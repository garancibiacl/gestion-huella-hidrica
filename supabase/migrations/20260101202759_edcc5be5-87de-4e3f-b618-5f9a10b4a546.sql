-- Add explanatory fields to risk_alerts table
ALTER TABLE public.risk_alerts
ADD COLUMN IF NOT EXISTS baseline_value numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS prev_value numeric DEFAULT NULL,
ADD COLUMN IF NOT EXISTS delta_pct numeric DEFAULT NULL,
ADD COLUMN IF NOT EXISTS seasonality_factor numeric DEFAULT 1,
ADD COLUMN IF NOT EXISTS confidence numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS data_points integer DEFAULT 0;