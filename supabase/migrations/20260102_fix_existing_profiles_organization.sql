-- Fix existing profiles without organization_id
-- Assign default organization "Buses JM" to all profiles that don't have one

DO $$
DECLARE
  default_org_id uuid;
BEGIN
  -- Get or create the default organization
  SELECT id INTO default_org_id FROM public.organizations WHERE name = 'Buses JM' LIMIT 1;
  
  IF default_org_id IS NULL THEN
    INSERT INTO public.organizations (name) VALUES ('Buses JM') RETURNING id INTO default_org_id;
  END IF;

  -- Update all profiles without organization_id
  UPDATE public.profiles
  SET organization_id = default_org_id
  WHERE organization_id IS NULL;
  
  RAISE NOTICE 'Updated % profiles with default organization', (SELECT COUNT(*) FROM public.profiles WHERE organization_id = default_org_id);
END $$;
