-- Create risk_alerts table for persisting server-generated alerts
CREATE TABLE public.risk_alerts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  center text NOT NULL,
  metric text NOT NULL CHECK (metric IN ('water_human', 'water_meter', 'energy')),
  period text NOT NULL,
  latest_value numeric NOT NULL DEFAULT 0,
  forecast_value numeric NOT NULL DEFAULT 0,
  forecast_cost numeric NOT NULL DEFAULT 0,
  range_min numeric NOT NULL DEFAULT 0,
  range_max numeric NOT NULL DEFAULT 0,
  range_cost_min numeric NOT NULL DEFAULT 0,
  range_cost_max numeric NOT NULL DEFAULT 0,
  score integer NOT NULL DEFAULT 0 CHECK (score >= 0 AND score <= 10),
  level text NOT NULL DEFAULT 'low' CHECK (level IN ('low', 'medium', 'high')),
  reasons jsonb NOT NULL DEFAULT '[]'::jsonb,
  actions jsonb NOT NULL DEFAULT '[]'::jsonb,
  change_detected boolean NOT NULL DEFAULT false,
  outlier boolean NOT NULL DEFAULT false,
  mix_current_pct numeric,
  mix_avg_pct numeric,
  mix_shift_pct numeric,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'acknowledged', 'resolved')),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(organization_id, center, metric, period)
);

-- Create indexes for common queries
CREATE INDEX idx_risk_alerts_org ON public.risk_alerts(organization_id);
CREATE INDEX idx_risk_alerts_org_status ON public.risk_alerts(organization_id, status);
CREATE INDEX idx_risk_alerts_org_level ON public.risk_alerts(organization_id, level);
CREATE INDEX idx_risk_alerts_period ON public.risk_alerts(period);

-- Enable RLS
ALTER TABLE public.risk_alerts ENABLE ROW LEVEL SECURITY;

-- RLS policies following existing pattern
CREATE POLICY "Users can view alerts from their organization"
ON public.risk_alerts FOR SELECT
USING (organization_id = get_user_organization_id(auth.uid()));

CREATE POLICY "Users can update alerts from their organization"
ON public.risk_alerts FOR UPDATE
USING (organization_id = get_user_organization_id(auth.uid()));

-- Service role can insert/upsert (for edge function)
CREATE POLICY "Service role can manage all alerts"
ON public.risk_alerts FOR ALL
USING (auth.role() = 'service_role');

-- Trigger for updated_at
CREATE TRIGGER update_risk_alerts_updated_at
BEFORE UPDATE ON public.risk_alerts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();