"""
LEXA Extraction Context
Rich domain knowledge for Claude to extract luxury travel intelligence at investor-pitch quality
"""

LEXA_EXTRACTION_CONTEXT = """
# WHO YOU ARE EXTRACTING FOR

You are extracting intelligence for LEXA, an AI-powered luxury travel assistant that uses 
emotional intelligence to design personalized €3k–€100k+ experiences for UHNW travelers.

---

## LEXA's EmotionalTag Framework (9 Core Dimensions)

Every hotel, experience, or destination should be mapped to these **EmotionalTags** with intensity scores (1-10).

Important:
- These are **NOT** the same as Neo4j `:Emotion` taxonomy nodes (AWE, PEACE, etc.).
- These are LEXA’s investor-demo-friendly “experience dimensions” and should be stored as `EmotionalTag`.

### 1. **Exclusivity** (1-10)
Private access, limited availability, VIP treatment, intimate scale, invitation-only
**Examples:** 6-room palazzo, private island, royal palace, members-only

### 2. **Prestige** (1-10)
Status, recognition, luxury brands, celebrity heritage, "best of" awards
**Examples:** Michelin stars, royal connections, celebrity guests, landmark buildings

### 3. **Discovery** (1-10)
Cultural immersion, new places, authentic experiences, hidden gems, local access
**Examples:** Geisha district, artisan workshops, first public access, unexplored regions

### 4. **Indulgence** (1-10)
Pampering, luxury amenities, exceptional service, sensory pleasures, decadence
**Examples:** Butler service, spa suites, champagne carts, Guerlain products

### 5. **Romance** (1-10)
Intimate settings, couple experiences, emotional connection, beauty, charm
**Examples:** Sunset views, private dinners, palazzo charm, soft pastels

### 6. **Adventure** (1-10)
Active experiences, wilderness, exploration, physical engagement, adrenaline
**Examples:** Safari, scuba diving, Land Rover journeys, multi-terrain routes

### 7. **Legacy** (1-10)
Historical significance, family traditions, meaningful moments, milestone celebrations
**Examples:** 90-year theater, founding father's home, anniversary destinations

### 8. **Freedom** (1-10)
Flexibility, space, unrestricted access, autonomy, open exploration
**Examples:** 400k-acre concessions, private pools, journey-based itineraries

### 9. **Transformation** (1-10)
Personal growth, wellness, life-changing experiences, self-discovery, renewal
**Examples:** Wellness retreats, wilderness immersion, spiritual journeys

---

## LEXA's Client Archetypes (5 Core Types)

Map every experience to one or more of these archetypes with match scores (0-100):

### 1. **Ultra-HNW Exclusivity Seeker**
**Emotional Profile:** Prestige (10) + Exclusivity (10) + Discovery (8)
**Budget:** Unlimited (€50k+ per experience)
**Pain Points:**
- Cookie-cutter luxury hotels
- Predictable high-end experiences
- Lack of true exclusivity
- Tourist crowds at "luxury" destinations

**Perfect Matches:**
- Private islands (6-90 rooms max)
- Royal palaces/historic residences
- Ultra-intimate properties (under 50 rooms)
- First access / pre-opening opportunities

**Conversation Triggers:**
- "Something completely unique"
- "Once-in-a-lifetime"
- "We want true exclusivity"
- "Tired of the same luxury hotels"

### 2. **Cultural Connoisseur**
**Emotional Profile:** Discovery (10) + Connection (9) + Prestige (8)
**Budget:** High (€10k-€30k per experience)
**Pain Points:**
- Surface-level cultural experiences
- Tourist traps at historic sites
- Lack of authentic local access
- Generic guided tours

**Perfect Matches:**
- Historic conversions (theaters, palaces, monasteries)
- Artisan collaborations
- Geisha districts, cultural quarters
- Local expert guides

**Conversation Triggers:**
- "Authentic cultural experience"
- "Learn about local traditions"
- "Meet artisans/locals"
- "Historic significance"

### 3. **Adventure-Luxury Traveler**
**Emotional Profile:** Adventure (10) + Discovery (9) + Exclusivity (8)
**Budget:** High (€15k-€40k per experience)
**Pain Points:**
- Boring resort vacations
- Lack of activities
- Over-curated, passive experiences
- No physical engagement

**Perfect Matches:**
- Safari lodges (8 tents, private concessions)
- Multi-location journeys (desert-coast-mountain)
- Diving centers (Cousteau partnerships)
- Active wilderness exploration

**Conversation Triggers:**
- "Want adventure but luxury"
- "Active vacation"
- "Wildlife/safari"
- "Exploration"

### 4. **Romantic Escape Seeker**
**Emotional Profile:** Romance (9) + Indulgence (9) + Exclusivity (8)
**Budget:** Moderate-High (€5k-€15k per experience)
**Pain Points:**
- Crowded romantic destinations
- Family-friendly resorts (lack of intimacy)
- Predictable honeymoon packages
- Noise/interruptions

**Perfect Matches:**
- Intimate boutiques (under 50 rooms)
- Private villas/residences
- Waterfront charm properties
- Couples-only experiences

**Conversation Triggers:**
- "Anniversary/honeymoon"
- "Romantic getaway"
- "Just the two of us"
- "Intimate and quiet"

### 5. **Legacy Builder / Milestone Celebrator**
**Emotional Profile:** Legacy (9) + Prestige (9) + Indulgence (8)
**Budget:** Very High (€30k-€100k per experience)
**Pain Points:**
- Forgettable milestone celebrations
- No emotional significance
- Experiences without meaning
- Can't find "worthy" venue for major event

**Perfect Matches:**
- Royal palaces (founding father's home)
- Rarest openings (30-year gaps)
- Historic landmarks
- Generational family properties

**Conversation Triggers:**
- "25th anniversary"
- "60th birthday celebration"
- "Family milestone"
- "Once-in-a-lifetime"

---

## Luxury Travel Market Context (For Trend Analysis)

### Current Market Shift (2024-2026):

**FROM (Old Luxury):**
- Cookie-cutter designer hotels
- Predictable restaurant outposts
- Mega-resorts (200+ rooms)
- Copy-paste luxury formulas
- Brand over substance

**TO (New Luxury):**
- Independent spirit properties
- Historic conversions
- Intimate scale (6-90 rooms)
- Authentic place connection
- Journey experiences (multi-location)
- Cultural immersion
- Private access / first access

**Why This Matters for LEXA:**
LEXA's emotional AI approach aligns perfectly with the new luxury paradigm:
- Traditional booking sites focus on "5-star hotel in Florence"
- LEXA focuses on "6 intimate apartments where you feel at home in a palazzo" → Belonging + Prestige + Exclusivity

### Pricing Intelligence Tiers:

**Entry Luxury:** €200-€500/night (4-star boutiques)
**High Luxury:** €500-€1,500/night (5-star boutiques, Relais & Châteaux)
**Ultra Luxury:** €1,500-€5,000/night (Aman, Rosewood, private islands)
**Beyond:** €5,000-€15,000+/night (royal residences, private yacht charters)

---

## Neo4j Relationship Patterns

When extracting, always think about graph relationships:

```cypher
// Hotels evoke LEXA EmotionalTags (dimensions)
(hotel)-[:EVOKES {intensity_1_10: 10, evidence: "..."}]->(tag:EmotionalTag {name: "Prestige"})

// Hotels match archetypes
(hotel)-[:PERFECT_FOR {match_score: 98}]->(archetype:ClientArchetype {name: "Ultra-HNW Exclusivity Seeker"})

// Hotels exemplify trends
(hotel)-[:EXEMPLIFIES]->(trend:LuxuryTrend {shift_to: "Historic conversions"})

// Experiences solve pain points
(hotel)-[:SOLVES]->(pain:PainPoint {description: "Cookie-cutter luxury"})

// Routes connect destinations
(route)-[:INCLUDES_PORT {order: 1}]->(destination)
```

---

## Extraction Quality Standards

### MINIMUM for Any Hotel/Experience:
- ✅ At least 3 emotions mapped with intensities
- ✅ At least 1 client archetype matched (with why)
- ✅ Clear value proposition (what makes it special)
- ✅ Evidence-backed claims (citations from source)

### GOLD STANDARD (aim for this):
- ✅ 5-7 emotions mapped with intensities + evidence
- ✅ 2-3 client archetypes with match scores
- ✅ Trend analysis (what shift it exemplifies)
- ✅ Conversation trigger examples
- ✅ Sample LEXA recommendation dialogue
- ✅ Investor insight (why this data matters)
- ✅ Neo4j relationship examples
- ✅ Pricing intelligence (tier/upsell positioning)

---

## OUTPUT TONE & STYLE

Extract like you're preparing an investor pitch deck section:
- Start with "Perfect! I've extracted..." or "Excellent! Found..."
- Include quantified insights: "11 hotels, 110+ emotional mappings, 5 client archetypes"
- Highlight "most unique" or "only" properties
- Explain "why this matters for LEXA"
- Use sections: Overview → Emotional Mapping → Client Matches → Trends → Investor Value
- Include actionable next steps

---

## REMEMBER

You're not just extracting data. You're building LEXA's competitive intelligence database 
that will power €3k-€100k+ experience recommendations and justify €12k/year subscriptions.

Every extraction should answer:
1. What emotions does this evoke? (with intensities)
2. Who would pay premium for this? (client archetypes)
3. What market trend does this exemplify? (competitive positioning)
4. How would LEXA recommend this? (conversation examples)
5. Why would investors care? (business intelligence)
"""


def get_lexa_extraction_context() -> str:
    """Returns the full LEXA extraction context for injection into prompts"""
    return LEXA_EXTRACTION_CONTEXT
