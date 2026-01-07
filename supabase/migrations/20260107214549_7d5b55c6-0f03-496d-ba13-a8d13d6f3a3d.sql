-- ALERTS TABLE
CREATE TABLE IF NOT EXISTS public.water_meter_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  centro_trabajo text NOT NULL,
  medidor text NOT NULL,
  period text NOT NULL,
  baseline_m3 numeric NOT NULL,
  current_m3 numeric NOT NULL,
  delta_pct numeric NOT NULL,
  confidence numeric NOT NULL,
  data_points int NOT NULL,
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create validation trigger instead of CHECK constraint for status
CREATE OR REPLACE FUNCTION public.validate_water_meter_alerts_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status NOT IN ('open', 'closed') THEN
    RAISE EXCEPTION 'Invalid status: %. Must be open or closed', NEW.status;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER water_meter_alerts_status_check
  BEFORE INSERT OR UPDATE ON public.water_meter_alerts
  FOR EACH ROW EXECUTE FUNCTION public.validate_water_meter_alerts_status();

CREATE UNIQUE INDEX IF NOT EXISTS water_meter_alerts_org_ctr_med_period_uidx
  ON public.water_meter_alerts (organization_id, centro_trabajo, medidor, period);

CREATE INDEX IF NOT EXISTS water_meter_alerts_org_idx
  ON public.water_meter_alerts (organization_id);

-- TASKS TABLE
CREATE TABLE IF NOT EXISTS public.water_alert_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_id uuid NOT NULL REFERENCES public.water_meter_alerts(id) ON DELETE CASCADE,
  title text NOT NULL,
  assignee_id uuid NULL,
  due_date date NULL,
  status text NOT NULL DEFAULT 'pending',
  evidence_url text NULL,
  notes text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create validation trigger for tasks status
CREATE OR REPLACE FUNCTION public.validate_water_alert_tasks_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status NOT IN ('pending', 'in_progress', 'completed') THEN
    RAISE EXCEPTION 'Invalid status: %. Must be pending, in_progress or completed', NEW.status;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER water_alert_tasks_status_check
  BEFORE INSERT OR UPDATE ON public.water_alert_tasks
  FOR EACH ROW EXECUTE FUNCTION public.validate_water_alert_tasks_status();

CREATE INDEX IF NOT EXISTS water_alert_tasks_alert_idx
  ON public.water_alert_tasks (alert_id);

-- Trigger for updated_at
CREATE TRIGGER update_water_alert_tasks_updated_at
  BEFORE UPDATE ON public.water_alert_tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS
ALTER TABLE public.water_meter_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.water_alert_tasks ENABLE ROW LEVEL SECURITY;

-- Policies for water_meter_alerts
CREATE POLICY "Users can view alerts from their organization"
ON public.water_meter_alerts FOR SELECT
USING (organization_id = get_user_organization_id(auth.uid()));

CREATE POLICY "Users can insert alerts for their organization"
ON public.water_meter_alerts FOR INSERT
WITH CHECK (organization_id = get_user_organization_id(auth.uid()));

CREATE POLICY "Users can update alerts from their organization"
ON public.water_meter_alerts FOR UPDATE
USING (organization_id = get_user_organization_id(auth.uid()));

CREATE POLICY "Users can delete alerts from their organization"
ON public.water_meter_alerts FOR DELETE
USING (organization_id = get_user_organization_id(auth.uid()));

-- Policies for water_alert_tasks
CREATE POLICY "Users can view tasks from their organization alerts"
ON public.water_alert_tasks FOR SELECT
USING (
  alert_id IN (
    SELECT id FROM public.water_meter_alerts
    WHERE organization_id = get_user_organization_id(auth.uid())
  )
);

CREATE POLICY "Users can insert tasks for their organization alerts"
ON public.water_alert_tasks FOR INSERT
WITH CHECK (
  alert_id IN (
    SELECT id FROM public.water_meter_alerts
    WHERE organization_id = get_user_organization_id(auth.uid())
  )
);

CREATE POLICY "Users can update tasks from their organization alerts"
ON public.water_alert_tasks FOR UPDATE
USING (
  alert_id IN (
    SELECT id FROM public.water_meter_alerts
    WHERE organization_id = get_user_organization_id(auth.uid())
  )
);

CREATE POLICY "Users can delete tasks from their organization alerts"
ON public.water_alert_tasks FOR DELETE
USING (
  alert_id IN (
    SELECT id FROM public.water_meter_alerts
    WHERE organization_id = get_user_organization_id(auth.uid())
  )
);