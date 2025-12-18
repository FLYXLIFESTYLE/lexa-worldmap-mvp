-- Create bug_reports table for user-submitted bug reports
-- Accessible to ALL users (not just admins/captains)

CREATE TABLE IF NOT EXISTS bug_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  page_url TEXT,
  browser_info TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved', 'duplicate', 'wont_fix')),
  severity TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('critical', 'high', 'medium', 'low')),
  category TEXT CHECK (category IN ('ui', 'api', 'database', 'performance', 'security', 'other')),
  reported_by UUID REFERENCES auth.users(id),
  reporter_email TEXT,
  reporter_name TEXT,
  assigned_to UUID REFERENCES auth.users(id),
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID REFERENCES auth.users(id),
  resolution_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  screenshot_url TEXT,
  steps_to_reproduce TEXT,
  expected_behavior TEXT,
  actual_behavior TEXT,
  tags TEXT[] DEFAULT '{}'
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_bug_reports_status ON bug_reports(status);
CREATE INDEX IF NOT EXISTS idx_bug_reports_severity ON bug_reports(severity);
CREATE INDEX IF NOT EXISTS idx_bug_reports_reported_by ON bug_reports(reported_by);
CREATE INDEX IF NOT EXISTS idx_bug_reports_created_at ON bug_reports(created_at DESC);

-- Enable Row Level Security
ALTER TABLE bug_reports ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can submit bug reports (authenticated or anonymous)
CREATE POLICY "Anyone can submit bug reports"
  ON bug_reports
  FOR INSERT
  WITH CHECK (true);

-- Policy: Everyone can view their own bug reports
CREATE POLICY "Users can view their own bug reports"
  ON bug_reports
  FOR SELECT
  USING (reported_by = auth.uid() OR reported_by IS NULL);

-- Policy: Admins and Captains can view all bug reports
CREATE POLICY "Admins and Captains can view all bug reports"
  ON bug_reports
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM captain_profiles
      WHERE captain_profiles.user_id = auth.uid()
      AND captain_profiles.role IN ('admin', 'captain')
    )
  );

-- Policy: Admins and Captains can update bug reports
CREATE POLICY "Admins and Captains can update bug reports"
  ON bug_reports
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM captain_profiles
      WHERE captain_profiles.user_id = auth.uid()
      AND captain_profiles.role IN ('admin', 'captain')
    )
  );

-- Policy: Only Admins can delete bug reports
CREATE POLICY "Only Admins can delete bug reports"
  ON bug_reports
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM captain_profiles
      WHERE captain_profiles.user_id = auth.uid()
      AND captain_profiles.role = 'admin'
    )
  );

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_bug_reports_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at on changes
CREATE TRIGGER bug_reports_updated_at
  BEFORE UPDATE ON bug_reports
  FOR EACH ROW
  EXECUTE FUNCTION update_bug_reports_updated_at();

-- Function to auto-add critical bugs to backlog
CREATE OR REPLACE FUNCTION auto_add_critical_bug_to_backlog()
RETURNS TRIGGER AS $$
BEGIN
  -- If bug is critical or high severity, add to backlog
  IF NEW.severity IN ('critical', 'high') THEN
    INSERT INTO backlog_items (
      title, 
      description, 
      priority, 
      category, 
      status,
      created_by,
      notes
    ) VALUES (
      'Bug: ' || NEW.title,
      NEW.description || E'\n\nSteps to reproduce: ' || COALESCE(NEW.steps_to_reproduce, 'Not provided'),
      CASE 
        WHEN NEW.severity = 'critical' THEN 'critical'
        ELSE 'high'
      END,
      'bug',
      'pending',
      NEW.reported_by,
      'Auto-created from bug report #' || NEW.id
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-add critical bugs to backlog
CREATE TRIGGER auto_add_critical_bug
  AFTER INSERT ON bug_reports
  FOR EACH ROW
  EXECUTE FUNCTION auto_add_critical_bug_to_backlog();

COMMENT ON TABLE bug_reports IS 'User-submitted bug reports accessible to all users';
COMMENT ON COLUMN bug_reports.status IS 'Status: open (needs attention), resolved (fixed), duplicate (already reported), wont_fix (by design)';
COMMENT ON COLUMN bug_reports.severity IS 'Severity: critical (system broken), high (major issue), medium (annoying), low (minor)';

