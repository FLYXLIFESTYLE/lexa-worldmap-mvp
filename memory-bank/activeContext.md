# Active Context

**Last Updated**: December 31, 2025

## Current Focus: Testing + Learning Sprint (with captains) + Pitch Deck

### What we're working on (now):
1. **Captain testing loop** (daily)
   - Captains + Chris actively chat with LEXA, push edge cases, and rate what works/doesn't.
2. **Learning via real examples**
   - Upload proven scripts/itineraries/transcripts/PDFs and ingest URLs.
   - Add POIs manually when needed to raise the bar fast.
3. **Expand POI coverage in the background**
   - Continue ingestion/projection for all 14 destinations without disrupting testing.
4. **Pitch deck prep**
   - A functional, non-technical story for investors and strategic partners.

### Key requirement:
**Functional summary** of what the system does and why it's powerful.
- Avoid technical architecture in captain-facing/investor-facing materials
- Focus on outcomes: emotional intelligence + explainable recommendations + learning loop

## Recent Major Changes

### December 2025 - POI Collection System & Production Deployment

**MAJOR ADDITION: Automated POI Collection System** ✅

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
1. **Google Places as Primary Source**: Real-time, accurate, comprehensive
2. **Luxury-Only Focus**: Filter out low-rated, budget POIs
3. **Emotional Tagging**: Every POI linked to themes
4. **Yacht Destinations Priority**: High luxury confidence, proven markets
5. **French Riviera First**: Test market for enrichment pipeline

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

