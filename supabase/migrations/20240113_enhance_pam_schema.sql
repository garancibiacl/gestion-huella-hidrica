-- Mejoras al schema PAM: agregar campos de contrato, área, ubicación y rol

-- 1. Agregar nuevos campos a pam_tasks
ALTER TABLE pam_tasks 
ADD COLUMN IF NOT EXISTS contract VARCHAR(100),
ADD COLUMN IF NOT EXISTS area VARCHAR(100),
ADD COLUMN IF NOT EXISTS assignee_role VARCHAR(50),
ADD COLUMN IF NOT EXISTS comments TEXT;

-- 2. Crear índices para mejorar performance en filtros
CREATE INDEX IF NOT EXISTS idx_pam_tasks_contract ON pam_tasks(contract);
CREATE INDEX IF NOT EXISTS idx_pam_tasks_area ON pam_tasks(area);
CREATE INDEX IF NOT EXISTS idx_pam_tasks_location ON pam_tasks(location);
CREATE INDEX IF NOT EXISTS idx_pam_tasks_assignee_role ON pam_tasks(assignee_role);
CREATE INDEX IF NOT EXISTS idx_pam_tasks_status ON pam_tasks(status);
CREATE INDEX IF NOT EXISTS idx_pam_tasks_week_number ON pam_tasks(week_number);

-- 3. Crear tabla para comentarios de tareas (chat)
CREATE TABLE IF NOT EXISTS pam_task_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES pam_tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_name VARCHAR(255),
  comment TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pam_task_comments_task_id ON pam_task_comments(task_id);
CREATE INDEX IF NOT EXISTS idx_pam_task_comments_created_at ON pam_task_comments(created_at DESC);

-- 4. Habilitar RLS en pam_task_comments
ALTER TABLE pam_task_comments ENABLE ROW LEVEL SECURITY;

-- 5. Políticas RLS para pam_task_comments
CREATE POLICY "Users can view comments on their tasks"
  ON pam_task_comments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM pam_tasks pt
      WHERE pt.id = pam_task_comments.task_id
      AND (
        pt.assignee_user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM profiles p
          WHERE p.user_id = auth.uid()
          AND p.role IN ('admin', 'prevencionista')
        )
      )
    )
  );

CREATE POLICY "Users can create comments on their tasks"
  ON pam_task_comments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM pam_tasks pt
      WHERE pt.id = task_id
      AND (
        pt.assignee_user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM profiles p
          WHERE p.user_id = auth.uid()
          AND p.role IN ('admin', 'prevencionista')
        )
      )
    )
  );

-- 6. Crear tabla para métricas agregadas (cache de reportes)
CREATE TABLE IF NOT EXISTS pam_metrics_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  week_year INTEGER NOT NULL,
  week_number INTEGER NOT NULL,
  contract VARCHAR(100),
  area VARCHAR(100),
  location VARCHAR(100),
  role VARCHAR(50),
  total_tasks INTEGER DEFAULT 0,
  completed_tasks INTEGER DEFAULT 0,
  in_progress_tasks INTEGER DEFAULT 0,
  pending_tasks INTEGER DEFAULT 0,
  overdue_tasks INTEGER DEFAULT 0,
  compliance_percentage DECIMAL(5,2) DEFAULT 0,
  calculated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, week_year, week_number, contract, area, location, role)
);

CREATE INDEX IF NOT EXISTS idx_pam_metrics_org_week ON pam_metrics_cache(organization_id, week_year, week_number);
CREATE INDEX IF NOT EXISTS idx_pam_metrics_contract ON pam_metrics_cache(contract);

-- 7. Función para calcular métricas
CREATE OR REPLACE FUNCTION calculate_pam_metrics(
  p_organization_id UUID,
  p_week_year INTEGER,
  p_week_number INTEGER
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Limpiar métricas anteriores de esta semana
  DELETE FROM pam_metrics_cache
  WHERE organization_id = p_organization_id
    AND week_year = p_week_year
    AND week_number = p_week_number;

  -- Calcular y guardar nuevas métricas
  INSERT INTO pam_metrics_cache (
    organization_id, week_year, week_number,
    contract, area, location, role,
    total_tasks, completed_tasks, in_progress_tasks,
    pending_tasks, overdue_tasks, compliance_percentage
  )
  SELECT
    p_organization_id,
    p_week_year,
    p_week_number,
    COALESCE(contract, 'Sin contrato'),
    COALESCE(area, 'Sin área'),
    COALESCE(location, 'Sin ubicación'),
    COALESCE(assignee_role, 'Sin rol'),
    COUNT(*) as total_tasks,
    COUNT(*) FILTER (WHERE status = 'DONE') as completed_tasks,
    COUNT(*) FILTER (WHERE status = 'IN_PROGRESS') as in_progress_tasks,
    COUNT(*) FILTER (WHERE status = 'PENDING') as pending_tasks,
    COUNT(*) FILTER (WHERE status = 'OVERDUE') as overdue_tasks,
    CASE 
      WHEN COUNT(*) > 0 THEN 
        ROUND((COUNT(*) FILTER (WHERE status = 'DONE')::DECIMAL / COUNT(*)) * 100, 2)
      ELSE 0
    END as compliance_percentage
  FROM pam_tasks
  WHERE organization_id = p_organization_id
    AND week_year = p_week_year
    AND week_number = p_week_number
  GROUP BY contract, area, location, assignee_role;
END;
$$;

-- 8. Trigger para actualizar métricas cuando cambia una tarea
CREATE OR REPLACE FUNCTION trigger_recalculate_pam_metrics()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM calculate_pam_metrics(
    COALESCE(NEW.organization_id, OLD.organization_id),
    COALESCE(NEW.week_year, OLD.week_year),
    COALESCE(NEW.week_number, OLD.week_number)
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS pam_tasks_metrics_trigger ON pam_tasks;
CREATE TRIGGER pam_tasks_metrics_trigger
  AFTER INSERT OR UPDATE OR DELETE ON pam_tasks
  FOR EACH ROW
  EXECUTE FUNCTION trigger_recalculate_pam_metrics();

-- 9. RLS para pam_metrics_cache
ALTER TABLE pam_metrics_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view metrics from their organization"
  ON pam_metrics_cache FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE user_id = auth.uid()
    )
  );

-- 10. Función para obtener métricas del dashboard
CREATE OR REPLACE FUNCTION get_pam_dashboard_metrics(
  p_organization_id UUID,
  p_week_year INTEGER DEFAULT NULL,
  p_week_number INTEGER DEFAULT NULL
)
RETURNS TABLE (
  total_tasks BIGINT,
  completed_tasks BIGINT,
  in_progress_tasks BIGINT,
  pending_tasks BIGINT,
  overdue_tasks BIGINT,
  compliance_percentage NUMERIC,
  by_contract JSONB,
  by_area JSONB,
  by_location JSONB,
  by_role JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_week_year INTEGER;
  v_week_number INTEGER;
BEGIN
  -- Si no se especifica semana, usar la actual
  IF p_week_year IS NULL OR p_week_number IS NULL THEN
    SELECT EXTRACT(ISOYEAR FROM CURRENT_DATE)::INTEGER,
           EXTRACT(WEEK FROM CURRENT_DATE)::INTEGER
    INTO v_week_year, v_week_number;
  ELSE
    v_week_year := p_week_year;
    v_week_number := p_week_number;
  END IF;

  RETURN QUERY
  SELECT
    SUM(pmc.total_tasks)::BIGINT,
    SUM(pmc.completed_tasks)::BIGINT,
    SUM(pmc.in_progress_tasks)::BIGINT,
    SUM(pmc.pending_tasks)::BIGINT,
    SUM(pmc.overdue_tasks)::BIGINT,
    CASE 
      WHEN SUM(pmc.total_tasks) > 0 THEN
        ROUND((SUM(pmc.completed_tasks)::NUMERIC / SUM(pmc.total_tasks)) * 100, 2)
      ELSE 0
    END,
    (SELECT jsonb_agg(jsonb_build_object(
      'name', contract,
      'total', SUM(total_tasks),
      'completed', SUM(completed_tasks),
      'compliance', AVG(compliance_percentage)
    ))
    FROM pam_metrics_cache
    WHERE organization_id = p_organization_id
      AND week_year = v_week_year
      AND week_number = v_week_number
    GROUP BY contract),
    (SELECT jsonb_agg(jsonb_build_object(
      'name', area,
      'total', SUM(total_tasks),
      'completed', SUM(completed_tasks),
      'compliance', AVG(compliance_percentage)
    ))
    FROM pam_metrics_cache
    WHERE organization_id = p_organization_id
      AND week_year = v_week_year
      AND week_number = v_week_number
    GROUP BY area),
    (SELECT jsonb_agg(jsonb_build_object(
      'name', location,
      'total', SUM(total_tasks),
      'completed', SUM(completed_tasks),
      'compliance', AVG(compliance_percentage)
    ))
    FROM pam_metrics_cache
    WHERE organization_id = p_organization_id
      AND week_year = v_week_year
      AND week_number = v_week_number
    GROUP BY location),
    (SELECT jsonb_agg(jsonb_build_object(
      'name', role,
      'total', SUM(total_tasks),
      'completed', SUM(completed_tasks),
      'compliance', AVG(compliance_percentage)
    ))
    FROM pam_metrics_cache
    WHERE organization_id = p_organization_id
      AND week_year = v_week_year
      AND week_number = v_week_number
    GROUP BY role)
  FROM pam_metrics_cache pmc
  WHERE pmc.organization_id = p_organization_id
    AND pmc.week_year = v_week_year
    AND pmc.week_number = v_week_number;
END;
$$;

COMMENT ON TABLE pam_task_comments IS 'Comentarios tipo chat en tareas PAM';
COMMENT ON TABLE pam_metrics_cache IS 'Cache de métricas agregadas para reportes PAM';
COMMENT ON FUNCTION calculate_pam_metrics IS 'Calcula y guarda métricas agregadas de PAM por semana';
COMMENT ON FUNCTION get_pam_dashboard_metrics IS 'Obtiene métricas del dashboard ejecutivo PAM';
