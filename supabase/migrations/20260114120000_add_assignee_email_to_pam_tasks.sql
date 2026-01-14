ALTER TABLE public.pam_tasks
ADD COLUMN IF NOT EXISTS assignee_email text;
