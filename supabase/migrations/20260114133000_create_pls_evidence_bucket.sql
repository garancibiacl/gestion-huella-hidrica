INSERT INTO storage.buckets (id, name, public)
VALUES ('pls-evidence', 'pls-evidence', false)
ON CONFLICT (id) DO NOTHING;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'pls_evidence_select'
  ) THEN
    CREATE POLICY "pls_evidence_select"
      ON storage.objects
      FOR SELECT
      USING (bucket_id = 'pls-evidence' AND auth.role() = 'authenticated');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'pls_evidence_insert'
  ) THEN
    CREATE POLICY "pls_evidence_insert"
      ON storage.objects
      FOR INSERT
      WITH CHECK (bucket_id = 'pls-evidence' AND auth.role() = 'authenticated');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'pls_evidence_delete'
  ) THEN
    CREATE POLICY "pls_evidence_delete"
      ON storage.objects
      FOR DELETE
      USING (bucket_id = 'pls-evidence' AND auth.role() = 'authenticated');
  END IF;
END $$;
