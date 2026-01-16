-- ============================================================================
-- NOTIFICATION OUTBOX SYSTEM
-- Sistema de cola para envío de notificaciones por email usando Resend
-- Implementa patrón OUTBOX + DISPATCHER para garantizar entrega confiable
-- ============================================================================

-- ============================================================================
-- 1. TABLA PRINCIPAL: notification_outbox
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.notification_outbox (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  
  -- Destinatario
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_email TEXT,
  
  -- Referencias a notificación origen
  source_table TEXT NOT NULL CHECK (source_table IN ('hazard_notifications', 'pam_notifications')),
  source_id UUID NOT NULL,
  
  -- Referencias a entidad (reporte o tarea)
  entity_type TEXT NOT NULL CHECK (entity_type IN ('hazard_report', 'pam_task')),
  entity_id UUID NOT NULL,
  
  -- Tipo de notificación
  notification_type TEXT NOT NULL,
  
  -- Canal y estado
  channel TEXT NOT NULL DEFAULT 'email' CHECK (channel = 'email'),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'sent', 'failed')),
  
  -- Control de reintentos
  attempts INT NOT NULL DEFAULT 0,
  last_error TEXT,
  sent_at TIMESTAMPTZ,
  
  -- Datos para renderizar email (snapshot)
  payload JSONB NOT NULL,
  
  -- ID del mensaje en Resend (para auditoría)
  message_id TEXT
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_notification_outbox_status_created 
  ON public.notification_outbox(status, created_at) 
  WHERE status IN ('pending', 'processing');

CREATE INDEX IF NOT EXISTS idx_notification_outbox_org_status 
  ON public.notification_outbox(organization_id, status);

CREATE INDEX IF NOT EXISTS idx_notification_outbox_source 
  ON public.notification_outbox(source_table, source_id);

-- Constraint de idempotencia: una notificación solo genera UN email
CREATE UNIQUE INDEX IF NOT EXISTS idx_notification_outbox_unique_source 
  ON public.notification_outbox(source_table, source_id, channel);

-- RLS: Bloquear acceso a usuarios normales (solo service role / edge functions)
ALTER TABLE public.notification_outbox ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notification_outbox_no_access"
  ON public.notification_outbox
  FOR ALL
  USING (false);

-- Comentario para documentación
COMMENT ON TABLE public.notification_outbox IS 
'Cola de salida para notificaciones por email. Procesada por Edge Function notification-email-dispatcher.';

-- ============================================================================
-- 2. TABLA DE CONFIGURACIÓN (OPCIONAL): notification_email_settings
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.notification_email_settings (
  organization_id UUID PRIMARY KEY REFERENCES public.organizations(id) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL DEFAULT true,
  
  -- Tipos de notificaciones habilitadas por dominio
  send_hazard_types TEXT[] NOT NULL DEFAULT ARRAY[
    'report_assigned',
    'report_due_soon',
    'report_overdue',
    'report_closed'
  ]::TEXT[],
  
  send_pam_types TEXT[] NOT NULL DEFAULT ARRAY[
    'task_assigned',
    'task_due_soon',
    'task_overdue'
  ]::TEXT[],
  
  -- Modo de envío (para futuro: digest, realtime)
  digest_mode TEXT NOT NULL DEFAULT 'realtime' CHECK (digest_mode IN ('realtime', 'digest_hourly', 'digest_daily')),
  
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS: Solo admin/service puede leer/modificar
ALTER TABLE public.notification_email_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notification_email_settings_service_all"
  ON public.notification_email_settings
  FOR ALL
  USING (false);

COMMENT ON TABLE public.notification_email_settings IS 
'Configuración de envío de emails por organización. TODO: agregar UI en Admin.';

-- ============================================================================
-- 3. FUNCIONES DE ENQUEUE (insertar en outbox)
-- ============================================================================

-- Función para encolar notificación de Hazard
CREATE OR REPLACE FUNCTION enqueue_hazard_notification_email()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_report RECORD;
  v_org_settings RECORD;
BEGIN
  -- 1. Verificar si la organización tiene emails habilitados
  SELECT * INTO v_org_settings
  FROM notification_email_settings
  WHERE organization_id = NEW.organization_id;
  
  -- Si no existe configuración, asumir habilitado por defecto
  IF v_org_settings IS NULL OR v_org_settings.enabled = false THEN
    RETURN NEW;
  END IF;
  
  -- Si el tipo de notificación no está en la lista permitida, salir
  IF v_org_settings.send_hazard_types IS NOT NULL AND 
     NOT (NEW.type = ANY(v_org_settings.send_hazard_types)) THEN
    RETURN NEW;
  END IF;
  
  -- 2. Obtener datos del reporte para el payload
  SELECT 
    hr.id,
    hr.description,
    hr.due_date,
    hr.created_at,
    hr.status,
    hcr.name as critical_risk_name,
    hch.gerencia,
    hch.proceso,
    hch.actividad,
    hch.tarea,
    hr.faena,
    hr.centro_trabajo,
    p_responsible.full_name as responsible_name,
    p_reporter.full_name as reporter_name,
    org.name as organization_name
  INTO v_report
  FROM hazard_reports hr
  LEFT JOIN hazard_critical_risks hcr ON hr.critical_risk_id = hcr.id
  LEFT JOIN hazard_catalog_hierarchy hch ON hr.hierarchy_id = hch.id
  LEFT JOIN profiles p_responsible ON hr.closing_responsible_id = p_responsible.user_id
  LEFT JOIN profiles p_reporter ON hr.reporter_user_id = p_reporter.user_id
  LEFT JOIN organizations org ON hr.organization_id = org.id
  WHERE hr.id = NEW.hazard_report_id;
  
  -- 3. Insertar en outbox (ON CONFLICT DO NOTHING por idempotencia)
  INSERT INTO notification_outbox (
    organization_id,
    user_id,
    source_table,
    source_id,
    entity_type,
    entity_id,
    notification_type,
    payload
  ) VALUES (
    NEW.organization_id,
    NEW.user_id,
    'hazard_notifications',
    NEW.id,
    'hazard_report',
    NEW.hazard_report_id,
    NEW.type,
    jsonb_build_object(
      'reportId', v_report.id,
      'description', v_report.description,
      'dueDate', v_report.due_date,
      'createdAt', v_report.created_at,
      'status', v_report.status,
      'criticalRisk', v_report.critical_risk_name,
      'gerencia', v_report.gerencia,
      'proceso', v_report.proceso,
      'actividad', v_report.actividad,
      'tarea', v_report.tarea,
      'faena', v_report.faena,
      'centroTrabajo', v_report.centro_trabajo,
      'responsibleName', v_report.responsible_name,
      'reporterName', v_report.reporter_name,
      'organizationName', v_report.organization_name,
      'notificationType', NEW.type,
      'notificationTitle', NEW.title,
      'notificationMessage', NEW.message
    )
  )
  ON CONFLICT (source_table, source_id, channel) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- Función para encolar notificación de PAM
CREATE OR REPLACE FUNCTION enqueue_pam_notification_email()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_task RECORD;
  v_org_settings RECORD;
BEGIN
  -- 1. Verificar si la organización tiene emails habilitados
  SELECT * INTO v_org_settings
  FROM notification_email_settings
  WHERE organization_id = NEW.organization_id;
  
  -- Si no existe configuración, asumir habilitado por defecto
  IF v_org_settings IS NULL OR v_org_settings.enabled = false THEN
    RETURN NEW;
  END IF;
  
  -- Si el tipo de notificación no está en la lista permitida, salir
  IF v_org_settings.send_pam_types IS NOT NULL AND 
     NOT (NEW.type = ANY(v_org_settings.send_pam_types)) THEN
    RETURN NEW;
  END IF;
  
  -- 2. Obtener datos de la tarea para el payload
  SELECT 
    t.id,
    t.assignee_email,
    t.assignee_rut,
    t.task_date,
    t.location,
    t.risk_type,
    t.task_description,
    t.area,
    t.responsible,
    t.created_at,
    t.completed_at,
    t.is_completed,
    org.name as organization_name,
    p.full_name as assignee_name
  INTO v_task
  FROM pam_tasks t
  LEFT JOIN organizations org ON t.organization_id = org.id
  LEFT JOIN profiles p ON t.assignee_user_id = p.user_id
  WHERE t.id = NEW.task_id;
  
  -- 3. Insertar en outbox (ON CONFLICT DO NOTHING por idempotencia)
  INSERT INTO notification_outbox (
    organization_id,
    user_id,
    recipient_email,
    source_table,
    source_id,
    entity_type,
    entity_id,
    notification_type,
    payload
  ) VALUES (
    NEW.organization_id,
    NEW.user_id,
    COALESCE(v_task.assignee_email, ''),
    'pam_notifications',
    NEW.id,
    'pam_task',
    NEW.task_id,
    NEW.type,
    jsonb_build_object(
      'taskId', v_task.id,
      'assigneeEmail', v_task.assignee_email,
      'assigneeRut', v_task.assignee_rut,
      'assigneeName', v_task.assignee_name,
      'taskDate', v_task.task_date,
      'location', v_task.location,
      'riskType', v_task.risk_type,
      'taskDescription', v_task.task_description,
      'area', v_task.area,
      'responsible', v_task.responsible,
      'createdAt', v_task.created_at,
      'isCompleted', v_task.is_completed,
      'completedAt', v_task.completed_at,
      'organizationName', v_task.organization_name,
      'notificationType', NEW.type,
      'notificationTitle', NEW.title,
      'notificationMessage', NEW.message
    )
  )
  ON CONFLICT (source_table, source_id, channel) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- ============================================================================
-- 4. TRIGGERS PARA ENQUEUE AUTOMÁTICO
-- ============================================================================

-- Trigger para hazard_notifications
DROP TRIGGER IF EXISTS trigger_enqueue_hazard_notification_email ON hazard_notifications;
CREATE TRIGGER trigger_enqueue_hazard_notification_email
  AFTER INSERT ON hazard_notifications
  FOR EACH ROW
  EXECUTE FUNCTION enqueue_hazard_notification_email();

-- Trigger para pam_notifications
DROP TRIGGER IF EXISTS trigger_enqueue_pam_notification_email ON pam_notifications;
CREATE TRIGGER trigger_enqueue_pam_notification_email
  AFTER INSERT ON pam_notifications
  FOR EACH ROW
  EXECUTE FUNCTION enqueue_pam_notification_email();

-- ============================================================================
-- 5. FUNCIÓN DE LIMPIEZA (opcional, para cron)
-- ============================================================================
CREATE OR REPLACE FUNCTION cleanup_old_notification_outbox()
RETURNS void
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Eliminar notificaciones enviadas con más de 30 días
  DELETE FROM notification_outbox
  WHERE status = 'sent'
    AND sent_at < now() - INTERVAL '30 days';
  
  -- Eliminar notificaciones falladas con más de 7 días
  DELETE FROM notification_outbox
  WHERE status = 'failed'
    AND created_at < now() - INTERVAL '7 days';
END;
$$;

COMMENT ON FUNCTION cleanup_old_notification_outbox IS 
'Limpia registros antiguos de notification_outbox (llamar desde cron).';

-- ============================================================================
-- 6. INSERTAR CONFIGURACIÓN DEFAULT PARA ORGANIZACIONES EXISTENTES
-- ============================================================================
INSERT INTO notification_email_settings (organization_id)
SELECT id FROM organizations
ON CONFLICT (organization_id) DO NOTHING;

-- ============================================================================
-- FIN DE MIGRACIÓN
-- ============================================================================
