-- Force update RLS policies for water_readings to allow shared access
-- This ensures prevencionistas can see the same data as admins

-- Drop ALL existing policies for water_readings (including any duplicates)
DO $$ 
DECLARE
    pol record;
BEGIN
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'water_readings' 
        AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.water_readings', pol.policyname);
    END LOOP;
END $$;

-- Create new shared policies for water_readings
CREATE POLICY "shared_select_water_readings"
  ON public.water_readings
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "shared_insert_water_readings"
  ON public.water_readings
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "shared_update_water_readings"
  ON public.water_readings
  FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "admin_delete_water_readings"
  ON public.water_readings
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Verify RLS is enabled
ALTER TABLE public.water_readings ENABLE ROW LEVEL SECURITY;

-- Add helpful comments
COMMENT ON POLICY "shared_select_water_readings" ON public.water_readings 
  IS 'All authenticated users can view all water readings (shared organizational data)';

COMMENT ON POLICY "admin_delete_water_readings" ON public.water_readings 
  IS 'Only admins can delete water readings';
