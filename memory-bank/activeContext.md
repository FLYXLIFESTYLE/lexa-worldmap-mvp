# Active Context

**Last Updated**: January 12, 2026

## Current Focus: MVP Completion for Investor Demo

### New MVP Completion Plan (User-Requested Sequence):
1. **Phase 0: Tier Definitions** (1 day) - User provides tier features, document them
2. **Phase 1: Script Design Engine** (5 days) - POI injection, day-by-day, booking links, refinement
3. **Phase 2: Finalize LEXA Chat** (4 days) - Script display, library, refinement flow
4. **Phase 3: Tiers & Upsells + Marketplace** (8 days) - Payment, enforcement, marketplace, GoHighLevel
5. **Phase 4: Emotional Profile Display** (2 days) - Show users their profile in account
6. **Phase 5: Landing Page Enhancements** (2 days) - Popular scripts, theme categories (14 themes)
7. **Phase 6: Data Ingestion** (Ongoing) - Upload, scrape, generate POIs continuously

### The 3 Perfect Things for MVP:
1. **Data Pipeline** (85% complete) - Upload, scrape, generate + extraction, approval, storage, relation, retrieval
2. **LEXA Chat Customer Journey** (80% complete) - Complete end-to-end flow
3. **Emotional Profiles + Script Engine for Upsells** (60% complete) - Profile display + upsell triggers

### New Requirements Added:
- **Emotional Profile Display**: Show users their emotional profile in account dashboard
- **Script Marketplace**: Browse, reuse, and edit scripts from other users
- **Landing Page Enhancements**: Popular scripts section + all 14 theme categories (add Nightlife & Sports)
- **GoHighLevel Integration**: Affiliate program for brokers, influencers, and affiliates

### Key requirement:
**Functional summary** of what the system does and why it's powerful.
- Avoid technical architecture in captain-facing/investor-facing materials
- Focus on outcomes: emotional intelligence + explainable recommendations + learning loop

## Recent Major Changes

### January 2026 - LEXA Brain Hardening (Neo4j alignment) ✅/⏳

**What we discovered in Neo4j (important):**
1. **Destination nodes are overloaded + duplicated**
   - `:destination` currently mixes **MVP yacht destinations**, **cities** (e.g., Monaco), and some “bounds” style nodes.
   - This causes duplicates (Monaco twice) and wrong UX (cities showing up as “destinations”).
2. **Two parallel emotional systems exist**
   - `:Emotion` exists both as **canonical** (`code`, `layer: LEXA_TAXONOMY`) and **legacy/freeform** (`name` only).
   - `:EmotionalTag` is a UX tagging layer with `category` (Primary Emotion / Trigger / Desire) and optional `intensity`.
   - **Decision**: keep `Emotion` and `EmotionalTag` separate, but add an explicit mapping layer so agents stop creating duplicates.
3. **Two parallel category systems exist**
   - `:theme_category` = the **14 core themes** used in Chat + Script Engine (high-level “why/vibe”).
   - `:occasion_type` = a **facet/filter system** (e.g., Accessible, Photography-Worthy, Water-Based).
   - **Decision**: do not merge; keep both and optionally map.

**New hardening direction (before building new features):**
- **Destination hierarchy**:
  - 12 MVP destinations (Set A): French Riviera; Amalfi Coast; Balearics; Cyclades; Adriatic North; Adriatic Central; Adriatic South; Ionian Sea; Bahamas; BVI; USVI; French Antilles
  - Cities like Monaco/St. Tropez become `kind:'city'` and link into the MVP destination (e.g., Monaco → French Riviera)
  - One-time scripts:
    - `docs/neo4j-taxonomy-constraints.cypher` (uniqueness constraints for taxonomy nodes)
    - `docs/neo4j-destination-normalization.cypher` (types the 12 MVP destinations + key cities and links city→MVP via `IN_DESTINATION`)
- **Relationship-first graph writes** (no more “arrays only”):
  - Promote/ingest should write `HAS_THEME`, `EVOKES`, `SUPPORTS_ACTIVITY`, `FITS_OCCASION`, `TAGGED_WITH` with confidence + evidence.
- **No Foursquare + no paid enrichment APIs for MVP**:
  - Open sources + scraping + manual enrichment only (investor-safe and legally safer).

### January 2026 - Captain Approval + Promotion + Unified Portal UI ✅

**What changed (high impact):**
1. **Unified “Captain Portal” look across pages**
   - New reusable wrapper: `components/portal/portal-shell.tsx`
   - Applied to key Admin + Captain pages so everything has:
     - Dark blue hero section (top)
     - Mission box (WHY/WHAT/HOW style)
     - “Quick Tips” box at the bottom

2. **Captain approval workflow is now real for POIs**
   - **Verify** is the approval step (required for confidence > 80).
   - Verification now stores audit fields (`verified_by`, `verified_at`).
   - Ownership enforced (non-admins only edit/verify their own extracted POIs).

5. **Captain Browse now supports real operations at scale (bulk + filters)**
   - Bulk select (per-row checkbox + select-all visible) and bulk actions:
     - Verify selected
     - Mark enhanced (without enrichment)
     - Set confidence for selected
     - Delete selected
   - Advanced filters: enriched/enhanced, min luxury score, keyword/hashtag match, plus existing category + confidence filters.
   - City is a first-class concept (separate from destination region):
     - UI allows editing `city` in “Edit & Enhance”
     - Enrichment attempts to extract `city` when supported by sources (stored in `extracted_pois.city` once migrated)

3. **Promotion is now real (official knowledge)**
   - Verified POIs can be **Promoted** into Neo4j as canonical `:poi` nodes.
   - Postgres `extracted_pois.promoted_to_main` is set and metadata stores promotion audit info (who/when + `neo4j_poi_uid`).

4. **Grounded retrieval added to the main LEXA chat**
   - The LEXA chat now appends **Neo4j POI grounding context** to Claude system prompts when a destination exists.
   - Rule enforced via prompt: **Do not invent venue names**; only use retrieved POIs when naming venues.

### January 2026 - Step 4: Grounded Retrieval + Ranking ✅

**What was added:**
1. **Brain v2 retrieval endpoint**: `/api/brain/retrieve-v2`
   - **Neo4j first** (approved/trusted items ranked highest)
   - **Fallback to drafts** from Supabase `extracted_pois` (clearly labeled as drafts)
   - Ranking factors: approval status + confidence + theme fit + recency + luxury (simple, explainable scoring)

2. **LEXA chat grounding now uses the same retrieval**
   - The assistant receives a short “Grounded Knowledge” list:
     - `[APPROVED]` items: safe to name as venues
     - `[DRAFT]` items: must be labeled as unapproved

### January 2026 - CEO Dashboard now shows live POI coverage ✅
- `/ceo-dashboard` slide “Live KPIs” pulls admin-only live counts from `/api/admin/poi-counts` (Supabase + Neo4j)
- Shows totals + per-destination table + optional auto-refresh

### December 2025 - POI Collection System & Production Deployment

**MAJOR ADDITION: Automated POI Collection System** ✅

**Note (Jan 2026 policy update):** This Google Places-based system exists, but **is optional/deferred** for the MVP brain hardening track because the current policy is **no paid enrichment APIs** for MVP. The investor-safe MVP path is open sources + scraping + manual enrichment, with clear provenance.

**What Was Built:**
1. **POI Collection Dashboard** (`/admin/poi-collection`)
   - Full-featured admin UI for Google Places POI collection
   - Category selection (14 categories: restaurants, hotels, viewpoints, activities, etc.)
   - Priority queue showing all destinations with luxury scores
   - Real-time progress tracking (destinations, categories, POIs)
   - Budget monitoring with cost estimates
   - Start/pause/resume controls
   - Auto-refresh live stats

2. **Tick-Based Execution System**
   - Safe, pauseable POI collection
   - Processes in batches ("ticks") to avoid timeouts
   - Configurable: max requests per tick, max queue items per tick
   - Automatically pauses when Google quota exhausted
   - Resumes from exact point after pause
   - Quota detection: watches for `RESOURCE_EXHAUSTED` errors

3. **API Endpoints** (`/api/admin/places/collector/*`)
   - `/start` - Create new collection job with parameters
   - `/tick` - Process one batch of destinations/POIs
   - `/pause` - Manual pause (saves state)
   - `/resume` - Resume from paused state
   - `/stats` - Real-time statistics and progress

4. **Dual Storage System**
   - **Supabase**: Raw Google Places data cached in `google_places_places` table
   - **Neo4j**: POI nodes with relationships to destinations and categories
   - Automatic sync between both systems

5. **Smart Category Queries**
   - Custom query templates per category
   - Example: Restaurants → ["Michelin restaurant", "fine dining", "upscale restaurant"]
   - Example: Hotels → ["luxury hotel", "5-star hotel", "boutique hotel"]
   - Discovers more relevant POIs than generic searches

6. **Quality Filtering**
   - Rating ≥ 4.0 stars
   - Price level ≥ $$ (excludes budget places)
   - Category-specific filters (e.g., restaurants need 4.2+ rating)

7. **Geocoding Integration**
   - Auto-discovers destination coordinates via Google Geocoding API
   - Caches coordinates for reuse

8. **Progress Tracking**
   - Per-destination stats (discovered, fetched, upserted)
   - Per-category stats across all destinations
   - Total requests used
   - Budget consumed (estimated)

**Production Deployment:**
- Deployed to Vercel (luxury-travel-designer.com)
- All TypeScript type errors fixed
- Em-dash (—) replaced with hyphen (-) for copy consistency
- Landing page messaging updated
- Invite-only access (signup disabled, admin-only sign-in)

### December 2025 - POI Enrichment & Yacht Destinations

**What Was Built:**
1. **Yacht Destination Upload System v2**
   - Screenshot OCR with Google Vision API
   - Drag & drop + Ctrl+V paste functionality
   - Editable data grid with approval workflow
   - Auto-creates Neo4j relationships
   - 350+ yacht destinations uploaded

2. **Google Places Enrichment Pipeline**
   - Luxury scoring algorithm (0-10 scale)
   - Quality filters: 4+ stars, $$$/$$$$ price level
   - Priority queue: French Riviera first, then yacht cities by luxury score
   - Budget tracking: €242 + $600 free (90 days) = $850 total
   - Cost per city: ~$3-7
   - Script: `scripts/enrich-french-riviera.ts`

3. **Theme Category System**
   - 12 core themes seeded with images
   - Visual selection cards with hover effects
   - Merged redundant categories (safe migration to preserve POI relationships)
   - NULL theme cleanup completed

4. **Admin Access & Debug Tools**
   - Fixed captain_profiles authentication
   - Debug profile page for troubleshooting
   - Improved unauthorized page with sign-in flow

5. **Invite-only access + Brain Console protection (NEW)**
   - No open registration (signup page is invite-only)
   - Admin-only user creation and role assignment
   - Brain Console routes restricted to captains/admins

### November-December 2025 - Conversation Redesign

**Major Pivot:**
User feedback: *"LEXA is focused too much on reading between the lines than actually listening."*

**What Changed:**
1. **Experience DNA Framework Created**
   - Story + Emotion + Trigger methodology
   - "Foodgasm Principle" - sensory memory anchors
   - Documented in: `docs/EXPERIENCE_DNA_FRAMEWORK.md`

2. **Theme-Led Conversation Flow**
   - 12 visual theme categories as opener
   - 90-second WOW test (3 mindblowing questions)
   - No destination/date required initially
   - Documented in: `docs/LEXA_THEME_LED_CONVERSATION.md`

3. **Experience Script Format**
   - 4-part structure: Title, Hook, Emotional Description, Signature Highlights
   - NOT itineraries—emotional narratives
   - Stored in user account for upsells

4. **Context Memory System**
   - No repetitive questions
   - Information extraction and tracking
   - Frustration recovery
   - Documented in: `docs/LEXA_CONTEXT_MEMORY_SYSTEM.md`

### Late December 2025 - Learning Loop Foundation + UI/Copy consistency

1. **Learning loop**
   - Captures feedback (thumbs up/down) and interaction events for improvement over time.
   - Stores durable user memory (emotional profile + preferences) in Supabase.
2. **Inventive but grounded**
   - LEXA is guided to propose cross-domain ideas (by analogy) without claiming uncertain things as guaranteed.
3. **Copy/typography consistency**
   - Replaced long dash characters with normal hyphens in production UI and captain-facing docs.
   - Updated landing page messaging to match "travel scripts" and avoid old phrasing.

### Earlier 2025 - Foundation & MVP

**What Works:**
- ✅ Landing page with Beta badge (luxury-travel-designer.com)
- ✅ Supabase authentication (fixed email confirmation)
- ✅ Theme selector component (12 categories with Unsplash images)
- ✅ Demo chat (admin-only testing)
- ✅ Neo4j graph: 300,000+ POIs, 14 themes, 350+ yacht destinations
- ✅ Admin dashboard with knowledge portal
- ✅ Safe theme migration system (preserves relationships)

## Current State of Key Features

### User-Facing (Live):
- [x] Landing page with luxury branding
- [x] Sign in (invite-only access; no public registration)
- [x] Theme selection (visual cards)
- [x] Interactive chat with LEXA (Claude-powered)
- [x] Experience Script generation
- [x] Seasonal intelligence
- [ ] Upsell system (planned)
- [ ] Mobile app (planned Q2 2026)

### Admin-Facing (Live):
- [x] Captain's Knowledge Portal
- [x] Knowledge upload (transcripts, PDFs, URLs)
- [x] POI search & edit
- [x] Theme seeding & management
- [x] User management (admin-only)
- [x] Yacht destination upload with OCR
- [x] Google Places enrichment scripts
- [ ] POI collection automation (in progress)
- [ ] Affiliate dashboard (planned)

### Data Infrastructure (Live):
- [x] Neo4j: 300K+ POIs, 14 themes, 350+ yacht destinations
- [x] Supabase: Users, sessions, messages, scripts
- [x] Google Places API integration
- [x] Luxury scoring algorithm
- [x] Relationship management
- [ ] Automated POI collection queue (next)
- [ ] Budget monitoring dashboard (next)

## Immediate Next Steps

### 1. Testing + learning sprint (captains) ✅
**Status**: Active now
**What's needed**:
- Daily captain usage and feedback
- More real examples uploaded (scripts, itineraries, URLs)
- Continue improving tone, clarity, and suggestion quality

### 2. Complete pitch deck summary ✅
**Status**: Active now
**What's needed**:
- Functional capabilities overview (no tech jargon)
- Roadmap framing: testing/learning + scaling destinations in parallel

### 3. POI collection automation (background scaling)
**Status**: Planned

### 2. POI Collection Automation
**Status**: Planned
**What's Needed**:
- `/api/admin/collect-pois` endpoint
- Priority queue management
- Budget tracker & progress dashboard
- Admin UI at `/admin/poi-collection`
- Auto-enrichment for French Riviera → Yacht cities

### 3. Upsell System Implementation
**Status**: Planned (Q1 2026)
**What's Needed**:
- Detailed day-by-day script generator ($497)
- Concierge service booking ($2,997+)
- Experience enhancement add-ons ($997+)
- Payment integration
- Offer presentation UI

## Active Decisions & Considerations

### Design Decisions:
1. **Theme Selection First**: Proven to work better than "Where do you want to go?"
2. **Visual-Heavy UI**: Images drive engagement, text is secondary
3. **Experience Scripts, Not Itineraries**: Emotional narratives sell better
4. **Graph-First**: Neo4j for complex queries, not SQL
5. **Luxury Aesthetics**: Gold, navy, elegant typography (global.css)

### Technical Decisions:
1. **Next.js 16 + Turbopack**: Fast builds, modern React
2. **FastAPI Backend**: Separate "AIfred" service for RAG
3. **Neo4j AuraDB**: Cloud-hosted graph database
4. **Supabase**: Auth + PostgreSQL + vector search
5. **Claude 3.5 Sonnet**: Emotional intelligence conversation

### Data Strategy:
1. **Open/free sources + owned inputs for MVP**: Open data (OSM/Overture/Wikidata) + uploads + scraping + manual enrichment
2. **No Foursquare + no paid enrichment APIs for MVP**: Defer paid APIs (Google Places, etc.) to post-investor / paid-tier phase
3. **Luxury-Only Focus**: Filter out low-quality POIs; require named+reviewable records
4. **Explainable Emotional Layer**: Use relationship edges with evidence/confidence (EVOKES/HAS_THEME/etc.)
5. **Yacht Destinations Priority**: MVP stays yacht-first with the 12 destinations as the top-level backbone

### User Communication Style:
- **Beginner-Friendly**: User has never coded
- **Explain Everything**: WHY and WHAT for terminal commands
- **Simplest Path**: Never over-engineer
- **Global Styles**: All design in global.css
- **TypeScript Strict**: Proper types always

## Known Issues & Blockers

### Minor Issues:
- Windows file locks: `.next` folder sometimes needs manual deletion
- Port mismatch: Backend on 8010, frontend expects 8000 (fixable via .env.local)
- Stale browser sessions: Cache/cookies may need clearing after auth changes

### No Current Blockers:
All critical systems are functional. Ready to proceed with pitch deck and POI automation.

## Context for Next Session

**If you're reading this after a memory reset:**

1. **Read ALL memory bank files first** (this is critical)
2. **Current priorities**: Testing/learning sprint + pitch deck preparation
3. **User wants**: Functional capabilities, not technical architecture
4. **Key insight**: LEXA is about emotional intelligence, not just data
5. **Communication style**: User is a complete beginner, explain everything simply
6. **Design philosophy**: Visual-first, luxury aesthetics, emotional language

**Recent conversation highlights:**
- Lock Brain Console to captains/admins; no open registration
- Improve LEXA creativity to be inventive by analogy, but grounded (no hallucinated feasibility)
- Start the testing/learning phase with captains and heavy usage
- Update landing page copy and remove long dash characters for consistency

**What's working well:**
- Theme-led conversation flow
- Experience DNA framework
- Google Places enrichment
- Yacht destination system
- Admin knowledge portal

**What needs attention:**
- POI collection automation (next major feature)
- Upsell system (Q1 2026)
- Mobile app (Q2 2026)
- Affiliate dashboard (Q1 2026)

## Questions to Clarify (If Needed)

When resuming work, consider asking:
1. "Which audience is the priority for the pitch deck? (Investors, brokers, agents, or tourism boards?)"
2. "Do you want slides content or a written pitch document?"
3. "Any specific metrics or traction to highlight?"
4. "Should we include founder/team information?"
5. "What's the ask? (Funding amount, partnership terms?)"

But for now: **Continue with comprehensive pitch deck summary as outlined.**

