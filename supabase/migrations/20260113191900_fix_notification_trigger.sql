-- Modificar trigger para que solo cree notificaciones cuando assignee_user_id NO es NULL

CREATE OR REPLACE FUNCTION public.notify_pam_task_assigned()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Solo crear notificación si hay un usuario asignado
  IF NEW.assignee_user_id IS NOT NULL THEN
    INSERT INTO public.pam_notifications (
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
      'Nueva tarea asignada',
      'Se te ha asignado una nueva tarea: ' || LEFT(NEW.description, 100)
    );
  END IF;
  RETURN NEW;
END;
$$;
