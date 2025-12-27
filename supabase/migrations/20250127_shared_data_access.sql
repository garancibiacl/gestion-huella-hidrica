-- Allow all authenticated users to view all water data (shared across organization)
-- This enables prevencionistas to see data synced by admins

-- Drop existing restrictive policies for water_readings
DROP POLICY IF EXISTS "Users can view their own water readings" ON public.water_readings;
DROP POLICY IF EXISTS "Users can insert their own water readings" ON public.water_readings;
DROP POLICY IF EXISTS "Users can update their own water readings" ON public.water_readings;
DROP POLICY IF EXISTS "Users can delete their own water readings" ON public.water_readings;

-- Create new shared policies for water_readings
CREATE POLICY "All authenticated users can view water readings"
  ON public.water_readings
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "All authenticated users can insert water readings"
  ON public.water_readings
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "All authenticated users can update water readings"
  ON public.water_readings
  FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Admins can delete water readings"
  ON public.water_readings
  FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Drop existing restrictive policies for human_water_consumption
DROP POLICY IF EXISTS "Users can view their own human water consumption" ON public.human_water_consumption;
DROP POLICY IF EXISTS "Users can insert their own human water consumption" ON public.human_water_consumption;
DROP POLICY IF EXISTS "Users can update their own human water consumption" ON public.human_water_consumption;
DROP POLICY IF EXISTS "Users can delete their own human water consumption" ON public.human_water_consumption;

-- Create new shared policies for human_water_consumption
CREATE POLICY "All authenticated users can view human water consumption"
  ON public.human_water_consumption
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "All authenticated users can insert human water consumption"
  ON public.human_water_consumption
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "All authenticated users can update human water consumption"
  ON public.human_water_consumption
  FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Admins can delete human water consumption"
  ON public.human_water_consumption
  FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Comment
COMMENT ON POLICY "All authenticated users can view water readings" ON public.water_readings 
  IS 'Shared data access: all users in the organization can view water readings';

COMMENT ON POLICY "All authenticated users can view human water consumption" ON public.human_water_consumption 
  IS 'Shared data access: all users in the organization can view human water consumption';
