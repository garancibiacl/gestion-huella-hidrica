-- Tabla de notificaciones PAM
CREATE TABLE IF NOT EXISTS pam_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  task_id UUID REFERENCES pam_tasks(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('task_assigned', 'task_due_soon', 'task_overdue')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  read_at TIMESTAMPTZ
);

-- Índices para optimizar consultas
CREATE INDEX idx_pam_notifications_user_id ON pam_notifications(user_id);
CREATE INDEX idx_pam_notifications_is_read ON pam_notifications(is_read);
CREATE INDEX idx_pam_notifications_created_at ON pam_notifications(created_at DESC);
CREATE INDEX idx_pam_notifications_task_id ON pam_notifications(task_id);

-- RLS: usuarios solo ven sus propias notificaciones
ALTER TABLE pam_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications"
  ON pam_notifications
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
  ON pam_notifications
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Función para crear notificación cuando se asigna una tarea
CREATE OR REPLACE FUNCTION create_pam_task_notification()
RETURNS TRIGGER AS $$
BEGIN
  -- Solo crear notificación para tareas nuevas (no updates)
  IF TG_OP = 'INSERT' THEN
    INSERT INTO pam_notifications (
      organization_id,
      user_id,
      task_id,
      type,
      title,
      message
    ) VALUES (
      NEW.organization_id,
      NEW.assignee_user_id,
      NEW.id,
      'task_assigned',
      'Nueva tarea PAM asignada',
      'Se te ha asignado: ' || NEW.description
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para crear notificaciones automáticamente
CREATE TRIGGER trigger_create_pam_task_notification
  AFTER INSERT ON pam_tasks
  FOR EACH ROW
  EXECUTE FUNCTION create_pam_task_notification();

-- Función para marcar notificación como leída
CREATE OR REPLACE FUNCTION mark_pam_notification_read(notification_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE pam_notifications
  SET is_read = true, read_at = now()
  WHERE id = notification_id AND user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para marcar todas las notificaciones como leídas
CREATE OR REPLACE FUNCTION mark_all_pam_notifications_read()
RETURNS void AS $$
BEGIN
  UPDATE pam_notifications
  SET is_read = true, read_at = now()
  WHERE user_id = auth.uid() AND is_read = false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON TABLE pam_notifications IS 'Notificaciones de tareas PAM para trabajadores';
COMMENT ON FUNCTION create_pam_task_notification() IS 'Trigger function que crea notificación automáticamente cuando se asigna una tarea PAM';
COMMENT ON FUNCTION mark_pam_notification_read(UUID) IS 'Marca una notificación específica como leída';
COMMENT ON FUNCTION mark_all_pam_notifications_read() IS 'Marca todas las notificaciones del usuario como leídas';
