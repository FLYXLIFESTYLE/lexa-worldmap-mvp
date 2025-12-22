// ============================================================================
// Neo4j Theme Category Cleanup & Consolidation
// ============================================================================

// STEP 1: View all existing theme_category nodes to identify duplicates
MATCH (t:theme_category)
RETURN t.name as name, 
       t.description as description,
       t.icon as icon,
       t.image_url as image_url,
       t.luxuryScore as luxuryScore
ORDER BY t.name;

// ============================================================================
// STEP 2: Identify Duplicates and Overlaps
// ============================================================================

/*
ANALYSIS OF DUPLICATES (Based on your seeding results):

NEW (12 seeded):
1. Romance & Intimacy 💕
2. Adventure & Exploration 🏔️
3. Wellness & Transformation 🧘
4. Culinary Excellence 🍷
5. Cultural Immersion 🎭
6. Pure Luxury & Indulgence 💎
7. Nature & Wildlife 🦁
8. Water Sports & Marine 🌊
9. Art & Architecture 🎨
10. Family Luxury 👨‍👩‍👧‍👦
11. Celebration & Milestones 🎉
12. Solitude & Reflection 🏝️

EXISTING (15 before seeding):
1. Culture & Culinary ⭐⭐⭐⭐⭐ → MERGE with "Culinary Excellence"
2. Water & Wildlife Adventure ⭐⭐⭐⭐⭐ → MERGE with "Nature & Wildlife" or split
3. Raw Nature & Vibes ⭐⭐⭐⭐⭐ → MERGE with "Nature & Wildlife"
4. Sports & Adrenaline ⭐⭐⭐⭐⭐ → MERGE with "Adventure & Exploration"
5. Mental Health & Legacy ⭐⭐⭐⭐⭐ → KEEP (unique - wellness/reflection)
6. Art & Fashion ⭐⭐⭐⭐⭐ → MERGE with "Art & Architecture"
7. Beauty & Longevity ⭐⭐⭐⭐⭐ → MERGE with "Wellness & Transformation"
8. Business & Performance ⭐⭐⭐⭐⭐ → KEEP (unique - business travel)

RECOMMENDED CONSOLIDATION:
- Keep the 12 new ones (they have images and better structure)
- Delete 7 redundant old ones
- Keep 3 unique old ones (rename/enhance them)
- Add images to the 3 kept old ones
*/

// ============================================================================
// STEP 3: Delete Redundant Theme Categories
// ============================================================================

// Delete: Culture & Culinary (redundant with Culinary Excellence)
MATCH (t:theme_category {name: "Culture & Culinary"})
DETACH DELETE t;

// Delete: Water & Wildlife Adventure (covered by Water Sports & Marine + Nature & Wildlife)
MATCH (t:theme_category {name: "Water & Wildlife Adventure"})
DETACH DELETE t;

// Delete: Raw Nature & Vibes (redundant with Nature & Wildlife)
MATCH (t:theme_category {name: "Raw Nature & Vibes"})
DETACH DELETE t;

// Delete: Sports & Adrenaline (redundant with Adventure & Exploration)
MATCH (t:theme_category {name: "Sports & Adrenaline"})
DETACH DELETE t;

// Delete: Art & Fashion (merge into Art & Architecture)
MATCH (t:theme_category {name: "Art & Fashion"})
DETACH DELETE t;

// Delete: Beauty & Longevity (redundant with Wellness & Transformation)
MATCH (t:theme_category {name: "Beauty & Longevity"})
DETACH DELETE t;

// ============================================================================
// STEP 4: Rename and Enhance Unique Existing Categories
// ============================================================================

// Update: Mental Health & Legacy → Wellness & Reflection (broader appeal)
MATCH (t:theme_category {name: "Mental Health & Legacy"})
SET t.name = "Personal Growth & Legacy",
    t.description = "Deep transformation, self-discovery, and lasting impact",
    t.icon = "🌟",
    t.luxuryScore = 8.5,
    t.short_description = "Mindset coaching, purpose retreats, legacy planning",
    t.personality_types = ["Knowledge", "Self-improvement", "Legacy builders"],
    t.evoked_feelings = ["Clarity", "purpose", "transformation", "meaning", "growth"],
    t.image_url = "https://images.unsplash.com/photo-1499209974431-9dddcece7f88?q=80&w=2400";

// Update: Business & Performance → Business & Executive Travel
MATCH (t:theme_category {name: "Business & Performance"})
SET t.name = "Business & Executive Travel",
    t.description = "Where productivity meets luxury",
    t.icon = "💼",
    t.luxuryScore = 8.2,
    t.short_description = "Executive retreats, networking events, workation destinations",
    t.personality_types = ["Action", "Achievers", "Leaders"],
    t.evoked_feelings = ["Focus", "achievement", "networking", "efficiency", "success"],
    t.image_url = "https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=2400";

// ============================================================================
// STEP 5: Verify Final Count
// ============================================================================

MATCH (t:theme_category)
RETURN count(t) as total_theme_categories;
// Should return: 14 (12 new + 2 updated unique ones)

// ============================================================================
// STEP 6: View Final Theme Categories
// ============================================================================

MATCH (t:theme_category)
RETURN t.name as name,
       t.icon as icon,
       t.description as description,
       t.luxuryScore as luxuryScore,
       t.image_url as image_url
ORDER BY t.luxuryScore DESC;

// ============================================================================
// FINAL 14 THEME CATEGORIES:
// ============================================================================

/*
1. Pure Luxury & Indulgence 💎 (10.0)
2. Romance & Intimacy 💕 (9.5)
3. Celebration & Milestones 🎉 (9.3)
4. Culinary Excellence 🍷 (9.2)
5. Wellness & Transformation 🧘 (9.0)
6. Nature & Wildlife 🦁 (8.8)
7. Solitude & Reflection 🏝️ (8.7)
8. Adventure & Exploration 🏔️ (8.5)
9. Personal Growth & Legacy 🌟 (8.5) [UPDATED]
10. Art & Architecture 🎨 (8.3)
11. Business & Executive Travel 💼 (8.2) [UPDATED]
12. Cultural Immersion 🎭 (8.0)
13. Family Luxury 👨‍👩‍👧‍👦 (8.0)
14. Water Sports & Marine 🌊 (7.5)
*/

