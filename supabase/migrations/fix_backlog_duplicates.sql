-- Fix Backlog Duplicates
-- Date: December 18, 2025
-- Run this in Supabase SQL Editor

-- 1. Update French Riviera status (already in progress)
UPDATE backlog_items 
SET status = 'in_progress' 
WHERE title = 'French Riviera Completion';

-- 2. Complete Vercel build item (already done)
UPDATE backlog_items 
SET status = 'completed', completed_at = NOW() 
WHERE title = 'Fix Vercel TypeScript Build';

-- 3. Delete old discovery items (will merge into one)
DELETE FROM backlog_items 
WHERE title IN ('Activity-First Discovery Strategy', 'Multi-Source Premium Discovery');

-- 4. Create merged comprehensive discovery item
INSERT INTO backlog_items (title, description, priority, category, status, estimated_hours, tags, order_index) 
VALUES (
  'Comprehensive POI Discovery Strategy',
  'Phase 1: Activity-First Discovery - Collect ALL activity-related POIs (beaches, viewpoints, trails, etc.) not just luxury. Target: 500K experience-enabling POIs worldwide. Phase 2: Multi-Source Luxury Discovery - Google Places (30K), Forbes (5K), Michelin (3K), Condé Nast (3K), World''s 50 Best (500), Relais & Châteaux (600). Total: 544K unique POIs. Includes automated deduplication, master enrichment pipeline, and all relationships.',
  'critical',
  'data',
  'pending',
  100,
  '{strategy,discovery,high-value,luxury,activity-first}',
  1
);

-- 5. Delete old user profile items (will merge into one)
DELETE FROM backlog_items 
WHERE title IN ('User Profile Management', 'User Profile Page');

-- 6. Create merged comprehensive user profile item
INSERT INTO backlog_items (title, description, priority, category, status, estimated_hours, tags, order_index) 
VALUES (
  'Complete User Profile System',
  'Backend: Store user preferences, past searches, favorites, travel personality, emotional profile. Frontend: View/edit profile page with settings, preferences, and history. Integration with LEXA chat for personalized recommendations. Includes authentication, data persistence, and privacy controls.',
  'high',
  'feature',
  'pending',
  32,
  '{user-experience,profiles,personalization}',
  17
);

-- 7. Reorder all items to ensure sequential order_index
WITH ranked AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (ORDER BY 
      CASE priority 
        WHEN 'critical' THEN 1 
        WHEN 'high' THEN 2 
        WHEN 'normal' THEN 3 
      END,
      order_index ASC
    ) as new_order
  FROM backlog_items
  WHERE status IN ('pending', 'in_progress')
)
UPDATE backlog_items 
SET order_index = ranked.new_order
FROM ranked
WHERE backlog_items.id = ranked.id;

-- Verify changes
SELECT 
  priority,
  status,
  COUNT(*) as count,
  SUM(estimated_hours) as total_hours
FROM backlog_items
GROUP BY priority, status
ORDER BY priority, status;

