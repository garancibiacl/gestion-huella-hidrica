-- Create enum for water format
CREATE TYPE public.water_format AS ENUM ('botella', 'bidon_20l');

-- Create table for human water consumption
CREATE TABLE public.human_water_consumption (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  period TEXT NOT NULL, -- YYYY-MM format
  fecha DATE,
  centro_trabajo TEXT NOT NULL,
  faena TEXT,
  formato water_format NOT NULL,
  proveedor TEXT,
  cantidad NUMERIC NOT NULL DEFAULT 0,
  unidad TEXT DEFAULT 'unidad',
  precio_unitario NUMERIC,
  total_costo NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.human_water_consumption ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own human water consumption" 
ON public.human_water_consumption 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own human water consumption" 
ON public.human_water_consumption 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own human water consumption" 
ON public.human_water_consumption 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own human water consumption" 
ON public.human_water_consumption 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_human_water_consumption_updated_at
BEFORE UPDATE ON public.human_water_consumption
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster queries
CREATE INDEX idx_human_water_consumption_period ON public.human_water_consumption(period);
CREATE INDEX idx_human_water_consumption_centro ON public.human_water_consumption(centro_trabajo);
CREATE INDEX idx_human_water_consumption_user ON public.human_water_consumption(user_id);