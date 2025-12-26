-- Drop existing RESTRICTIVE policies and recreate as PERMISSIVE
DROP POLICY IF EXISTS "Users can view their own human water consumption" ON public.human_water_consumption;
DROP POLICY IF EXISTS "Users can insert their own human water consumption" ON public.human_water_consumption;
DROP POLICY IF EXISTS "Users can update their own human water consumption" ON public.human_water_consumption;
DROP POLICY IF EXISTS "Users can delete their own human water consumption" ON public.human_water_consumption;

-- Create PERMISSIVE policies (default)
CREATE POLICY "Users can view their own human water consumption"
ON public.human_water_consumption
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own human water consumption"
ON public.human_water_consumption
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own human water consumption"
ON public.human_water_consumption
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own human water consumption"
ON public.human_water_consumption
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);