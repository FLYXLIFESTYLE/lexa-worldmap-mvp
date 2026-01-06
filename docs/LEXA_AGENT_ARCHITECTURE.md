# LEXA Agent Architecture
**Purpose:** Define all AI agents, their missions, capabilities, and intelligence flows  
**Date:** January 6, 2026  
**Status:** Comprehensive mapping + optimized prompts

---

## LEXA AGENT ECOSYSTEM (9 Agents)

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER FACING                              │
├─────────────────────────────────────────────────────────────────┤
│  1. LEXA Chat Agent (Conversation & Emotional Intelligence)      │
│  2. Briefing Collector Agent (Requirements Gathering)            │
│  3. Script Composer Agent (Experience Design)                    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      KNOWLEDGE LAYER                             │
├─────────────────────────────────────────────────────────────────┤
│  4. Knowledge Retrieval Agent (Brain v2 - Grounded Context)      │
│  5. Emotional Profiler Agent (Archetype Detection)               │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     INTELLIGENCE LAYER                           │
├─────────────────────────────────────────────────────────────────┤
│  6. Intelligence Extractor Agent (Data → Insights)               │
│  7. Multipass Enrichment Agent (Deep Analysis)                   │
│  8. Scraping Agent (URL → Content → Intelligence)                │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      STRATEGIC LAYER (NEW)                       │
├─────────────────────────────────────────────────────────────────┤
│  9. Market Intelligence Agent (Trends, Demand, Strategy)         │
└─────────────────────────────────────────────────────────────────┘
```

---

## AGENT 1: LEXA CHAT AGENT
**Purpose:** Main conversational AI that interacts with users

### Mission:
Guide users through luxury experience design using emotional intelligence, creating personalized €3k-€100k+ experiences through natural conversation.

### Current Location:
- `app/api/lexa/chat/route.ts` (main orchestrator)
- `lib/lexa/state-machine.ts` (conversation stages)
- `lib/lexa/stages/*.ts` (stage-specific prompts)

### Capabilities:
- 10+ conversation stages (WELCOME → DISARM → MIRROR → COMMIT → BRIEFING → SCRIPT → REFINE → HANDOFF)
- Emotional signal detection
- Hybrid approach: Deterministic + Claude fallback
- Session state management
- Multi-language support (8 languages)
- Quick action button generation

### Intelligence Flow:
**Input:** User messages  
**Process:**
1. Detect conversation stage
2. Extract emotional signals
3. Retrieve grounded context from Brain v2
4. Generate response with Claude
5. Update session state
6. Track profile learning

**Output:** Natural language responses, UI suggestions, state updates

### Data Sources:
- Current session state (Supabase)
- User emotional profile (Supabase)
- Grounded POI context (Neo4j via Retrieval Agent)
- Conversation history

### Current Prompt Quality: ⭐⭐⭐⭐ (Good, but can be optimized)

---

## AGENT 2: BRIEFING COLLECTOR AGENT
**Purpose:** Systematically gather 10 required fields for Operations Agent handoff

### Mission:
Collect complete experience requirements (when, where, theme, budget, duration, emotional_goals, must_haves, best_experiences, worst_experiences, bucket_list) through conversational extraction.

### Current Location:
- `lib/lexa/briefing-processor.ts` (orchestration)
- `lib/lexa/stages/briefing-collect.ts` (system prompt)
- `lib/lexa/claude-client.ts` (field extraction)

### Capabilities:
- 10-field structured collection
- Claude-powered field extraction from natural language
- Suggestion engine integration (if user says "suggest")
- Validation before handoff
- Missing field detection

### Intelligence Flow:
**Input:** User responses to briefing questions  
**Process:**
1. Extract structured data from natural language
2. Map to 10 required fields
3. Validate completeness
4. Identify next missing field
5. Generate contextual question

**Output:** Structured experience brief (JSONB), next question

### Data Generated:
```typescript
{
  when_at: { timeframe, dates, flexibility },
  where_at: { destination, regions, hints },
  theme: string,
  budget: { amount, currency, sensitivity },
  duration: { days, flexibility },
  emotional_goals: { desired_feelings, avoid_fears, success_definition },
  must_haves: string[],
  best_experiences: [{ experience, why }],
  worst_experiences: [{ experience, why }],
  bucket_list: string[]
}
```

### Current Prompt Quality: ⭐⭐⭐ (Functional, needs emotional intelligence upgrade)

---

## AGENT 3: SCRIPT COMPOSER AGENT
**Purpose:** Generate personalized experience scripts from brief + knowledge graph

### Mission:
Transform emotional profile + brief + grounded POIs into €3k-€100k+ experience scripts with day-by-day itineraries, venue recommendations, and upsell triggers.

### Current Location:
- `rag_system/core/ailessia/script_composer.py` (backend)
- `app/api/lexa/chat/route.ts` (SCRIPT_DRAFT stage)
- `lib/lexa/stages/script-draft.ts` (system prompt)

### Capabilities:
- JSON-first script generation
- Grounded POI injection (from Brain v2)
- Day-by-day itinerary creation
- Emotional arc design
- Signature moments highlighting
- Upsell trigger identification

### Intelligence Flow:
**Input:** Experience brief + grounded POIs  
**Process:**
1. Retrieve relevant POIs from Neo4j (via Retrieval Agent)
2. Design emotional arc (arrival → peak → departure)
3. Match POIs to emotional goals
4. Generate day-by-day flow
5. Inject booking links and coordinates (tier-dependent)
6. Add upsell triggers

**Output:** Experience script JSON with:
- Title, hook, emotional description
- Day-by-day itinerary
- Signature highlights
- Venue recommendations
- Booking details (tier-dependent)
- Upsell triggers

### Data Sources:
- Experience brief (from Briefing Collector)
- Neo4j POIs (high-confidence approved)
- Supabase drafts (fallback)
- User emotional profile
- Tier/upsell configuration

### Current Prompt Quality: ⭐⭐⭐ (Basic, needs grounded POI integration)

---

## AGENT 4: KNOWLEDGE RETRIEVAL AGENT (Brain v2)
**Purpose:** Grounded retrieval + ranking for POI context injection

### Mission:
Retrieve the most relevant, high-quality POIs from the knowledge graph to ground LEXA's recommendations in real, approved data (not hallucinations).

### Current Location:
- `lib/brain/retrieve-v2.ts` (implementation)
- `app/api/brain/retrieve-v2/route.ts` (API endpoint)

### Capabilities:
- Neo4j-first retrieval (approved high-confidence POIs)
- Fallback to Supabase drafts (unapproved but labeled)
- Multi-factor ranking:
  - Confidence score (0-1)
  - Luxury score (0-1)
  - Theme fit (0-1)
  - Recency (0-1)
  - Approval status (approved vs. draft)
- Traceability (source attribution)
- Duplicate filtering

### Intelligence Flow:
**Input:** Destination + theme(s)  
**Process:**
1. Query Neo4j for approved POIs matching destination + themes
2. Fallback to Supabase `extracted_pois` (verified but not promoted)
3. Rank by: `score = (confidence × 0.3) + (luxury × 0.25) + (theme_fit × 0.25) + (recency × 0.1) + (approval_bonus × 0.1)`
4. Return top N candidates with traceability

**Output:** Ranked list of grounded POI candidates

### Data Sources:
- Neo4j (primary - approved POIs)
- Supabase `extracted_pois` (secondary - drafts)

### Data Flow:
```
Intelligence Extractor → Supabase extracted_pois → Captain Verification → Neo4j (promote) → Retrieval Agent → LEXA Chat
```

### Current Prompt Quality: N/A (Pure algorithmic, no LLM)

---

## AGENT 5: EMOTIONAL PROFILER AGENT
**Purpose:** Learn user's emotional profile and archetype through conversation

### Mission:
Passively listen to user responses and progressively build a multi-dimensional emotional profile for personalized recommendations and Script Engine feeding.

### Current Location:
- `lib/lexa/profile.ts` (profile updates)
- Integrated into state machine (all stages)
- Stored in `lexa_user_profiles` table

### Capabilities:
- Extract emotional keywords from conversation
- Map to 9 core emotions (Exclusivity, Prestige, Discovery, Indulgence, Romance, Adventure, Legacy, Freedom, Transformation)
- Detect personality archetype (5 types)
- Track preferences (sensory, activity, social, pace)
- Build travel style profile
- Identify pain points and desires

### Intelligence Flow:
**Input:** User conversation messages  
**Process:**
1. Parse for emotional keywords
2. Detect preferences (quiet vs. social, active vs. relaxing)
3. Identify pain points ("tired of crowds")
4. Map to archetype (Cultural Connoisseur, Ultra-HNW Seeker, etc.)
5. Update profile incrementally

**Output:** Emotional profile JSON:
```json
{
  "core_emotions": ["Discovery", "Prestige", "Exclusivity"],
  "personality_archetype": "Cultural Connoisseur",
  "travel_style": "active_cultural",
  "sensory_preferences": ["visual_art", "culinary", "architectural"],
  "social_preference": "intimate_small_groups",
  "pace_preference": "thoughtful_immersive",
  "pain_points": ["crowded_tourist_traps", "superficial_experiences"],
  "transformation_sought": "cultural_enrichment"
}
```

### Data Sources:
- User messages (LEXA chat)
- Briefing field responses
- Historical conversations

### Current Prompt Quality: ⭐⭐ (Heuristic-based, needs LLM upgrade)

---

## AGENT 6: INTELLIGENCE EXTRACTOR AGENT
**Purpose:** Transform unstructured text → structured intelligence (just upgraded!)

### Mission:
Extract POIs, experiences, emotional mappings, client archetypes, and market trends from documents/URLs at investor-pitch quality.

### Current Location:
- `rag_system/app/services/intelligence_extractor.py` (main)
- `rag_system/app/services/lexa_extraction_context.py` (domain knowledge)

### Capabilities:
- PDF/Word/Excel text extraction
- OCR for images/scans
- Emotional mapping (9 emotions × intensity 1-10)
- Client archetype matching (5 archetypes × match score 0-100)
- Trend analysis
- Pricing intelligence
- Investor insights generation
- Neo4j relationship suggestions

### Intelligence Flow:
**Input:** Document text or URL content  
**Process:**
1. Load LEXA extraction context (emotions, archetypes, market knowledge)
2. Call Claude with investor-pitch quality prompt
3. Extract POIs with emotional mappings
4. Match to client archetypes
5. Identify market trends
6. Generate business insights
7. Return structured JSON

**Output:** Rich intelligence package:
```json
{
  "extraction_summary": "Perfect! I've extracted 11 hotels with 110+ emotional mappings...",
  "pois": [
    {
      "name": "Diriyah Palace",
      "emotional_map": [{"emotion": "Prestige", "intensity": 10, "evidence": "..."}],
      "client_archetypes": [{"archetype": "Ultra-HNW", "match_score": 98, "why": "..."}],
      "conversation_triggers": ["..."],
      "unique_selling_points": ["..."],
      "luxury_tier": "ultra_luxury"
    }
  ],
  "trends": [...],
  "investor_insights": {...}
}
```

### Data Sources:
- Uploaded files (Captain Portal)
- Scraped URLs
- Manual text entries
- LEXA extraction context (domain knowledge)

### Data Flow:
```
Upload/Scrape → Intelligence Extractor → Supabase extracted_pois → Captain Verification → Neo4j
```

### Current Prompt Quality: ⭐⭐⭐⭐⭐ (Just upgraded to investor-pitch quality!)

---

## AGENT 7: MULTIPASS ENRICHMENT AGENT
**Purpose:** Deep, validated extraction with multiple analysis passes

### Mission:
Perform comprehensive extraction with validation, deduplication, and confidence scoring across multiple passes for complex documents (itineraries, provider brochures).

### Current Location:
- `rag_system/app/services/multipass_extractor.py` (main)
- `rag_system/app/services/multipass_contract.py` (schema)

### Capabilities:
- 4-pass analysis (outline → expand → validate → report)
- 50+ sub-experience extraction from itineraries
- Citation tracking for evidence
- Confidence scoring per section
- Deduplication
- Captain-facing markdown reports
- Real vs. estimated count separation

### Intelligence Flow:
**Input:** Long-form documents (itineraries, brochures)  
**Process:**
1. **Pass 1 (Outline):** Identify structure, estimate counts
2. **Pass 2 (Expand):** Extract detailed fields, emotional mappings, archetypes
3. **Pass 3 (Validate):** Deduplicate, verify confidence, add citations
4. **Pass 4 (Report):** Summarize quality, generate markdown report

**Output:** Extraction contract with:
- Final validated package
- Per-pass findings
- Validation warnings
- Captain summary markdown

### Data Sources:
- Multi-page documents
- LEXA extraction context (domain knowledge)

### Data Flow:
```
Complex Document → Multipass Enrichment → Validated Intelligence → Supabase → Captain Review
```

### Current Prompt Quality: ⭐⭐⭐⭐⭐ (Just upgraded with LEXA context!)

---

## AGENT 8: SCRAPING AGENT
**Purpose:** URL → Clean content → Intelligence extraction

### Mission:
Convert web pages to clean, structured text, then trigger intelligence extraction, handling pagination, caching, and error tracking.

### Current Location:
- `rag_system/app/api/captain_scraping.py` (backend API)
- Integrates with Intelligence Extractor

### Capabilities:
- HTTP request handling
- HTML → clean text extraction
- Subpage discovery
- Duplicate detection (URL caching)
- Force refresh option
- Error tracking
- Metadata preservation

### Intelligence Flow:
**Input:** URL(s)  
**Process:**
1. Fetch URL content (with caching)
2. Extract clean text from HTML
3. Store in `scraped_urls` table
4. Trigger Intelligence Extractor on content
5. Store extracted POIs in `extracted_pois`
6. Track scraping status and errors

**Output:** Scraped content + extracted intelligence

### Data Sources:
- Web pages (URLs provided by Captain)
- Previously scraped cache

### Data Flow:
```
URL → Scraping Agent → Clean Text → Intelligence Extractor → extracted_pois → Captain Review
```

### Current Prompt Quality: N/A (Scraping is non-LLM; extraction uses Intelligence Extractor)

---

## AGENT 9: MARKET INTELLIGENCE AGENT (NEW - TO BUILD)
**Purpose:** Strategic insights for business decisions, demand analysis, trend forecasting

### Mission:
Analyze aggregated user data, market trends, and competitive intelligence to advise Chris/Paul/Bakary on:
- Which destinations are in highest demand
- Which themes are trending
- What SYCC cruises to create
- Pricing optimization opportunities
- Competitive gaps to exploit

### Proposed Location:
- `rag_system/app/services/market_intelligence_agent.py` (new)
- `app/api/captain/market-intelligence/route.ts` (API)
- `app/captain/market-insights/page.tsx` (UI)

### Capabilities (Proposed):
- Aggregate user preference data
- Identify demand patterns (destinations, themes, emotions)
- Analyze booking patterns (which tiers/upsells convert)
- Competitive gap analysis
- Trend forecasting
- SYCC cruise opportunity identification
- Pricing elasticity analysis
- ROI projections for new offerings

### Intelligence Flow (Proposed):
**Input:** Aggregated data from all LEXA systems  
**Process:**
1. Query Supabase for:
   - User emotional profiles → Which emotions are most sought?
   - Conversation summaries → Which destinations mentioned most?
   - Experience briefs → What budgets and durations are typical?
   - Script library → Which themes generate most scripts?
   - Membership data → Which tiers convert best?
2. Query Neo4j for:
   - POI theme distributions → Where is LEXA's knowledge strongest?
   - Destination coverage gaps → Which luxury markets are underserved?
3. Call Claude with strategic analysis prompt:
   - "Given 1,000 users seeking Discovery (9/10) + Prestige (8/10), and 300 mentions of 'Santorini', what SYCC cruise should we create?"
4. Generate recommendations with ROI projections

**Output:** Strategic insights dashboard:
```json
{
  "demand_analysis": {
    "top_destinations": [
      {"name": "French Riviera", "demand_score": 95, "user_mentions": 487},
      {"name": "Santorini", "demand_score": 88, "user_mentions": 312}
    ],
    "top_emotions": [
      {"emotion": "Discovery", "avg_intensity": 8.7, "user_count": 1023},
      {"emotion": "Prestige", "avg_intensity": 8.2, "user_count": 891}
    ],
    "underserved_segments": [
      {
        "archetype": "Adventure-Luxury Traveler",
        "demand": "high",
        "supply_gap": "Only 12 POIs vs. 487 in Cultural Connoisseur category",
        "opportunity": "Add safari, diving, active wellness experiences"
      }
    ]
  },
  "cruise_recommendations": [
    {
      "proposed_cruise": "Santorini Cultural Immersion",
      "theme": "Discovery + Prestige",
      "target_archetype": "Cultural Connoisseur",
      "projected_demand": 312,
      "projected_revenue": "€1.4M (312 × €1,497 Blueprint)",
      "rationale": "High user demand (312 mentions), strong emotional match, existing POI coverage (45 verified POIs)"
    }
  ],
  "pricing_insights": {
    "tier_conversion": {
      "The Spark": "12% convert to Inspired after 1 script",
      "The Inspired": "35% buy Discovery upsell on 2nd script"
    },
    "optimization": "Consider €397 'Taste' upsell between Spark and Discovery"
  }
}
```

### Data Sources (Proposed):
- All user conversations (aggregated)
- All experience briefs
- All emotional profiles
- All script generation patterns
- Membership tier data
- Upsell purchase history
- POI coverage by destination/theme
- Competitive intelligence from extracted articles

### Current Status: ❌ Not built yet (Phase 3-4 feature)

---

## INTELLIGENCE FLOW ARCHITECTURE

### USER → LEXA Flow:
```
User Message 
  → LEXA Chat Agent (stage detection + emotional extraction)
  → Emotional Profiler Agent (update profile)
  → Briefing Collector Agent (if in briefing stage)
  → Knowledge Retrieval Agent (get grounded context)
  → Script Composer Agent (if in script stage)
  → Response to User
```

### CAPTAIN → KNOWLEDGE GRAPH Flow:
```
Captain Upload (File/URL/Text)
  → Scraping Agent (if URL)
  → Intelligence Extractor Agent (text → structured data)
  → Multipass Enrichment Agent (if complex document)
  → Supabase extracted_pois (draft storage)
  → Captain Verification (Browse page)
  → Promote to Neo4j (if verified)
  → Knowledge Retrieval Agent (now available for LEXA Chat)
```

### BUSINESS INTELLIGENCE Flow (Proposed):
```
User Conversations (aggregated)
  + Experience Briefs (aggregated)
  + Emotional Profiles (aggregated)
  + Script Patterns (aggregated)
  + POI Coverage Analysis
  → Market Intelligence Agent
  → Strategic Insights Dashboard
  → Chris/Paul/Bakary Decision-Making
  → New SYCC Cruises / Offerings
  → Script Templates
  → Pricing Adjustments
```

---

## AGENT INTERACTION MAP

```
┌─────────────┐
│    USER     │
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────────────────────────────┐
│  LEXA CHAT AGENT (Orchestrator)                         │
│  - Detects stage                                        │
│  - Routes to specialized agents                         │
│  - Coordinates response generation                      │
└─────┬──────────────┬────────────────┬─────────────┬────┘
      │              │                │             │
      ▼              ▼                ▼             ▼
┌───────────┐  ┌────────────┐  ┌────────────┐  ┌─────────────┐
│ EMOTIONAL │  │ BRIEFING   │  │ KNOWLEDGE  │  │   SCRIPT    │
│ PROFILER  │  │ COLLECTOR  │  │ RETRIEVAL  │  │  COMPOSER   │
│  AGENT    │  │   AGENT    │  │   AGENT    │  │    AGENT    │
└─────┬─────┘  └─────┬──────┘  └─────┬──────┘  └──────┬──────┘
      │              │                │                │
      └──────────────┴────────────────┴────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │  USER PROFILE    │
                    │  (Supabase)      │
                    └──────────────────┘


┌──────────────┐
│   CAPTAIN    │
└──────┬───────┘
       │
       ▼
┌─────────────────────────────────────────────────────────┐
│  CAPTAIN PORTAL (Upload & Manual Entry)                 │
└─────┬──────────────┬────────────────┬──────────────────┘
      │              │                │
      ▼              ▼                ▼
┌───────────┐  ┌────────────┐  ┌──────────────────┐
│ SCRAPING  │  │ MULTIPASS  │  │  INTELLIGENCE    │
│   AGENT   │  │ ENRICHMENT │  │   EXTRACTOR      │
│           │  │   AGENT    │  │     AGENT        │
└─────┬─────┘  └─────┬──────┘  └─────┬────────────┘
      │              │                │
      └──────────────┴────────────────┘
                     │
                     ▼
           ┌──────────────────┐
           │  extracted_pois  │
           │   (Supabase)     │
           └────────┬─────────┘
                    │
            Captain Verification
                    │
                    ▼
           ┌──────────────────┐
           │     Neo4j        │
           │  (Approved POIs) │
           └────────┬─────────┘
                    │
                    └───→ Knowledge Retrieval Agent


┌──────────────────────┐
│  CHRIS / PAUL /      │
│  BAKARY (Strategy)   │
└──────┬───────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│  MARKET INTELLIGENCE AGENT (NEW)     │
│  - Analyze aggregated user data      │
│  - Identify demand patterns          │
│  - Recommend new cruises/offerings   │
│  - Competitive gap analysis          │
└──────┬───────────────────────────────┘
       │
       ▼
┌──────────────────────┐
│  Strategic Insights  │
│  Dashboard (NEW)     │
└──────────────────────┘
```

---

## DATA GENERATION → USAGE → ENRICHMENT FLOW

### AGENT 6 & 7: Intelligence Extraction
**Generates:**
- POIs with emotional mappings
- Experiences with archetype matches
- Trends and insights
- Pricing intelligence

**Stored In:**
- Supabase: `extracted_pois`, `captain_uploads`, `scraped_urls`
- Metadata: source attribution, confidence scores, edit versions

**Enrichment:**
- Captain verification (confidence boost to 95%+)
- Google Places API (coordinates, place_id, photos)
- Neo4j relationships (themes, emotions, destinations)

### AGENT 4: Knowledge Retrieval
**Uses:**
- Neo4j approved POIs (trusted, high-confidence)
- Supabase drafts (fallback, labeled as unapproved)

**Enrichment:**
- Ranking algorithm (confidence + luxury + theme_fit + recency)
- Traceability (source_id, upload_id preservation)

**Outputs To:**
- LEXA Chat Agent (grounded context)
- Script Composer Agent (venue recommendations)

### AGENT 5: Emotional Profiler
**Generates:**
- User emotional profiles (9 emotions with intensities)
- Personality archetypes (5 types)
- Preference vectors (sensory, social, pace)

**Stored In:**
- Supabase: `lexa_user_profiles`

**Enrichment:**
- Incremental updates (every conversation)
- Archetype refinement (confidence increases over time)

**Used By:**
- LEXA Chat Agent (personalized tone)
- Script Composer Agent (POI selection)
- Market Intelligence Agent (demand aggregation)

### AGENT 2: Briefing Collector
**Generates:**
- Structured experience briefs (10 fields)
- Emotional goal definitions
- Budget/duration parameters

**Stored In:**
- Supabase: `experience_briefs`

**Used By:**
- Script Composer Agent (requirements for script design)
- Market Intelligence Agent (demand pattern analysis)

### AGENT 3: Script Composer
**Generates:**
- Experience scripts (JSON-first)
- Day-by-day itineraries
- Venue recommendations
- Upsell triggers

**Stored In:**
- Supabase: `lexa_script_library`
- User visible in Account Dashboard

**Uses:**
- Experience brief (from Briefing Collector)
- Grounded POIs (from Knowledge Retrieval)
- User emotional profile (from Emotional Profiler)

---

## NEXT: OPTIMIZED PROMPTS FOR EACH AGENT

I'll now create perfect, production-ready prompts for each agent to ensure:
- Consistent quality across all agents
- Aligned with LEXA's emotional intelligence framework
- Investor-pitch quality outputs
- Clear mission and success criteria

Creating agent prompt library...
