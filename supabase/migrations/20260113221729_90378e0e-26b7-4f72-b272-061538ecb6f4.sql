-- Permitir que assignee_user_id sea NULL en pam_tasks
-- Esto permite importar tareas aunque los correos no existan en profiles

ALTER TABLE public.pam_tasks 
  ALTER COLUMN assignee_user_id DROP NOT NULL;

-- Actualizar políticas RLS para manejar assignee_user_id NULL

-- Reemplazar política de selección para workers
DROP POLICY IF EXISTS "pam_tasks_select_own_or_admin" ON public.pam_tasks;

CREATE POLICY "pam_tasks_select_own_or_admin"
ON public.pam_tasks
FOR SELECT
USING (
  organization_id = get_user_organization_id(auth.uid())
  AND (
    assignee_user_id = auth.uid()
    OR assignee_user_id IS NULL
    OR public.is_pam_admin()
  )
);

-- Reemplazar política de actualización para workers
DROP POLICY IF EXISTS "pam_tasks_update_own" ON public.pam_tasks;

CREATE POLICY "pam_tasks_update_own"
ON public.pam_tasks
FOR UPDATE
USING (
  organization_id = get_user_organization_id(auth.uid())
  AND (
    assignee_user_id = auth.uid()
    OR (assignee_user_id IS NULL AND public.is_pam_admin())
  )
)
WITH CHECK (
  organization_id = get_user_organization_id(auth.uid())
  AND (
    assignee_user_id = auth.uid()
    OR (assignee_user_id IS NULL AND public.is_pam_admin())
  )
);