-- Fix search_path for validation functions
CREATE OR REPLACE FUNCTION public.validate_water_meter_alerts_status()
RETURNS TRIGGER 
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.status NOT IN ('open', 'closed') THEN
    RAISE EXCEPTION 'Invalid status: %. Must be open or closed', NEW.status;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.validate_water_alert_tasks_status()
RETURNS TRIGGER 
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.status NOT IN ('pending', 'in_progress', 'completed') THEN
    RAISE EXCEPTION 'Invalid status: %. Must be pending, in_progress or completed', NEW.status;
  END IF;
  RETURN NEW;
END;
$$;