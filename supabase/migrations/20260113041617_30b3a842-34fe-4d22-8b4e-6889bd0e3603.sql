-- Create pam_notifications table
CREATE TABLE public.pam_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  user_id uuid NOT NULL,
  task_id uuid REFERENCES public.pam_tasks(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('task_assigned', 'task_due_soon', 'task_overdue')),
  title text NOT NULL,
  message text NOT NULL,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  read_at timestamptz
);

-- Enable RLS
ALTER TABLE public.pam_notifications ENABLE ROW LEVEL SECURITY;

-- RLS policies: users can only see their own notifications
CREATE POLICY "pam_notifications_select_own"
  ON public.pam_notifications FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "pam_notifications_update_own"
  ON public.pam_notifications FOR UPDATE
  USING (user_id = auth.uid());

-- Admins can manage all notifications in their org
CREATE POLICY "pam_notifications_admin_all"
  ON public.pam_notifications FOR ALL
  USING (is_pam_admin() AND organization_id = get_user_organization_id(auth.uid()))
  WITH CHECK (is_pam_admin() AND organization_id = get_user_organization_id(auth.uid()));

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.pam_notifications;

-- Function to create notification when task is assigned
CREATE OR REPLACE FUNCTION public.notify_pam_task_assigned()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
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
  RETURN NEW;
END;
$$;

-- Trigger to auto-create notification on task insert
CREATE TRIGGER pam_task_notify_on_insert
  AFTER INSERT ON public.pam_tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_pam_task_assigned();

-- Function to mark notification as read
CREATE OR REPLACE FUNCTION public.mark_pam_notification_read(notification_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.pam_notifications
  SET is_read = true, read_at = timezone('utc', now())
  WHERE id = notification_id AND user_id = auth.uid();
END;
$$;

-- Function to mark all notifications as read
CREATE OR REPLACE FUNCTION public.mark_all_pam_notifications_read()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.pam_notifications
  SET is_read = true, read_at = timezone('utc', now())
  WHERE user_id = auth.uid() AND is_read = false;
END;
$$;