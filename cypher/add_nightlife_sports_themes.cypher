// Add 2 new theme categories to Neo4j: Nightlife & Entertainment, Sports & Active
// Total themes: 12 → 14

// Create Nightlife & Entertainment theme
MERGE (t:theme_category {name: 'Nightlife & Entertainment'})
SET t.description = 'Exclusive after-hours experiences: VIP club access, private performances, rooftop lounges, and late-night discoveries',
    t.display_order = 13,
    t.is_active = true,
    t.hook = 'When the sun sets, your evening begins',
    t.icon = 'Music',
    t.accent_color = 'violet',
    t.updated_at = datetime();

// Create Sports & Active theme
MERGE (t:theme_category {name: 'Sports & Active'})
SET t.description = 'Active luxury experiences: championship golf, private tennis coaching, elite fitness sessions, and active wellness',
    t.display_order = 14,
    t.is_active = true,
    t.hook = 'Luxury isn''t passive – it''s powerful',
    t.icon = 'Trophy',
    t.accent_color = 'amber',
    t.updated_at = datetime();

// Verify all 14 themes exist
MATCH (t:theme_category)
RETURN t.name AS theme_name, t.display_order AS order
ORDER BY t.display_order;
