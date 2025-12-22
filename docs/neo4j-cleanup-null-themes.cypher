// ============================================================================
// Clean Up NULL Theme Categories
// ============================================================================

// STEP 1: Find all theme_category nodes with NULL or empty names
MATCH (t:theme_category)
WHERE t.name IS NULL OR t.name = '' OR t.name = 'null'
RETURN t, 
       id(t) as node_id,
       labels(t) as labels,
       properties(t) as props,
       size((t)<--()) as incoming_relationships
ORDER BY incoming_relationships DESC;

// STEP 2: Count POIs linked to NULL theme categories
MATCH (p:poi)-[r:HAS_THEME]->(t:theme_category)
WHERE t.name IS NULL OR t.name = '' OR t.name = 'null'
RETURN count(DISTINCT p) as pois_with_null_themes,
       count(r) as null_theme_relationships;

// STEP 3: Delete relationships to NULL theme categories
MATCH (p:poi)-[r:HAS_THEME]->(t:theme_category)
WHERE t.name IS NULL OR t.name = '' OR t.name = 'null'
DELETE r
RETURN count(r) as relationships_deleted;

// STEP 4: Delete NULL theme category nodes
MATCH (t:theme_category)
WHERE t.name IS NULL OR t.name = '' OR t.name = 'null'
DELETE t
RETURN count(t) as null_categories_deleted;

// STEP 5: Verify cleanup
MATCH (t:theme_category)
WHERE t.name IS NULL OR t.name = '' OR t.name = 'null'
RETURN count(t) as remaining_null_categories;
// Should return: 0

// STEP 6: Final theme_category count
MATCH (t:theme_category)
WHERE t.name IS NOT NULL AND t.name <> '' AND t.name <> 'null'
RETURN count(t) as valid_theme_categories;
// Should return: 14 (or 26 if you haven't run the main cleanup yet)

// STEP 7: Show all valid theme categories
MATCH (t:theme_category)
WHERE t.name IS NOT NULL AND t.name <> '' AND t.name <> 'null'
RETURN t.name as name,
       t.icon as icon,
       t.luxuryScore as luxuryScore,
       size((t)<-[:HAS_THEME]-()) as poi_count
ORDER BY t.luxuryScore DESC, t.name;

