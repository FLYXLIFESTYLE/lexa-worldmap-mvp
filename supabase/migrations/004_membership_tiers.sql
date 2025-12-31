-- ============================================================================
-- Membership Tiers System
-- Implements flexible membership tiers with configurable features and limits
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- TABLE: membership_tiers
-- Stores available membership tier configurations
-- ============================================================================
CREATE TABLE IF NOT EXISTS membership_tiers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  price_monthly DECIMAL(10,2),
  price_annual DECIMAL(10,2),
  features JSONB NOT NULL DEFAULT '{}'::jsonb,
  limits JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT true,
  display_order INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_membership_tiers_slug ON membership_tiers(slug);
CREATE INDEX IF NOT EXISTS idx_membership_tiers_active ON membership_tiers(is_active);
CREATE INDEX IF NOT EXISTS idx_membership_tiers_display_order ON membership_tiers(display_order);

-- Auto-update updated_at timestamp
CREATE TRIGGER update_membership_tiers_updated_at
  BEFORE UPDATE ON membership_tiers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- TABLE: user_memberships
-- Tracks user membership status and subscription details
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_memberships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tier_id UUID NOT NULL REFERENCES membership_tiers(id),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired', 'trial')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  auto_renew BOOLEAN DEFAULT true,
  payment_metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_user_memberships_user_id ON user_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_user_memberships_tier_id ON user_memberships(tier_id);
CREATE INDEX IF NOT EXISTS idx_user_memberships_status ON user_memberships(status);
CREATE INDEX IF NOT EXISTS idx_user_memberships_expires_at ON user_memberships(expires_at);

-- Auto-update updated_at timestamp
CREATE TRIGGER update_user_memberships_updated_at
  BEFORE UPDATE ON user_memberships
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- TABLE: membership_usage_tracking
-- Tracks usage against membership limits (scripts created, etc.)
-- ============================================================================
CREATE TABLE IF NOT EXISTS membership_usage_tracking (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  scripts_created INT DEFAULT 0,
  detailed_itineraries INT DEFAULT 0,
  concierge_requests INT DEFAULT 0,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_membership_usage_user_id ON membership_usage_tracking(user_id);
CREATE INDEX IF NOT EXISTS idx_membership_usage_period ON membership_usage_tracking(period_start, period_end);

-- Auto-update updated_at timestamp
CREATE TRIGGER update_membership_usage_tracking_updated_at
  BEFORE UPDATE ON membership_usage_tracking
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- SEED DEFAULT MEMBERSHIP TIERS
-- ============================================================================

-- Free Tier
INSERT INTO membership_tiers (name, slug, description, price_monthly, price_annual, features, limits, is_active, display_order)
VALUES (
  'Free',
  'free',
  'Get started with LEXA and create your first experience scripts',
  0.00,
  0.00,
  '{
    "scripts_per_month": 3,
    "detailed_itineraries": false,
    "concierge_access": false,
    "marketplace_access": true,
    "marketplace_purchases": false,
    "priority_support": false,
    "conversation_history": true,
    "community_sharing": true,
    "custom_features": ["Basic theme selection", "Experience DNA discovery", "Community script browsing"]
  }'::jsonb,
  '{
    "scripts_per_month": 3,
    "conversations_per_month": 10,
    "script_revisions": 1
  }'::jsonb,
  true,
  1
) ON CONFLICT (slug) DO NOTHING;

-- Explorer Tier
INSERT INTO membership_tiers (name, slug, description, price_monthly, price_annual, features, limits, is_active, display_order)
VALUES (
  'Explorer',
  'explorer',
  'Unlimited experience scripts and full conversation history',
  97.00,
  970.00,
  '{
    "scripts_per_month": -1,
    "detailed_itineraries": false,
    "concierge_access": false,
    "marketplace_access": true,
    "marketplace_purchases": true,
    "priority_support": false,
    "conversation_history": true,
    "community_sharing": true,
    "advanced_filters": true,
    "export_pdf": true,
    "custom_features": ["Unlimited scripts", "Advanced emotional profiling", "Save favorite scripts", "Priority destination data"]
  }'::jsonb,
  '{
    "scripts_per_month": -1,
    "conversations_per_month": -1,
    "script_revisions": 3
  }'::jsonb,
  true,
  2
) ON CONFLICT (slug) DO NOTHING;

-- Creator Tier
INSERT INTO membership_tiers (name, slug, description, price_monthly, price_annual, features, limits, is_active, display_order)
VALUES (
  'Creator',
  'creator',
  'Detailed day-by-day itineraries with POI recommendations and reservations',
  497.00,
  4970.00,
  '{
    "scripts_per_month": -1,
    "detailed_itineraries": true,
    "concierge_access": false,
    "marketplace_access": true,
    "marketplace_purchases": true,
    "marketplace_selling": true,
    "priority_support": true,
    "conversation_history": true,
    "community_sharing": true,
    "advanced_filters": true,
    "export_pdf": true,
    "poi_recommendations": true,
    "reservation_assistance": true,
    "custom_features": ["Detailed day-by-day planning", "Specific POI recommendations", "Timing & logistics", "Reservation booking assistance", "Share scripts to marketplace"]
  }'::jsonb,
  '{
    "scripts_per_month": -1,
    "conversations_per_month": -1,
    "detailed_itineraries_per_month": 5,
    "script_revisions": -1
  }'::jsonb,
  true,
  3
) ON CONFLICT (slug) DO NOTHING;

-- Concierge Tier
INSERT INTO membership_tiers (name, slug, description, price_monthly, price_annual, features, limits, is_active, display_order)
VALUES (
  'Concierge',
  'concierge',
  'White-glove service with full trip planning and 24/7 support during your experience',
  2997.00,
  29970.00,
  '{
    "scripts_per_month": -1,
    "detailed_itineraries": true,
    "concierge_access": true,
    "marketplace_access": true,
    "marketplace_purchases": true,
    "marketplace_selling": true,
    "priority_support": true,
    "dedicated_agent": true,
    "conversation_history": true,
    "community_sharing": true,
    "advanced_filters": true,
    "export_pdf": true,
    "poi_recommendations": true,
    "reservation_assistance": true,
    "full_booking_service": true,
    "trip_support_24_7": true,
    "custom_features": ["Dedicated luxury travel agent", "All bookings made by team", "24/7 support during trip", "VIP access & upgrades", "Personal concierge", "Unlimited revisions", "Priority partner access"]
  }'::jsonb,
  '{
    "scripts_per_month": -1,
    "conversations_per_month": -1,
    "detailed_itineraries_per_month": -1,
    "concierge_requests_per_month": -1,
    "script_revisions": -1
  }'::jsonb,
  true,
  4
) ON CONFLICT (slug) DO NOTHING;

-- ============================================================================
-- COMMENTS (Documentation)
-- ============================================================================

COMMENT ON TABLE membership_tiers IS 'Configurable membership tier definitions with features and limits';
COMMENT ON TABLE user_memberships IS 'User membership subscriptions and status tracking';
COMMENT ON TABLE membership_usage_tracking IS 'Monthly usage tracking for membership limit enforcement';

COMMENT ON COLUMN membership_tiers.features IS 'JSONB object containing boolean/numeric feature flags';
COMMENT ON COLUMN membership_tiers.limits IS 'JSONB object with numeric limits (-1 = unlimited)';
COMMENT ON COLUMN user_memberships.status IS 'Membership status: active, cancelled, expired, or trial';
COMMENT ON COLUMN user_memberships.payment_metadata IS 'Stripe subscription ID, payment method, etc.';
