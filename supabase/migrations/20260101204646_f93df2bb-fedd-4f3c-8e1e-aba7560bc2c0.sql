-- Create risk_runs table to track execution history
CREATE TABLE public.risk_runs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  started_at timestamp with time zone NOT NULL DEFAULT now(),
  finished_at timestamp with time zone,
  alerts_created integer DEFAULT 0,
  alerts_updated integer DEFAULT 0,
  alerts_skipped integer DEFAULT 0,
  errors jsonb DEFAULT '[]'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.risk_runs ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view risk runs from their organization"
  ON public.risk_runs FOR SELECT
  USING (organization_id = get_user_organization_id(auth.uid()));

CREATE POLICY "Service role can manage all risk runs"
  ON public.risk_runs FOR ALL
  USING (auth.role() = 'service_role');

-- Index for faster queries
CREATE INDEX idx_risk_runs_org_started ON public.risk_runs(organization_id, started_at DESC);