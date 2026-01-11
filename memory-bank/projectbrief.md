# LEXA Project Brief

## Project Name
**LEXA** - Luxury Experience Assistant

## Tagline
"Emotional Intelligence for Luxury Travel"

## Core Mission
Transform luxury travel from transactional booking to emotional experience design. LEXA doesn't plan trips—it designs feelings, creates memory triggers, and architects transformational moments.

## The Problem We Solve

### What's Broken in Luxury Travel:
1. **Traditional Travel Agents**
   - Ask: "Where? When? Budget?"
   - Focus on logistics, not emotions
   - Limited by personal experience
   - Doesn't scale

2. **OTAs (Booking.com, Expedia)**
   - Commodity booking engines
   - Race to the bottom on price
   - No personalization beyond "beachfront vs. garden view"
   - Generic recommendations

3. **Existing AI Travel Assistants**
   - Generic, hallucinate facts
   - No emotional intelligence
   - No real-time luxury data
   - Can't explain WHY a recommendation fits

4. **Yacht Brokers**
   - Market yachts, not experiences
   - Ask "Where do you want to go?"
   - Don't understand emotional drivers
   - Client dissatisfaction: "What should we do there?"

### The Core Insight
**Humans don't remember destinations. They remember FEELINGS.**

- Not "I went to Paris" → "I felt completely alive"
- Not "We ate at a 3-star restaurant" → "I can still taste that truffle pasta"
- Not "Nice hotel" → "The smell of roses and sea salt—I'm instantly back there"

## What LEXA Does

### For Travelers:
1. **Theme-Led Discovery**
   - Visual selection of 14 emotional themes (Romance, Adventure, Wellness, etc.)
   - No "Where do you want to go?" - Start with feelings

2. **Experience DNA Design**
   - **Story**: The narrative arc (reconnection, celebration, transformation)
   - **Emotion**: The core feeling + secondary emotion
   - **Trigger**: Sensory anchor (smell, taste, sound) that brings it all back

3. **90-Second WOW Test**
   - 3 mindblowing questions that prove "LEXA gets me"
   - If client isn't impressed in 90 seconds, they can walk away
   - Creates instant trust and engagement

4. **Experience Scripts, Not Itineraries**
   - 4-part format: Title, Hook, Emotional Description, Signature Highlights
   - Written like movie trailers, not travel guides
   - Client can envision the experience before booking

### For Business Partners:
1. **Yacht Brokers**: Emotional client profiling, destination intelligence
2. **Travel Agents**: Knowledge upload system, commission tracking, AI assistant
3. **Tourism Boards**: Destination enrichment, emotional storytelling

## Key Differentiators

### 1. Graph Database + RAG
- **Neo4j**: 300,000+ POIs with emotional relationships
- **Claude 3.5 Sonnet**: Conversation intelligence
- **No hallucinations**: Every fact grounded in real data
- **Relationship-aware**: "This restaurant pairs with your hotel theme and fits your budget"

### 2. Experience DNA Framework
- Proprietary methodology: Story + Emotion + Trigger
- "Foodgasm Principle": Design peak moments that encode with sensory triggers
- 10 years later, smell lavender → instantly back on that Provence terrace

### 3. Data-Driven Luxury Intelligence
- Open-source + owned-input enrichment (uploads/scraping/manual) for MVP; paid enrichers optional later
- Luxury scoring algorithm (0-10)
- Quality filters: 4+ stars, high price level, experience-relevant only
- 350+ yacht destinations with confidence scores

### 4. Theme-First, Not Logistics-First
- Traditional: Where → When → What → Book
- LEXA: What (feeling) → LEXA suggests Where & When → Experience Script

## Success Metrics

### User Success:
- Client says: *"I can still taste that meal. Whenever I smell lavender, I'm back there."*
- NOT: *"We went to Nice. It was nice."*

### Business Success:
- **18-month goal**: 10,000 users, $250K MRR
- **5-year vision**: Global standard for luxury experience design

## Target Users

### Primary:
1. **High-Net-Worth Individuals (HNWIs)**
   - 35-65 years old
   - Experience collectors
   - Travel 3-5x per year
   - Value emotional impact over price

2. **Luxury Travel Advisors**
   - Need AI augmentation
   - Want to scale personalization
   - Commission-focused

3. **Yacht Charter Clients & Brokers**
   - $10.2B market
   - 25,000+ charters/year
   - Pain: "What should we do there?"

### Secondary:
4. **Tourism Boards**
   - Need emotional positioning
   - Want data-driven insights
   - 195 countries, thousands of luxury destinations

## Scope

### MVP (Current - Beta Live):
- ✅ Theme selection (14 categories)
- ✅ Conversational experience builder
- ✅ Experience Script generation
- ✅ 300,000+ POI database
- ✅ Google Places enrichment
- ✅ Admin knowledge portal
- ✅ Yacht destination upload system

### Next 6 Months:
1. **Ingestion & Extraction (Top Priority)**: High-throughput crawl/upload → multi-pass extraction → confidence scoring → Neo4j + pgvector writes with captain approval
2. **Communication Quality**: Claude-style responses (acknowledge + first ideas + clarifying question), data-driven emotional profiling
3. **Grounded Retrieval & Recommendation**: Hybrid Neo4j + pgvector, ranking by emotion fit and confidence
4. Upsell system ($497-$2,997 packages)
5. Affiliate dashboard (GoHighLevel integration)
6. Mobile app (React Native)
7. Multi-language support
8. Real-time collaboration

### Out of Scope (For Now):
- Direct booking (handoff to partners)
- Payment processing
- Customer service chat
- Hotel/airline inventory
- “Right now” live concierge (will be a paid tier later)

## Strategic Priorities (2026)
1) **Feed the Brain**: Crawl/provider ingestion + file uploads → multi-pass extraction → captain approval → Neo4j canonical graph with audit trail in Postgres/pgvector. Counts separated into real vs. estimated. No hallucinations; concrete claims must be source-backed.
2) **Claude-Quality Communication**: Immediate reflection + 3–6 first ideas + 1 clarifying question. Tone: warm, confident, luxury. Uses grounded context only; generic ideas must be labeled as such.
3) **Personalization**: Continuously learn user emotional profile and preferences from conversations, selections, and outcomes.
4) **Recommendations**: Hybrid retrieval (graph + vector) ranked by confidence and emotion fit, using captain-verified data first.
5) **Security by Default**: Anti-exfiltration and prompt-injection defenses; role-based access; rate limits; deny “list all” or schema/architecture probing.
6) **Real-Time World Context (Later/Paid)**: Tavily + reliable APIs (weather, advisories, events) for “right now” suggestions, gated to paid tier when built.

### Recent UX (Captain Upload)
- File rows show quick summary of extracted counts; keep/dump displayed.
- Editor has bulk select/delete for POIs/Experiences/Providers and per-item confidence (0–100% UI, stored as fraction).
- Providers are separated from competitors; competitor lists are mapped into providers when present.
- Removed top-level confidence slider/emotion/count boxes to reduce clutter; focus on item-level edits and keep/dump.

## Constraints

### Technical:
- Must be fast (< 2 second responses)
- Must not hallucinate (RAG grounding required)
- Must scale to 100,000+ users
- Must respect Google Places API budget

### Business:
- Bootstrap-friendly (seed funding target: $1.5M)
- Commission-based revenue (no VC pressure for scale-at-all-costs)
- Partner-first (don't compete with brokers/agents)

### User Experience:
- Beginner-friendly (user has never coded)
- Luxury aesthetics (gold, navy, elegant)
- Mobile-first (future, desktop-first now)

## Success Definition

**LEXA succeeds when:**
1. Travelers design experiences based on feelings, not destinations
2. Brokers/agents use LEXA to understand client emotions
3. Tourism boards position destinations emotionally
4. The knowledge graph becomes the world's most comprehensive luxury travel database
5. Users remember experiences 10 years later with sensory triggers

## Vision Statement

> "LEXA becomes the global standard for emotional travel design. Every luxury traveler starts with LEXA to design their experience DNA. Every broker and agent uses LEXA to understand client emotions. Every tourism board enriches their destination through LEXA's graph. Not just a chatbot. Not just a booking engine. An emotional intelligence platform that transforms how humans design, discover, and remember travel experiences."

## Non-Goals

- We are NOT building a booking platform
- We are NOT competing on price
- We are NOT a generic travel search engine
- We are NOT focused on budget travel
- We are NOT trying to replace human travel advisors (we augment them)

## Project Status
**BETA LIVE** at luxury-travel-designer.com

Currently preparing pitch deck for:
- Investors (Seed round: $1.5M)
- Strategic partners (yacht brokers, travel agents, tourism boards)
- Press and media

