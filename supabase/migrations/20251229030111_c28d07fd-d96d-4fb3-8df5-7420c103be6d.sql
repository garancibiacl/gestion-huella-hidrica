-- Update handle_new_user trigger to assign default organization "Buses JM"
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  default_org_id uuid;
BEGIN
  -- Get the default organization (Buses JM)
  SELECT id INTO default_org_id FROM public.organizations WHERE name = 'Buses JM' LIMIT 1;
  
  -- If no default org exists, create it
  IF default_org_id IS NULL THEN
    INSERT INTO public.organizations (name) VALUES ('Buses JM') RETURNING id INTO default_org_id;
  END IF;

  -- Insert profile with organization_id
  INSERT INTO public.profiles (user_id, email, full_name, organization_id)
  VALUES (new.id, new.email, new.raw_user_meta_data ->> 'full_name', default_org_id);
  
  -- Insert default measurement criteria
  INSERT INTO public.measurement_criteria (user_id)
  VALUES (new.id);
  
  RETURN new;
END;
$$;