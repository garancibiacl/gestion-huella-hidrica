-- Tabla de notificaciones para Reportes de Peligros
CREATE TABLE IF NOT EXISTS hazard_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  hazard_report_id UUID REFERENCES hazard_reports(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_hazard_notifications_user_id ON hazard_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_hazard_notifications_org_id ON hazard_notifications(organization_id);
CREATE INDEX IF NOT EXISTS idx_hazard_notifications_unread ON hazard_notifications(user_id, is_read) WHERE is_read = false;

-- Habilitar RLS
ALTER TABLE hazard_notifications ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Users can view their own hazard notifications"
  ON hazard_notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert hazard notifications"
  ON hazard_notifications FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.organization_id = hazard_notifications.organization_id
    )
  );

CREATE POLICY "Users can update their own hazard notifications"
  ON hazard_notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- Función para marcar notificación como leída
CREATE OR REPLACE FUNCTION mark_hazard_notification_read(notification_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE hazard_notifications
  SET is_read = true, read_at = now()
  WHERE id = notification_id AND user_id = auth.uid();
END;
$$;

-- Función para marcar todas como leídas
CREATE OR REPLACE FUNCTION mark_all_hazard_notifications_read()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE hazard_notifications
  SET is_read = true, read_at = now()
  WHERE user_id = auth.uid() AND is_read = false;
END;
$$;

-- Trigger al crear reporte de peligro (notifica al responsable de cierre)
CREATE OR REPLACE FUNCTION notify_hazard_report_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  responsible_user_id UUID;
BEGIN
  -- Buscar el user_id del responsable de cierre por email
  IF NEW.closing_responsible_id IS NOT NULL THEN
    SELECT p.user_id INTO responsible_user_id
    FROM hazard_responsibles hr
    JOIN profiles p ON LOWER(TRIM(p.email)) = LOWER(TRIM(hr.email))
    WHERE hr.id = NEW.closing_responsible_id
    AND p.organization_id = NEW.organization_id
    LIMIT 1;

    IF responsible_user_id IS NOT NULL THEN
      INSERT INTO hazard_notifications (
        organization_id,
        user_id,
        hazard_report_id,
        type,
        title,
        message
      ) VALUES (
        NEW.organization_id,
        responsible_user_id,
        NEW.id,
        'report_assigned',
        'Nuevo Reporte de Peligro asignado',
        'Se te ha asignado un nuevo reporte: ' || LEFT(NEW.description, 100)
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_notify_hazard_report_created
  AFTER INSERT ON hazard_reports
  FOR EACH ROW
  EXECUTE FUNCTION notify_hazard_report_created();

-- Trigger al cerrar reporte (notifica al responsable de verificación)
CREATE OR REPLACE FUNCTION notify_hazard_report_closed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  responsible_user_id UUID;
BEGIN
  -- Solo si cambia a CLOSED
  IF NEW.status = 'CLOSED' AND OLD.status != 'CLOSED' THEN
    -- Buscar el user_id del responsable de verificación
    IF NEW.verification_responsible_id IS NOT NULL THEN
      SELECT p.user_id INTO responsible_user_id
      FROM hazard_responsibles hr
      JOIN profiles p ON LOWER(TRIM(p.email)) = LOWER(TRIM(hr.email))
      WHERE hr.id = NEW.verification_responsible_id
      AND p.organization_id = NEW.organization_id
      LIMIT 1;

      IF responsible_user_id IS NOT NULL THEN
        INSERT INTO hazard_notifications (
          organization_id,
          user_id,
          hazard_report_id,
          type,
          title,
          message
        ) VALUES (
          NEW.organization_id,
          responsible_user_id,
          NEW.id,
          'report_closed',
          'Reporte de Peligro cerrado - Verificación requerida',
          'El reporte ha sido cerrado y requiere tu verificación: ' || LEFT(NEW.description, 100)
        );
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_notify_hazard_report_closed
  AFTER UPDATE ON hazard_reports
  FOR EACH ROW
  EXECUTE FUNCTION notify_hazard_report_closed();

-- Habilitar realtime para notificaciones
ALTER PUBLICATION supabase_realtime ADD TABLE hazard_notifications;