-- Add unique constraint for upsert on water_readings
ALTER TABLE public.water_readings 
ADD CONSTRAINT water_readings_user_id_period_unique UNIQUE (user_id, period);