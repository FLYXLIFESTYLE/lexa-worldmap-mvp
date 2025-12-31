-- ============================================================================
-- Marketplace & Partner Infrastructure (Phase 2)
-- Placeholder tables for future marketplace and partner advertisement features
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- TABLE: script_marketplace_listings
-- Marketplace listings for experience scripts (paid/free)
-- ============================================================================
CREATE TABLE IF NOT EXISTS script_marketplace_listings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  script_id UUID NOT NULL REFERENCES experience_briefs(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL,
  price DECIMAL(10,2) DEFAULT 0.00,
  listing_type TEXT NOT NULL DEFAULT 'free' CHECK (listing_type IN ('free', 'paid', 'premium')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'sold_out', 'removed')),
  description TEXT,
  preview_enabled BOOLEAN DEFAULT true,
  purchase_count INT DEFAULT 0,
  revenue_total DECIMAL(10,2) DEFAULT 0.00,
  commission_rate DECIMAL(5,4) DEFAULT 0.15,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  published_at TIMESTAMPTZ,
  UNIQUE(script_id)
);

CREATE INDEX IF NOT EXISTS idx_script_marketplace_listings_seller ON script_marketplace_listings(seller_id);
CREATE INDEX IF NOT EXISTS idx_script_marketplace_listings_type ON script_marketplace_listings(listing_type);
CREATE INDEX IF NOT EXISTS idx_script_marketplace_listings_status ON script_marketplace_listings(status);
CREATE INDEX IF NOT EXISTS idx_script_marketplace_listings_price ON script_marketplace_listings(price);

-- Auto-update updated_at timestamp
CREATE TRIGGER update_script_marketplace_listings_updated_at
  BEFORE UPDATE ON script_marketplace_listings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- TABLE: marketplace_purchases
-- Track script purchases from marketplace
-- ============================================================================
CREATE TABLE IF NOT EXISTS marketplace_purchases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  listing_id UUID NOT NULL REFERENCES script_marketplace_listings(id),
  buyer_id UUID NOT NULL,
  seller_id UUID NOT NULL,
  price_paid DECIMAL(10,2) NOT NULL,
  commission_amount DECIMAL(10,2),
  payment_method TEXT,
  payment_metadata JSONB DEFAULT '{}'::jsonb,
  purchased_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_marketplace_purchases_listing ON marketplace_purchases(listing_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_purchases_buyer ON marketplace_purchases(buyer_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_purchases_seller ON marketplace_purchases(seller_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_purchases_date ON marketplace_purchases(purchased_at DESC);

-- ============================================================================
-- TABLE: experience_partners
-- Registered experience partners (hotels, restaurants, etc.)
-- ============================================================================
CREATE TABLE IF NOT EXISTS experience_partners (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('hotel', 'restaurant', 'activity', 'transport', 'yacht', 'spa', 'tour_operator', 'full_service')),
  tier TEXT NOT NULL DEFAULT 'basic' CHECK (tier IN ('basic', 'featured', 'exclusive')),
  branding JSONB DEFAULT '{}'::jsonb,
  destinations TEXT[] DEFAULT '{}',
  themes TEXT[] DEFAULT '{}',
  contact_email TEXT,
  contact_phone TEXT,
  website TEXT,
  description TEXT,
  partnership_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  partnership_end TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_experience_partners_type ON experience_partners(type);
CREATE INDEX IF NOT EXISTS idx_experience_partners_tier ON experience_partners(tier);
CREATE INDEX IF NOT EXISTS idx_experience_partners_destinations ON experience_partners USING GIN(destinations);
CREATE INDEX IF NOT EXISTS idx_experience_partners_themes ON experience_partners USING GIN(themes);
CREATE INDEX IF NOT EXISTS idx_experience_partners_active ON experience_partners(is_active) WHERE is_active = true;

-- Auto-update updated_at timestamp
CREATE TRIGGER update_experience_partners_updated_at
  BEFORE UPDATE ON experience_partners
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- TABLE: partner_placements
-- Advertisement placements for experience partners
-- ============================================================================
CREATE TABLE IF NOT EXISTS partner_placements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  partner_id UUID NOT NULL REFERENCES experience_partners(id) ON DELETE CASCADE,
  placement_type TEXT NOT NULL CHECK (placement_type IN ('dashboard', 'script_suggestion', 'sidebar', 'email', 'banner')),
  targeting_criteria JSONB DEFAULT '{}'::jsonb,
  priority INT DEFAULT 0,
  impressions INT DEFAULT 0,
  clicks INT DEFAULT 0,
  conversions INT DEFAULT 0,
  active_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  active_until TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_partner_placements_partner ON partner_placements(partner_id);
CREATE INDEX IF NOT EXISTS idx_partner_placements_type ON partner_placements(placement_type);
CREATE INDEX IF NOT EXISTS idx_partner_placements_active ON partner_placements(is_active, active_from, active_until);

-- Auto-update updated_at timestamp
CREATE TRIGGER update_partner_placements_updated_at
  BEFORE UPDATE ON partner_placements
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- TABLE: partner_referrals
-- Track referrals from LEXA to partners (for commission tracking)
-- ============================================================================
CREATE TABLE IF NOT EXISTS partner_referrals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  partner_id UUID NOT NULL REFERENCES experience_partners(id),
  user_id UUID NOT NULL,
  placement_id UUID REFERENCES partner_placements(id),
  script_id UUID REFERENCES experience_briefs(id),
  referral_type TEXT NOT NULL CHECK (referral_type IN ('view', 'click', 'inquiry', 'booking')),
  value DECIMAL(10,2),
  commission_earned DECIMAL(10,2),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_partner_referrals_partner ON partner_referrals(partner_id);
CREATE INDEX IF NOT EXISTS idx_partner_referrals_user ON partner_referrals(user_id);
CREATE INDEX IF NOT EXISTS idx_partner_referrals_type ON partner_referrals(referral_type);
CREATE INDEX IF NOT EXISTS idx_partner_referrals_date ON partner_referrals(created_at DESC);

-- ============================================================================
-- COMMENTS (Documentation)
-- ============================================================================

COMMENT ON TABLE script_marketplace_listings IS 
'Marketplace listings for experience scripts (Phase 2 feature)';

COMMENT ON COLUMN script_marketplace_listings.listing_type IS 
'Listing type:
- free: No charge for download
- paid: One-time purchase price
- premium: Higher tier with additional features';

COMMENT ON COLUMN script_marketplace_listings.commission_rate IS 
'Platform commission as decimal (0.15 = 15%)';

COMMENT ON TABLE marketplace_purchases IS 
'Purchase history for marketplace transactions';

COMMENT ON TABLE experience_partners IS 
'Registered partners who advertise on LEXA platform';

COMMENT ON COLUMN experience_partners.branding IS 
'JSONB structure: {
  "logo_url": "https://...",
  "primary_color": "#123456",
  "tagline": "Luxury experiences...",
  "featured_image": "https://..."
}';

COMMENT ON COLUMN experience_partners.tier IS 
'Partnership tier:
- basic: Standard listing
- featured: Highlighted placement
- exclusive: Premium placement + priority';

COMMENT ON TABLE partner_placements IS 
'Advertisement placements with targeting and performance tracking';

COMMENT ON COLUMN partner_placements.targeting_criteria IS 
'JSONB structure: {
  "themes": ["Romance & Intimacy"],
  "destinations": ["French Riviera"],
  "budget_range": "luxury",
  "user_segments": ["frequent_travelers"]
}';

COMMENT ON TABLE partner_referrals IS 
'Tracks user interactions with partners for commission calculation';

-- ============================================================================
-- NOTE: These tables are placeholders for Phase 2
-- The actual marketplace and partner features will be implemented in Q2 2026
-- ============================================================================
