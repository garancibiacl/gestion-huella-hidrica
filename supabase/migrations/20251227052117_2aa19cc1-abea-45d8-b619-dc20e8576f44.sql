-- Fix DELETE policy for human_water_consumption
-- Allow all authenticated users to delete data for sync operations

-- Drop existing restrictive delete policy
DROP POLICY IF EXISTS "Users can delete their own human water consumption" ON public.human_water_consumption;
DROP POLICY IF EXISTS "Admins can delete human water consumption" ON public.human_water_consumption;

-- Create new permissive delete policy for all authenticated users
CREATE POLICY "Authenticated users can delete human water consumption"
ON public.human_water_consumption
FOR DELETE
TO authenticated
USING (true);