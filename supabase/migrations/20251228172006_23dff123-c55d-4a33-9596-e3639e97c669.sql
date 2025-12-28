
-- 1. Create organizations table
CREATE TABLE public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on organizations
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- Insert "Buses JM" as the first organization
INSERT INTO public.organizations (id, name) VALUES 
  ('00000000-0000-0000-0000-000000000001', 'Buses JM');

-- 2. Add organization_id to profiles
ALTER TABLE public.profiles 
ADD COLUMN organization_id UUID REFERENCES public.organizations(id);

-- Backfill all existing profiles with "Buses JM"
UPDATE public.profiles 
SET organization_id = '00000000-0000-0000-0000-000000000001'
WHERE organization_id IS NULL;

-- 3. Add organization_id to water_readings
ALTER TABLE public.water_readings 
ADD COLUMN organization_id UUID REFERENCES public.organizations(id);

-- Backfill all existing water_readings
UPDATE public.water_readings 
SET organization_id = '00000000-0000-0000-0000-000000000001'
WHERE organization_id IS NULL;

-- 4. Add organization_id to human_water_consumption
ALTER TABLE public.human_water_consumption 
ADD COLUMN organization_id UUID REFERENCES public.organizations(id);

-- Backfill all existing human_water_consumption
UPDATE public.human_water_consumption 
SET organization_id = '00000000-0000-0000-0000-000000000001'
WHERE organization_id IS NULL;

-- 5. Create helper function to get user's organization
CREATE OR REPLACE FUNCTION public.get_user_organization_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organization_id 
  FROM public.profiles 
  WHERE user_id = _user_id
  LIMIT 1
$$;

-- 6. RLS policies for organizations table
CREATE POLICY "Users can view their own organization"
ON public.organizations
FOR SELECT
USING (id = public.get_user_organization_id(auth.uid()));

-- 7. Update water_readings RLS policies to include organization filter
DROP POLICY IF EXISTS "Authenticated users can view all water readings" ON public.water_readings;

CREATE POLICY "Users can view water readings from their organization"
ON public.water_readings
FOR SELECT
USING (organization_id = public.get_user_organization_id(auth.uid()));

-- Update insert policy to set organization_id
DROP POLICY IF EXISTS "Users can insert their own water readings" ON public.water_readings;

CREATE POLICY "Users can insert water readings for their organization"
ON public.water_readings
FOR INSERT
WITH CHECK (
  auth.uid() = user_id 
  AND organization_id = public.get_user_organization_id(auth.uid())
);

-- Update policy remains the same (user can only update their own)
-- Delete policy remains the same (user can only delete their own)

-- 8. Update human_water_consumption RLS policies
DROP POLICY IF EXISTS "Authenticated users can view all human water consumption" ON public.human_water_consumption;

CREATE POLICY "Users can view human water consumption from their organization"
ON public.human_water_consumption
FOR SELECT
USING (organization_id = public.get_user_organization_id(auth.uid()));

-- Update insert policy
DROP POLICY IF EXISTS "Users can insert their own human water consumption" ON public.human_water_consumption;

CREATE POLICY "Users can insert human water consumption for their organization"
ON public.human_water_consumption
FOR INSERT
WITH CHECK (
  auth.uid() = user_id 
  AND organization_id = public.get_user_organization_id(auth.uid())
);

-- 9. Make organization_id NOT NULL after backfill
ALTER TABLE public.profiles 
ALTER COLUMN organization_id SET NOT NULL;

ALTER TABLE public.water_readings 
ALTER COLUMN organization_id SET NOT NULL;

ALTER TABLE public.human_water_consumption 
ALTER COLUMN organization_id SET NOT NULL;

-- 10. Add trigger to update updated_at on organizations
CREATE TRIGGER update_organizations_updated_at
BEFORE UPDATE ON public.organizations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
