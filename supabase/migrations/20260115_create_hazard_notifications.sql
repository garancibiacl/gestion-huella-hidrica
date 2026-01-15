-- Tabla de notificaciones para Reportes de Peligros
CREATE TABLE IF NOT EXISTS hazard_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  hazard_report_id UUID REFERENCES hazard_reports(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN (
    'report_assigned',      -- Cuando se crea el reporte y se asigna responsable de cierre
    'report_closed',        -- Cuando se cierra el reporte (notifica a verificador)
    'report_due_soon',      -- Cuando se acerca la fecha de cierre
    'report_overdue'        -- Cuando se pasa la fecha de cierre
  )),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  read_at TIMESTAMPTZ
);

-- Índices para optimizar consultas
CREATE INDEX idx_hazard_notifications_user_id ON hazard_notifications(user_id);
CREATE INDEX idx_hazard_notifications_is_read ON hazard_notifications(is_read);
CREATE INDEX idx_hazard_notifications_created_at ON hazard_notifications(created_at DESC);
CREATE INDEX idx_hazard_notifications_report_id ON hazard_notifications(hazard_report_id);

-- RLS: usuarios solo ven sus propias notificaciones
ALTER TABLE hazard_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own hazard notifications"
  ON hazard_notifications
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own hazard notifications"
  ON hazard_notifications
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Función para crear notificación cuando se crea un reporte de peligro
CREATE OR REPLACE FUNCTION create_hazard_report_notification()
RETURNS TRIGGER AS $$
BEGIN
  -- Crear notificación para el responsable de cierre cuando se crea el reporte
  IF TG_OP = 'INSERT' AND NEW.closing_responsible_id IS NOT NULL THEN
    INSERT INTO hazard_notifications (
      organization_id,
      user_id,
      hazard_report_id,
      type,
      title,
      message
    ) VALUES (
      NEW.organization_id,
      NEW.closing_responsible_id,
      NEW.id,
      'report_assigned',
      'Nuevo Reporte de Peligro asignado',
      'Se te ha asignado un reporte de peligro: ' || COALESCE(NEW.description, 'Sin descripción')
    );
  END IF;
  
  -- Cuando se cierra el reporte, notificar al responsable de verificación
  IF TG_OP = 'UPDATE' AND OLD.status = 'ABIERTO' AND NEW.status = 'CERRADO' AND NEW.verification_responsible_id IS NOT NULL THEN
    INSERT INTO hazard_notifications (
      organization_id,
      user_id,
      hazard_report_id,
      type,
      title,
      message
    ) VALUES (
      NEW.organization_id,
      NEW.verification_responsible_id,
      NEW.id,
      'report_closed',
      'Reporte de Peligro cerrado - Requiere verificación',
      'El reporte "' || COALESCE(NEW.description, 'Sin descripción') || '" ha sido cerrado y requiere tu verificación.'
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para crear notificaciones automáticamente
CREATE TRIGGER trigger_create_hazard_report_notification
  AFTER INSERT OR UPDATE ON hazard_reports
  FOR EACH ROW
  EXECUTE FUNCTION create_hazard_report_notification();

-- Función para marcar notificación de hazard como leída
CREATE OR REPLACE FUNCTION mark_hazard_notification_read(notification_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE hazard_notifications
  SET is_read = true, read_at = now()
  WHERE id = notification_id AND user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para marcar todas las notificaciones de hazards como leídas
CREATE OR REPLACE FUNCTION mark_all_hazard_notifications_read()
RETURNS void AS $$
BEGIN
  UPDATE hazard_notifications
  SET is_read = true, read_at = now()
  WHERE user_id = auth.uid() AND is_read = false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION mark_hazard_notification_read(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION mark_all_hazard_notifications_read() TO authenticated;

-- Habilitar realtime para notificaciones
ALTER PUBLICATION supabase_realtime ADD TABLE hazard_notifications;

COMMENT ON TABLE hazard_notifications IS 'Notificaciones de Reportes de Peligros para responsables';
COMMENT ON FUNCTION create_hazard_report_notification() IS 'Trigger function que crea notificaciones automáticamente cuando se asigna o cierra un reporte de peligro';
COMMENT ON FUNCTION mark_hazard_notification_read(UUID) IS 'Marca una notificación de hazard específica como leída';
COMMENT ON FUNCTION mark_all_hazard_notifications_read() IS 'Marca todas las notificaciones de hazards del usuario como leídas';
