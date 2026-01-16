-- =============================================
-- NOTIFICATION OUTBOX SYSTEM
-- =============================================

-- 1. Tabla principal de cola de emails
CREATE TABLE IF NOT EXISTS public.notification_outbox (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('hazard', 'pam')),
  entity_id UUID NOT NULL,
  notification_id UUID NOT NULL,
  notification_type TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  recipient_name TEXT,
  subject TEXT NOT NULL,
  html_body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  attempts INT NOT NULL DEFAULT 0,
  last_error TEXT,
  message_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent_at TIMESTAMPTZ,
  CONSTRAINT notification_outbox_max_attempts CHECK (attempts <= 5)
);

-- 2. Tabla de configuración de emails por organización
CREATE TABLE IF NOT EXISTS public.notification_email_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  hazard_emails_enabled BOOLEAN NOT NULL DEFAULT true,
  pam_emails_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(organization_id)
);

-- 3. Índices para performance
CREATE INDEX IF NOT EXISTS idx_notification_outbox_status ON notification_outbox(status);
CREATE INDEX IF NOT EXISTS idx_notification_outbox_created_at ON notification_outbox(created_at);
CREATE INDEX IF NOT EXISTS idx_notification_outbox_entity ON notification_outbox(entity_type, entity_id);

-- 4. RLS para notification_outbox (solo service role puede acceder)
ALTER TABLE notification_outbox ENABLE ROW LEVEL SECURITY;

-- 5. RLS para notification_email_settings
ALTER TABLE notification_email_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their org email settings"
  ON notification_email_settings FOR SELECT
  USING (organization_id = get_user_organization_id(auth.uid()));

CREATE POLICY "Admins can update their org email settings"
  ON notification_email_settings FOR UPDATE
  USING (organization_id = get_user_organization_id(auth.uid()));

-- 6. Función para encolar email de hazard notification
CREATE OR REPLACE FUNCTION enqueue_hazard_notification_email()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_user_email TEXT;
  v_user_name TEXT;
  v_hazard_desc TEXT;
  v_hazard_id UUID;
  v_due_date DATE;
  v_subject TEXT;
  v_html_body TEXT;
BEGIN
  -- Obtener datos del usuario destinatario
  SELECT email, full_name INTO v_user_email, v_user_name
  FROM profiles
  WHERE user_id = NEW.user_id
  LIMIT 1;

  -- Si no hay email, no hacer nada
  IF v_user_email IS NULL THEN
    RETURN NEW;
  END IF;

  -- Obtener datos del hazard report
  SELECT description, id, due_date INTO v_hazard_desc, v_hazard_id, v_due_date
  FROM hazard_reports
  WHERE id = NEW.hazard_report_id
  LIMIT 1;

  -- Construir subject y body según tipo
  CASE NEW.type
    WHEN 'report_assigned' THEN
      v_subject := '🔔 Nuevo Reporte de Peligro asignado';
      v_html_body := format(
        '<h2>Hola %s,</h2>
        <p>Se te ha asignado un nuevo reporte de peligro:</p>
        <blockquote>%s</blockquote>
        <p><strong>Fecha límite:</strong> %s</p>
        <p><a href="%s/pam/hazards/%s">Ver en la App</a></p>',
        COALESCE(v_user_name, 'Usuario'),
        LEFT(COALESCE(v_hazard_desc, 'Sin descripción'), 200),
        COALESCE(v_due_date::text, 'No especificada'),
        COALESCE(current_setting('app.base_url', true), 'https://app.busesjm.cl'),
        v_hazard_id
      );
    WHEN 'report_closed' THEN
      v_subject := '✅ Reporte de Peligro cerrado - Verificación requerida';
      v_html_body := format(
        '<h2>Hola %s,</h2>
        <p>Un reporte de peligro ha sido cerrado y requiere tu verificación:</p>
        <blockquote>%s</blockquote>
        <p><a href="%s/pam/hazards/%s">Verificar en la App</a></p>',
        COALESCE(v_user_name, 'Usuario'),
        LEFT(COALESCE(v_hazard_desc, 'Sin descripción'), 200),
        COALESCE(current_setting('app.base_url', true), 'https://app.busesjm.cl'),
        v_hazard_id
      );
    WHEN 'report_overdue' THEN
      v_subject := '⚠️ Reporte de Peligro VENCIDO';
      v_html_body := format(
        '<h2>Hola %s,</h2>
        <p><strong>ATENCIÓN:</strong> El siguiente reporte de peligro ha vencido:</p>
        <blockquote>%s</blockquote>
        <p><strong>Fecha límite:</strong> %s</p>
        <p><a href="%s/pam/hazards/%s">Atender URGENTE</a></p>',
        COALESCE(v_user_name, 'Usuario'),
        LEFT(COALESCE(v_hazard_desc, 'Sin descripción'), 200),
        COALESCE(v_due_date::text, 'No especificada'),
        COALESCE(current_setting('app.base_url', true), 'https://app.busesjm.cl'),
        v_hazard_id
      );
    ELSE
      v_subject := 'Notificación de Reporte de Peligro';
      v_html_body := format(
        '<h2>Hola %s,</h2>
        <p>%s</p>
        <p><a href="%s/pam/hazards/%s">Ver en la App</a></p>',
        COALESCE(v_user_name, 'Usuario'),
        NEW.message,
        COALESCE(current_setting('app.base_url', true), 'https://app.busesjm.cl'),
        v_hazard_id
      );
  END CASE;

  -- Insertar en outbox
  INSERT INTO notification_outbox (
    entity_type,
    entity_id,
    notification_id,
    notification_type,
    recipient_email,
    recipient_name,
    subject,
    html_body
  ) VALUES (
    'hazard',
    NEW.hazard_report_id,
    NEW.id,
    NEW.type,
    v_user_email,
    v_user_name,
    v_subject,
    v_html_body
  );

  RETURN NEW;
END;
$$;

-- 7. Función para encolar email de PAM notification
CREATE OR REPLACE FUNCTION enqueue_pam_notification_email()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_user_email TEXT;
  v_user_name TEXT;
  v_task_desc TEXT;
  v_task_date DATE;
  v_subject TEXT;
  v_html_body TEXT;
BEGIN
  -- Obtener datos del usuario destinatario
  SELECT email, full_name INTO v_user_email, v_user_name
  FROM profiles
  WHERE user_id = NEW.user_id
  LIMIT 1;

  -- Si no hay email, no hacer nada
  IF v_user_email IS NULL THEN
    RETURN NEW;
  END IF;

  -- Obtener datos de la tarea
  SELECT description, date INTO v_task_desc, v_task_date
  FROM pam_tasks
  WHERE id = NEW.task_id
  LIMIT 1;

  -- Construir subject y body según tipo
  CASE NEW.type
    WHEN 'task_assigned' THEN
      v_subject := '📋 Nueva tarea PAM asignada';
      v_html_body := format(
        '<h2>Hola %s,</h2>
        <p>Se te ha asignado una nueva tarea:</p>
        <blockquote>%s</blockquote>
        <p><strong>Fecha:</strong> %s</p>
        <p><a href="%s/pam/tasks">Ver mis tareas</a></p>',
        COALESCE(v_user_name, 'Usuario'),
        LEFT(COALESCE(v_task_desc, 'Sin descripción'), 200),
        COALESCE(v_task_date::text, 'No especificada'),
        COALESCE(current_setting('app.base_url', true), 'https://app.busesjm.cl')
      );
    WHEN 'task_due_soon' THEN
      v_subject := '⏰ Tarea PAM próxima a vencer';
      v_html_body := format(
        '<h2>Hola %s,</h2>
        <p>Tienes una tarea próxima a vencer:</p>
        <blockquote>%s</blockquote>
        <p><strong>Fecha:</strong> %s</p>
        <p><a href="%s/pam/tasks">Completar tarea</a></p>',
        COALESCE(v_user_name, 'Usuario'),
        LEFT(COALESCE(v_task_desc, 'Sin descripción'), 200),
        COALESCE(v_task_date::text, 'No especificada'),
        COALESCE(current_setting('app.base_url', true), 'https://app.busesjm.cl')
      );
    WHEN 'task_overdue' THEN
      v_subject := '⚠️ Tarea PAM VENCIDA';
      v_html_body := format(
        '<h2>Hola %s,</h2>
        <p><strong>ATENCIÓN:</strong> La siguiente tarea ha vencido:</p>
        <blockquote>%s</blockquote>
        <p><strong>Fecha:</strong> %s</p>
        <p><a href="%s/pam/tasks">Atender URGENTE</a></p>',
        COALESCE(v_user_name, 'Usuario'),
        LEFT(COALESCE(v_task_desc, 'Sin descripción'), 200),
        COALESCE(v_task_date::text, 'No especificada'),
        COALESCE(current_setting('app.base_url', true), 'https://app.busesjm.cl')
      );
    ELSE
      v_subject := 'Notificación PAM';
      v_html_body := format(
        '<h2>Hola %s,</h2>
        <p>%s</p>
        <p><a href="%s/pam/tasks">Ver mis tareas</a></p>',
        COALESCE(v_user_name, 'Usuario'),
        NEW.message,
        COALESCE(current_setting('app.base_url', true), 'https://app.busesjm.cl')
      );
  END CASE;

  -- Insertar en outbox
  INSERT INTO notification_outbox (
    entity_type,
    entity_id,
    notification_id,
    notification_type,
    recipient_email,
    recipient_name,
    subject,
    html_body
  ) VALUES (
    'pam',
    NEW.task_id,
    NEW.id,
    NEW.type,
    v_user_email,
    v_user_name,
    v_subject,
    v_html_body
  );

  RETURN NEW;
END;
$$;

-- 8. Triggers para encolar emails automáticamente
DROP TRIGGER IF EXISTS trigger_enqueue_hazard_notification_email ON hazard_notifications;
CREATE TRIGGER trigger_enqueue_hazard_notification_email
  AFTER INSERT ON hazard_notifications
  FOR EACH ROW
  EXECUTE FUNCTION enqueue_hazard_notification_email();

DROP TRIGGER IF EXISTS trigger_enqueue_pam_notification_email ON pam_notifications;
CREATE TRIGGER trigger_enqueue_pam_notification_email
  AFTER INSERT ON pam_notifications
  FOR EACH ROW
  EXECUTE FUNCTION enqueue_pam_notification_email();