-- Add unique constraints for UPSERT operations
-- water_readings: unique per user and period
alter table public.water_readings
  add constraint water_readings_user_period_uniq
  unique (user_id, period);

-- human_water_consumption: unique per user, period, centro, and formato
alter table public.human_water_consumption
  add constraint human_water_user_period_centro_formato_uniq
  unique (user_id, period, centro_trabajo, formato);

-- Create sync_runs table for tracking synchronization metadata
create table public.sync_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source text not null, -- 'google_sheets' or 'manual_upload'
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  rows_inserted int default 0,
  rows_updated int default 0,
  errors jsonb default '[]'::jsonb,
  created_at timestamptz not null default now()
);

-- Enable RLS on sync_runs
alter table public.sync_runs enable row level security;

-- Policy: users can only see their own sync runs
create policy "Users can view own sync runs"
  on public.sync_runs
  for select
  using (auth.uid() = user_id);

-- Policy: service role can insert sync runs
create policy "Service role can insert sync runs"
  on public.sync_runs
  for insert
  with check (true);

-- Create index for faster queries
create index sync_runs_user_id_idx on public.sync_runs(user_id);
create index sync_runs_started_at_idx on public.sync_runs(started_at desc);

-- Add comment
comment on table public.sync_runs is 'Tracks synchronization runs from Google Sheets and manual uploads';
