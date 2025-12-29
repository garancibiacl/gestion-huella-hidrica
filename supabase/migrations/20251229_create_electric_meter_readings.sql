-- Create table for electric meter readings (consumo de luz por medidor)
create table public.electric_meter_readings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  period text not null, -- YYYY-MM
  fecha date,
  centro_trabajo text not null,
  medidor text not null,
  tipo_uso text,
  consumo_kwh numeric not null,
  costo_total numeric,
  proveedor text,
  observaciones text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Simple index for querying by organization/period
create index electric_meter_org_period_idx
  on public.electric_meter_readings (organization_id, period);

-- Enable RLS
alter table public.electric_meter_readings enable row level security;

-- Shared access policies (similar to water_readings)
create policy "All authenticated users can view electric meter readings"
  on public.electric_meter_readings
  for select
  to authenticated
  using (true);

create policy "All authenticated users can insert electric meter readings"
  on public.electric_meter_readings
  for insert
  to authenticated
  with check (true);

create policy "All authenticated users can update electric meter readings"
  on public.electric_meter_readings
  for update
  to authenticated
  using (true);

create policy "Admins can delete electric meter readings"
  on public.electric_meter_readings
  for delete
  to authenticated
  using (
    exists (
      select 1 from public.user_roles
      where user_roles.user_id = auth.uid()
        and user_roles.role = 'admin'
    )
  );

comment on table public.electric_meter_readings is 'Consumo de energía eléctrica por medidor (kWh y costo)';
