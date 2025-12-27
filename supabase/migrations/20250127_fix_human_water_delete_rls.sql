-- Fix RLS policy for human_water_consumption to allow all authenticated users to delete
-- This is needed for the sync feature to work correctly (delete old + insert fresh)

-- Drop existing delete policy
DROP POLICY IF EXISTS "Admins can delete human water consumption" ON public.human_water_consumption;
DROP POLICY IF EXISTS "Users can delete their own human water consumption" ON public.human_water_consumption;

-- Create new policy that allows all authenticated users to delete
-- This is safe because the data is shared organizational data
CREATE POLICY "All authenticated users can delete human water consumption"
  ON public.human_water_consumption
  FOR DELETE
  TO authenticated
  USING (true);

-- Verify RLS is enabled
ALTER TABLE public.human_water_consumption ENABLE ROW LEVEL SECURITY;

COMMENT ON POLICY "All authenticated users can delete human water consumption" ON public.human_water_consumption 
  IS 'Shared organizational data: all authenticated users can delete for sync purposes';
