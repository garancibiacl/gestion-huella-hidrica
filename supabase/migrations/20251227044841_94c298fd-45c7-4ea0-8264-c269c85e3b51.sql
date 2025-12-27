-- Share operational data across authenticated users (admin + prevencionista)
-- Keep existing INSERT/UPDATE/DELETE behavior unchanged to minimize impact.

-- water_readings: replace per-user SELECT policy with shared SELECT
DROP POLICY IF EXISTS "Users can view their own water readings" ON public.water_readings;

CREATE POLICY "Authenticated users can view all water readings"
ON public.water_readings
FOR SELECT
TO authenticated
USING (true);

-- human_water_consumption: replace per-user SELECT policy with shared SELECT
DROP POLICY IF EXISTS "Users can view their own human water consumption" ON public.human_water_consumption;

CREATE POLICY "Authenticated users can view all human water consumption"
ON public.human_water_consumption
FOR SELECT
TO authenticated
USING (true);
