-- Add assignee_email column to pam_tasks table
ALTER TABLE public.pam_tasks 
ADD COLUMN IF NOT EXISTS assignee_email TEXT;