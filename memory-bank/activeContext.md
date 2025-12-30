# Active Context

**Last Updated**: December 31, 2025

## Current Focus: Pitch Deck Preparation

### What We're Working On:
Creating a comprehensive pitch deck summary for:
1. **Investors** (Seed round: $1.5M)
2. **Strategic Partners** (Yacht brokers, travel agents, tourism boards)
3. **Press & Media**

### Key Requirement:
**Functional summary** of what the system is capable of and what's planned.
- NOT technical architecture
- Focus on **what users get** and **why it's powerful**
- Emphasize the **data-driven personalization RAG system**

## Recent Major Changes

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
- [x] Signup/signin with email verification
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
- [x] User management
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

### 1. Complete Pitch Deck Summary ✅
**Status**: In progress
**What's Needed**:
- Functional capabilities overview
- What users get (travelers, brokers, agents, tourism boards)
- Why the RAG system is powerful
- Business model clarity
- Market opportunity
- Competitive advantages
- Roadmap (6-month, 18-month)

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
2. **Current priority**: Pitch deck preparation for investors/partners
3. **User wants**: Functional capabilities, not technical architecture
4. **Key insight**: LEXA is about emotional intelligence, not just data
5. **Communication style**: User is a complete beginner, explain everything simply
6. **Design philosophy**: Visual-first, luxury aesthetics, emotional language

**Recent conversation highlights:**
- User requested comprehensive pitch deck summary
- Focus on what users get and why it's powerful
- Emphasize the RAG system's capabilities
- Avoid technical architecture details
- Make it investor/partner-ready

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

