-- ============================================================================
-- Upsell Packages Table
-- Stores available upsell packages and their features
-- Created: January 5, 2026
-- ============================================================================

CREATE TABLE IF NOT EXISTS upsell_packages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  price_per_experience DECIMAL(10,2),
  price_per_night DECIMAL(10,2),
  nights_included INT DEFAULT 0,
  min_days INT DEFAULT 1,
  max_price_per_day DECIMAL(10,2),
  min_price_per_day DECIMAL(10,2),
  features JSONB NOT NULL DEFAULT '{}'::jsonb,
  includes_lower_packages BOOLEAN DEFAULT true,
  available_to_tiers TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  display_order INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_upsell_packages_slug ON upsell_packages(slug);
CREATE INDEX IF NOT EXISTS idx_upsell_packages_active ON upsell_packages(is_active);
CREATE INDEX IF NOT EXISTS idx_upsell_packages_display_order ON upsell_packages(display_order);

-- Auto-update updated_at timestamp
CREATE TRIGGER update_upsell_packages_updated_at
  BEFORE UPDATE ON upsell_packages
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- SEED UPSELL PACKAGES
-- ============================================================================

-- 1. Discovery (€497 per experience)
INSERT INTO upsell_packages (name, slug, description, price_per_experience, features, includes_lower_packages, available_to_tiers, is_active, display_order)
VALUES (
  'Discovery',
  'discovery',
  'Day-by-day flow, venue candidates, logistics framework, and budget guidance',
  497.00,
  '{
    "day_by_day_flow": true,
    "venue_candidates": true,
    "venue_candidates_verified": "captains_preferred",
    "logistics_framework": true,
    "budget_guidance": true
  }'::jsonb,
  false,
  ARRAY['spark', 'inspired', 'connoisseur'],
  true,
  1
) ON CONFLICT (slug) DO NOTHING;

-- 2. Blueprint (€1,497 per experience, or €497 per night for 3 nights)
INSERT INTO upsell_packages (name, slug, description, price_per_experience, price_per_night, nights_included, features, includes_lower_packages, available_to_tiers, is_active, display_order)
VALUES (
  'Blueprint',
  'blueprint',
  'All Discovery features + direct booking links, POI coordinates, seasonal optimization, and post-trip debrief',
  1497.00,
  497.00,
  3,
  '{
    "day_by_day_flow": true,
    "venue_candidates": true,
    "venue_candidates_verified": "captains_preferred",
    "logistics_framework": true,
    "budget_guidance": true,
    "direct_booking_links": true,
    "poi_ids_coordinates_maps": true,
    "seasonal_optimization": true,
    "post_trip_debrief": true
  }'::jsonb,
  true,
  ARRAY['spark', 'inspired', 'connoisseur'],
  true,
  2
) ON CONFLICT (slug) DO NOTHING;

-- 3. Concierge (€2,997 per experience, or €997 per night for 3 nights)
INSERT INTO upsell_packages (name, slug, description, price_per_experience, price_per_night, nights_included, features, includes_lower_packages, available_to_tiers, is_active, display_order)
VALUES (
  'Concierge',
  'concierge',
  'All Blueprint features + concierge review, full planning service, booking coordination, and VIP access',
  2997.00,
  997.00,
  3,
  '{
    "day_by_day_flow": true,
    "venue_candidates": true,
    "venue_candidates_verified": "captains_preferred",
    "logistics_framework": true,
    "budget_guidance": true,
    "direct_booking_links": true,
    "poi_ids_coordinates_maps": true,
    "seasonal_optimization": true,
    "post_trip_debrief": true,
    "concierge_review_revision": true,
    "full_planning_service": true,
    "booking_coordination": true,
    "crew_supplier_brief": true,
    "real_time_updates": true,
    "custom_requests": true,
    "vip_access": true
  }'::jsonb,
  true,
  ARRAY['inspired', 'connoisseur'],
  true,
  3
) ON CONFLICT (slug) DO NOTHING;

-- 4. White Glove (€5k-8k per day, 4 days minimum)
INSERT INTO upsell_packages (name, slug, description, price_per_experience, min_price_per_day, max_price_per_day, min_days, features, includes_lower_packages, available_to_tiers, is_active, display_order)
VALUES (
  'White Glove',
  'white_glove',
  'All Concierge features + yacht charter, private jet, villa rental, onsite concierge, and 24-hour support',
  NULL,
  5000.00,
  8000.00,
  4,
  '{
    "day_by_day_flow": true,
    "venue_candidates": true,
    "venue_candidates_verified": "captains_preferred",
    "logistics_framework": true,
    "budget_guidance": true,
    "direct_booking_links": true,
    "poi_ids_coordinates_maps": true,
    "seasonal_optimization": true,
    "post_trip_debrief": true,
    "concierge_review_revision": true,
    "full_planning_service": true,
    "booking_coordination": true,
    "crew_supplier_brief": true,
    "real_time_updates": true,
    "custom_requests": true,
    "vip_access": true,
    "yacht_charter_integration": true,
    "private_jet_coordination": true,
    "villa_rental_curation": true,
    "onsite_concierge": true,
    "live_optimization": true,
    "photo_video_memory_capture": true,
    "24hour_call_support": true,
    "additional_costs": "accommodation_and_expenses"
  }'::jsonb,
  true,
  ARRAY['inspired', 'connoisseur'],
  true,
  4
) ON CONFLICT (slug) DO NOTHING;

-- ============================================================================
-- TABLE: user_upsell_purchases
-- Tracks purchased upsell packages per user
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_upsell_purchases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  script_id UUID REFERENCES experience_briefs(id) ON DELETE SET NULL,
  upsell_package_id UUID NOT NULL REFERENCES upsell_packages(id),
  price_paid DECIMAL(10,2) NOT NULL,
  payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'refunded')),
  purchased_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_upsell_purchases_user_id ON user_upsell_purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_user_upsell_purchases_script_id ON user_upsell_purchases(script_id);
CREATE INDEX IF NOT EXISTS idx_user_upsell_purchases_package_id ON user_upsell_purchases(upsell_package_id);
CREATE INDEX IF NOT EXISTS idx_user_upsell_purchases_payment_status ON user_upsell_purchases(payment_status);

-- Auto-update updated_at timestamp
CREATE TRIGGER update_user_upsell_purchases_updated_at
  BEFORE UPDATE ON user_upsell_purchases
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON TABLE upsell_packages IS 'Available upsell packages that can be purchased per experience';
COMMENT ON TABLE user_upsell_purchases IS 'Tracks upsell package purchases by users';
COMMENT ON COLUMN upsell_packages.includes_lower_packages IS 'If true, this package includes all features of lower-tier packages';
COMMENT ON COLUMN upsell_packages.available_to_tiers IS 'Array of tier slugs that can purchase this upsell';
COMMENT ON COLUMN user_upsell_purchases.script_id IS 'The script/experience this upsell was purchased for';
