# LEXA MVP Completion Roadmap
**Goal**: Transform current 75% MVP into investor-ready "wow" demo  
**Timeline**: 2-3 weeks focused development  
**Created**: January 5, 2026

---

## 🎯 The 3 Critical Gaps

### 1. **End-to-End Chat LEXA** (80% → 100%)
**Problem**: Chat works, but script delivery feels incomplete  
**Impact**: Users don't see the "wow" moment after script generation

### 2. **Script Design Engine** (60% → 100%)
**Problem**: Scripts are generic text, not data-driven with real POIs  
**Impact**: Scripts feel like templates, not personalized recommendations

### 3. **Tiers & Upsells** (30% → 100%)
**Problem**: No way to pay or gate features  
**Impact**: Can't monetize or demonstrate business model

---

## 📋 NEW IMPLEMENTATION SEQUENCE (User-Requested Order)

### **PHASE 0: Tier Definitions & Documentation** ✅ **COMPLETE**
**Priority**: 🔴 CRITICAL - Foundation for all tier features

#### Day 1: Document Tier Features & Capabilities ✅
**What**: Create comprehensive tier documentation (not implementation yet)  
**Why**: LEXA needs to understand what each tier offers before building features

**Status**: ✅ **COMPLETE** - User provided tier definitions

**Tiers Defined:**
- ✅ **Free (The Spark)**: €0/month - 1 basic script per year
- ✅ **The Inspired**: €297/month (€3,564/year) - Unlimited basic + 3 fully curated per year
- ✅ **The Connoisseur**: €997/month (€11,964/year) - Unlimited basic + 5 fully curated per year

**Upsell Packages Defined:**
- ✅ **Discovery**: €497 per experience
- ✅ **Blueprint**: €1,497 per experience (or €497/night for 3 nights)
- ✅ **Concierge**: €2,997 per experience (or €997/night for 3 nights)
- ✅ **White Glove**: €5k-8k per day (4 days minimum)

**Key Rules Documented:**
- ✅ Annual payment only (prevents abuse)
- ✅ Higher tiers include lower tier features
- ✅ Higher upsells include lower upsell features
- ✅ Limited fully curated scripts per tier
- ✅ On-demand purchases if user exceeds tier limits

**Files Created:**
- ✅ `docs/TIER_DEFINITIONS.md` - Complete tier documentation
- ✅ `supabase/migrations/016_update_tier_definitions.sql` - Database migration
- ✅ `supabase/migrations/017_upsell_packages.sql` - Upsell packages table

**Deliverable**: ✅ Complete tier documentation and database schema ready for implementation

---

### **PHASE 1: Script Design Engine** (5 days)
**Priority**: 🔴 CRITICAL - Needed for LEXA chat flow

#### Day 1: POI Injection into Scripts
**What**: Include real POI recommendations in scripts  
**Why**: Scripts should name specific venues, not generic concepts

**Tasks:**
- [ ] Update `getScriptDraftSystemPrompt` to call `retrieveBrainCandidatesV2`
- [ ] Format POIs into script (name, address, type, coordinates)
- [ ] Add POI section to script display
- [ ] Test: Scripts include real venue recommendations

**Files:**
- `lib/lexa/stages/script-draft.ts`
- `app/experience/script/page.tsx` (display POIs)

---

#### Day 2: Day-by-Day Generator (Creator Tier)
**What**: Break script into daily activities  
**Why**: $497 tier feature - actionable day-by-day planning

**Tasks:**
- [ ] Create day-by-day breakdown function
- [ ] Split script into daily activities with POIs
- [ ] Add time-of-day suggestions
- [ ] Gate behind Creator tier check
- [ ] Show upgrade prompt for Free/Explorer tiers

**Files:**
- `lib/lexa/script/day-by-day.ts` (new)
- `app/experience/script/page.tsx` (show day-by-day)
- `lib/membership/tier-check.ts` (new - tier enforcement)

---

#### Day 3: Booking Links & Coordinates
**What**: Add actionable booking links to POIs  
**Why**: Creator+ tier feature - users can book directly

**Tasks:**
- [ ] Add booking URLs to POI data (where available)
- [ ] Display booking links in script (Creator+ only)
- [ ] Add map coordinates for POIs
- [ ] Show upgrade prompt for lower tiers

**Files:**
- `app/experience/script/page.tsx` (booking links)
- `lib/neo4j/queries.ts` (fetch POI booking URLs)

---

#### Day 4: Script Refinement Logic
**What**: Smart refinement based on user requests  
**Why**: Users want to iterate, not regenerate from scratch

**Tasks:**
- [ ] Enhance REFINE stage to parse user requests
- [ ] Regenerate script with refinements
- [ ] Track refinement count (limit for Free tier)
- [ ] Show refinement history

**Files:**
- `lib/lexa/stages/refine.ts`
- `app/api/lexa/chat/route.ts` (refinement tracking)

---

#### Day 5: Script Versioning
**What**: Track script versions and allow reverting  
**Why**: Users want to see evolution and restore previous versions

**Tasks:**
- [ ] Store script versions in database
- [ ] Show version history in script view
- [ ] Allow reverting to previous versions
- [ ] Visual diff between versions

**Files:**
- `supabase/migrations/013_script_versioning.sql` (new)
- `app/experience/script/page.tsx` (version history UI)

**✅ Phase 1 Deliverable**: Scripts are data-driven, actionable, and tier-gated.

---

### **PHASE 2: Finalize LEXA Chat** (4 days)
**Priority**: 🔴 CRITICAL - Complete the customer journey

#### Day 1: Script Display from Real Data
**What**: Make script preview page load actual generated scripts  
**Why**: Users currently see mock data, not their real scripts

**Tasks:**
- [ ] Update `app/experience/script/page.tsx` to fetch from `experience_briefs` table
- [ ] Create API route `/api/user/scripts/[id]` to get script by ID
- [ ] Replace mock data with real script data
- [ ] Test: Chat → Generate → View shows real script

**Files:**
- `app/experience/script/page.tsx`
- `app/api/user/scripts/[id]/route.ts` (new)

---

#### Day 2: Script Library & Navigation
**What**: Save scripts to library and show in account dashboard  
**Why**: Users need to find and revisit their scripts

**Tasks:**
- [ ] Ensure scripts save to `user_script_library` on HANDOFF
- [ ] Update Account Dashboard to show recent scripts
- [ ] Create script library page (`/account/scripts`)
- [ ] Add navigation: Chat → Script → Library

**Files:**
- `app/api/lexa/chat/route.ts` (ensure script saving)
- `app/account/page.tsx` (show scripts)
- `app/account/scripts/page.tsx` (new)

---

#### Day 3: Refinement Flow
**What**: Let users refine scripts through chat  
**Why**: Users want to iterate, not start over

**Tasks:**
- [ ] Add "Refine this script" button on script view
- [ ] Refinement opens chat with script context
- [ ] REFINE stage uses existing script to make changes
- [ ] Save refined version as new script

**Files:**
- `app/experience/script/page.tsx` (add refine button)
- `lib/lexa/stages/refine.ts` (enhance refinement logic)
- `app/api/lexa/chat/route.ts` (handle refinement context)

---

#### Day 4: Seamless Flow & Polish
**What**: Auto-redirect and beautiful script display  
**Why**: Complete the "wow" moment

**Tasks:**
- [ ] Auto-redirect to script page after HANDOFF
- [ ] Beautiful script formatting (luxury design)
- [ ] Add share button (copy link)
- [ ] Add "Back to Chat" navigation
- [ ] Test full flow: Chat → Script → View → Refine

**Files:**
- `app/api/lexa/chat/route.ts` (return script ID)
- `app/experience/script/page.tsx` (polish UI)
- `components/script/script-viewer.tsx` (new component)

**✅ Phase 2 Deliverable**: Users can chat, get script, view it beautifully, and refine it seamlessly.

---

### **PHASE 3: Tiers & Upsells + Marketplace** (8 days)
**Priority**: 🔴 CRITICAL - Enables monetization

**✅ Phase 1 Deliverable**: Users can chat, get script, view it beautifully, and refine it seamlessly.

---

### **PHASE 2: Script Design Engine Enhancement** (5 days)
**Priority**: 🔴 CRITICAL - Makes scripts actionable

#### Day 5: POI Injection into Scripts
**What**: Include real POI recommendations in scripts  
**Why**: Scripts should name specific venues, not generic concepts

**Tasks:**
- [ ] Update `getScriptDraftSystemPrompt` to call `retrieveBrainCandidatesV2`
- [ ] Format POIs into script (name, address, type)
- [ ] Add POI section to script display
- [ ] Test: Scripts include real venue recommendations

**Files:**
- `lib/lexa/stages/script-draft.ts`
- `app/experience/script/page.tsx` (display POIs)

---

#### Day 6: Day-by-Day Generator (Creator Tier)
**What**: Break script into daily activities  
**Why**: $497 tier feature - actionable day-by-day planning

**Tasks:**
- [ ] Create day-by-day breakdown function
- [ ] Split script into daily activities with POIs
- [ ] Add time-of-day suggestions
- [ ] Gate behind Creator tier check
- [ ] Show upgrade prompt for Free/Explorer tiers

**Files:**
- `lib/lexa/script/day-by-day.ts` (new)
- `app/experience/script/page.tsx` (show day-by-day)
- `lib/membership/tier-check.ts` (new - tier enforcement)

---

#### Day 7: Booking Links & Coordinates
**What**: Add actionable booking links to POIs  
**Why**: Creator+ tier feature - users can book directly

**Tasks:**
- [ ] Add booking URLs to POI data (where available)
- [ ] Display booking links in script (Creator+ only)
- [ ] Add map coordinates for POIs
- [ ] Show upgrade prompt for lower tiers

**Files:**
- `app/experience/script/page.tsx` (booking links)
- `lib/neo4j/queries.ts` (fetch POI booking URLs)

---

#### Day 8: Script Refinement Logic
**What**: Smart refinement based on user requests  
**Why**: Users want to iterate, not regenerate from scratch

**Tasks:**
- [ ] Enhance REFINE stage to parse user requests
- [ ] Regenerate script with refinements
- [ ] Track refinement count (limit for Free tier)
- [ ] Show refinement history

**Files:**
- `lib/lexa/stages/refine.ts`
- `app/api/lexa/chat/route.ts` (refinement tracking)

---

#### Day 9: Script Versioning
**What**: Track script versions and allow reverting  
**Why**: Users want to see evolution and restore previous versions

**Tasks:**
- [ ] Store script versions in database
- [ ] Show version history in script view
- [ ] Allow reverting to previous versions
- [ ] Visual diff between versions

**Files:**
- `supabase/migrations/013_script_versioning.sql` (new)
- `app/experience/script/page.tsx` (version history UI)

**✅ Phase 2 Deliverable**: Scripts are data-driven, actionable, and tier-gated.

---

### **PHASE 3: Tiers & Upsells System** (6 days)
**Priority**: 🔴 CRITICAL - Enables monetization

#### Day 10: Upsell Presentation Page
**What**: Beautiful tier comparison and upgrade page  
**Why**: Users need to see value before paying

**Tasks:**
- [ ] Create `/account/membership` page
- [ ] Beautiful tier comparison table
- [ ] Feature highlights per tier
- [ ] "Upgrade" buttons for each tier
- [ ] Pricing display (monthly/annual)

**Files:**
- `app/account/membership/page.tsx` (new)
- `components/upsell/tier-comparison.tsx` (new)

---

#### Day 11: Stripe Integration Setup
**What**: Connect Stripe for payments  
**Why**: Need payment processing to monetize

**Tasks:**
- [ ] Create Stripe account (if not exists)
- [ ] Add Stripe keys to `.env.local` and production
- [ ] Install Stripe SDK (`@stripe/stripe-js`, `stripe`)
- [ ] Create checkout session API route
- [ ] Test: Can create checkout sessions

**Files:**
- `app/api/stripe/checkout/route.ts` (new)
- `package.json` (add Stripe dependencies)
- `.env.local` (add Stripe keys)

---

#### Day 3: Payment Flow
**What**: Complete payment checkout  
**Why**: Users need to be able to pay

**Tasks:**
- [ ] Connect "Upgrade" buttons to Stripe checkout
- [ ] Handle successful payment redirect
- [ ] Update `user_memberships` table on payment
- [ ] Show success message
- [ ] Test: Users can complete payment

**Files:**
- `app/account/membership/page.tsx` (checkout integration)
- `app/api/stripe/checkout/route.ts` (complete flow)

---

#### Day 4: Webhook Handler
**What**: Handle Stripe webhooks for subscription updates  
**Why**: Need to sync Stripe events with database

**Tasks:**
- [ ] Create Stripe webhook endpoint
- [ ] Handle `checkout.session.completed`
- [ ] Handle `customer.subscription.updated`
- [ ] Handle `customer.subscription.deleted`
- [ ] Test: Webhooks update membership status

**Files:**
- `app/api/stripe/webhook/route.ts` (new)

---

#### Day 14: Tier Enforcement
**What**: Gate features based on tier  
**Why**: Free tier shouldn't access paid features

**Tasks:**
- [ ] Create `lib/membership/tier-check.ts` helper
- [ ] Gate day-by-day behind Creator tier
- [ ] Gate booking links behind Creator tier
- [ ] Gate concierge features behind Concierge tier
- [ ] Block script generation if Free tier limit reached
- [ ] Test: Features are properly gated

**Files:**
- `lib/membership/tier-check.ts` (new)
- `app/experience/script/page.tsx` (tier checks)
- `app/api/lexa/chat/route.ts` (tier checks)

---

#### Day 6: Upsell Triggers

---

#### Day 7: Script Marketplace - Core Features
**What**: Create marketplace for users to browse, reuse, and edit scripts  
**Why**: Social proof, inspiration, and community engagement

**Tasks:**
- [ ] Create marketplace database schema (`marketplace_scripts` table)
- [ ] Create marketplace page (`/marketplace`)
- [ ] Display popular scripts (by views, favorites, shares)
- [ ] Allow users to "Use this script" (creates copy for editing)
- [ ] Add search and filter (theme, destination, price)
- [ ] Add script preview cards

**Files:**
- `supabase/migrations/014_marketplace_scripts.sql` (new)
- `app/marketplace/page.tsx` (new)
- `components/marketplace/script-card.tsx` (new)
- `app/api/marketplace/scripts/route.ts` (new)

---

#### Day 8: Script Marketplace - Sharing & Affiliate Integration
**What**: Enable script sharing and GoHighLevel affiliate tracking  
**Why**: Users can share scripts, affiliates get credit

**Tasks:**
- [ ] Add "Share to Marketplace" button on script view
- [ ] Create script sharing API (public/private options)
- [ ] Integrate GoHighLevel CRM for affiliate tracking
- [ ] Add affiliate attribution to scripts
- [ ] Create affiliate dashboard (for brokers/influencers)
- [ ] Add affiliate links to marketplace scripts

**Files:**
- `app/api/marketplace/scripts/share/route.ts` (new)
- `lib/affiliate/gohighlevel.ts` (new - GoHighLevel integration)
- `app/affiliate/dashboard/page.tsx` (new)
- `app/api/affiliate/track/route.ts` (new)

**✅ Phase 3 Deliverable**: Users can pay, features are gated, marketplace enables community, affiliates are tracked.

---

### **PHASE 4: Emotional Profile Display** (2 days)
**Priority**: 🟡 HIGH - User engagement

#### Day 1: Emotional Profile UI in Account
**What**: Display user's emotional profile and preferences in account dashboard  
**Why**: Users want to see what LEXA knows about them

**Tasks:**
- [ ] Create emotional profile component (`components/account/EmotionalProfileCard.tsx`)
- [ ] Display core emotions, secondary emotions, emotional drivers
- [ ] Display personality traits and archetype
- [ ] Display primary themes user explores
- [ ] Display travel preferences (budget, frequency, style)
- [ ] Display sensory preferences (scents, tastes, sounds)
- [ ] Display past destinations and bucket list
- [ ] Add "Edit Profile" button

**Files:**
- `components/account/EmotionalProfileCard.tsx` (new or update existing)
- `app/account/page.tsx` (add emotional profile section)
- `app/api/user/profile/emotional/route.ts` (ensure it works)

---

#### Day 2: Profile Learning Visualization
**What**: Show how LEXA learns from conversations  
**Why**: Transparency builds trust

**Tasks:**
- [ ] Display "Last updated" timestamp
- [ ] Show learning signals (what LEXA learned from last conversation)
- [ ] Display confidence scores for emotional drivers
- [ ] Add "Refresh Profile" button (re-analyze from conversations)
- [ ] Show profile evolution over time (if multiple updates)

**Files:**
- `components/account/EmotionalProfileCard.tsx` (enhance)
- `app/api/user/profile/refresh/route.ts` (new)

**✅ Phase 4 Deliverable**: Users can see their emotional profile and how LEXA learns about them.

---

### **PHASE 5: Landing Page Enhancements** (2 days)
**Priority**: 🟡 HIGH - User acquisition

#### Day 1: Popular Scripts Section
**What**: Show most popular scripts on landing page  
**Why**: Social proof and inspiration

**Tasks:**
- [ ] Create API route to fetch popular scripts (`/api/marketplace/popular`)
- [ ] Add "Popular Experience Scripts" section to landing page
- [ ] Display 4-6 script cards with preview
- [ ] Add "View All" link to marketplace
- [ ] Make cards clickable (link to script preview or marketplace)

**Files:**
- `app/page.tsx` (add popular scripts section)
- `app/api/marketplace/popular/route.ts` (new)
- `components/landing/popular-scripts.tsx` (new)

---

#### Day 2: Theme Categories Overview
**What**: Show all 14 theme categories on landing page  
**Why**: Help users discover themes before starting chat

**Tasks:**
- [ ] Update themes to include "Nightlife & Entertainment" and "Sports & Active"
- [ ] Create theme categories section on landing page
- [ ] Display all 14 themes with images and descriptions
- [ ] Make themes clickable (link to chat with theme pre-selected)
- [ ] Add hover effects and luxury styling

**Files:**
- `lib/lexa/themes.ts` (add Nightlife and Sports)
- `app/page.tsx` (add theme categories section)
- `components/landing/theme-categories.tsx` (new)
- `supabase/migrations/015_add_nightlife_sports_themes.sql` (new - update Neo4j)

**✅ Phase 5 Deliverable**: Landing page shows popular scripts and all theme categories.

---

### **PHASE 6: Data Ingestion (Parallel/Background)** (Ongoing)
**Priority**: 🟢 MEDIUM - Fill LEXA's brain

**What**: Upload, scrape, and generate POIs continuously  
**Why**: More data = better recommendations

**Tasks:**
- [ ] Upload documents (transcripts, PDFs, itineraries)
- [ ] Scrape URLs (luxury travel sites, blogs, guides)
- [ ] Generate POIs from Overture, Foursquare, Wikidata
- [ ] Extract intelligence (POIs, experiences, trends)
- [ ] Approve and promote high-quality POIs
- [ ] Create relationships (POI → Theme → Destination)

**Note**: This runs in parallel with other phases, not blocking.

---

## 📊 Updated Implementation Summary

### Total Effort: 20 days (4 weeks)

| Phase | Days | Priority | Impact |
|-------|------|----------|--------|
| Phase 0: Tier Definitions | 1 | 🔴 Critical | Foundation |
| Phase 1: Script Design Engine | 5 | 🔴 Critical | Makes scripts actionable |
| Phase 2: Finalize LEXA Chat | 4 | 🔴 Critical | Complete customer journey |
| Phase 3: Tiers & Upsells + Marketplace | 8 | 🔴 Critical | Enables monetization |
| Phase 4: Emotional Profile Display | 2 | 🟡 High | User engagement |
| Phase 5: Landing Page Enhancements | 2 | 🟡 High | User acquisition |
| Phase 6: Data Ingestion | Ongoing | 🟢 Medium | Better recommendations |
**What**: Show upgrade prompts at right moments  
**Why**: Drive conversions when users are most engaged

**Tasks:**
- [ ] Show upgrade prompt when Free tier hits 3 scripts/month
- [ ] Show upgrade prompt after script generation ("Want day-by-day?")
- [ ] Show upgrade prompt when requesting concierge features
- [ ] Show upgrade prompt when hitting conversation limit
- [ ] Test: Upsells appear at right moments

**Files:**
- `components/upsell/upgrade-prompt.tsx` (new)
- `app/experience/script/page.tsx` (upsell triggers)
- `app/api/lexa/chat/route.ts` (upsell triggers)

**✅ Phase 3 Deliverable**: Users can pay, features are gated, upsells drive conversions.

---

## 📊 Implementation Summary

### Total Effort: 15 days

| Phase | Days | Priority | Impact |
|-------|------|----------|--------|
| Phase 1: End-to-End Chat | 4 | 🔴 Critical | Highest user impact |
| Phase 2: Script Engine | 5 | 🔴 Critical | Makes scripts actionable |
| Phase 3: Tiers & Upsells | 6 | 🔴 Critical | Enables monetization |

---

## 🎯 Quick Wins (Can Do in Parallel)

These can be done alongside the main phases:

### Quick Win 1: Script PDF Export (2 hours)
- [ ] Use existing PDF library (`rag_system/core/pdf/script_pdf_generator.py`)
- [ ] Create API route `/api/user/scripts/[id]/pdf`
- [ ] Add "Download PDF" button to script view
- [ ] Test: Users can download beautiful PDF

### Quick Win 2: Script Sharing (2 hours)
- [ ] Create shareable link with preview
- [ ] Add "Share" button to script view
- [ ] Create public script preview page (`/scripts/[id]`)
- [ ] Test: Users can share scripts

### Quick Win 3: Usage Limit Warnings (1 hour)
- [ ] Show warning when Free tier hits 2/3 scripts
- [ ] Show warning when approaching conversation limit
- [ ] Add progress bars to account dashboard
- [ ] Test: Users see limits before hitting them

---

## 🚨 Blockers & Dependencies

### External Dependencies:
1. **Stripe Account**: Need to create Stripe account and get API keys
2. **Stripe Webhook URL**: Need to configure webhook endpoint in Stripe dashboard

### Internal Dependencies:
1. **Script ID**: Need to return script ID from HANDOFF stage
2. **Tier Check Helper**: Need to create before enforcing features

---

## ✅ Success Criteria

### Must-Have for Investor Demo:
- [x] User can chat with LEXA end-to-end
- [ ] User sees beautiful script after generation
- [ ] Script includes real POI recommendations
- [ ] User can upgrade tier and complete payment
- [ ] Tier features are enforced (Free can't access Creator features)
- [ ] User can see their emotional profile in account
- [ ] Marketplace shows popular scripts
- [ ] Landing page shows themes and popular scripts
- [ ] Affiliate tracking works (GoHighLevel integration)

### Nice-to-Have (Can Demo Without):
- [ ] PDF export
- [ ] Script sharing (can show as "coming soon")
- [ ] Day-by-day generator (can show as "coming soon" for Creator tier)
- [ ] Concierge features (can show as "coming soon" for Concierge tier)

### Nice-to-Have (Can Demo Without):
- [ ] PDF export
- [ ] Script sharing
- [ ] Day-by-day generator (can show as "coming soon")
- [ ] Concierge features (can show as "coming soon")

---

## 📝 Next Steps

1. **Review this roadmap** and confirm priorities
2. **Set investor demo date** (determines timeline)
3. **Start Phase 0, Day 1** (Tier Definitions & Documentation)
4. **Then Phase 1** (Script Design Engine)
5. **Then Phase 2** (Finalize LEXA Chat)
6. **Then Phase 3** (Tiers & Upsells + Marketplace)
7. **Then Phase 4** (Emotional Profile Display)
8. **Then Phase 5** (Landing Page Enhancements)
9. **Run Phase 6** (Data Ingestion) in parallel throughout

---

## 🔗 GoHighLevel CRM Integration

**Question**: Can Cursor connect LEXA with GoHighLevel CRM?

**Answer**: Yes! GoHighLevel has a REST API that can be integrated. Here's how:

### GoHighLevel Integration Plan:
1. **API Authentication**: Use GoHighLevel API key (stored in environment variables)
2. **Affiliate Tracking**: When user signs up via affiliate link, create contact in GoHighLevel
3. **Conversion Tracking**: When user upgrades tier, update contact with conversion event
4. **Commission Tracking**: Track affiliate commissions in GoHighLevel
5. **Webhook Integration**: GoHighLevel can send webhooks for contact updates

### Implementation:
- Create `lib/affiliate/gohighlevel.ts` with API client
- Add GoHighLevel API key to environment variables
- Create webhook handler for GoHighLevel events
- Add affiliate link tracking (UTM parameters)
- Create affiliate dashboard showing GoHighLevel data

### Files to Create:
- `lib/affiliate/gohighlevel.ts` (GoHighLevel API client)
- `app/api/affiliate/gohighlevel/route.ts` (webhook handler)
- `app/affiliate/dashboard/page.tsx` (affiliate dashboard)

---

**Status**: Ready to begin implementation  
**Last Updated**: January 5, 2026
