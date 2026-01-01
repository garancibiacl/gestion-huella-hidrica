alter table public.risk_alerts
  add column baseline_value numeric,
  add column prev_value numeric,
  add column delta_pct numeric,
  add column seasonality_factor numeric,
  add column confidence numeric,
  add column data_points int;
