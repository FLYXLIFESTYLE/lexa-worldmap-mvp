-- Add 2 new theme categories: Nightlife & Entertainment, Sports & Active
-- Total themes: 12 → 14

-- Insert new themes (if they don't already exist)
INSERT INTO theme_categories (name, description, display_order, is_active)
VALUES 
  (
    'Nightlife & Entertainment',
    'Exclusive after-hours experiences: VIP club access, private performances, rooftop lounges, and late-night discoveries. Your nights become as memorable as your days.',
    13,
    true
  ),
  (
    'Sports & Active',
    'Active luxury experiences: championship golf, private tennis coaching, elite fitness sessions, and active wellness. Return energized and accomplished.',
    14,
    true
  )
ON CONFLICT (name) DO NOTHING;

-- Update display order to reflect new themes
-- (Existing themes keep their order 1-12, new themes are 13-14)

COMMENT ON TABLE theme_categories IS 'LEXA''s 14 theme categories (updated Jan 2026: added Nightlife & Entertainment, Sports & Active)';
