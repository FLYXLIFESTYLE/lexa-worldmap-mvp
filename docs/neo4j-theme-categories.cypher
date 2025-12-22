// ============================================================================
// LEXA Theme Categories - Neo4j Database Script
// ============================================================================

// PART 1: CHECK EXISTING THEME CATEGORIES
// ============================================================================
// Run this first to see what's already in your database

MATCH (t:theme_category)
RETURN t.name as name, 
       t.description as description, 
       t.icon as icon,
       t.image_url as image_url,
       t.luxuryScore as luxuryScore
ORDER BY t.name;

// ============================================================================
// PART 2: CREATE THEME CATEGORIES (if they don't exist)
// ============================================================================
// Run this to seed the 12 core theme categories

// 1. Romance & Intimacy
MERGE (t:theme_category {name: "Romance & Intimacy"})
SET t.description = "Where every moment is designed for connection",
    t.icon = "💕",
    t.luxuryScore = 9.5,
    t.short_description = "Private dinners, sunset experiences, couples spa treatments",
    t.personality_types = ["Lovers", "Connectors", "Quality Time seekers"],
    t.evoked_feelings = ["Deep connection", "intimacy", "tenderness", "presence", "devotion"],
    t.image_url = "https://images.unsplash.com/photo-1505881502353-a1986add3762";

// 2. Adventure & Exploration
MERGE (t:theme_category {name: "Adventure & Exploration"})
SET t.description = "For those who feel most alive on the edge",
    t.icon = "🏔️",
    t.luxuryScore = 8.5,
    t.short_description = "Helicopter excursions, diving expeditions, mountain adventures",
    t.personality_types = ["Thrill-seekers", "Achievers", "Blueprint"],
    t.evoked_feelings = ["Aliveness", "excitement", "achievement", "freedom", "vitality"],
    t.image_url = "https://images.unsplash.com/photo-1506905925346-21bda4d32df4";

// 3. Wellness & Transformation
MERGE (t:theme_category {name: "Wellness & Transformation"})
SET t.description = "Deep restoration for body, mind, and soul",
    t.icon = "🧘",
    t.luxuryScore = 9.0,
    t.short_description = "World-class spas, wellness retreats, mindfulness experiences",
    t.personality_types = ["Nurturing", "Self-care focused", "Healers"],
    t.evoked_feelings = ["Peace", "restoration", "clarity", "renewal", "balance"],
    t.image_url = "https://images.unsplash.com/photo-1540555700478-4be289fbecef";

// 4. Culinary Excellence
MERGE (t:theme_category {name: "Culinary Excellence"})
SET t.description = "Where taste becomes memory",
    t.icon = "🍷",
    t.luxuryScore = 9.2,
    t.short_description = "Michelin experiences, wine country, chef's tables, market tours",
    t.personality_types = ["Knowledge", "Connoisseurs", "Epicureans"],
    t.evoked_feelings = ["Sensory delight", "sophistication", "discovery", "indulgence"],
    t.image_url = "https://images.unsplash.com/photo-1414235077428-338989a2e8c0";

// 5. Cultural Immersion
MERGE (t:theme_category {name: "Cultural Immersion"})
SET t.description = "Experience the soul of a place",
    t.icon = "🎭",
    t.luxuryScore = 8.0,
    t.short_description = "Private museum tours, local artisans, authentic experiences",
    t.personality_types = ["Knowledge", "Learners", "Culture seekers"],
    t.evoked_feelings = ["Enrichment", "understanding", "connection", "wonder", "depth"],
    t.image_url = "https://images.unsplash.com/photo-1533929736458-ca588d08c8be";

// 6. Pure Luxury & Indulgence
MERGE (t:theme_category {name: "Pure Luxury & Indulgence"})
SET t.description = "Where 'too much' is just right",
    t.icon = "💎",
    t.luxuryScore = 10.0,
    t.short_description = "Ultra-luxury accommodations, VIP access, white-glove service",
    t.personality_types = ["Action", "Status-conscious", "Pleasure-seekers"],
    t.evoked_feelings = ["Pampered", "special", "exclusive", "elevated", "indulged"],
    t.image_url = "https://images.unsplash.com/photo-1566073771259-6a8506099945";

// 7. Nature & Wildlife
MERGE (t:theme_category {name: "Nature & Wildlife"})
SET t.description = "Raw beauty that humbles and inspires",
    t.icon = "🦁",
    t.luxuryScore = 8.8,
    t.short_description = "Wildlife safaris, whale watching, pristine ecosystems",
    t.personality_types = ["Wonder-seekers", "Environmentalists", "Adventurers"],
    t.evoked_feelings = ["Awe", "humility", "wonder", "respect", "connection"],
    t.image_url = "https://images.unsplash.com/photo-1516426122078-c23e76319801";

// 8. Water Sports & Marine
MERGE (t:theme_category {name: "Water Sports & Marine"})
SET t.description = "Where the ocean becomes your playground",
    t.icon = "🌊",
    t.luxuryScore = 7.5,
    t.short_description = "Diving, sailing, yachting, marine adventures",
    t.personality_types = ["Active", "Sporty", "Ocean lovers"],
    t.evoked_feelings = ["Freedom", "exhilaration", "vitality", "play", "energy"],
    t.image_url = "https://images.unsplash.com/photo-1559827260-dc66d52bef19";

// 9. Art & Architecture
MERGE (t:theme_category {name: "Art & Architecture"})
SET t.description = "Beauty that moves the mind and soul",
    t.icon = "🎨",
    t.luxuryScore = 8.3,
    t.short_description = "Design hotels, private galleries, architectural masterpieces",
    t.personality_types = ["Aesthetes", "Creatives", "Knowledge seekers"],
    t.evoked_feelings = ["Inspiration", "sophistication", "beauty", "elevation", "wonder"],
    t.image_url = "https://images.unsplash.com/photo-1541961017774-22349e4a1262";

// 10. Family Luxury
MERGE (t:theme_category {name: "Family Luxury"})
SET t.description = "Memories that span generations",
    t.icon = "👨‍👩‍👧‍👦",
    t.luxuryScore = 8.0,
    t.short_description = "Multi-generational villas, kids clubs, family adventures",
    t.personality_types = ["Family-focused", "Nurturing", "Legacy creators"],
    t.evoked_feelings = ["Joy", "connection", "legacy", "warmth", "belonging"],
    t.image_url = "https://images.unsplash.com/photo-1559827260-dc66d52bef19";

// 11. Celebration & Milestones
MERGE (t:theme_category {name: "Celebration & Milestones"})
SET t.description = "Marking moments that matter",
    t.icon = "🎉",
    t.luxuryScore = 9.3,
    t.short_description = "Anniversaries, birthdays, proposals, once-in-a-lifetime events",
    t.personality_types = ["Celebrators", "Memory makers", "Significance seekers"],
    t.evoked_feelings = ["Joy", "significance", "pride", "love", "memory"],
    t.image_url = "https://images.unsplash.com/photo-1464366400600-7168b8af9bc3";

// 12. Solitude & Reflection
MERGE (t:theme_category {name: "Solitude & Reflection"})
SET t.description = "Space to breathe, think, and simply be",
    t.icon = "🏝️",
    t.luxuryScore = 8.7,
    t.short_description = "Private islands, remote villas, digital detox, solo journeys",
    t.personality_types = ["Introverts", "Contemplatives", "Seekers"],
    t.evoked_feelings = ["Peace", "clarity", "freedom", "restoration", "presence"],
    t.image_url = "https://images.unsplash.com/photo-1559827260-dc66d52bef19";

// ============================================================================
// PART 3: VERIFY THE DATA
// ============================================================================

MATCH (t:theme_category)
RETURN count(t) as total_themes;

// Should return: total_themes = 12

// ============================================================================
// PART 4: QUERY FOR SPECIFIC USE CASES
// ============================================================================

// Get all themes sorted by luxury score
MATCH (t:theme_category)
RETURN t.name, t.luxuryScore, t.description
ORDER BY t.luxuryScore DESC;

// Get themes by personality type
MATCH (t:theme_category)
WHERE "Adventurers" IN t.personality_types
RETURN t.name, t.description;

// Get themes that evoke specific feelings
MATCH (t:theme_category)
WHERE any(feeling IN t.evoked_feelings WHERE toLower(feeling) CONTAINS "peace")
RETURN t.name, t.evoked_feelings;

// ============================================================================
// NOTES FOR IMPLEMENTATION
// ============================================================================

// 1. Run PART 1 first to check what exists
// 2. Run PART 2 to create/update all 12 theme categories
// 3. Run PART 3 to verify count
// 4. Replace placeholder image URLs with actual high-quality images
// 5. The frontend will query these using: getThemeCategories() function

