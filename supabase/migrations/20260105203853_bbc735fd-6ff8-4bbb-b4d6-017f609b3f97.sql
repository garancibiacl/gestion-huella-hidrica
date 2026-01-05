-- Create petroleum_consumption table
CREATE TABLE public.petroleum_consumption (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  period text NOT NULL,
  period_label text,
  date_emission date,
  date_payment date,
  center text,
  company text,
  supplier text,
  liters numeric,
  total_cost numeric,
  mining_use_raw text,
  is_mining_use boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.petroleum_consumption ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view petroleum consumption from their organization"
ON public.petroleum_consumption
FOR SELECT
USING (organization_id = get_user_organization_id(auth.uid()));

CREATE POLICY "Users can insert petroleum consumption for their organization"
ON public.petroleum_consumption
FOR INSERT
WITH CHECK (auth.uid() = user_id AND organization_id = get_user_organization_id(auth.uid()));

CREATE POLICY "Users can update their own petroleum consumption"
ON public.petroleum_consumption
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own petroleum consumption"
ON public.petroleum_consumption
FOR DELETE
USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_petroleum_consumption_updated_at
BEFORE UPDATE ON public.petroleum_consumption
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();