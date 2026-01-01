-- Create risk alerts table for predictive signals
create table public.risk_alerts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  center text not null,
  metric text not null check (metric in ('water_human', 'water_meter', 'energy')),
  period text not null,
  latest_value numeric not null default 0,
  forecast_value numeric not null default 0,
  forecast_cost numeric not null default 0,
  range_min numeric not null default 0,
  range_max numeric not null default 0,
  range_cost_min numeric not null default 0,
  range_cost_max numeric not null default 0,
  score int not null default 0,
  level text not null default 'low',
  reasons text[] not null default '{}'::text[],
  actions text[] not null default '{}'::text[],
  change_detected boolean not null default false,
  outlier boolean not null default false,
  mix_current_pct numeric,
  mix_avg_pct numeric,
  mix_shift_pct numeric,
  status text not null default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index risk_alerts_org_center_metric_period_key
  on public.risk_alerts (organization_id, center, metric, period);

create index risk_alerts_org_status_idx
  on public.risk_alerts (organization_id, status);

create index risk_alerts_org_created_idx
  on public.risk_alerts (organization_id, created_at desc);

alter table public.risk_alerts enable row level security;

create policy "Users can view risk alerts from their organization"
  on public.risk_alerts
  for select
  using (organization_id = public.get_user_organization_id(auth.uid()));

create policy "Users can update risk alerts from their organization"
  on public.risk_alerts
  for update
  using (organization_id = public.get_user_organization_id(auth.uid()));

create policy "Service role can insert risk alerts"
  on public.risk_alerts
  for insert
  with check (true);

create policy "Service role can update risk alerts"
  on public.risk_alerts
  for update
  using (true);

create trigger update_risk_alerts_updated_at
  before update on public.risk_alerts
  for each row execute function public.update_updated_at_column();
