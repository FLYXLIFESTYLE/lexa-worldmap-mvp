// ============================================================================
// SAFE Theme Category Migration & Cleanup
// Preserves all existing POI relationships before deleting old categories
// ============================================================================

// STEP 1: Analyze current relationships
MATCH (p:poi)-[r:HAS_THEME]->(old:theme_category)
WHERE old.name IN [
  'Culture & Culinary',
  'Water & Wildlife Adventure', 
  'Raw Nature & Vibes',
  'Sports & Adrenaline',
  'Art & Fashion',
  'Beauty & Longevity'
]
RETURN old.name as old_category, 
       count(p) as poi_count,
       collect(DISTINCT p.name)[0..5] as sample_pois
ORDER BY poi_count DESC;

// ============================================================================
// STEP 2: Migrate Relationships - Culture & Culinary → Culinary Excellence
// ============================================================================

MATCH (p:poi)-[old_rel:HAS_THEME]->(old:theme_category {name: 'Culture & Culinary'})
MATCH (new:theme_category {name: 'Culinary Excellence'})
MERGE (p)-[new_rel:HAS_THEME]->(new)
SET new_rel.confidence = old_rel.confidence,
    new_rel.evidence = old_rel.evidence,
    new_rel.migrated_from = 'Culture & Culinary',
    new_rel.migrated_at = datetime()
WITH old_rel
DELETE old_rel
RETURN count(*) as relationships_migrated;

// ============================================================================
// STEP 3: Migrate - Raw Nature & Vibes → Nature & Wildlife
// ============================================================================

MATCH (p:poi)-[old_rel:HAS_THEME]->(old:theme_category {name: 'Raw Nature & Vibes'})
MATCH (new:theme_category {name: 'Nature & Wildlife'})
MERGE (p)-[new_rel:HAS_THEME]->(new)
SET new_rel.confidence = old_rel.confidence,
    new_rel.evidence = old_rel.evidence,
    new_rel.migrated_from = 'Raw Nature & Vibes',
    new_rel.migrated_at = datetime()
WITH old_rel
DELETE old_rel
RETURN count(*) as relationships_migrated;

// ============================================================================
// STEP 4: Migrate - Sports & Adrenaline → Adventure & Exploration
// ============================================================================

MATCH (p:poi)-[old_rel:HAS_THEME]->(old:theme_category {name: 'Sports & Adrenaline'})
MATCH (new:theme_category {name: 'Adventure & Exploration'})
MERGE (p)-[new_rel:HAS_THEME]->(new)
SET new_rel.confidence = old_rel.confidence,
    new_rel.evidence = old_rel.evidence,
    new_rel.migrated_from = 'Sports & Adrenaline',
    new_rel.migrated_at = datetime()
WITH old_rel
DELETE old_rel
RETURN count(*) as relationships_migrated;

// ============================================================================
// STEP 5: Migrate - Art & Fashion → Art & Architecture
// ============================================================================

MATCH (p:poi)-[old_rel:HAS_THEME]->(old:theme_category {name: 'Art & Fashion'})
MATCH (new:theme_category {name: 'Art & Architecture'})
MERGE (p)-[new_rel:HAS_THEME]->(new)
SET new_rel.confidence = old_rel.confidence,
    new_rel.evidence = old_rel.evidence,
    new_rel.migrated_from = 'Art & Fashion',
    new_rel.migrated_at = datetime()
WITH old_rel
DELETE old_rel
RETURN count(*) as relationships_migrated;

// ============================================================================
// STEP 6: Migrate - Beauty & Longevity → Wellness & Transformation
// ============================================================================

MATCH (p:poi)-[old_rel:HAS_THEME]->(old:theme_category {name: 'Beauty & Longevity'})
MATCH (new:theme_category {name: 'Wellness & Transformation'})
MERGE (p)-[new_rel:HAS_THEME]->(new)
SET new_rel.confidence = old_rel.confidence,
    new_rel.evidence = old_rel.evidence,
    new_rel.migrated_from = 'Beauty & Longevity',
    new_rel.migrated_at = datetime()
WITH old_rel
DELETE old_rel
RETURN count(*) as relationships_migrated;

// ============================================================================
// STEP 7: Special Case - Water & Wildlife Adventure (split into two)
// ============================================================================

// First: Create relationship to Water Sports & Marine
MATCH (p:poi)-[old_rel:HAS_THEME]->(old:theme_category {name: 'Water & Wildlife Adventure'})
MATCH (new_water:theme_category {name: 'Water Sports & Marine'})
MERGE (p)-[new_rel_water:HAS_THEME]->(new_water)
SET new_rel_water.confidence = old_rel.confidence * 0.8,
    new_rel_water.evidence = old_rel.evidence,
    new_rel_water.migrated_from = 'Water & Wildlife Adventure',
    new_rel_water.migrated_at = datetime()
RETURN count(*) as water_relationships_created;

// Second: Create relationship to Nature & Wildlife
MATCH (p:poi)-[old_rel:HAS_THEME]->(old:theme_category {name: 'Water & Wildlife Adventure'})
MATCH (new_nature:theme_category {name: 'Nature & Wildlife'})
MERGE (p)-[new_rel_nature:HAS_THEME]->(new_nature)
SET new_rel_nature.confidence = old_rel.confidence * 0.8,
    new_rel_nature.evidence = old_rel.evidence,
    new_rel_nature.migrated_from = 'Water & Wildlife Adventure',
    new_rel_nature.migrated_at = datetime()
RETURN count(*) as nature_relationships_created;

// Third: Delete old relationships
MATCH (p:poi)-[old_rel:HAS_THEME]->(old:theme_category {name: 'Water & Wildlife Adventure'})
DELETE old_rel
RETURN count(*) as old_relationships_deleted;

// ============================================================================
// STEP 8: Verify no POIs are still linked to old categories
// ============================================================================

MATCH (p:poi)-[r:HAS_THEME]->(old:theme_category)
WHERE old.name IN [
  'Culture & Culinary',
  'Water & Wildlife Adventure', 
  'Raw Nature & Vibes',
  'Sports & Adrenaline',
  'Art & Fashion',
  'Beauty & Longevity'
]
RETURN old.name, count(p) as remaining_pois;
// Should return 0 rows

// ============================================================================
// STEP 9: NOW safe to delete old theme category nodes
// ============================================================================

MATCH (t:theme_category)
WHERE t.name IN [
  'Culture & Culinary',
  'Water & Wildlife Adventure', 
  'Raw Nature & Vibes',
  'Sports & Adrenaline',
  'Art & Fashion',
  'Beauty & Longevity'
]
DELETE t
RETURN count(*) as categories_deleted;

// ============================================================================
// STEP 10: Update unique categories (Mental Health & Legacy, Business & Performance)
// ============================================================================

// Update: Mental Health & Legacy → Personal Growth & Legacy
MATCH (t:theme_category {name: "Mental Health & Legacy"})
SET t.name = "Personal Growth & Legacy",
    t.description = "Deep transformation, self-discovery, and lasting impact",
    t.icon = "🌟",
    t.luxuryScore = 8.5,
    t.short_description = "Mindset coaching, purpose retreats, legacy planning",
    t.personality_types = ["Knowledge", "Self-improvement", "Legacy builders"],
    t.evoked_feelings = ["Clarity", "purpose", "transformation", "meaning", "growth"],
    t.image_url = "https://images.unsplash.com/photo-1499209974431-9dddcece7f88?q=80&w=2400"
RETURN t.name as updated_category;

// Update: Business & Performance → Business & Executive Travel
MATCH (t:theme_category {name: "Business & Performance"})
SET t.name = "Business & Executive Travel",
    t.description = "Where productivity meets luxury",
    t.icon = "💼",
    t.luxuryScore = 8.2,
    t.short_description = "Executive retreats, networking events, workation destinations",
    t.personality_types = ["Action", "Achievers", "Leaders"],
    t.evoked_feelings = ["Focus", "achievement", "networking", "efficiency", "success"],
    t.image_url = "https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=2400"
RETURN t.name as updated_category;

// ============================================================================
// STEP 11: Final Verification
// ============================================================================

// Count all theme categories
MATCH (t:theme_category)
RETURN count(t) as total_theme_categories;
// Should return: 14

// Count all HAS_THEME relationships
MATCH ()-[r:HAS_THEME]->(:theme_category)
RETURN count(r) as total_theme_relationships;

// Show distribution of POIs across new theme categories
MATCH (p:poi)-[r:HAS_THEME]->(t:theme_category)
RETURN t.name as theme_category,
       t.icon as icon,
       count(p) as poi_count
ORDER BY poi_count DESC;

