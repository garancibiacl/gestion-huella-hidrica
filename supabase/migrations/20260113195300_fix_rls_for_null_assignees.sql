-- Corregir políticas RLS para que admins/prevencionistas vean TODAS las tareas
-- incluyendo aquellas con assignee_user_id NULL

-- 1. Eliminar políticas existentes
DROP POLICY IF EXISTS "pam_tasks_select_own_or_admin" ON public.pam_tasks;
DROP POLICY IF EXISTS "pam_tasks_update_own" ON public.pam_tasks;
DROP POLICY IF EXISTS "pam_tasks_admin_all" ON public.pam_tasks;

-- 2. Política de SELECT: Admins ven TODO, workers ven solo sus tareas
CREATE POLICY "pam_tasks_select_policy"
ON public.pam_tasks
FOR SELECT
USING (
  organization_id = get_user_organization_id(auth.uid())
  AND (
    -- Admins/prevencionistas ven todas las tareas de su organización
    public.is_pam_admin()
    OR
    -- Workers ven solo sus tareas asignadas
    assignee_user_id = auth.uid()
  )
);

-- 3. Política de UPDATE: Workers actualizan sus tareas, admins actualizan todo
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

-- 4. Política de INSERT/DELETE: Solo admins
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
