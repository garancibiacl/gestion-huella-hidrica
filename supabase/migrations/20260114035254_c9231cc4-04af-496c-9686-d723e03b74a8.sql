-- Crear trigger para notificar cuando se asigna una tarea
CREATE TRIGGER pam_task_assigned_notification
AFTER INSERT ON public.pam_tasks
FOR EACH ROW
EXECUTE FUNCTION public.notify_pam_task_assigned();