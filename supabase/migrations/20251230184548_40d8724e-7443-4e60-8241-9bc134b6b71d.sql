-- Prevent duplicate electric readings per organization/period/site/meter

-- 1) Remove any existing duplicates (keep the newest row by created_at/id)
DELETE FROM public.electric_meter_readings a
USING public.electric_meter_readings b
WHERE a.ctid < b.ctid
  AND a.organization_id = b.organization_id
  AND a.period = b.period
  AND a.centro_trabajo = b.centro_trabajo
  AND a.medidor = b.medidor;

-- 2) Add a unique constraint to enforce de-duplication going forward
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'electric_meter_readings_org_period_site_meter_key'
  ) THEN
    ALTER TABLE public.electric_meter_readings
      ADD CONSTRAINT electric_meter_readings_org_period_site_meter_key
      UNIQUE (organization_id, period, centro_trabajo, medidor);
  END IF;
END $$;

-- 3) Helpful index for dashboard queries (period ordering)
CREATE INDEX IF NOT EXISTS idx_electric_meter_readings_org_period
  ON public.electric_meter_readings (organization_id, period);
