-- ============================================================================
-- Update Membership Tiers with User-Defined Structure
-- Replaces old tiers (Free, Explorer, Creator, Concierge) with new tiers
-- Created: January 5, 2026
-- ============================================================================

-- First, update existing tiers or insert new ones
-- We'll use ON CONFLICT to update existing tiers

-- ============================================================================
-- TIER 1: Free (The Spark) - €0/month
-- ============================================================================
INSERT INTO membership_tiers (name, slug, description, price_monthly, price_annual, features, limits, is_active, display_order)
VALUES (
  'The Spark',
  'spark',
  'Get started with LEXA - 1 basic script per year',
  0.00,
  0.00,
  '{
    "lexa_chat": true,
    "lexa_chat_limit": "1_theme_1_destination_1_script_per_year",
    "emotional_profile": true,
    "preferences": false,
    "kyc": false,
    "support": "standard_email",
    "script_marketplace": "brand_scripts_only",
    "basic_scripts": true,
    "brand_scripts": true,
    "person_scripts": false,
    "fully_curated_scripts": false,
    "day_by_day_flow": false,
    "venue_candidates": false,
    "logistics_framework": false,
    "budget_guidance": false,
    "direct_booking_links": false,
    "poi_ids_coordinates_maps": false,
    "seasonal_optimization": false,
    "post_trip_debrief": false,
    "concierge_review_revision": false,
    "full_planning_service": false,
    "booking_coordination": false,
    "crew_supplier_brief": false,
    "real_time_updates": false,
    "custom_requests": false,
    "vip_access": false,
    "yacht_charter_integration": false,
    "private_jet_coordination": false,
    "villa_rental_curation": false,
    "onsite_concierge": false,
    "live_optimization": false,
    "photo_video_memory_capture": false,
    "24hour_call_support": false,
    "sycc_membership": false,
    "group_experience_design": false,
    "upsell_access": ["discovery", "blueprint"]
  }'::jsonb,
  '{
    "basic_scripts_per_year": 1,
    "brand_scripts_per_year": 1,
    "person_scripts_per_year": 0,
    "fully_curated_scripts_per_year": 0,
    "conversations_per_month": 10,
    "script_revisions": 1
  }'::jsonb,
  true,
  1
) ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price_monthly = EXCLUDED.price_monthly,
  price_annual = EXCLUDED.price_annual,
  features = EXCLUDED.features,
  limits = EXCLUDED.limits,
  display_order = EXCLUDED.display_order;

-- ============================================================================
-- TIER 2: The Inspired - €297/month (paid yearly = €3,564/year)
-- ============================================================================
INSERT INTO membership_tiers (name, slug, description, price_monthly, price_annual, features, limits, is_active, display_order)
VALUES (
  'The Inspired',
  'inspired',
  'Unlimited basic scripts + 3 fully curated experiences per year',
  297.00,
  3564.00,
  '{
    "lexa_chat": true,
    "lexa_chat_limit": "unlimited",
    "emotional_profile": true,
    "preferences": true,
    "kyc": false,
    "support": "priority_email",
    "script_marketplace": "personalized",
    "basic_scripts": true,
    "brand_scripts": true,
    "person_scripts": true,
    "fully_curated_scripts": true,
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
    "concierge_review_limit": "1_review_2_revisions_per_script",
    "concierge_revision_restrictions": "1_theme_change_or_1_destination_change",
    "full_planning_service": false,
    "booking_coordination": false,
    "crew_supplier_brief": false,
    "real_time_updates": false,
    "custom_requests": false,
    "vip_access": false,
    "yacht_charter_integration": false,
    "private_jet_coordination": false,
    "villa_rental_curation": false,
    "onsite_concierge": false,
    "live_optimization": false,
    "photo_video_memory_capture": false,
    "24hour_call_support": false,
    "sycc_membership": true,
    "group_experience_design": false,
    "upsell_access": ["concierge", "white_glove"],
    "fully_curated_includes": ["discovery", "blueprint"]
  }'::jsonb,
  '{
    "basic_scripts_per_year": -1,
    "brand_scripts_per_year": 6,
    "person_scripts_per_year": 6,
    "fully_curated_scripts_per_year": 3,
    "conversations_per_month": -1,
    "script_revisions": 3
  }'::jsonb,
  true,
  2
) ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price_monthly = EXCLUDED.price_monthly,
  price_annual = EXCLUDED.price_annual,
  features = EXCLUDED.features,
  limits = EXCLUDED.limits,
  display_order = EXCLUDED.display_order;

-- ============================================================================
-- TIER 3: The Connoisseur - €997/month (paid yearly = €11,964/year)
-- ============================================================================
INSERT INTO membership_tiers (name, slug, description, price_monthly, price_annual, features, limits, is_active, display_order)
VALUES (
  'The Connoisseur',
  'connoisseur',
  '5 fully curated experiences per year with full concierge service',
  997.00,
  11964.00,
  '{
    "lexa_chat": true,
    "lexa_chat_limit": "unlimited",
    "emotional_profile": true,
    "preferences": true,
    "kyc": true,
    "support": "24hour_whatsapp_concierge",
    "script_marketplace": "personalized",
    "basic_scripts": true,
    "brand_scripts": true,
    "person_scripts": true,
    "fully_curated_scripts": true,
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
    "concierge_review_limit": "unlimited",
    "full_planning_service": true,
    "booking_coordination": true,
    "crew_supplier_brief": true,
    "real_time_updates": true,
    "custom_requests": true,
    "vip_access": true,
    "yacht_charter_integration": false,
    "private_jet_coordination": false,
    "villa_rental_curation": false,
    "onsite_concierge": false,
    "live_optimization": false,
    "photo_video_memory_capture": false,
    "24hour_call_support": false,
    "sycc_membership": true,
    "group_experience_design": false,
    "upsell_access": ["white_glove"],
    "fully_curated_includes": ["discovery", "blueprint", "concierge"]
  }'::jsonb,
  '{
    "basic_scripts_per_year": -1,
    "brand_scripts_per_year": 12,
    "person_scripts_per_year": 12,
    "fully_curated_scripts_per_year": 5,
    "conversations_per_month": -1,
    "script_revisions": -1
  }'::jsonb,
  true,
  3
) ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price_monthly = EXCLUDED.price_monthly,
  price_annual = EXCLUDED.price_annual,
  features = EXCLUDED.features,
  limits = EXCLUDED.limits,
  display_order = EXCLUDED.display_order;

-- ============================================================================
-- Deactivate old tiers (if they exist and aren't being used)
-- ============================================================================
UPDATE membership_tiers
SET is_active = false
WHERE slug IN ('explorer', 'creator', 'concierge')
  AND slug NOT IN ('spark', 'inspired', 'connoisseur');

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON COLUMN membership_tiers.features IS 'JSONB object containing feature flags. Higher tiers include all features of lower tiers.';
COMMENT ON COLUMN membership_tiers.limits IS 'JSONB object with numeric limits per year (-1 = unlimited). Script limits reset on subscription anniversary.';
COMMENT ON COLUMN membership_tiers.price_annual IS 'Annual price (subscription must be paid yearly to prevent abuse).';
