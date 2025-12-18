-- Create error_logs table for automatic error tracking
-- System automatically logs errors for review

CREATE TABLE IF NOT EXISTS error_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  error_type TEXT NOT NULL,
  error_message TEXT NOT NULL,
  stack_trace TEXT,
  page_url TEXT,
  user_id UUID REFERENCES auth.users(id),
  user_agent TEXT,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'reviewed', 'fixed', 'ignored')),
  severity TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('critical', 'high', 'medium', 'low')),
  occurrence_count INTEGER DEFAULT 1,
  first_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID REFERENCES auth.users(id),
  backlog_item_id UUID REFERENCES backlog_items(id),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_error_logs_status ON error_logs(status);
CREATE INDEX IF NOT EXISTS idx_error_logs_severity ON error_logs(severity);
CREATE INDEX IF NOT EXISTS idx_error_logs_error_type ON error_logs(error_type);
CREATE INDEX IF NOT EXISTS idx_error_logs_last_seen ON error_logs(last_seen DESC);
CREATE INDEX IF NOT EXISTS idx_error_logs_occurrence_count ON error_logs(occurrence_count DESC);

-- Enable Row Level Security
ALTER TABLE error_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Only Admins and Captains can view error logs
CREATE POLICY "Admins and Captains can view error logs"
  ON error_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM captain_profiles
      WHERE captain_profiles.user_id = auth.uid()
      AND captain_profiles.role IN ('admin', 'captain')
    )
  );

-- Policy: System can insert error logs (using service role)
-- This will be done via API with proper authentication

-- Policy: Admins and Captains can update error logs
CREATE POLICY "Admins and Captains can update error logs"
  ON error_logs
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM captain_profiles
      WHERE captain_profiles.user_id = auth.uid()
      AND captain_profiles.role IN ('admin', 'captain')
    )
  );

-- Function to deduplicate errors and increment occurrence count
CREATE OR REPLACE FUNCTION log_error_or_increment(
  p_error_type TEXT,
  p_error_message TEXT,
  p_stack_trace TEXT,
  p_page_url TEXT,
  p_user_id UUID,
  p_user_agent TEXT,
  p_severity TEXT
) RETURNS UUID AS $$
DECLARE
  v_error_id UUID;
  v_occurrence_count INTEGER;
BEGIN
  -- Try to find existing error with same type and message
  SELECT id, occurrence_count INTO v_error_id, v_occurrence_count
  FROM error_logs
  WHERE error_type = p_error_type
    AND error_message = p_error_message
    AND status IN ('new', 'reviewed')
    AND last_seen > NOW() - INTERVAL '7 days' -- Only match recent errors
  ORDER BY last_seen DESC
  LIMIT 1;

  IF v_error_id IS NOT NULL THEN
    -- Update existing error
    UPDATE error_logs
    SET occurrence_count = occurrence_count + 1,
        last_seen = NOW(),
        page_url = COALESCE(p_page_url, page_url),
        stack_trace = COALESCE(p_stack_trace, stack_trace)
    WHERE id = v_error_id;
    
    RETURN v_error_id;
  ELSE
    -- Insert new error
    INSERT INTO error_logs (
      error_type,
      error_message,
      stack_trace,
      page_url,
      user_id,
      user_agent,
      severity
    ) VALUES (
      p_error_type,
      p_error_message,
      p_stack_trace,
      p_page_url,
      p_user_id,
      p_user_agent,
      p_severity
    )
    RETURNING id INTO v_error_id;
    
    RETURN v_error_id;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to auto-add frequent errors to backlog
CREATE OR REPLACE FUNCTION auto_add_frequent_error_to_backlog()
RETURNS TRIGGER AS $$
DECLARE
  v_backlog_exists BOOLEAN;
BEGIN
  -- If error occurs 10+ times and is critical/high, add to backlog
  IF NEW.occurrence_count >= 10 AND NEW.severity IN ('critical', 'high') AND NEW.backlog_item_id IS NULL THEN
    -- Check if backlog item already exists for this error
    SELECT EXISTS(
      SELECT 1 FROM backlog_items 
      WHERE notes LIKE '%Error log #' || NEW.id || '%'
    ) INTO v_backlog_exists;
    
    IF NOT v_backlog_exists THEN
      INSERT INTO backlog_items (
        title,
        description,
        priority,
        category,
        status,
        notes
      ) VALUES (
        'Fix: ' || NEW.error_type,
        NEW.error_message || E'\n\nOccurred ' || NEW.occurrence_count || ' times since ' || NEW.first_seen,
        CASE 
          WHEN NEW.severity = 'critical' THEN 'critical'
          ELSE 'high'
        END,
        'bug',
        'pending',
        'Auto-created from error log #' || NEW.id || E'\nPage: ' || COALESCE(NEW.page_url, 'Unknown')
      )
      RETURNING id INTO NEW.backlog_item_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-add frequent errors to backlog
CREATE TRIGGER auto_add_frequent_error
  BEFORE UPDATE ON error_logs
  FOR EACH ROW
  WHEN (NEW.occurrence_count >= 10 AND OLD.occurrence_count < 10)
  EXECUTE FUNCTION auto_add_frequent_error_to_backlog();

COMMENT ON TABLE error_logs IS 'Automatic error tracking with deduplication and backlog integration';
COMMENT ON COLUMN error_logs.occurrence_count IS 'Number of times this error has occurred';
COMMENT ON COLUMN error_logs.status IS 'Status: new (needs review), reviewed (acknowledged), fixed (resolved), ignored (wont fix)';

