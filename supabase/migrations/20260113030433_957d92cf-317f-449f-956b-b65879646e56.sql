-- ============================================================
-- 1) TIPOS Y ENUMS
-- ============================================================
-- Crear enum de estado de tarea PAM si no existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type typ
    JOIN pg_namespace nsp ON nsp.oid = typ.typnamespace
    WHERE nsp.nspname = 'public'
    AND typ.typname = 'pam_task_status'
  ) THEN
    CREATE TYPE public.pam_task_status AS ENUM (
      'PENDING',
      'IN_PROGRESS',
      'DONE',
      'OVERDUE'
    );
  END IF;
END$$;

-- ============================================================
-- 2) TABLAS
-- ============================================================
-- 2.1) Planificación semanal (metadatos de cada semana cargada)
CREATE TABLE IF NOT EXISTS public.pam_weeks_plan (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  week_number int NOT NULL,
  week_year int NOT NULL,
  uploaded_by uuid NOT NULL REFERENCES auth.users (id),
  uploaded_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  source_filename text,
  organization_id uuid NOT NULL,
  CONSTRAINT pam_weeks_plan_unique_week UNIQUE (week_number, week_year, organization_id)
);

-- 2.2) Tareas PAM
CREATE TABLE IF NOT EXISTS public.pam_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  week_plan_id uuid NOT NULL REFERENCES public.pam_weeks_plan (id) ON DELETE CASCADE,
  week_number int NOT NULL,
  week_year int NOT NULL,
  date date NOT NULL,
  assignee_user_id uuid NOT NULL REFERENCES auth.users (id),
  assignee_name text,
  description text NOT NULL,
  location text,
  risk_type text,
  status public.pam_task_status NOT NULL DEFAULT 'PENDING',
  has_evidence boolean NOT NULL DEFAULT false,
  organization_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

-- Trigger para mantener updated_at
CREATE OR REPLACE FUNCTION public.set_pam_tasks_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = timezone('utc', now());
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS pam_tasks_set_updated_at ON public.pam_tasks;
CREATE TRIGGER pam_tasks_set_updated_at
  BEFORE UPDATE ON public.pam_tasks
  FOR EACH ROW
  EXECUTE PROCEDURE public.set_pam_tasks_updated_at();

-- 2.3) Evidencias de tareas (archivos / notas)
CREATE TABLE IF NOT EXISTS public.pam_task_evidences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.pam_tasks (id) ON DELETE CASCADE,
  uploaded_by_user_id uuid NOT NULL REFERENCES auth.users (id),
  uploaded_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  file_url text NOT NULL,
  notes text
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_pam_tasks_week ON public.pam_tasks (week_year, week_number);
CREATE INDEX IF NOT EXISTS idx_pam_tasks_assignee ON public.pam_tasks (assignee_user_id);
CREATE INDEX IF NOT EXISTS idx_pam_tasks_status ON public.pam_tasks (status);
CREATE INDEX IF NOT EXISTS idx_pam_tasks_org ON public.pam_tasks (organization_id);
CREATE INDEX IF NOT EXISTS idx_pam_evidences_task ON public.pam_task_evidences (task_id);
CREATE INDEX IF NOT EXISTS idx_pam_weeks_org ON public.pam_weeks_plan (organization_id);

-- ============================================================
-- 3) HELPERS DE ROLES (usando user_roles y app_role existente)
-- ============================================================
-- Helper: es worker (usuario sin rol admin/prevencionista)
CREATE OR REPLACE FUNCTION public.is_pam_worker()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT NOT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role IN ('admin', 'prevencionista')
  );
$$;

-- Helper: es preventer o admin (puede ver/gestionar todo el PAM)
CREATE OR REPLACE FUNCTION public.is_pam_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role IN ('admin', 'prevencionista')
  );
$$;

-- ============================================================
-- 4) RLS (ROW LEVEL SECURITY)
-- ============================================================
ALTER TABLE public.pam_weeks_plan ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pam_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pam_task_evidences ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------
-- 4.1) RLS pam_weeks_plan
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "pam_weeks_plan_select" ON public.pam_weeks_plan;
DROP POLICY IF EXISTS "pam_weeks_plan_admin_all" ON public.pam_weeks_plan;

-- Lectura solo para preventer/admin de la misma organización
CREATE POLICY "pam_weeks_plan_select"
ON public.pam_weeks_plan
FOR SELECT
USING (
  public.is_pam_admin() 
  AND organization_id = get_user_organization_id(auth.uid())
);

-- Gestión completa solo preventer/admin
CREATE POLICY "pam_weeks_plan_admin_all"
ON public.pam_weeks_plan
FOR ALL
USING (
  public.is_pam_admin() 
  AND organization_id = get_user_organization_id(auth.uid())
)
WITH CHECK (
  public.is_pam_admin() 
  AND organization_id = get_user_organization_id(auth.uid())
);

-- ------------------------------------------------------------
-- 4.2) RLS pam_tasks
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "pam_tasks_select_own_or_admin" ON public.pam_tasks;
DROP POLICY IF EXISTS "pam_tasks_update_own" ON public.pam_tasks;
DROP POLICY IF EXISTS "pam_tasks_admin_all" ON public.pam_tasks;

-- Worker: ve SOLO sus tareas; preventer/admin ven todo de su org
CREATE POLICY "pam_tasks_select_own_or_admin"
ON public.pam_tasks
FOR SELECT
USING (
  organization_id = get_user_organization_id(auth.uid())
  AND (
    assignee_user_id = auth.uid()
    OR public.is_pam_admin()
  )
);

-- Worker: puede actualizar SOLO sus tareas (estado/evidencia)
CREATE POLICY "pam_tasks_update_own"
ON public.pam_tasks
FOR UPDATE
USING (
  assignee_user_id = auth.uid()
  AND organization_id = get_user_organization_id(auth.uid())
)
WITH CHECK (
  assignee_user_id = auth.uid()
  AND organization_id = get_user_organization_id(auth.uid())
);

-- Preventer/admin: control total sobre tareas de su organización
CREATE POLICY "pam_tasks_admin_all"
ON public.pam_tasks
FOR ALL
USING (
  public.is_pam_admin() 
  AND organization_id = get_user_organization_id(auth.uid())
)
WITH CHECK (
  public.is_pam_admin() 
  AND organization_id = get_user_organization_id(auth.uid())
);

-- ------------------------------------------------------------
-- 4.3) RLS pam_task_evidences
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "pam_evidences_select" ON public.pam_task_evidences;
DROP POLICY IF EXISTS "pam_evidences_insert" ON public.pam_task_evidences;
DROP POLICY IF EXISTS "pam_evidences_admin_all" ON public.pam_task_evidences;

-- Lectura: preventer/admin ven todo; worker ve sus evidencias o de sus tareas
CREATE POLICY "pam_evidences_select"
ON public.pam_task_evidences
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.pam_tasks t
    WHERE t.id = pam_task_evidences.task_id
    AND t.organization_id = get_user_organization_id(auth.uid())
  )
  AND (
    public.is_pam_admin()
    OR uploaded_by_user_id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.pam_tasks t
      WHERE t.id = pam_task_evidences.task_id
      AND t.assignee_user_id = auth.uid()
    )
  )
);

-- Inserción: worker sube sus propias evidencias; admin puede subir para cualquiera
CREATE POLICY "pam_evidences_insert"
ON public.pam_task_evidences
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.pam_tasks t
    WHERE t.id = pam_task_evidences.task_id
    AND t.organization_id = get_user_organization_id(auth.uid())
  )
  AND (
    public.is_pam_admin()
    OR uploaded_by_user_id = auth.uid()
  )
);

-- Admin: control total sobre evidencias de su organización
CREATE POLICY "pam_evidences_admin_all"
ON public.pam_task_evidences
FOR ALL
USING (
  public.is_pam_admin()
  AND EXISTS (
    SELECT 1 FROM public.pam_tasks t
    WHERE t.id = pam_task_evidences.task_id
    AND t.organization_id = get_user_organization_id(auth.uid())
  )
)
WITH CHECK (
  public.is_pam_admin()
  AND EXISTS (
    SELECT 1 FROM public.pam_tasks t
    WHERE t.id = pam_task_evidences.task_id
    AND t.organization_id = get_user_organization_id(auth.uid())
  )
);