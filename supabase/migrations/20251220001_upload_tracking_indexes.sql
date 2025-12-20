-- Improve lookup performance for upload history and retention handling
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relname = 'idx_upload_tracking_created_at' AND n.nspname = 'public'
  ) THEN
    CREATE INDEX idx_upload_tracking_created_at ON public.upload_tracking (created_at);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relname = 'idx_upload_tracking_uploaded_by' AND n.nspname = 'public'
  ) THEN
    CREATE INDEX idx_upload_tracking_uploaded_by ON public.upload_tracking (uploaded_by);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relname = 'idx_upload_tracking_processing_status' AND n.nspname = 'public'
  ) THEN
    CREATE INDEX idx_upload_tracking_processing_status ON public.upload_tracking (processing_status);
  END IF;
END$$;

-- Optional retention marker: set when files should be cleaned up if keep_file = false
ALTER TABLE public.upload_tracking
  ADD COLUMN IF NOT EXISTS delete_after timestamptz;

-- Backfill delete_after for past rows that should not be retained
UPDATE public.upload_tracking
SET delete_after = COALESCE(delete_after, created_at + interval '30 days')
WHERE keep_file = false;

