-- Create backlog_items table for managing development priorities
-- This table stores tasks, features, and improvements with priorities and ordering

CREATE TABLE IF NOT EXISTS backlog_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT NOT NULL CHECK (priority IN ('critical', 'high', 'normal')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  category TEXT CHECK (category IN ('feature', 'bug', 'enhancement', 'infrastructure', 'data', 'ui', 'other')),
  order_index INTEGER NOT NULL DEFAULT 0,
  estimated_hours DECIMAL(5,1),
  assigned_to UUID REFERENCES auth.users(id),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  tags TEXT[] DEFAULT '{}',
  notes TEXT
);

-- Create index on priority and order for efficient sorting
CREATE INDEX IF NOT EXISTS idx_backlog_priority_order ON backlog_items(priority, order_index);
CREATE INDEX IF NOT EXISTS idx_backlog_status ON backlog_items(status);
CREATE INDEX IF NOT EXISTS idx_backlog_created_by ON backlog_items(created_by);

-- Enable Row Level Security
ALTER TABLE backlog_items ENABLE ROW LEVEL SECURITY;

-- Policy: Admins and Captains can view all backlog items
CREATE POLICY "Admins and Captains can view backlog"
  ON backlog_items
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM captain_profiles
      WHERE captain_profiles.user_id = auth.uid()
      AND captain_profiles.role IN ('admin', 'captain')
    )
  );

-- Policy: Admins and Captains can insert backlog items
CREATE POLICY "Admins and Captains can insert backlog"
  ON backlog_items
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM captain_profiles
      WHERE captain_profiles.user_id = auth.uid()
      AND captain_profiles.role IN ('admin', 'captain')
    )
  );

-- Policy: Admins and Captains can update backlog items
CREATE POLICY "Admins and Captains can update backlog"
  ON backlog_items
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM captain_profiles
      WHERE captain_profiles.user_id = auth.uid()
      AND captain_profiles.role IN ('admin', 'captain')
    )
  );

-- Policy: Only Admins can delete backlog items
CREATE POLICY "Only Admins can delete backlog"
  ON backlog_items
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM captain_profiles
      WHERE captain_profiles.user_id = auth.uid()
      AND captain_profiles.role = 'admin'
    )
  );

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_backlog_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at on changes
CREATE TRIGGER backlog_updated_at
  BEFORE UPDATE ON backlog_items
  FOR EACH ROW
  EXECUTE FUNCTION update_backlog_updated_at();

-- Insert some initial backlog items from BACKLOG.md priorities
INSERT INTO backlog_items (title, description, priority, category, order_index, estimated_hours, created_by) VALUES
  ('Activity-First Discovery Strategy', 'Collect ALL activity-related POIs (beaches, viewpoints, trails) not just luxury. Target: 500K experience-enabling POIs worldwide.', 'critical', 'data', 1, 40, (SELECT id FROM auth.users LIMIT 1)),
  ('Multi-Source Premium Discovery', 'Google Places (30K luxury POIs), Forbes, Michelin, etc. Result: 44K unique luxury POIs after deduplication.', 'critical', 'data', 2, 60, (SELECT id FROM auth.users LIMIT 1)),
  ('Master Data Intake Pipeline', 'Automated process: Get properties → Scrape websites → Score → Emotions → Relationships', 'critical', 'infrastructure', 3, 80, (SELECT id FROM auth.users LIMIT 1)),
  ('Valuable Website RAG System', 'RAG-optimized knowledge extraction from industry sources with semantic chunking and vector search', 'high', 'feature', 4, 120, (SELECT id FROM auth.users LIMIT 1)),
  ('User Management System', 'Admin page to manage Captains and Contributors with role-based permissions', 'high', 'feature', 5, 12, (SELECT id FROM auth.users LIMIT 1)),
  ('Events Web Scraping', 'Use Tavily for real-time event data with AFFECTS_DESTINATION relationships', 'high', 'feature', 6, 8, (SELECT id FROM auth.users LIMIT 1)),
  ('Weather Integration', 'Real-time weather data using Tavily API', 'high', 'feature', 7, 2, (SELECT id FROM auth.users LIMIT 1)),
  ('Fix Destination Browser Loading', 'Debug and fix destination browser page that fails to load', 'high', 'bug', 8, 2, (SELECT id FROM auth.users LIMIT 1)),
  ('Best Time to Travel Feature', 'Add seasonal data and calendar component for optimal travel timing', 'normal', 'feature', 9, 4, (SELECT id FROM auth.users LIMIT 1)),
  ('User Profile Page', 'Allow users to view and edit their profile settings', 'normal', 'feature', 10, 3, (SELECT id FROM auth.users LIMIT 1));

COMMENT ON TABLE backlog_items IS 'Stores development backlog items with priorities, ordering, and metadata';
COMMENT ON COLUMN backlog_items.priority IS 'Priority level: critical (must do now), high (important), normal (can wait)';
COMMENT ON COLUMN backlog_items.order_index IS 'Manual sort order within priority group (lower numbers appear first)';
COMMENT ON COLUMN backlog_items.status IS 'Current status: pending (not started), in_progress (active), completed (done), cancelled (wont do)';

