-- Tabla para lecturas de medidores de agua (m³)
CREATE TABLE IF NOT EXISTS public.water_meter_readings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  period VARCHAR(7) NOT NULL,
  centro_trabajo VARCHAR(255) NOT NULL,
  direccion VARCHAR(255),
  medidor VARCHAR(100) NOT NULL,
  lectura_m3 NUMERIC(12,3) DEFAULT 0,
  consumo_m3 NUMERIC(12,3) NOT NULL DEFAULT 0,
  sobre_consumo_m3 NUMERIC(12,3) DEFAULT 0,
  costo_total NUMERIC(12,2),
  observaciones TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_water_meter_readings_org ON public.water_meter_readings(organization_id);
CREATE INDEX IF NOT EXISTS idx_water_meter_readings_period ON public.water_meter_readings(period);
CREATE INDEX IF NOT EXISTS idx_water_meter_readings_user ON public.water_meter_readings(user_id);

-- Habilitar RLS
ALTER TABLE public.water_meter_readings ENABLE ROW LEVEL SECURITY;

-- Políticas RLS usando función security definer existente
CREATE POLICY "Users can view water meter readings from their organization"
ON public.water_meter_readings FOR SELECT
USING (organization_id = get_user_organization_id(auth.uid()));

CREATE POLICY "Users can insert water meter readings for their organization"
ON public.water_meter_readings FOR INSERT
WITH CHECK (auth.uid() = user_id AND organization_id = get_user_organization_id(auth.uid()));

CREATE POLICY "Users can update their own water meter readings"
ON public.water_meter_readings FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own water meter readings"
ON public.water_meter_readings FOR DELETE
USING (auth.uid() = user_id);

-- Trigger para actualizar updated_at
CREATE TRIGGER update_water_meter_readings_updated_at
BEFORE UPDATE ON public.water_meter_readings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();