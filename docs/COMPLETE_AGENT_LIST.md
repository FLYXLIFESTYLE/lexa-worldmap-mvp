# LEXA Complete Agent List - As Built
**Date:** January 6, 2026  
**Purpose:** Comprehensive list of ALL agents with missions, capabilities, connections  
**Format:** Agent name, what it does, how it connects

---

## THE COMPLETE LEXA AGENT ECOSYSTEM

---

## 🎨 AGENT 1: AIlessia (The Conversational Artist)

### **WHO SHE IS**
**Personality:** Emotional, intuitive, creative, storytelling-focused  
**Archetype:** The artist who transforms cold data into warm emotional journeys

### **LOCATION**
`rag_system/core/ailessia/` (8 modules)

### **MISSION**
Create cinematic, emotionally-resonant luxury experience scripts that clients treasure forever. Transform logical data into stories worth €3k-€100k+.

### **CAPABILITIES**

#### Module 1: `script_composer.py`
**What:** Creates full experience scripts with emotional arcs  
**Output:** ExperienceScript with:
- Cinematic hook
- Emotional arc (celebration, renewal, transformation)
- Signature experiences
- Sensory journey
- Personalized rituals
- Day-by-day narratives

**Emotional Arcs:**
- Celebration: Anticipation → Crescendo → Savoring → Reflection
- Renewal: Release → Tranquility → Renewal → Integration  
- Transformation: Departure → Challenge → Breakthrough → Transcendence

#### Module 2: `emotion_interpreter.py`
**What:** Reads emotional subtext from user messages  
**Detects:** EmotionalState (CELEBRATING, STRESSED, SEEKING_ESCAPE, CURIOUS, etc.)  
**Output:** EmotionalReading with confidence scores

#### Module 3: `personality_mirror.py`
**What:** Adapts communication style to mirror user's energy  
**Adapts:** Formality, enthusiasm, detail level, pacing  
**Output:** Mirrored response tone

#### Module 4: `emotional_profile_builder.py`
**What:** Builds user emotional profiles incrementally  
**Tracks:** Desires, fears, preferences, archetypes  
**Output:** Updated emotional profile in Supabase

#### Module 5: `weighted_archetype_calculator.py`
**What:** Calculates weighted personality archetypes  
**Output:** ArchetypeWeights (multiple archetypes with confidence scores)

#### Module 6: `context_extractor.py`
**What:** Extracts structured context from conversation history  
**Uses:** Recent messages to maintain coherent dialogue

#### Module 7: `conversation_os.py`
**What:** Manages intake question flow  
**Functions:** `next_intake_question()`, `is_intake_complete()`, `build_question_with_examples()`

### **INTELLIGENCE FLOW**

**Inputs:**
- User messages
- Conversation history
- Emotional profile (from database)
- AnticipatedDesires (from AIbert)
- Grounded POIs (from Knowledge Retrieval)

**Processing:**
1. Interpret emotional subtext
2. Mirror user's communication style
3. Build/update emotional profile
4. Calculate archetype weights
5. Compose experience script using:
   - Emotional arc matching user's state
   - POIs matching emotional goals
   - Desires anticipated by AIbert

**Outputs:**
- Natural language responses
- Experience scripts (JSON + narrative)
- Updated user profiles
- Session state updates

### **DATA GENERATION**
**Creates in Supabase:**
- `lexa_user_profiles` - Emotional profiles, archetypes
- `lexa_sessions` - Conversation state
- `lexa_messages` - Conversation history
- `experience_briefs` - Structured requirements

### **CONNECTIONS**
- **Receives from:** AIbert (anticipated desires), Knowledge Retrieval (grounded POIs), User input
- **Sends to:** Frontend (responses), Database (profiles/scripts), Script PDF Generator

### **CURRENT PROMPT QUALITY:** ⭐⭐⭐⭐ (Good, can be enhanced with grounded POI integration)

---

## 🧠 AGENT 2: AIbert (The Analytical Psychologist)

### **WHO HE IS**
**Personality:** Analytical, logical, pattern-recognition focused  
**Archetype:** The psychologist who understands what clients want before they say it

### **LOCATION**
`rag_system/core/aibert/` (1 module currently)

### **MISSION**
Anticipate unstated client desires and hidden anxieties using pattern recognition and psychological insights about ultra-luxury travelers.

### **CAPABILITIES**

#### Module: `desire_anticipator.py`
**What:** Recognizes psychological patterns and anticipates desires

**Anticipation Rules (Examples from code):**

**Pattern: romantic_partner_anniversary**
- Triggers: "anniversary", "celebrate us", "years together"
- Anticipated Desires:
  - Prove thoughtfulness and planning
  - Create Instagram-worthy moment for partner
  - Show growth in relationship
  - Impress partner with exclusivity
- Hidden Anxieties:
  - Not special enough
  - Partner disappointed
  - Too predictable
- How to Address: "Emphasize uniqueness, personalization, 'once-in-lifetime' framing"

**Pattern: achievement_celebration**
- Triggers: "achieved", "made it", "big deal closed", "promotion"
- Anticipated Desires:
  - Recognition of achievement
  - Permission to indulge without guilt
  - Feel the power of wealth
  - Mark transition to new status
- Hidden Anxieties:
  - Imposter syndrome
  - Not appreciating success enough
- How to Address: "Mirror celebration energy, suggest 'victory lap' experiences"

**Pattern: escape_from_pressure**
- Triggers: "burned out", "need a break", "exhausted", "stressed"
- Anticipated Desires:
  - Permission to do nothing
  - Feel unreachable
  - Restore energy without guilt
- Hidden Anxieties:
  - FOMO (missing work)
  - Guilt about relaxing
- How to Address: "Frame as necessary recovery, suggest 'unreachable luxury'"

### **INTELLIGENCE FLOW**

**Inputs:**
- User conversation messages
- Emotional reading (from AIlessia's emotion interpreter)
- User profile data

**Processing:**
1. Detect psychological patterns
2. Match to anticipation rules
3. Predict unstated desires
4. Identify hidden anxieties
5. Generate addressing strategies

**Outputs:**
- AnticipatedDesire objects with:
  - Desire type
  - Confidence (0-1)
  - Reasoning
  - How to address
  - Experiences to suggest
  - Hidden anxieties list

### **DATA USAGE**
- Reads: Conversation patterns, emotional signals
- Enriches: AIlessia's script composition with psychological insights
- Stores: Desire patterns in session state

### **CONNECTIONS**
- **Receives from:** User messages (via AIlessia)
- **Sends to:** AIlessia (anticipated desires for script composition)
- **Integration:** Tightly coupled with AIlessia - AIbert analyzes, AIlessia creates

### **CURRENT QUALITY:** ⭐⭐⭐⭐ (Good, pattern-based rules working well)

---

## 📊 AGENT 3: Intelligence Extractor (The Data Archaeologist)

### **WHO IT IS**
**Personality:** Methodical, thorough, investor-minded  
**Purpose:** Transform unstructured documents into structured, investor-quality intelligence

### **LOCATION**
`rag_system/app/services/intelligence_extractor.py`

### **MISSION**
Extract POIs, experiences, emotional mappings, client archetypes, and market trends from uploaded documents at investor-pitch quality.

### **CAPABILITIES** (Just Upgraded!)
- PDF/Word/Excel text extraction
- OCR for images/scans
- **Emotional mapping** (9 emotions × intensity 1-10 with evidence)
- **Client archetype matching** (5 archetypes × match score 0-100)
- **Trend analysis** (market shifts, competitive insights)
- **Pricing intelligence** (tier/upsell positioning)
- **Investor insights** (business implications)
- **Conversation triggers** (when LEXA should recommend)

### **INTELLIGENCE FLOW**

**Inputs:**
- Uploaded files (PDF, Word, Excel, .txt, images)
- URLs (scraped content)
- Pasted text
- **LEXA extraction context** (9 emotions, 5 archetypes, market knowledge)

**Processing:**
1. Load LEXA extraction context
2. Call Claude with investor-pitch quality prompt
3. Extract POIs with mandatory emotional mappings
4. Match each POI to client archetypes
5. Identify luxury market trends
6. Generate business insights
7. Create conversation triggers

**Outputs:**
```json
{
  "extraction_summary": "Perfect! I've extracted 11 hotels with 110+ emotional mappings...",
  "pois": [
    {
      "name": "Diriyah Palace",
      "emotional_map": [
        {"emotion": "Prestige", "intensity": 10, "evidence": "Former royal palace..."}
      ],
      "client_archetypes": [
        {"archetype": "Ultra-HNW Exclusivity Seeker", "match_score": 98, "why": "..."}
      ],
      "conversation_triggers": ["Once-in-a-lifetime", "Feel like royalty"],
      "unique_selling_points": ["Only royal palace-to-hotel"],
      "luxury_tier": "ultra_luxury"
    }
  ],
  "trends": [{...}],
  "investor_insights": {...}
}
```

### **DATA GENERATION**
**Creates in Supabase:**
- `captain_uploads` - Upload metadata, source text (redacted), edit versions
- `extracted_pois` - POIs with emotional mappings, archetype matches
- Stores confidence scores, luxury tiers, conversation triggers

### **CONNECTIONS**
- **Receives from:** Captain uploads/scrapes, Scraping Agent (clean text)
- **Sends to:** Supabase `extracted_pois` → Captain verification → Neo4j (if promoted) → Brain v2 Retrieval → AIlessia
- **Enriches:** AIlessia's knowledge base with emotionally-mapped POIs

### **CURRENT QUALITY:** ⭐⭐⭐⭐⭐ (Just upgraded to investor-pitch level!)

---

## ✅ AGENT 4: Multipass Enrichment Agent (The Validator)

### **WHO IT IS**
**Personality:** Meticulous, thorough, quality-obsessed  
**Purpose:** Deep, validated extraction for complex documents (multi-day itineraries, provider brochures)

### **LOCATION**
`rag_system/app/services/multipass_extractor.py`

### **MISSION**
Perform 4-pass analysis (outline → expand → validate → report) to ensure highest quality intelligence extraction from complex sources.

### **CAPABILITIES**
- **Pass 1 (Outline):** Identify structure, estimate counts
- **Pass 2 (Expand):** Extract detailed fields with emotional mappings
- **Pass 3 (Validate):** Deduplicate, verify confidence, add citations
- **Pass 4 (Report):** Generate Captain-facing markdown summary

**Special Features:**
- 50+ sub-experience extraction from itineraries
- Citation tracking for evidence
- Confidence scoring per section
- Real vs. estimated count separation
- Captain summary ("Perfect! I've extracted...")
- Markdown reports with sections

### **INTELLIGENCE FLOW**

**Inputs:**
- Complex documents (10+ pages, multi-day itineraries)
- LEXA extraction context

**Processing:**
1. Outline pass: Map structure
2. Expand pass: Deep extraction with emotional mapping (uses LEXA context)
3. Validate pass: Dedupe, verify, cite sources
4. Report pass: Summarize for Captain

**Outputs:**
- ExtractionContract with validated package
- Captain markdown report
- Per-pass findings and warnings

### **DATA GENERATION**
**Creates:** Same as Intelligence Extractor, but higher quality for complex docs

### **CONNECTIONS**
- **Used for:** Complex documents (itineraries, brochures)
- **Feeds:** Same flow as Intelligence Extractor → Supabase → Neo4j → AIlessia

### **CURRENT QUALITY:** ⭐⭐⭐⭐⭐ (Just upgraded!)

---

## 📚 AGENT 5: Knowledge Retrieval (Brain v2 - The Librarian)

### **WHO IT IS**
**Personality:** Precise, reliable, grounding-focused  
**Purpose:** Prevent hallucinations by retrieving real, verified POIs

### **LOCATION**
`lib/brain/retrieve-v2.ts`

### **MISSION**
Retrieve the most relevant, high-confidence POIs from the knowledge graph to ground AIlessia's recommendations in real, approved data.

### **CAPABILITIES**
- Neo4j-first retrieval (approved, high-confidence POIs)
- Fallback to Supabase drafts (labeled as unapproved)
- Multi-factor ranking:
  - Confidence score (30%)
  - Luxury score (25%)
  - Theme fit (25%)
  - Recency (10%)
  - Approval status bonus (10%)
- Traceability (source attribution)
- Duplicate filtering

### **INTELLIGENCE FLOW**

**Inputs:**
- Destination name
- Theme(s)
- Limit (how many POIs to return)

**Processing:**
1. Query Neo4j for approved POIs (destination + themes)
2. Fallback to Supabase `extracted_pois` (verified but not promoted)
3. Rank by weighted score
4. Label each: APPROVED vs. UNAPPROVED_DRAFT
5. Return top N with traceability

**Outputs:**
```typescript
[
  {
    source: 'neo4j',
    approved: true,
    label: 'APPROVED',
    name: 'Château de la Chèvre d'Or',
    type: 'restaurant',
    destination: 'Èze, French Riviera',
    confidence: 0.95,
    luxury: 0.92,
    theme_fit: 0.88,
    score: 0.91,
    poi_uid: 'poi_abc123'
  }
]
```

### **DATA USAGE**
**Reads from:**
- Neo4j `:poi` nodes (promoted, approved)
- Supabase `extracted_pois` (verified drafts)

**Provides to:**
- AIlessia (grounded context for script composition)
- LEXA Chat (prevent hallucinated venue names)

### **CONNECTIONS**
- **Feeds:** AIlessia's script composer, LEXA chat system prompts
- **Source Data:** Intelligence Extractor → Supabase → Captain verification → Neo4j

### **CURRENT QUALITY:** ⭐⭐⭐⭐⭐ (Excellent - algorithmic, working perfectly)

---

## 🕷️ AGENT 6: Scraping Agent (The Web Crawler)

### **WHO IT IS**
**Personality:** Methodical, reliable, content-focused  
**Purpose:** Convert URLs into clean, structured text for intelligence extraction

### **LOCATION**
`rag_system/app/api/captain_scraping.py`

### **MISSION**
Fetch web content, clean it, cache it, and trigger intelligence extraction—handling errors, duplicates, and force-refresh options.

### **CAPABILITIES**
- HTTP request handling
- HTML → clean text extraction
- URL caching (avoid re-scraping)
- Force refresh option
- Error tracking
- Metadata preservation (URL, scrape date, status)

### **INTELLIGENCE FLOW**

**Inputs:**
- URL(s) from Captain Portal

**Processing:**
1. Check cache (skip if already scraped and not force-refresh)
2. Fetch URL content
3. Extract clean text from HTML
4. Store in `scraped_urls` table
5. Trigger Intelligence Extractor on content
6. Store extracted intelligence in `extracted_pois`

**Outputs:**
- Clean text content
- Scraping metadata (status, errors, content_length)
- Extracted intelligence (via Intelligence Extractor)

### **DATA GENERATION**
**Creates in Supabase:**
- `scraped_urls` - URL content cache, scraping status
- `extracted_pois` - Intelligence from URL content (via Intelligence Extractor)

### **CONNECTIONS**
- **Orchestrates:** URL fetch → Intelligence Extractor → Supabase
- **Feeds:** Same knowledge pipeline as file uploads

### **CURRENT QUALITY:** ⭐⭐⭐⭐ (Solid orchestrator, no issues)

---

## 🆕 AGENT 7: Market Intelligence Agent (TO BUILD)

### **WHO IT IS**
**Personality:** Strategic, data-driven, business-minded  
**Purpose:** Analyze aggregated data to guide SYCC cruise creation and business strategy

### **PROPOSED LOCATION**
- `rag_system/app/services/market_intelligence_agent.py` (backend)
- `app/api/captain/market-intelligence/route.ts` (API)
- `app/captain/market-insights/page.tsx` (UI)

### **MISSION**
Advise Chris/Paul/Bakary on strategic decisions by analyzing what users want, identifying demand patterns, and recommending profitable offerings.

### **PROPOSED CAPABILITIES**
1. **Demand Analysis**
   - Which destinations mentioned most in conversations?
   - Which emotions are users seeking most (intensity aggregation)?
   - Which archetypes dominate user base?

2. **SYCC Cruise Recommendations**
   - Based on: demand + POI coverage + archetype match + margin potential
   - Output: Specific cruise proposals with ROI projections

3. **Archetype Gap Analysis**
   - Which client types are underserved?
   - Example: "Adventure-Luxury Traveler: High demand (234 users), weak supply (12 POIs)"

4. **Pricing Optimization**
   - Identify conversion patterns
   - Recommend new upsell packages
   - Test pricing elasticity

5. **Content Priority**
   - Which destinations need more POIs?
   - Which themes need enrichment?

### **INTELLIGENCE FLOW (Proposed)**

**Inputs:**
- Aggregated conversation data (from AIlessia)
- Aggregated emotional profiles (from AIlessia's Profile Builder)
- Desire patterns (from AIbert)
- Experience briefs (structured requirements)
- POI coverage analysis (Neo4j + Supabase)
- Tier/upsell conversion data
- Membership analytics

**Processing:**
1. Aggregate user emotional profiles:
   - "1,247 users seek Discovery (avg intensity: 9/10)"
   - "487 conversations mention 'French Riviera'"
2. Cross-reference with POI coverage:
   - "French Riviera: 487 verified POIs (strong coverage)"
   - "Maldives: 12 verified POIs (weak coverage, high demand!)"
3. Identify patterns:
   - High demand + high coverage = Create premium cruise
   - High demand + low coverage = Urgent POI collection needed
4. Calculate ROI projections
5. Rank strategic priorities

**Outputs:**
```json
{
  "cruise_recommendations": [
    {
      "cruise_name": "Santorini Cultural Immersion",
      "rationale": "312 user mentions, Discovery (9/10) + Prestige (8/10) match, 45 verified POIs",
      "target_archetype": "Cultural Connoisseur (62% of users)",
      "pricing": "€2,997 Concierge tier",
      "projected_revenue": "€215k annually (6 cruises × 12 guests × €2,997)",
      "margin": "47%",
      "timeline": "4 months",
      "required_pois": "Add 15 artisan workshops, 5 archeological guides"
    }
  ],
  "archetype_gaps": [...],
  "pricing_opportunities": [...],
  "content_priorities": [...]
}
```

### **DATA SOURCES (Proposed)**
**Reads from:**
- `lexa_user_profiles` (aggregated emotional profiles)
- `lexa_messages` (conversation patterns)
- `experience_briefs` (structured requirements)
- `lexa_script_library` (script generation patterns)
- `user_memberships` (tier distribution)
- `user_upsell_purchases` (conversion patterns)
- Neo4j (POI coverage by destination/theme)

### **CONNECTIONS (Proposed)**
- **Analyzes:** AIlessia's conversations, AIbert's desire patterns, user profiles
- **Advises:** Chris/Paul/Bakary (strategic decisions)
- **Influences:** New cruise creation, POI collection priorities, pricing changes

### **INTEGRATION WITH EXISTING AGENTS**
- **Does NOT replace AIlessia or AIbert**
- **Supports:** Business strategy layer (above conversation layer)
- **Uses:** Aggregated outputs from AIlessia + AIbert
- **Feeds back:** Strategic priorities influence what AIlessia should emphasize

---

## 🔄 COMPLETE INTELLIGENCE FLOW

### **USER-FACING FLOW (AIlessia + AIbert)**
```
User: "I want a romantic getaway for our anniversary"
  ↓
AIlessia: Emotion Interpreter
  → Detects: EmotionalState.CELEBRATING, theme signals (Romance + Intimacy)
  ↓
AIbert: Desire Anticipator
  → Pattern match: romantic_partner_anniversary
  → Anticipated: Prove thoughtfulness, create special moment, show relationship growth
  → Anxieties: Not special enough, too predictable
  ↓
AIlessia: Personality Mirror
  → Adapts tone to mirror user's romantic energy
  ↓
AIlessia: Profile Builder
  → Updates profile: Romance (9/10), Prestige (7/10), archetype: Romantic Escape Seeker (0.8)
  ↓
Knowledge Retrieval (Brain v2)
  → Queries: Neo4j for Romance + Intimacy POIs with high luxury scores
  → Returns: Grounded POI list (APPROVED venues)
  ↓
AIlessia: Script Composer
  → Uses AIbert's insights: Emphasize uniqueness, personalization
  → Uses grounded POIs: Real venues (not hallucinated)
  → Creates emotional arc: Celebration type (Anticipation → Crescendo → Savoring)
  → Outputs: Cinematic experience script
  ↓
Response to User: Personalized script with upsell triggers
```

### **CAPTAIN KNOWLEDGE FLOW (Intelligence → AIlessia)**
```
Captain uploads Bloomberg article
  ↓
Intelligence Extractor
  → Injects LEXA context (9 emotions, 5 archetypes)
  → Extracts: 11 hotels with emotional mappings
  → Matches: Client archetypes
  → Analyzes: Market trends
  ↓
Supabase extracted_pois
  → Stores: POIs with emotional_map, client_archetypes, conversation_triggers
  ↓
Captain verifies in Browse page
  → Confidence boosted to 95%+
  → Verified flag set
  ↓
Captain promotes to Neo4j
  → Creates canonical `:poi` nodes
  → Preserves traceability (source_id, upload_id)
  ↓
Brain v2 Knowledge Retrieval
  → Now available as grounded context
  ↓
AIlessia Script Composer
  → Uses these POIs to create scripts
  → No hallucinations - all venues are real
  ↓
User receives grounded, personalized experience
```

### **BUSINESS STRATEGY FLOW (Proposed - Market Intelligence)**
```
AIlessia's 10,000 conversations (aggregated)
  → Extract: Top destinations, emotions, archetypes
  ↓
AIbert's desire patterns (aggregated)
  → Extract: Common desires, anxieties
  ↓
User profiles (aggregated)
  → Extract: Archetype distribution
  ↓
POI coverage analysis
  → Extract: Gaps (high demand + low supply)
  ↓
Market Intelligence Agent
  → Analyzes: Demand vs. supply
  → Recommends: SYCC cruises to create
  → Prioritizes: POI collection targets
  → Optimizes: Pricing strategies
  ↓
Strategic Insights Dashboard
  → Chris/Paul/Bakary review recommendations
  ↓
Business Decisions
  → Create new Santorini Cultural Immersion cruise
  → Prioritize safari POI collection
  → Add €397 "Taste" on-demand package
  ↓
Influences AIlessia
  → New script templates for Santorini cruise
  → Emphasis on safari experiences
  → New pricing tier in upsell triggers
```

---

## 📊 AGENT CAPABILITIES MATRIX

| Agent | Mission | Data In | Data Out | Connects To |
|-------|---------|---------|----------|-------------|
| **AIlessia** | Create emotional scripts | User messages, AIbert insights, Grounded POIs | Experience scripts, Profiles | AIbert, Brain v2, User |
| **AIbert** | Anticipate desires | Conversation patterns | Anticipated desires, Anxieties | AIlessia |
| **Intelligence Extractor** | Documents → insights | Files, URLs, Text | POIs with emotional mappings | Supabase → Neo4j → Brain v2 |
| **Multipass Enrichment** | Deep validated extraction | Complex documents | Validated intelligence | Supabase → Neo4j → Brain v2 |
| **Brain v2 Retrieval** | Grounded POI context | Destination + themes | Ranked approved POIs | AIlessia, LEXA Chat |
| **Scraping Agent** | URLs → clean text | URLs | Clean text | Intelligence Extractor |
| **Market Intelligence** (NEW) | Strategic insights | Aggregated user data | Business recommendations | Chris/Paul/Bakary, influences AIlessia |

---

## ✅ WHAT'S DEPLOYED & WHAT'S NEXT

### Deployed (Working Now):
- ✅ AIlessia (8 modules operational)
- ✅ AIbert (desire anticipation working)
- ✅ Intelligence Extractor (investor-quality extraction)
- ✅ Multipass Enrichment (4-pass validation)
- ✅ Brain v2 Retrieval (grounded context)
- ✅ Scraping Agent (URL processing)

### To Build Next:
- ⏳ **Market Intelligence Agent** (strategic layer)
- ⏳ **Improve AIlessia's Script Composer** (Phase 1: integrate grounded POIs, add day-by-day, booking links)
- ⏳ **Upgrade AIlessia's prompts** (use extraction quality improvements)
- ⏳ **Convert AIlessia's Emotional Profiler to LLM** (currently heuristic-based)

---

## IMPROVING CURSOR CONSISTENCY (Action Plan)

### What I Fixed:
1. ✅ Created `START_HERE.md` (mandatory first read)
2. ✅ Updated `.cursorrules` (enforce START_HERE reading)
3. ✅ Mapped existing AIlessia + AIbert architecture
4. ✅ Documented deployment process (stop asking!)

### What You Can Do:
1. ✅ **At conversation start, remind me:** "Read START_HERE.md first"
2. ✅ **If I ask about deployment:** Point me to START_HERE.md
3. ✅ **If I create duplicate agents:** Stop me and reference existing architecture
4. ✅ **Update memory-bank when things change** (I'll do this too)

---

**Committed and deployed. Ready to build Market Intelligence Agent when you say go, or continue with Phase 1 (Script Design Engine) to improve AIlessia's capabilities.**