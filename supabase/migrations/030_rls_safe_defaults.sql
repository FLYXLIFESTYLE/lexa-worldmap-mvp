-- 030_rls_safe_defaults.sql
--
-- Purpose:
-- - Fix Supabase linter errors (RLS disabled + security definer views)
-- - Apply "safe defaults" for public read + user-owned access
-- - Lock internal/admin-only tables to service role only
--
-- Notes:
-- - Service role bypasses RLS (admin APIs + cron/scripts remain OK)
-- - Public read is limited to safe, non-sensitive reference data
-- - User-owned data is limited by auth.uid()

-- -----------------------------------------------------------------------------
-- 1) Views: force SECURITY INVOKER (not SECURITY DEFINER)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.pending_merges
WITH (security_invoker = true) AS
SELECT
  mc.id,
  ea.name AS poi_a_name,
  ea.lat AS poi_a_lat,
  ea.lon AS poi_a_lon,
  mc.source_a,
  eb.name AS poi_b_name,
  eb.lat AS poi_b_lat,
  eb.lon AS poi_b_lon,
  mc.source_b,
  mc.distance_meters,
  mc.name_similarity,
  mc.overall_confidence,
  d.name AS destination,
  mc.match_reason,
  mc.created_at
FROM poi_merge_candidates mc
JOIN experience_entities ea ON ea.id = mc.poi_a_id
JOIN experience_entities eb ON eb.id = mc.poi_b_id
LEFT JOIN destinations_geo d ON d.id = mc.destination_id
WHERE mc.status = 'pending'
ORDER BY mc.overall_confidence DESC, mc.created_at ASC;

CREATE OR REPLACE VIEW public.low_value_pois
WITH (security_invoker = true) AS
SELECT
  id,
  name,
  destination,
  category,
  script_contribution_score,
  luxury_score,
  confidence_score,
  enhanced,
  verified,
  created_at,
  last_enriched_at
FROM extracted_pois
WHERE
  enhanced = true
  AND verified = false
  AND (
    (script_contribution_score IS NOT NULL AND script_contribution_score < 40)
    OR (luxury_score IS NOT NULL AND luxury_score < 4)
  )
ORDER BY script_contribution_score ASC NULLS FIRST, luxury_score ASC NULLS FIRST;

CREATE OR REPLACE VIEW public.sections_needing_review
WITH (security_invoker = true) AS
SELECT
  s.id,
  s.section_type,
  s.title,
  s.content,
  s.tags,
  s.date_context,
  s.confidence,
  u.filename,
  u.created_at AS uploaded_at
FROM company_brain_sections s
JOIN company_brain_uploads u ON u.id = s.upload_id
WHERE s.status = 'needs_review'
ORDER BY s.confidence DESC, s.created_at ASC;

CREATE OR REPLACE VIEW public.approved_company_knowledge
WITH (security_invoker = true) AS
SELECT
  s.id,
  s.section_type,
  s.title,
  s.content,
  s.tags,
  s.date_context,
  s.confidence,
  u.filename AS source_document,
  s.reviewed_at,
  s.created_at
FROM company_brain_sections s
JOIN company_brain_uploads u ON u.id = s.upload_id
WHERE s.status = 'approved' AND s.include_in_retrieval = true
ORDER BY s.section_type, s.confidence DESC;

CREATE OR REPLACE VIEW public.client_dashboard_summary
WITH (security_invoker = true) AS
SELECT 
  ca.id,
  ca.email,
  ca.name,
  ca.personality_archetype,
  ca.vip_status,
  ca.total_scripts_created,
  ca.total_experiences_booked,
  ca.lifetime_value,
  COUNT(DISTINCT es.id) AS scripts_count,
  COUNT(DISTINCT cs.id) AS conversations_count,
  MAX(cs.started_at) AS last_conversation,
  AVG(cf.rating) AS avg_feedback_rating
FROM client_accounts ca
LEFT JOIN experience_scripts es ON ca.id = es.client_id
LEFT JOIN conversation_sessions cs ON ca.id = cs.client_id
LEFT JOIN client_feedback cf ON ca.id = cf.client_id
GROUP BY ca.id, ca.email, ca.name, ca.personality_archetype, ca.vip_status,
         ca.total_scripts_created, ca.total_experiences_booked, ca.lifetime_value;

CREATE OR REPLACE VIEW public.script_performance_analytics
WITH (security_invoker = true) AS
SELECT 
  es.id,
  es.title,
  es.client_archetype,
  es.story_theme,
  es.status,
  es.total_investment,
  es.created_at,
  es.finalized_at,
  COUNT(DISTINCT su.id) AS upsells_presented,
  COUNT(DISTINCT su.id) FILTER (WHERE su.client_response = 'accepted') AS upsells_accepted,
  SUM(su.additional_value) FILTER (WHERE su.client_response = 'accepted') AS upsell_revenue,
  AVG(cf.rating) AS avg_rating,
  AVG(cf.emotional_resonance_rating) AS avg_emotional_resonance
FROM experience_scripts es
LEFT JOIN script_upsells su ON es.id = su.script_id
LEFT JOIN client_feedback cf ON es.id = cf.script_id
GROUP BY es.id, es.title, es.client_archetype, es.story_theme, es.status,
         es.total_investment, es.created_at, es.finalized_at;

-- -----------------------------------------------------------------------------
-- 2) Enable RLS on flagged public tables
-- -----------------------------------------------------------------------------
ALTER TABLE IF EXISTS poi_url_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS script_marketplace_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS partner_referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS poi_merge_candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS company_brain_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS experience_partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS company_brain_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS client_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS experience_scripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS conversation_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS script_upsells ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS client_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS unstructured_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS conversation_artifacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS experience_entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS destinations_geo ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS experience_entity_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS experience_conflation_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS experience_artifacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS experience_ingestion_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS lexa_message_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS lexa_interaction_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS lexa_user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS membership_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS user_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS membership_usage_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS conversation_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS user_script_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS community_scripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS community_script_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS community_script_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS partner_placements ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS upsell_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS user_upsell_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS company_brain_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS theme_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS experience_entity_destinations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS experience_entity_destination_sources ENABLE ROW LEVEL SECURITY;

-- Optional: legacy table name seen in Supabase linter (may exist in DB)
DO $$
BEGIN
  IF to_regclass('public.marketplace_listing_purchases') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.marketplace_listing_purchases ENABLE ROW LEVEL SECURITY';
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 3) Public read (safe reference data)
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "public_read_destinations_geo" ON destinations_geo;
CREATE POLICY "public_read_destinations_geo"
ON destinations_geo
FOR SELECT TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS "public_read_theme_categories" ON theme_categories;
CREATE POLICY "public_read_theme_categories"
ON theme_categories
FOR SELECT TO anon, authenticated
USING (is_active = true);

DROP POLICY IF EXISTS "public_read_membership_tiers" ON membership_tiers;
CREATE POLICY "public_read_membership_tiers"
ON membership_tiers
FOR SELECT TO anon, authenticated
USING (is_active = true);

DROP POLICY IF EXISTS "public_read_upsell_packages" ON upsell_packages;
CREATE POLICY "public_read_upsell_packages"
ON upsell_packages
FOR SELECT TO anon, authenticated
USING (is_active = true);

DROP POLICY IF EXISTS "public_read_approved_community_scripts" ON community_scripts;
CREATE POLICY "public_read_approved_community_scripts"
ON community_scripts
FOR SELECT TO anon, authenticated
USING (moderation_status = 'approved');

DROP POLICY IF EXISTS "public_read_active_marketplace_listings" ON script_marketplace_listings;
CREATE POLICY "public_read_active_marketplace_listings"
ON script_marketplace_listings
FOR SELECT TO anon, authenticated
USING (status = 'active');

-- -----------------------------------------------------------------------------
-- 4) User-owned access (auth.uid())
-- -----------------------------------------------------------------------------
-- lexa_user_profiles
DROP POLICY IF EXISTS "users_read_lexa_user_profiles" ON lexa_user_profiles;
CREATE POLICY "users_read_lexa_user_profiles"
ON lexa_user_profiles
FOR SELECT TO authenticated
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "users_insert_lexa_user_profiles" ON lexa_user_profiles;
CREATE POLICY "users_insert_lexa_user_profiles"
ON lexa_user_profiles
FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "users_update_lexa_user_profiles" ON lexa_user_profiles;
CREATE POLICY "users_update_lexa_user_profiles"
ON lexa_user_profiles
FOR UPDATE TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- user_memberships
DROP POLICY IF EXISTS "users_read_user_memberships" ON user_memberships;
CREATE POLICY "users_read_user_memberships"
ON user_memberships
FOR SELECT TO authenticated
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "users_insert_user_memberships" ON user_memberships;
CREATE POLICY "users_insert_user_memberships"
ON user_memberships
FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "users_update_user_memberships" ON user_memberships;
CREATE POLICY "users_update_user_memberships"
ON user_memberships
FOR UPDATE TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- membership_usage_tracking
DROP POLICY IF EXISTS "users_read_membership_usage" ON membership_usage_tracking;
CREATE POLICY "users_read_membership_usage"
ON membership_usage_tracking
FOR SELECT TO authenticated
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "users_insert_membership_usage" ON membership_usage_tracking;
CREATE POLICY "users_insert_membership_usage"
ON membership_usage_tracking
FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "users_update_membership_usage" ON membership_usage_tracking;
CREATE POLICY "users_update_membership_usage"
ON membership_usage_tracking
FOR UPDATE TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- user_script_library
DROP POLICY IF EXISTS "users_read_user_script_library" ON user_script_library;
CREATE POLICY "users_read_user_script_library"
ON user_script_library
FOR SELECT TO authenticated
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "users_insert_user_script_library" ON user_script_library;
CREATE POLICY "users_insert_user_script_library"
ON user_script_library
FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "users_update_user_script_library" ON user_script_library;
CREATE POLICY "users_update_user_script_library"
ON user_script_library
FOR UPDATE TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "users_delete_user_script_library" ON user_script_library;
CREATE POLICY "users_delete_user_script_library"
ON user_script_library
FOR DELETE TO authenticated
USING (user_id = auth.uid());

-- community_scripts (creator access)
DROP POLICY IF EXISTS "creator_read_community_scripts" ON community_scripts;
CREATE POLICY "creator_read_community_scripts"
ON community_scripts
FOR SELECT TO authenticated
USING (creator_id = auth.uid());

DROP POLICY IF EXISTS "creator_insert_community_scripts" ON community_scripts;
CREATE POLICY "creator_insert_community_scripts"
ON community_scripts
FOR INSERT TO authenticated
WITH CHECK (creator_id = auth.uid());

DROP POLICY IF EXISTS "creator_delete_community_scripts" ON community_scripts;
CREATE POLICY "creator_delete_community_scripts"
ON community_scripts
FOR DELETE TO authenticated
USING (creator_id = auth.uid());

-- community_script_likes
DROP POLICY IF EXISTS "users_read_community_script_likes" ON community_script_likes;
CREATE POLICY "users_read_community_script_likes"
ON community_script_likes
FOR SELECT TO authenticated
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "users_insert_community_script_likes" ON community_script_likes;
CREATE POLICY "users_insert_community_script_likes"
ON community_script_likes
FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "users_delete_community_script_likes" ON community_script_likes;
CREATE POLICY "users_delete_community_script_likes"
ON community_script_likes
FOR DELETE TO authenticated
USING (user_id = auth.uid());

-- community_script_reports
DROP POLICY IF EXISTS "users_read_community_script_reports" ON community_script_reports;
CREATE POLICY "users_read_community_script_reports"
ON community_script_reports
FOR SELECT TO authenticated
USING (reporter_id = auth.uid());

DROP POLICY IF EXISTS "users_insert_community_script_reports" ON community_script_reports;
CREATE POLICY "users_insert_community_script_reports"
ON community_script_reports
FOR INSERT TO authenticated
WITH CHECK (reporter_id = auth.uid());

-- user_upsell_purchases (read own purchases)
DROP POLICY IF EXISTS "users_read_user_upsell_purchases" ON user_upsell_purchases;
CREATE POLICY "users_read_user_upsell_purchases"
ON user_upsell_purchases
FOR SELECT TO authenticated
USING (user_id = auth.uid());

-- conversation_summaries (read own)
DROP POLICY IF EXISTS "users_read_conversation_summaries" ON conversation_summaries;
CREATE POLICY "users_read_conversation_summaries"
ON conversation_summaries
FOR SELECT TO authenticated
USING (user_id = auth.uid());

-- script_marketplace_listings (seller read own drafts)
DROP POLICY IF EXISTS "seller_read_marketplace_listings" ON script_marketplace_listings;
CREATE POLICY "seller_read_marketplace_listings"
ON script_marketplace_listings
FOR SELECT TO authenticated
USING (seller_id = auth.uid());
