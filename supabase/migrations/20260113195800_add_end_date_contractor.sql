-- Agregar columnas end_date y contractor a pam_tasks

ALTER TABLE public.pam_tasks
  ADD COLUMN IF NOT EXISTS end_date date,
  ADD COLUMN IF NOT EXISTS contractor text;

-- Índice para búsquedas por contractor
CREATE INDEX IF NOT EXISTS idx_pam_tasks_contractor ON public.pam_tasks (contractor);
