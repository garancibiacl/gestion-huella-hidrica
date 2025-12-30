-- Tabla para lecturas de medidores de agua (m³)
CREATE TABLE IF NOT EXISTS public.water_meter_readings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  period VARCHAR(7) NOT NULL, -- formato YYYY-MM
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

-- Índices
CREATE INDEX IF NOT EXISTS idx_water_meter_readings_org ON public.water_meter_readings(organization_id);
CREATE INDEX IF NOT EXISTS idx_water_meter_readings_period ON public.water_meter_readings(period);
CREATE INDEX IF NOT EXISTS idx_water_meter_readings_centro ON public.water_meter_readings(centro_trabajo);

-- RLS
ALTER TABLE public.water_meter_readings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view water meter readings of their organization"
  ON public.water_meter_readings FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert water meter readings for their organization"
  ON public.water_meter_readings FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update water meter readings of their organization"
  ON public.water_meter_readings FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM public.profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete water meter readings of their organization"
  ON public.water_meter_readings FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM public.profiles WHERE user_id = auth.uid()
    )
  );

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_water_meter_readings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_water_meter_readings_updated_at
  BEFORE UPDATE ON public.water_meter_readings
  FOR EACH ROW
  EXECUTE FUNCTION update_water_meter_readings_updated_at();

-- Habilitar realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.water_meter_readings;
