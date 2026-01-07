-- Create theme_categories table with all 14 themes
-- Includes hooks and descriptions from LEXA Chat implementation

CREATE TABLE IF NOT EXISTS theme_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  hook TEXT,  -- The one-sentence emotional hook
  icon TEXT,  -- Icon name (from Lucide icons)
  accent_color TEXT,  -- Color accent (gold, navy, rose, emerald, sky, violet, amber)
  display_order INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_theme_categories_slug ON theme_categories(slug);
CREATE INDEX IF NOT EXISTS idx_theme_categories_display_order ON theme_categories(display_order);
CREATE INDEX IF NOT EXISTS idx_theme_categories_is_active ON theme_categories(is_active);

-- Insert all 14 themes with complete data
INSERT INTO theme_categories (name, slug, description, hook, icon, accent_color, display_order, is_active)
VALUES 
  -- Original 12 themes
  (
    'Romance & Intimacy',
    'romance_intimacy',
    'Your script designs quiet, unhurried moments made just for two – sunrise coffees in hidden bays, starlit dinners on deck, and small surprises that feel deeply personal. Less program, more presence, so you can actually feel each other again.',
    'Fall in love with each other all over again.',
    'Heart',
    'rose',
    1,
    true
  ),
  (
    'Adventure & Exploration',
    'adventure_exploration',
    'This script turns your journey into a sequence of discoveries: remote anchorages, off-the-map experiences, and challenges chosen to excite, not exhaust. You return home with stories you can''t find on Google – and a renewed appetite for life.',
    'For when comfort isn''t enough – you want a story.',
    'Mountain',
    'amber',
    2,
    true
  ),
  (
    'Wellness & Transformation',
    'wellness_transformation',
    'Your script blends gentle rituals, movement, and deep rest into the rhythm of each day. Think sunrise breaths on the bow, tailored treatments, and meaningful conversations that create real inner shifts – without feeling like a "program."',
    'Leave as yourself. Return as your next chapter.',
    'Sparkles',
    'emerald',
    3,
    true
  ),
  (
    'Culinary Excellence',
    'culinary_excellence',
    'This script is built around flavor: market-to-table experiences, hidden local gems, and bespoke menus on board inspired by your story. Every meal becomes a memory, and every day has a signature dish you''ll talk about long after you''ve left.',
    'Travel through taste, one unforgettable course at a time.',
    'Utensils',
    'gold',
    4,
    true
  ),
  (
    'Cultural Immersion',
    'cultural_immersion',
    'Your script opens doors that don''t exist for regular tourists: private encounters with local hosts, traditions shared in intimate settings, and stories that bring each place to life. You don''t just visit – you briefly belong.',
    'Not just another destination – a deeper connection.',
    'Landmark',
    'violet',
    5,
    true
  ),
  (
    'Pure Luxury & Indulgence',
    'pure_luxury_indulgence',
    'This script is dedicated to effortless pleasure: seamless service, beautiful spaces, and every detail tuned to your personal tastes. No guilt, no rush – just days that feel soft, generous, and quietly extraordinary.',
    'Give yourself permission to want exactly what you want.',
    'Crown',
    'gold',
    6,
    true
  ),
  (
    'Nature & Wildlife',
    'nature_wildlife',
    'Your script follows the rhythm of the natural world: sunrise encounters, golden-hour sightings, and respectful access to fragile environments. You feel the scale of nature again – and your place within it.',
    'Get close to the world that usually stays out of reach.',
    'Leaf',
    'emerald',
    7,
    true
  ),
  (
    'Water Sports & Marine',
    'water_sports_marine',
    'This script keeps you moving: custom-selected toys, guided sessions, and play built into every stop. From effortless fun to skill-building experiences, the ocean becomes your private playground.',
    'Live your days at sea, not just look at the water.',
    'Waves',
    'sky',
    8,
    true
  ),
  (
    'Art & Architecture',
    'art_architecture',
    'Your script curates galleries, ateliers, and iconic spaces – plus a few places that never make it to the guidebooks. You meet the minds behind the work, feel the history in the walls, and let beauty quietly reshape your perspective.',
    'Walk inside the world''s most beautiful ideas.',
    'Palette',
    'violet',
    9,
    true
  ),
  (
    'Family Luxury',
    'family_luxury',
    'This script balances shared moments and personal space, with age-appropriate experiences woven into one story. No chaos, no over-scheduling – just simple, joyful days that become part of your family legend.',
    'Time together that everyone will remember – not just the kids.',
    'Users',
    'navy',
    10,
    true
  ),
  (
    'Celebration & Milestones',
    'celebration_milestones',
    'Your script builds towards one signature occasion – a birthday, anniversary, or life achievement – with meaningful touches along the way. Every detail is designed so that when you look back, this moment stands out clearly in your memory.',
    'Mark the moment so it never blurs into the rest.',
    'PartyPopper',
    'amber',
    11,
    true
  ),
  (
    'Solitude & Reflection',
    'solitude_reflection',
    'This script protects your quiet: minimal obligations, soft structure, and places chosen for their stillness. Gentle prompts, private rituals, and simple beauty help you process, reset, and return with clarity.',
    'Finally, the space to hear yourself again.',
    'Moon',
    'navy',
    12,
    true
  ),
  -- NEW themes (Jan 2026)
  (
    'Nightlife & Entertainment',
    'nightlife_entertainment',
    'This script opens doors to exclusive after-hours experiences: VIP club access, private performances, and late-night discoveries that most travelers never see. From rooftop lounges to underground venues, your nights become as memorable as your days.',
    'When the sun sets, your evening begins.',
    'Music',
    'violet',
    13,
    true
  ),
  (
    'Sports & Active',
    'sports_active',
    'This script keeps you moving with purpose: championship golf courses, private tennis coaching, elite fitness sessions, and active wellness experiences. Whether mastering a skill or testing your limits, you return energized and accomplished.',
    'Luxury isn''t passive – it''s powerful.',
    'Trophy',
    'amber',
    14,
    true
  )
ON CONFLICT (name) DO NOTHING;

-- Add comment
COMMENT ON TABLE theme_categories IS 'LEXA theme categories (14 total as of Jan 2026). Each theme has emotional hooks and descriptions for experience design.';
COMMENT ON COLUMN theme_categories.hook IS 'One-sentence emotional hook for the theme';
COMMENT ON COLUMN theme_categories.description IS 'Full description explaining what this theme delivers emotionally';
COMMENT ON COLUMN theme_categories.icon IS 'Lucide icon name for UI';
COMMENT ON COLUMN theme_categories.accent_color IS 'Tailwind color accent (gold, navy, rose, emerald, sky, violet, amber)';
