# Product Context

## Why LEXA Exists

### The Core Insight
Humans don't remember destinations. They remember **feelings**.

When someone recalls their best vacation, they don't say "We stayed at Hotel X and ate at Restaurant Y." They say:
- "I can still taste that meal"
- "The smell of lavender instantly brings me back"
- "I felt completely alive for the first time in years"
- "We reconnected in a way we hadn't in months"

**LEXA is built to design these moments intentionally.**

## The Experience DNA Framework

This is LEXA's proprietary methodology and core differentiator.

### The Three Pillars:

#### 1. **STORY** 📖
Humans are wired for narrative (cave paintings = stories, not facts).

Every experience needs an arc:
- **Beginning**: Arrival, softening, transition from work-mode
- **Peak**: The "foodgasm" moment—the scene they'll replay forever
- **Resolution**: What they take home (not a souvenir, but a transformation)

Examples:
- "Reconnection after months of distance"
- "Celebrating freedom after a hard year"
- "Rediscovering each other"
- "The adventure that changed everything"

#### 2. **EMOTION** ❤️
The feeling IS the destination.

Core emotions:
- **Freedom**: Weightless, unchained, spontaneous
- **Connection**: Intimate, present, vulnerable
- **Awe**: Humbled, expanded, perspective-shifting
- **Peace**: Still, restored, grounded
- **Thrill**: Alive, electric, vital
- **Belonging**: Welcomed, understood, home

Most powerful experiences blend 2-3 emotions:
- "Thrilling freedom"
- "Peaceful awe"
- "Intimate adventure"

#### 3. **TRIGGER** 🎯
The sensory anchor that brings it all back.

**The "Foodgasm Principle":**
Like a meal so transcendent you can taste it years later. Every experience needs a peak moment that gets encoded with sensory triggers.

Five senses as memory anchors:
- **Smell** (most powerful): Lavender in Provence, sea salt, coffee & croissants
- **Taste**: That truffle pasta, champagne at sunset, fresh figs
- **Sound**: "Our song," ocean waves, market sounds
- **Sight**: The view from that terrace, her face in golden hour
- **Touch**: Cool marble, soft linen, warm sand

## How LEXA Works

### The User Journey:

#### 1. **Theme Selection** (Stage 0 - NEW!)
Instead of "Where do you want to go?"

→ Visual selection of 12 theme categories with stunning images:
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
12. Solitude & Reflection 🌅

Each theme shows:
- Evocative image
- Short description
- Personality types it attracts
- Feelings it evokes

#### 2. **The 90-Second WOW** (First 3 Questions)
LEXA asks 3 "mindblowing questions" designed to make clients think:
*"Finally, someone who gets it."*

Not "Where?" or "When?" but:
- "When this trip is over, what do you want to feel first?"
- "Tell me about a past vacation where you felt truly alive. What made it special?"
- "What would make this experience unforgettable—not impressive, but meaningful?"

**If client isn't impressed in 90 seconds, they can walk away.** (As promised on landing page)

#### 3. **Experience DNA Discovery**
LEXA extracts:
- **Story arc**: What is this experience marking/celebrating/healing?
- **Core emotion + secondary emotion**: What feelings are they chasing?
- **Sensory triggers**: What smells/tastes/sounds will anchor this memory?

Example output:
```
EXPERIENCE DNA: Chris & Wife

STORY: "Reconnection after months of distance"
A weekend where nothing else exists—just presence, luxury, and her.

EMOTION: Intimate devotion mixed with sensory luxury
What unlocks it: Slow mornings, private moments, beauty as a gift

TRIGGER:
- The scent of salt air and roses
- The taste of champagne at sunset
- The sound of waves with no other noise
```

#### 4. **Experience Script** (The Deliverable)
A 4-part narrative (NOT an itinerary):

**1. TITLE** (The Theme)
- Evocative, not generic
- Example: ✅ "The Reconnection: A Love Letter in Three Acts"
- NOT: ❌ "A Week in the Mediterranean"

**2. THE HOOK** (2-3 sentences)
- Creates FOMO before revealing details
- Example: *"There's a table set for two where the cliffs meet the sea. By the time you sit down, the world will have disappeared—nothing left but candlelight, the sound of waves, and the way she looks at you like she's seeing you for the first time in months."*

**3. EMOTIONAL DESCRIPTION** (The Story)
- 3-4 paragraphs: Before → During → After transformation
- Focus on feelings, not logistics
- Client can envision the experience

**4. SIGNATURE HIGHLIGHTS** (3-6 Peak Moments)
- NOT specific venues (yet)
- Categories with emotional descriptions
- Examples:
  - 🕯️ Private Cliffside Dining - A table where you're the only guests
  - 💆 Couples Spa Ritual - Rose oil treatments with coastal views
  - 🌅 Sunrise Together - Coffee on your terrace before the world wakes

**Tiered Upsells (JSON-first engine)**
- Base script: Theme, Hook, Emotional Description, Signature Highlights
- Tier 1: Day-by-day flow
- Tier 2: Booking links + coordinates + venue candidates
- Tier 3: Planning service
- Tier 4: White glove (plan/book/execute with concierge onsite)

## Claude-Quality Ingestion & World Context
- **Ingestion priorities**: Crawl provider sites (with sub-pages) and file uploads → multi-pass extraction (outline → expand → validate/dedupe) → confidence scoring → captain approval → Neo4j + pgvector.
- **Source-backed only**: Concrete claims must have sources; generic fallbacks must be labeled as generic.
- **Counts**: Separate real extracted counts from estimated potential coverage.
- **World context (later/paid)**: Tavily + reliable APIs (weather, advisories, events) for “right now” suggestions, gated to paid tier when implemented.

## Captain Upload UX (current)
- File cards show quick summary (POIs, experiences, providers) and keep/dump state.
- Editor modal: per-item confidence editable as 0–100% (stored as fractions), bulk select/delete for POIs, experiences, providers, and individual delete.
- Providers are handled separately (no longer mixed with competitors); competitor data is converted to providers when present.
- Removed top-level confidence slider/emotion/count boxes to keep focus on item-level edits and keep/dump decision.

## The Knowledge Graph (Neo4j)

### Why Graph Database?
Traditional SQL can't handle:
- "Find romantic restaurants in Monaco with sunset views near luxury hotels favored by nurturing personalities"

Neo4j can traverse relationships in milliseconds:
```cypher
MATCH (poi:poi)-[:HAS_THEME]->(theme:theme_category {name: 'Romance & Intimacy'})
WHERE poi.luxury_score > 8
  AND poi.destination_name CONTAINS 'Monaco'
RETURN poi
```

### What's in the Graph:
- **300,000+ POIs** (restaurants, hotels, activities, viewpoints, beaches, cultural sites)
- **14 theme categories** (emotional tagging)
- **350+ yacht destinations** (with luxury confidence scores)
- **Relationships**: `LOCATED_IN`, `HAS_THEME`, `SUPPORTS_ACTIVITY`

### Data Sources:
1. **OpenStreetMap** (initial POIs)
2. **Google Places API** (enrichment: ratings, reviews, pricing, photos)
3. **Manual uploads** (yacht destinations, curated experiences)
4. **Foursquare** (activity data - planned)

### Luxury Scoring Algorithm:
```
Base Score: Google Rating × 2 (max 10)

Modifiers:
+ Price Level $$$$ → +2
+ Michelin Star → +3 per star
+ Review count > 500 → +0.5
+ Luxury keywords → +0.5 each
- Rating < 4.0 → -2
- Price Level $ → -3

Final Score: Clamp 0-10
```

## The RAG System

### What is RAG?
**Retrieval Augmented Generation** = AI + Real Data

Traditional chatbots: Hallucinate, generic, no real-time data
LEXA's RAG: Every response grounded in Neo4j graph data

### How It Works:
1. **User message**: "I want a romantic weekend in Monaco"
2. **LEXA queries Neo4j**: Finds POIs with Romance theme, Monaco location, high luxury score
3. **Claude 3.5 Sonnet**: Crafts response using REAL data
4. **Result**: "Le Louis XV at Hotel de Paris (3 Michelin stars, luxury score 9.8) offers intimate dining with..."

### Why Powerful:
- ✅ **No hallucinations**: If data doesn't exist, LEXA says so
- ✅ **Context-aware**: Knows client personality, past preferences
- ✅ **Relationship-rich**: "This restaurant pairs with your hotel and theme"
- ✅ **Real-time accurate**: Google Places data updated regularly

## User Experience Principles

### 1. Feeling-First, Always
- Never ask "Where?" first
- Always start with "What do you want to feel?"
- Logistics come AFTER emotional alignment

### 2. Visual > Text
- Theme cards with stunning imagery
- Destination cards with high-quality photos
- Experience scripts with evocative language

### 3. Progressive Disclosure
- Start simple (pick a theme)
- Gradually reveal complexity
- Advanced users can skip steps

### 4. Luxury Aesthetics
- **Colors**: Gold (#D4AF37), Navy (#1E293B), White
- **Typography**: Elegant, spacious, readable
- **Imagery**: Aspirational but authentic
- **Tone**: Sophisticated but warm, not stuffy

### 5. Mobile-First (Future)
- Desktop works now
- Mobile app planned (Q2 2026)
- Voice input for hands-free

## Business Model

### Revenue Streams:

**B2C (Direct to Travelers):**
- **Free**: Experience Script (lead gen)
- **$497**: Detailed day-by-day itinerary
- **$2,997+**: Full concierge service

**B2B (Agents & Brokers):**
- **$297/month**: Affiliate subscription
- **10-15% commission**: On bookings they close
- **$2,997/month**: Enterprise (unlimited users)

**Tourism Boards:**
- **$4,997**: Destination enrichment package
- **$997/month**: Featured placement
- **$497/month**: Data insights dashboard

**Data Licensing (Future):**
- API access to luxury POI database
- Emotional recommendation engine licensing

## Problems LEXA Solves

### For Travelers:
- ❌ Generic "Top 10" lists → ✅ Personalized Experience DNA
- ❌ Logistics-focused planning → ✅ Emotion-first design
- ❌ Forgettable trips → ✅ Memory-encoded experiences

### For Yacht Brokers:
- ❌ "Where do you want to go?" → ✅ "What do you want to feel?"
- ❌ Client dissatisfaction post-charter → ✅ Emotional profiling & itinerary design
- ❌ One-time transactions → ✅ Relationship building with emotional data

### For Travel Agents:
- ❌ Can't scale personalization → ✅ AI-augmented human service
- ❌ Limited by personal experience → ✅ 300K+ POI database
- ❌ Manual research → ✅ Instant graph queries

### For Tourism Boards:
- ❌ Generic marketing → ✅ Emotional positioning
- ❌ No visitor insights → ✅ Data-driven theme alignment
- ❌ Competing on "Top 10" lists → ✅ Unique emotional narratives

## Success Stories (Planned)

*Example of what success looks like:*

**Client**: Business executive and wife
**Problem**: "We're busy, disconnected, need quality time"
**Traditional Agent**: Suggests Maldives resort, books flights
**LEXA Approach**:
1. Identifies theme: Romance & Intimacy
2. Discovers DNA: Reconnection story, intimate devotion emotion, sensory luxury triggers
3. Suggests: French Riviera in May (roses in bloom, fewer crowds)
4. Creates Script: "The Reconnection: A Weekend of Presence & Devotion"
5. Delivers: Experience script with signature moments

**Result 10 Years Later**:
- Client: "Whenever I smell lavender, I'm instantly back on that terrace with her."
- Not: "We went to Nice. It was nice."

## The Ultimate Test

**Ask yourself:** "Will they remember this moment in 10 years?"

**If yes:** What will trigger the memory?

**That's the Experience DNA.**

