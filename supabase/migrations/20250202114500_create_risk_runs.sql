create table public.risk_runs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text not null default 'running',
  alerts_upserted int not null default 0,
  errors jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index risk_runs_org_started_idx
  on public.risk_runs (organization_id, started_at desc);

alter table public.risk_runs enable row level security;

create policy "Users can view risk runs from their organization"
  on public.risk_runs
  for select
  using (organization_id = public.get_user_organization_id(auth.uid()));

create policy "Service role can insert risk runs"
  on public.risk_runs
  for insert
  with check (true);

create policy "Service role can update risk runs"
  on public.risk_runs
  for update
  using (true);
