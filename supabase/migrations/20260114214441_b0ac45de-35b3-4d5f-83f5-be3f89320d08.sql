-- Create bucket for PLS evidence files
INSERT INTO storage.buckets (id, name, public)
VALUES ('pls-evidence', 'pls-evidence', false)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if they exist (to recreate them correctly)
DROP POLICY IF EXISTS "pls_evidence_select" ON storage.objects;
DROP POLICY IF EXISTS "pls_evidence_insert" ON storage.objects;
DROP POLICY IF EXISTS "pls_evidence_delete" ON storage.objects;

-- Create RLS policies for authenticated users
CREATE POLICY "pls_evidence_select"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (bucket_id = 'pls-evidence');

CREATE POLICY "pls_evidence_insert"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'pls-evidence');

CREATE POLICY "pls_evidence_delete"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'pls-evidence');