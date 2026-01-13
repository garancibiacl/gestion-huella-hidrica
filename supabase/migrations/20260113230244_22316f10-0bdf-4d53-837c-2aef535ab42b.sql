-- Agregar columnas end_date y contractor a pam_tasks
ALTER TABLE public.pam_tasks
ADD COLUMN IF NOT EXISTS end_date date,
ADD COLUMN IF NOT EXISTS contractor text;

-- Índice para búsquedas por contractor
CREATE INDEX IF NOT EXISTS idx_pam_tasks_contractor ON public.pam_tasks (contractor);

-- Corregir políticas RLS para que admins/prevencionistas vean TODAS las tareas
DROP POLICY IF EXISTS "pam_tasks_select_own_or_admin" ON public.pam_tasks;
DROP POLICY IF EXISTS "pam_tasks_update_own" ON public.pam_tasks;
DROP POLICY IF EXISTS "pam_tasks_admin_all" ON public.pam_tasks;

CREATE POLICY "pam_tasks_select_policy"
ON public.pam_tasks
FOR SELECT
USING (
  organization_id = get_user_organization_id(auth.uid())
  AND (
    public.is_pam_admin()
    OR
    assignee_user_id = auth.uid()
  )
);

CREATE POLICY "pam_tasks_update_policy"
ON public.pam_tasks
FOR UPDATE
USING (
  organization_id = get_user_organization_id(auth.uid())
  AND (
    public.is_pam_admin()
    OR
    assignee_user_id = auth.uid()
  )
)
WITH CHECK (
  organization_id = get_user_organization_id(auth.uid())
  AND (
    public.is_pam_admin()
    OR
    assignee_user_id = auth.uid()
  )
);

CREATE POLICY "pam_tasks_insert_policy"
ON public.pam_tasks
FOR INSERT
WITH CHECK (
  public.is_pam_admin()
  AND organization_id = get_user_organization_id(auth.uid())
);

CREATE POLICY "pam_tasks_delete_policy"
ON public.pam_tasks
FOR DELETE
USING (
  public.is_pam_admin()
  AND organization_id = get_user_organization_id(auth.uid())
);