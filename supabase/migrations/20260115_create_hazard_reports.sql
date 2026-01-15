-- =====================================================
-- MIGRACIÓN: Módulo de Reporte de Peligros (Hazard Reports)
-- Fecha: 2026-01-15
-- Descripción: Tablas para gestión de reportes de peligro en PLS
-- =====================================================

-- =====================================================
-- 1. CATÁLOGOS: Jerarquía organizacional para Hazards
-- =====================================================

-- Tabla de jerarquía: Gerencia → Proceso → Actividad → Tarea
CREATE TABLE IF NOT EXISTS hazard_catalog_hierarchy (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Jerarquía
  gerencia text NOT NULL,
  proceso text,
  actividad text,
  tarea text,
  
  -- Ubicación / Faena
  faena text,
  centro_trabajo text,
  
  -- ID estable para sync (hash de la combinación)
  stable_id text NOT NULL,
  
  -- Metadatos
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(organization_id, stable_id)
);

CREATE INDEX idx_hazard_hierarchy_org ON hazard_catalog_hierarchy(organization_id);
CREATE INDEX idx_hazard_hierarchy_stable ON hazard_catalog_hierarchy(stable_id);
CREATE INDEX idx_hazard_hierarchy_gerencia ON hazard_catalog_hierarchy(organization_id, gerencia);

-- =====================================================
-- 2. CATÁLOGO: Riesgos Críticos
-- =====================================================

CREATE TABLE IF NOT EXISTS hazard_critical_risks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  code text NOT NULL,
  name text NOT NULL,
  description text,
  severity text CHECK (severity IN ('BAJA', 'MEDIA', 'ALTA', 'CRITICA')),
  
  -- ¿Requiere evidencia obligatoria?
  requires_evidence boolean DEFAULT false,
  
  -- Metadatos
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(organization_id, code)
);

CREATE INDEX idx_hazard_risks_org ON hazard_critical_risks(organization_id);
CREATE INDEX idx_hazard_risks_severity ON hazard_critical_risks(severity);

-- =====================================================
-- 3. CATÁLOGO: Responsables de Cierre/Verificación
-- =====================================================

CREATE TABLE IF NOT EXISTS hazard_responsibles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  name text NOT NULL,
  rut text,
  email text,
  company text,
  
  -- Roles/permisos
  can_close boolean DEFAULT false,
  can_verify boolean DEFAULT false,
  
  -- Metadatos
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(organization_id, email)
);

CREATE INDEX idx_hazard_responsibles_org ON hazard_responsibles(organization_id);
CREATE INDEX idx_hazard_responsibles_email ON hazard_responsibles(email);

-- =====================================================
-- 4. CATÁLOGO: Tipos de Control
-- =====================================================

CREATE TABLE IF NOT EXISTS hazard_control_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  code text NOT NULL,
  name text NOT NULL,
  description text,
  
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  
  UNIQUE(organization_id, code)
);

CREATE INDEX idx_hazard_control_types_org ON hazard_control_types(organization_id);

-- =====================================================
-- 5. TABLA PRINCIPAL: Reportes de Peligro
-- =====================================================

CREATE TABLE IF NOT EXISTS hazard_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Estado
  status text NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'CLOSED', 'CANCELLED')),
  
  -- Tipo de reporte (por si se agregan otros tipos después)
  report_type text NOT NULL DEFAULT 'DANGER_REPORT',
  
  -- Jerarquía (IDs a catálogo, desnormalizado para performance)
  hierarchy_id uuid REFERENCES hazard_catalog_hierarchy(id),
  gerencia text NOT NULL,
  proceso text,
  actividad text,
  tarea text,
  
  -- Ubicación
  faena text,
  centro_trabajo text,
  
  -- Riesgo crítico
  critical_risk_id uuid REFERENCES hazard_critical_risks(id),
  critical_risk_name text, -- desnormalizado
  
  -- Tipo de desviación
  deviation_type text NOT NULL CHECK (deviation_type IN ('ACCION', 'CONDICION')),
  
  -- Descripción del peligro
  description text NOT NULL,
  root_cause text, -- Causa raíz (opcional)
  
  -- Responsables
  closing_responsible_id uuid REFERENCES hazard_responsibles(id),
  closing_responsible_name text,
  
  -- Plazo
  due_date date NOT NULL,
  
  -- Datos del reportante (snapshot inmutable)
  reporter_user_id uuid REFERENCES auth.users(id),
  reporter_name text NOT NULL,
  reporter_rut text,
  reporter_email text,
  reporter_company text,
  
  -- Cierre
  closed_at timestamptz,
  closed_by_user_id uuid REFERENCES auth.users(id),
  verification_responsible_id uuid REFERENCES hazard_responsibles(id),
  verification_responsible_name text,
  control_type_id uuid REFERENCES hazard_control_types(id),
  control_type_name text,
  closing_description text,
  
  -- Metadatos
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Índices para queries comunes
CREATE INDEX idx_hazard_reports_org ON hazard_reports(organization_id);
CREATE INDEX idx_hazard_reports_status ON hazard_reports(organization_id, status);
CREATE INDEX idx_hazard_reports_closing_responsible ON hazard_reports(closing_responsible_id);
CREATE INDEX idx_hazard_reports_reporter ON hazard_reports(reporter_user_id);
CREATE INDEX idx_hazard_reports_due_date ON hazard_reports(organization_id, due_date);
CREATE INDEX idx_hazard_reports_critical_risk ON hazard_reports(critical_risk_id);
CREATE INDEX idx_hazard_reports_created_at ON hazard_reports(organization_id, created_at DESC);

-- =====================================================
-- 6. TABLA: Evidencias de Reportes
-- =====================================================

CREATE TABLE IF NOT EXISTS hazard_report_evidences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hazard_report_id uuid NOT NULL REFERENCES hazard_reports(id) ON DELETE CASCADE,
  
  -- Archivo
  file_url text NOT NULL,
  file_name text NOT NULL,
  mime_type text,
  size_bytes bigint,
  
  -- Tipo de evidencia
  evidence_type text NOT NULL CHECK (evidence_type IN ('FINDING', 'CLOSURE', 'OTHER')),
  
  -- Descripción opcional
  description text,
  
  -- Quién lo subió
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_hazard_evidences_report ON hazard_report_evidences(hazard_report_id);
CREATE INDEX idx_hazard_evidences_type ON hazard_report_evidences(hazard_report_id, evidence_type);

-- =====================================================
-- 7. TABLA: Eventos / Auditoría
-- =====================================================

CREATE TABLE IF NOT EXISTS hazard_report_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hazard_report_id uuid NOT NULL REFERENCES hazard_reports(id) ON DELETE CASCADE,
  
  event_type text NOT NULL CHECK (event_type IN (
    'CREATED', 
    'UPDATED', 
    'EVIDENCE_ADDED', 
    'CLOSED', 
    'REOPENED',
    'ASSIGNED',
    'COMMENT_ADDED'
  )),
  
  -- Payload flexible (JSON)
  payload jsonb,
  
  -- Usuario que generó el evento
  created_by uuid REFERENCES auth.users(id),
  created_by_name text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_hazard_events_report ON hazard_report_events(hazard_report_id, created_at DESC);

-- =====================================================
-- 8. ROW LEVEL SECURITY (RLS)
-- =====================================================

ALTER TABLE hazard_catalog_hierarchy ENABLE ROW LEVEL SECURITY;
ALTER TABLE hazard_critical_risks ENABLE ROW LEVEL SECURITY;
ALTER TABLE hazard_responsibles ENABLE ROW LEVEL SECURITY;
ALTER TABLE hazard_control_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE hazard_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE hazard_report_evidences ENABLE ROW LEVEL SECURITY;
ALTER TABLE hazard_report_events ENABLE ROW LEVEL SECURITY;

-- RLS: Catálogos (lectura para usuarios de la org)
CREATE POLICY "Users can view catalogs of their organization"
  ON hazard_catalog_hierarchy FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view critical risks of their organization"
  ON hazard_critical_risks FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view responsibles of their organization"
  ON hazard_responsibles FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view control types of their organization"
  ON hazard_control_types FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE user_id = auth.uid()
    )
  );

-- RLS: Reportes (CRUD para usuarios de la org)
CREATE POLICY "Users can view hazard reports of their organization"
  ON hazard_reports FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create hazard reports in their organization"
  ON hazard_reports FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update hazard reports in their organization"
  ON hazard_reports FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE user_id = auth.uid()
    )
  );

-- RLS: Evidencias
CREATE POLICY "Users can view evidences of their organization"
  ON hazard_report_evidences FOR SELECT
  USING (
    hazard_report_id IN (
      SELECT id FROM hazard_reports 
      WHERE organization_id IN (
        SELECT organization_id FROM profiles WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can add evidences to reports in their organization"
  ON hazard_report_evidences FOR INSERT
  WITH CHECK (
    hazard_report_id IN (
      SELECT id FROM hazard_reports 
      WHERE organization_id IN (
        SELECT organization_id FROM profiles WHERE user_id = auth.uid()
      )
    )
  );

-- RLS: Eventos (solo lectura y creación automática)
CREATE POLICY "Users can view events of their organization"
  ON hazard_report_events FOR SELECT
  USING (
    hazard_report_id IN (
      SELECT id FROM hazard_reports 
      WHERE organization_id IN (
        SELECT organization_id FROM profiles WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can create events in their organization"
  ON hazard_report_events FOR INSERT
  WITH CHECK (
    hazard_report_id IN (
      SELECT id FROM hazard_reports 
      WHERE organization_id IN (
        SELECT organization_id FROM profiles WHERE user_id = auth.uid()
      )
    )
  );

-- =====================================================
-- 9. STORAGE: Bucket para evidencias
-- =====================================================

-- Reusar bucket existente pls-evidence o crear uno específico
-- Si no existe, crearlo:
INSERT INTO storage.buckets (id, name, public)
VALUES ('hazard-evidence', 'hazard-evidence', false)
ON CONFLICT (id) DO NOTHING;

-- Policy de storage: subir evidencias
CREATE POLICY "Users can upload hazard evidence"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'hazard-evidence' AND
    auth.uid() IN (
      SELECT user_id FROM profiles 
      WHERE organization_id IN (
        SELECT organization_id FROM profiles WHERE user_id = auth.uid()
      )
    )
  );

-- Policy de storage: ver evidencias de su org
CREATE POLICY "Users can view hazard evidence of their organization"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'hazard-evidence' AND
    auth.uid() IN (
      SELECT user_id FROM profiles 
      WHERE organization_id IN (
        SELECT organization_id FROM profiles WHERE user_id = auth.uid()
      )
    )
  );

-- =====================================================
-- 10. TRIGGERS: Eventos automáticos
-- =====================================================

-- Trigger para crear evento al crear un reporte
CREATE OR REPLACE FUNCTION create_hazard_report_event()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO hazard_report_events (
    hazard_report_id,
    event_type,
    payload,
    created_by,
    created_by_name
  ) VALUES (
    NEW.id,
    'CREATED',
    jsonb_build_object(
      'status', NEW.status,
      'gerencia', NEW.gerencia,
      'critical_risk', NEW.critical_risk_name,
      'due_date', NEW.due_date
    ),
    NEW.reporter_user_id,
    NEW.reporter_name
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER hazard_report_created
  AFTER INSERT ON hazard_reports
  FOR EACH ROW
  EXECUTE FUNCTION create_hazard_report_event();

-- Trigger para evento de cierre
CREATE OR REPLACE FUNCTION create_hazard_close_event()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'CLOSED' AND OLD.status != 'CLOSED' THEN
    INSERT INTO hazard_report_events (
      hazard_report_id,
      event_type,
      payload,
      created_by,
      created_by_name
    ) VALUES (
      NEW.id,
      'CLOSED',
      jsonb_build_object(
        'closed_at', NEW.closed_at,
        'control_type', NEW.control_type_name,
        'verification_responsible', NEW.verification_responsible_name
      ),
      NEW.closed_by_user_id,
      (SELECT full_name FROM profiles WHERE user_id = NEW.closed_by_user_id LIMIT 1)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER hazard_report_closed
  AFTER UPDATE ON hazard_reports
  FOR EACH ROW
  WHEN (NEW.status = 'CLOSED' AND OLD.status != 'CLOSED')
  EXECUTE FUNCTION create_hazard_close_event();

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_hazard_report_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_hazard_report_updated_at
  BEFORE UPDATE ON hazard_reports
  FOR EACH ROW
  EXECUTE FUNCTION update_hazard_report_timestamp();

-- =====================================================
-- 11. DATOS DE EJEMPLO (opcional, para desarrollo)
-- =====================================================

-- Insertar tipos de control comunes (si no existen)
-- Esto es opcional y se puede cargar desde Google Sheets
/*
INSERT INTO hazard_control_types (organization_id, code, name, description)
SELECT 
  o.id,
  'ELIMINACION',
  'Eliminación del peligro',
  'Control tipo: Eliminación'
FROM organizations o
ON CONFLICT DO NOTHING;

INSERT INTO hazard_control_types (organization_id, code, name, description)
SELECT 
  o.id,
  'SUSTITUCION',
  'Sustitución',
  'Control tipo: Sustitución'
FROM organizations o
ON CONFLICT DO NOTHING;

INSERT INTO hazard_control_types (organization_id, code, name, description)
SELECT 
  o.id,
  'ING_CONTROLES',
  'Controles de ingeniería',
  'Control tipo: Ingeniería'
FROM organizations o
ON CONFLICT DO NOTHING;

INSERT INTO hazard_control_types (organization_id, code, name, description)
SELECT 
  o.id,
  'ADM_CONTROLES',
  'Controles administrativos',
  'Control tipo: Administrativo'
FROM organizations o
ON CONFLICT DO NOTHING;

INSERT INTO hazard_control_types (organization_id, code, name, description)
SELECT 
  o.id,
  'EPP',
  'Equipos de protección personal',
  'Control tipo: EPP'
FROM organizations o
ON CONFLICT DO NOTHING;
*/

-- =====================================================
-- FIN DE MIGRACIÓN
-- =====================================================

COMMENT ON TABLE hazard_reports IS 'Tabla principal de reportes de peligro del módulo PLS';
COMMENT ON TABLE hazard_catalog_hierarchy IS 'Catálogo jerárquico: Gerencia → Proceso → Actividad → Tarea';
COMMENT ON TABLE hazard_critical_risks IS 'Catálogo de riesgos críticos';
COMMENT ON TABLE hazard_responsibles IS 'Catálogo de responsables de cierre y verificación';
COMMENT ON TABLE hazard_report_evidences IS 'Evidencias (fotos/archivos) asociadas a reportes';
COMMENT ON TABLE hazard_report_events IS 'Timeline/auditoría de eventos de reportes';
