-- Create sync_runs table for tracking synchronization metadata
CREATE TABLE IF NOT EXISTS public.sync_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  source text NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  rows_inserted int DEFAULT 0,
  rows_updated int DEFAULT 0,
  errors jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS on sync_runs
ALTER TABLE public.sync_runs ENABLE ROW LEVEL SECURITY;

-- Policy: users can only see their own sync runs
CREATE POLICY "Users can view own sync runs"
  ON public.sync_runs
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: authenticated users can insert sync runs
CREATE POLICY "Authenticated users can insert sync runs"
  ON public.sync_runs
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: users can update own sync runs  
CREATE POLICY "Users can update own sync runs"
  ON public.sync_runs
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Create indexes for faster queries
CREATE INDEX sync_runs_user_id_idx ON public.sync_runs(user_id);
CREATE INDEX sync_runs_started_at_idx ON public.sync_runs(started_at DESC);

-- Add comment
COMMENT ON TABLE public.sync_runs IS 'Tracks synchronization runs from Google Sheets and manual uploads';