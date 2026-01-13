-- Agregar el rol 'worker' al enum app_role si aún no existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
      AND t.typname = 'app_role'
      AND e.enumlabel = 'worker'
  ) THEN
    ALTER TYPE public.app_role ADD VALUE 'worker';
  END IF;
END$$;