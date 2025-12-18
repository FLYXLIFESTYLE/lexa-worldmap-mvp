-- Add Logging to Backlog
INSERT INTO backlog_items (title, description, priority, category, order_index, estimated_hours, created_by) VALUES
  ('Implement Comprehensive Logging System', 'Add logging for all API calls, errors, user actions, and system events for debugging and monitoring', 'high', 'infrastructure', 1, 8, (SELECT id FROM auth.users LIMIT 1));

