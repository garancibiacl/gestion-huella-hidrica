-- Create electric_meter_readings table for electricity consumption tracking
CREATE TABLE public.electric_meter_readings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id),
  user_id UUID NOT NULL,
  period TEXT NOT NULL,
  centro_trabajo TEXT NOT NULL,
  medidor TEXT NOT NULL,
  tipo_uso TEXT,
  consumo_kwh NUMERIC NOT NULL DEFAULT 0,
  costo_total NUMERIC,
  proveedor TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.electric_meter_readings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view electric readings from their organization" 
ON public.electric_meter_readings 
FOR SELECT 
USING (organization_id = get_user_organization_id(auth.uid()));

CREATE POLICY "Users can insert electric readings for their organization" 
ON public.electric_meter_readings 
FOR INSERT 
WITH CHECK (auth.uid() = user_id AND organization_id = get_user_organization_id(auth.uid()));

CREATE POLICY "Users can update their own electric readings" 
ON public.electric_meter_readings 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own electric readings" 
ON public.electric_meter_readings 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_electric_meter_readings_updated_at
BEFORE UPDATE ON public.electric_meter_readings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for the table
ALTER PUBLICATION supabase_realtime ADD TABLE public.electric_meter_readings;