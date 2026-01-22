-- 031_security_search_path_and_warnings.sql
--
-- Purpose:
-- - Fix "Function Search Path Mutable" warnings
-- - Move vector extension out of public schema
-- - Tighten bug_reports INSERT policy (avoid always-true WITH CHECK)

-- -----------------------------------------------------------------------------
-- 1) Move vector extension to "extensions" schema (Supabase recommendation)
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'vector') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'extensions') THEN
      CREATE SCHEMA extensions;
    END IF;

    -- Only move if not already in extensions
    IF EXISTS (
      SELECT 1
      FROM pg_extension e
      JOIN pg_namespace n ON n.oid = e.extnamespace
      WHERE e.extname = 'vector' AND n.nspname <> 'extensions'
    ) THEN
      EXECUTE 'ALTER EXTENSION vector SET SCHEMA extensions';
    END IF;
  END IF;
END $$;

-- Ensure roles can use extension types/functions
GRANT USAGE ON SCHEMA extensions TO anon, authenticated, service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA extensions TO anon, authenticated, service_role;
-- Postgres doesn't support "ALL TYPES IN SCHEMA" on some versions.
-- Grant usage for existing types, and set defaults for future types.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE n.nspname = 'extensions' AND t.typname = 'vector') THEN
    EXECUTE 'GRANT USAGE ON TYPE extensions.vector TO anon, authenticated, service_role';
  END IF;
END $$;
ALTER DEFAULT PRIVILEGES IN SCHEMA extensions GRANT USAGE ON TYPES TO anon, authenticated, service_role;

-- -----------------------------------------------------------------------------
-- 2) Fix permissive RLS policy on bug_reports (INSERT)
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Anyone can submit bug reports" ON bug_reports;
CREATE POLICY "Anyone can submit bug reports"
  ON bug_reports
  FOR INSERT
  WITH CHECK (reported_by = auth.uid() OR reported_by IS NULL);

-- -----------------------------------------------------------------------------
-- 3) Set search_path for functions flagged by the linter
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT
      n.nspname AS schema_name,
      p.proname AS function_name,
      pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = ANY(ARRAY[
        'update_client_script_count',
        'update_client_last_interaction',
        'find_stale_pois',
        'upsert_user_profile',
        'update_updated_at_column',
        'mark_poi_enriched',
        'auto_add_frequent_error_to_backlog',
        'initialize_user_profile',
        'approve_company_brain_section',
        'log_error_or_increment',
        'update_bug_reports_updated_at',
        'reject_company_brain_section',
        'cleanup_low_value_pois',
        'decrement_community_script_likes',
        'set_timestamp',
        'auto_flag_reported_scripts',
        'update_script_access',
        'auto_add_to_library',
        'search_travel_trends',
        'trigger_summary_generation',
        'auto_add_critical_bug_to_backlog',
        'find_high_confidence_merges',
        'increment_community_script_likes',
        'update_backlog_updated_at'
      ])
  LOOP
    EXECUTE format(
      'ALTER FUNCTION %I.%I(%s) SET search_path = public, extensions',
      r.schema_name,
      r.function_name,
      r.args
    );
  END LOOP;
END $$;
