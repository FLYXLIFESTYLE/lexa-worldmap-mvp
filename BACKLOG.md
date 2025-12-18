# LEXA Feature & Improvement Backlog

**Last Updated:** December 17, 2024

This backlog tracks feature ideas, improvements, enhancements, and tasks for LEXA. Items are categorized by priority and complexity.

---

## 🔴 High Priority (Do First)

### **STRATEGIC PIVOT** 🎯 NEW - Dec 18, 2025
- [ ] **Activity-First Discovery Strategy** (Complexity: Medium, HIGH VALUE) ⭐ GAME CHANGER
  - [ ] Pivot from enriching existing low-quality POIs to discovering experience-enabling POIs
  - [ ] Collect ALL activity-related POIs (beaches, viewpoints, trails, etc.) not just luxury
  - [ ] Target: 500K experience-enabling POIs worldwide
  - [ ] Philosophy: LEXA makes experiences luxury through design, not just venue selection
  - [ ] Cost: $12,500 for 500K POIs (vs. $4,670 for 28K from mass enrichment)
  - [ ] See: `docs/ACTIVITY_FIRST_DISCOVERY_STRATEGY.md`
- [ ] **Multi-Source Premium Discovery** (Complexity: High, CRITICAL) ⭐ NEW
  - [ ] Google Places: 30K luxury POIs ($750)
  - [ ] Forbes Travel Guide: 5K ultra-luxury (FREE - web scraping)
  - [ ] ~~TripAdvisor~~ EXCLUDED (their terms prohibit AI/ML use of API data) ❌
  - [ ] Michelin Guide: 3K dining elite (FREE - web scraping)
  - [ ] Condé Nast Traveler: 3K curated (FREE - web scraping)
  - [ ] World's 50 Best: 500 top (FREE - web scraping)
  - [ ] Relais & Châteaux: 600 properties (FREE - web scraping)
  - [ ] Result: 44K unique luxury POIs after deduplication
  - [ ] See: `docs/STRATEGIC_PIVOT_DISCOVERY_VS_ENRICHMENT.md`
- [ ] **Master Data Intake Pipeline** (Complexity: High, CRITICAL) ⭐ NEW - Dec 18
  - [ ] Automated process: Get properties → Scrape websites → Score → Emotions → Relationships
  - [ ] Duplicate detection & merging (within 100m radius)
  - [ ] Creates ALL relationships: LOCATED_IN, SUPPORTS_ACTIVITY, EVOKES, AMPLIFIES_DESIRE, MITIGATES_FEAR, OFFERS_EXPERIENCE
  - [ ] Geographic relationships: city, region, area, continent
  - [ ] Script: `scripts/master-data-intake-pipeline.ts`
  - [ ] Philosophy: "LEXA doesn't just list what's there - it shows what's relevant to excite and move you"
  - [ ] See: `docs/LEXA_DIFFERENTIATION.md`
- [ ] **Manual POI Import System** (Complexity: Low, READY) ⭐ NEW - Dec 18
  - [ ] Import Forbes PDFs converted to CSV
  - [ ] Import government tourism lists
  - [ ] Import any POI list (CSV/JSON format)
  - [ ] Automatic enrichment through Master Pipeline
  - [ ] Script: `scripts/import-manual-poi-list.ts`
  - [ ] Template: `data/templates/poi_import_template.csv`
  - [ ] See: `MANUAL_IMPORT_GUIDE.md`
- [ ] **Government Tourism Partnerships** (Complexity: Medium, HIGH VALUE) ⭐ NEW - Dec 18
  - [ ] Target: 5 partnerships by Month 3
  - [ ] Priority: Monaco, Côte d'Azur, Amalfi Coast, Maldives, Dubai
  - [ ] Expected: 50,000+ government-verified POIs
  - [ ] Template: `docs/GOVERNMENT_DATA_REQUEST_TEMPLATE.md`
  - [ ] Email 5 tourism boards this week
- [ ] **GetYourGuide API Integration** (Complexity: Medium, REVENUE) ⭐ NEW - Dec 18
  - [ ] World's largest activities marketplace (50K+ experiences)
  - [ ] Sign up: https://partner.getyourguide.com
  - [ ] Verify AI/ML usage allowed in terms
  - [ ] Revenue: 20-30% commission per booking
  - [ ] Perfect for "things to do" recommendations
  - [ ] See: `docs/TRIPADVISOR_ALTERNATIVES_ANALYSIS.md`
- [ ] **Komoot API Integration** (Complexity: Low, UNIQUE NICHE) - Dec 18
  - [ ] Outdoor activities (hiking, cycling, running routes)
  - [ ] Sign up: https://www.komoot.com/api
  - [ ] Strong in Europe, 30M+ users
  - [ ] Unique differentiator for outdoor luxury experiences
- [ ] **Immediate Data Quality Fixes** (Complexity: Low, DO TODAY) ⭐ URGENT
  - [ ] Run: `npx ts-node scripts/fix-duplicate-relationships.ts` (remove ~108 duplicates)
  - [ ] Run: `npx ts-node scripts/create-experience-nodes-from-highlights.ts` (convert highlights)
  - [ ] Re-enrich Arabian Gulf (10K POIs have suspicious 10.1 scores from OSM import)
  - [ ] Re-enrich Amalfi Coast (5K POIs have placeholder scores)
  - [ ] Mark low-quality POIs with `skip_enrichment = true` (save $3,200)

### **Data Enrichment & Quality**
- [ ] **Selective Enrichment** (Complexity: Low, REVISED STRATEGY)
  - [ ] Only enrich POIs with: names, types, in luxury destinations
  - [ ] Skip: unnamed, no type, suspicious scores
  - [ ] Target: ~15K good existing POIs (not 186K all)
  - [ ] Cost: $375 (vs. $4,670 for all)
- [ ] **French Riviera Completion** (Complexity: Low)
  - [ ] Continue with 100 POI batches (increased from 50)
  - [ ] Target: Complete remaining ~10K POIs
  - [ ] Cost: ~$250
  - [ ] Timeline: 1-2 weeks with automation
- [ ] **Emotional Intelligence Implementation** (Complexity: High, CRITICAL) ⭐ THE MOAT
  - [ ] THIS IS LEXA'S BILLION-DOLLAR DIFFERENTIATOR
  - [ ] Build signal detection system (keyword → emotion mapping)
  - [ ] Create emotional profile generator
  - [ ] Enhance Neo4j queries with emotional filters
  - [ ] Implement conversational probing ("What does 'special' mean to you?")
  - [ ] Timeline: 2 weeks
  - [ ] See: `docs/LEXA_EMOTIONAL_INTELLIGENCE_SYSTEM.md`

### **Security & Compliance**
- [ ] **LEXA Compliance & Safety Rules** (Complexity: High, CRITICAL)
  - [ ] Non-racist, non-discriminatory responses
  - [ ] No hallucination - only factual, verified information
  - [ ] Travel-only responses - refuse off-topic questions
  - [ ] No system insights - never reveal processes, architecture, database structure
  - [ ] Content moderation filters
  - [ ] Automated safety checks on all AI responses
  - [ ] Logging & monitoring for compliance violations
  - [ ] Human review queue for flagged responses
- [ ] **Role-Based Access Control (RBAC)** - Separate user/captain/admin roles (Complexity: Medium)
- [ ] **Input Validation & Sanitization** - Prevent injection attacks (Complexity: Medium)
- [ ] **Rate Limiting** - Prevent abuse and API overuse (Complexity: Medium)
- [ ] **Audit Logging** - Track all admin actions (Complexity: Low)

### **Features**
- [ ] **User Profile Management** - Store user preferences, past searches, favorites (Complexity: Medium)
- [ ] **Captain Analytics Dashboard** - Show which Captains contribute most, knowledge usage stats (Complexity: Medium)
- [ ] **Email Notifications** - Notify Captains when their knowledge is used in recommendations (Complexity: Low)
- [ ] **Knowledge Approval Workflow** - Review/approve Captain submissions before publishing (Complexity: Medium)
- [ ] **Bulk Import Status Page** - Track progress of large ChatGPT imports (Complexity: Low)

### **LEXA Chat Improvements**
- [ ] **Optimize Chat Process with LEXA** (Complexity: High, CRITICAL) ⭐
  - [ ] Implement 3-question intake: When, Where, What theme
  - [ ] Quick-reply buttons (months, destinations, themes from Neo4j)
  - [ ] Interactive world map for destination selection
  - [ ] Professional luxury-focused tone
  - [ ] Mirror stage, disarm stage, etc.
  - [ ] See: Initial user request in chat
- [ ] **Enhance Voice Integration** (Complexity: High, USER FEEDBACK: "TERRIBLE") ⭐
  - [ ] Current TTS/STT is terrible per user
  - [ ] Need better voice quality
  - [ ] Consider ElevenLabs, Play.ht, or similar
  - [ ] **HIGH PRIORITY** - user specifically mentioned this multiple times
- [ ] **Implement Emotional Intelligence in Chat** (Complexity: High, CRITICAL)
  - [ ] Read between the lines (detect hidden emotions/desires)
  - [ ] Conversational probing ("What does 'special' mean to you?")
  - [ ] Map user language to emotions
  - [ ] See: `docs/LEXA_EMOTIONAL_INTELLIGENCE_SYSTEM.md`

### **UI/UX Improvements**
- [x] **POI Search & Edit Feature** - Allow Captains to search and edit existing POIs (Complexity: Medium) ✅ **COMPLETED Dec 17, 2024**
- [ ] **Add Search to Knowledge Browser** - Full-text search across all knowledge (Complexity: Medium)
- [ ] **POI Deduplication in UI** - Show when POIs are duplicates before merge (Complexity: Medium)
- [ ] **Mobile Responsive Maps** - Map doesn't work well on mobile (Complexity: Medium)
- [ ] **Error Recovery in Upload** - Resume failed uploads, retry logic (Complexity: Medium)
- [ ] **Optimize Landing Page** (Complexity: Medium)
  - [ ] User mentioned in priority list
  - [ ] Better showcase of LEXA's value proposition

### **Bugs/Issues**
- [ ] **Fix Port Conflict Handling** - Better detection/resolution when port 3000 is in use (Complexity: Low)
- [ ] **Handle Empty Neo4j Responses** - Graceful handling when no data returned (Complexity: Low)
- [ ] **Improve Unicode Support** - Better handling of special characters in knowledge (Complexity: Low)

---

### **Quick Wins** ⚡ (< 2 hours each, HIGH IMPACT)
- [ ] **Toast Notifications** (1 hour)
  - [ ] npm install react-hot-toast
  - [ ] Add success/error toasts to all async actions
  - [ ] Huge UX improvement
- [ ] **Autosave to Knowledge Editor** (2 hours)
  - [ ] Debounced autosave every 3 seconds
  - [ ] Prevent data loss
  - [ ] Toast: "Draft saved"
- [ ] **Dashboard Stats Cards** (2 hours)
  - [ ] Total POIs, Luxury POIs, Emotional Coverage, Today's Enrichment
  - [ ] Quick visibility into data quality
- [ ] **Add Timestamps** (30 min)
  - [ ] "Last updated: X minutes ago" everywhere
  - [ ] Shows activity, builds trust
- [ ] **Captain Leaderboard** (1 day)
  - [ ] Gamify knowledge contributions
  - [ ] 🥇 Top contributor badge
  - [ ] 📈 Contribution graph
  - [ ] 🎯 Monthly challenges
- [ ] **Personality Quiz** (3 days) ⭐ HIGH VALUE
  - [ ] 10-15 questions to determine travel personality
  - [ ] Maps to emotional preferences
  - [ ] Saves to user profile for personalization
  - [ ] Gamifies onboarding
  - [ ] See: `docs/HIGH_VALUE_QUICK_WINS.md`

## 🐛 Bug Fixes & Admin UI Improvements (Urgent) ⚠️ NEW - Dec 18

### **Build & Deployment**
- [ ] **Fix Vercel TypeScript Build** (Complexity: Low, 1 hour) ⚠️
  - Scripts folder causing TypeScript errors in Vercel build
  - Solution: Exclude scripts from Next.js TypeScript check
  - Add `"exclude": ["scripts"]` to `tsconfig.json`
  - Current workaround: Manual redeployment successful
  - Priority: Medium (annoying but has workaround)

### **Admin UI Navigation**
- [ ] **Add Admin Nav to All Pages** (Complexity: Low, 30 min) 🔴 URGENT
  - Missing on Captain's Knowledge Portal (`/admin/knowledge`)
  - Missing on Destination Browser (`/admin/destinations`)
  - Missing on other admin subpages
  - Solution: Add `<AdminNav />` component to all admin pages
  - User reported: "Menu dropdown not available on all subpages"
  
- [ ] **Fix Destination Browser** (Complexity: Medium, 2 hours) 🔴 URGENT
  - Failed to load destinations
  - Check API endpoint `/api/neo4j/destinations`
  - Verify Neo4j query is correct
  - Add error handling and loading states
  - User reported: "Destination browser failed to load destinations"

### **Admin Page Descriptions**
- [ ] **Add Why-What-How Descriptions** (Complexity: Low, 2 hours) ⚠️
  - Add to all admin pages: Why created, What user gets, How to use
  - Format: Short description at top of each page
  - Pages to update:
    - `/admin/dashboard`
    - `/admin/documentation`
    - `/admin/knowledge`
    - `/admin/knowledge/editor`
    - `/admin/chat-neo4j`
    - `/admin/destinations`
    - `/admin/knowledge/scraped-urls`
    - `/admin/release-notes`
  - User requested: "Why - What - How descriptions on all pages"

### **Authentication & Routing**
- [x] **Fix Sign-in Redirect** ✅ COMPLETED - Dec 18
  - After sign-in, user is redirected to chatbot instead of original URL
  - ✅ Fixed: Now reads `redirectTo` parameter and preserves original URL
  - Users return to intended page after authentication

### **User Management & Authentication** ⚠️ NEW - Dec 18
- [ ] **Add Sign-out Option** (Complexity: Low, 30 min) 🔴 URGENT
  - No way to sign out currently
  - Add to AdminNav dropdown
  - User reported: "There is no option to log out"

- [ ] **Add User Profile View** (Complexity: Low, 1 hour) 🔴 URGENT  
  - Display current user info
  - Show role (Admin/Captain/Contributor)
  - Edit profile settings
  - User reported: "No option to see my user profile"

- [ ] **User Management for Captains** (Complexity: Medium, 3 hours) 🔴 HIGH PRIORITY
  - Create admin page: `/admin/users`
  - List all Captains/Contributors
  - Add new users (invite system)
  - Edit roles: Admin, Captain, Contributor (new role!)
  - Deactivate/reactivate users
  - User requested: "Need user management to add more captains"

- [ ] **New Role: Contributor** (Complexity: Low, 1 hour) ⚠️
  - Less permissions than Captain
  - Can contribute knowledge but limited admin access
  - Cannot access ChatNeo4j or edit other users' content
  - User requested: "New user role: Contributor"

## 🟡 Medium Priority (Do Next)

### **Valuable Website & RAG System** 🌐 NEW - Dec 18
- [ ] **Implement Valuable Website Feature** (Complexity: High, 2-3 weeks) ⭐ HIGH VALUE
  - RAG-optimized knowledge extraction from industry sources
  - 5 content types: market intel, destination insights, POI news, travel behavior, competitive intel
  - Entity extraction + relationship mapping for graph queries
  - Semantic chunking with embeddings for vector search
  - See: `docs/VALUABLE_WEBSITE_RAG_SYSTEM.md`
  - User requested: "How to get most out of unstructured data for RAG"
  - **Phases:**
    - [ ] Phase 1: Enhanced URL scraper with RAG optimization
    - [ ] Phase 2: AI extraction with Claude (entity + relationship)
    - [ ] Phase 3: Smart content categorization
    - [ ] Phase 4: Vector embedding generation for semantic search
  - **Impact:** Transforms unstructured web content into queryable knowledge graph

### **Knowledge Ingestion & Captain Portal**
- [ ] **ChatGPT Conversation Import** (Complexity: High, HIGH VALUE)
  - [ ] User has thousands of ChatGPT conversations about LEXA development
  - [ ] Need to parse JSON exports, extract knowledge with AI
  - [ ] Ingest into Neo4j as knowledge nodes
  - [ ] Timeline: 1 week
  - [ ] See: Original request in chat
- [ ] **Captain Knowledge Portal Enhancements** (Complexity: Medium)
  - [ ] Multi-format uploads (Zoom transcripts, PDFs, URLs)
  - [ ] Rich text editor
  - [ ] URL scraping with subpage detection
  - [ ] Knowledge browser
  - [ ] Manual user creation (no self-registration)
  - [ ] Future: Commission model for external contributors

### **Real-time Data & Integrations** ⭐ READY TO IMPLEMENT
- [ ] **Events Web Scraping** (Complexity: Low, 1 day) ⭐ NEXT - READY
  - [ ] Use Tavily (already integrated!) to search for events
  - [ ] Create Event nodes in Neo4j with AFFECTS_DESTINATION relationships
  - [ ] Add to user dashboard: "Events at your saved destinations"
  - [ ] Cost: $0.15 per run, ~$1.80/year
  - [ ] See: `docs/EVENTS_WEB_SCRAPING_IMPLEMENTATION.md`
- [ ] **Weather Integration** (Complexity: Low, 2 hours) ⭐ READY
  - [ ] Use Tavily (already have!) for real-time weather
  - [ ] Create WeatherWidget component
  - [ ] Add to destination pages
  - [ ] Cost: $0 (using existing Tavily)
  - [ ] See: `docs/WEATHER_AND_BEST_TIME_IMPLEMENTATION.md`
- [ ] **Best Time to Travel** (Complexity: Low, 4 hours) ⭐ READY
  - [ ] Add seasonal_data to destination nodes (manual data entry)
  - [ ] Create BestTimeCalendar component with month grid
  - [ ] Show peak/shoulder/low seasons with pricing impact
  - [ ] Cost: $0 (static data)
  - [ ] See: `docs/WEATHER_AND_BEST_TIME_IMPLEMENTATION.md`
- [ ] **Opening Hours Integration** (Complexity: Low, 2 hours)
  - [ ] Already fetching from Google Places, just need to store
  - [ ] Add `opening_hours` and `currently_open` to POI properties
  - [ ] Show "Open now" / "Opens at X" in UI
  - [ ] Cost: $0 (already fetching)
- [ ] **Visa Requirements Integration** (Complexity: Medium) → BACKLOG
  - [ ] Sherpa° API: Free tier (100 requests/month)
  - [ ] See: `docs/EVENTS_AND_TRAVEL_RESTRICTIONS_INTEGRATION.md`
- [ ] **Travel Warnings & Restrictions** (Complexity: Medium) → BACKLOG
  - [ ] US State Dept API (FREE)
  - [ ] See: `docs/EVENTS_AND_TRAVEL_RESTRICTIONS_INTEGRATION.md`

### **User Features & Monetization**
- [ ] **User Account Area** (Complexity: High)
  - [ ] Save favorite destinations
  - [ ] Track planned trips
  - [ ] View past recommendations
  - [ ] Event notifications for saved destinations
  - [ ] See: User mentioned in early chat
- [ ] **Operations Agent** (Complexity: Very High)
  - [ ] Connect user preferences with experiences
  - [ ] Understand "why they buy"
  - [ ] Generate experience scripts automatically
  - [ ] See: User priority list in chat
- [ ] **Monetization Features** (Complexity: High)
  - [ ] Upsell premium experiences
  - [ ] Subscription tiers
  - [ ] Marketplace for Captains
  - [ ] Commission tracking for external contributors
  - [ ] See: User mentioned commission model for external Captains
- [ ] **Budget-Aware Recommendations** (Complexity: Medium, Enhancement doc ready!)
  - [ ] Filter by daily/total budget
  - [ ] Budget tier: moderate, upscale, luxury, ultra-luxury
  - [ ] Map to luxury score ranges
  - [ ] See: `docs/HIGH_VALUE_QUICK_WINS.md`
- [ ] **Multi-Destination Itinerary Builder** (Complexity: High)
  - [ ] Day-by-day scheduling across destinations
  - [ ] Route optimization
  - [ ] Activity timing recommendations
- [ ] **Collaborative Filtering** (Complexity: High)
  - [ ] "Users like you also loved..."
  - [ ] Personality-based recommendations
- [ ] **POI Photo Gallery** (Complexity: Low)
  - [ ] Display photos from enrichment APIs
  - [ ] User-uploaded photos
- [ ] **Export Itinerary to PDF** (Complexity: Medium)
  - [ ] Generate beautiful PDF itineraries
  - [ ] Include maps, photos, details
- [ ] **Share Itinerary Link** (Complexity: Low)
  - [ ] Shareable URLs for created itineraries
- [ ] **Knowledge Versioning** (Complexity: Medium)
  - [ ] Track changes to knowledge over time
  - [ ] Captain edit history

### **Improvements**
- [ ] **Lazy Load Map Markers** - Performance improvement for many destinations (Complexity: Medium)
- [ ] **Add Autocomplete to Destination Input** - Suggest destinations as user types (Complexity: Low)
- [ ] **Improve Luxury Score Visualization** - Add charts/graphs to admin UI (Complexity: Low)
- [ ] **Add Confidence Score Filtering to UI** - Let users filter by confidence (Complexity: Low)
- [ ] **Batch Edit Knowledge Entries** - Edit multiple entries at once (Complexity: Medium)
- [ ] **Add Undo/Redo to Knowledge Editor** - Prevent accidental loss (Complexity: Low)

### **Data Quality**
- [ ] **Add POI Images** - Scrape/store representative images (Complexity: Medium)
- [ ] **Validate Coordinates** - Check if lat/lon are in correct region (Complexity: Low)
- [ ] **Add Opening Hours** - Enrich POIs with operating hours (Complexity: Medium)
- [ ] **Price Level Validation** - Ensure price_level consistency (Complexity: Low)
- [ ] **Phone Number Standardization** - Format phone numbers consistently (Complexity: Low)

---

## 🟢 Low Priority (Nice to Have)

### **Features**
- [ ] **Personality Quiz** - Help users discover their travel personality (Complexity: Low)
- [ ] **Time-of-Day Optimization** - Recommend based on best visit time (Complexity: Medium)
- [ ] **Accessibility Scoring** - Rate POIs for wheelchair access, etc. (Complexity: High)
- [ ] **Sustainability Ratings** - Eco-friendly travel options (Complexity: High)
- [ ] **Social Proof Integration** - "Most booked", "Trending" badges (Complexity: Medium)
- [ ] **Sentiment Analysis Dashboard** - Visualize review sentiments (Complexity: High)
- [ ] **Language Translation** - Multi-language support (Complexity: Very High)
- [ ] **Offline Mode** - Cache data for offline access (Complexity: High)
- [ ] **Dark Mode** - UI dark theme (Complexity: Low)
- [ ] **Keyboard Shortcuts** - Power user navigation (Complexity: Low)

### **Improvements**
- [ ] **Add Animations to UI** - Smooth transitions, loading states (Complexity: Low)
- [ ] **Improve Loading Skeletons** - Better loading placeholders (Complexity: Low)
- [ ] **Add Tooltips Everywhere** - Contextual help (Complexity: Low)
- [ ] **Improve Error Messages** - More user-friendly error text (Complexity: Low)
- [ ] **Add Copy-to-Clipboard** - For sharing POI info (Complexity: Low)
- [ ] **Optimize Bundle Size** - Reduce JavaScript payload (Complexity: Medium)

### **Developer Experience**
- [ ] **Add Storybook** - Component documentation (Complexity: Medium)
- [ ] **Add E2E Tests** - Playwright/Cypress tests (Complexity: High)
- [ ] **Add API Documentation** - Swagger/OpenAPI docs (Complexity: Medium)
- [ ] **Add Code Coverage** - Jest coverage reports (Complexity: Low)
- [ ] **Add Pre-commit Hooks** - Husky + lint-staged (Complexity: Low)

---

## 🚀 Quick Wins (Easy Implementations)

These can be done in < 2 hours and provide immediate value:

### **UI Improvements**
- [ ] Add "Back to Top" button on long pages
- [ ] Add breadcrumb navigation
- [ ] Add loading spinners to all async actions
- [ ] Add success/error toast notifications
- [ ] Add "Last updated" timestamp to knowledge entries
- [ ] Add character counter to all text inputs
- [ ] Add "Clear all" button to form fields
- [ ] Add keyboard navigation (arrows, enter, esc)

### **UX Improvements**
- [ ] Add confirmation dialogs before delete
- [ ] Add "Are you sure?" before leaving unsaved forms
- [ ] Add autosave to knowledge editor
- [ ] Add recent searches/history
- [ ] Add favorite destinations
- [ ] Add "Copy link" button to share POIs
- [ ] Add print-friendly styling
- [ ] Add meta tags for SEO

### **Data Display**
- [ ] Add sorting to knowledge browser table
- [ ] Add pagination to long lists
- [ ] Add export to CSV for admin tables
- [ ] Add filters to scoring stats
- [ ] Add date range picker for analytics
- [ ] Add quick stats cards to dashboard
- [ ] Add percentage change indicators
- [ ] Add sparkline charts for trends

### **Developer Quality**
- [ ] Add TypeScript strict mode
- [ ] Add ESLint rules for accessibility
- [ ] Add error boundary components
- [ ] Add logging for API calls
- [ ] Add health check endpoint
- [ ] Add version number to footer
- [ ] Add build time to console
- [ ] Add environment indicator (dev/staging/prod)

---

## 🎯 In Progress

Currently being worked on:
- ✅ Captain's Knowledge Portal (COMPLETED)
- ✅ Scoring Visualization (COMPLETED)
- ✅ Recommendation Engine (COMPLETED)
- ✅ ChatGPT Import System (COMPLETED)

---

## ✅ Completed (December 2025)

### **Week of Dec 16-18:**
- ✅ Luxury scoring system
- ✅ Confidence scoring for relationships
- ✅ Data quality agent with merge logic
- ✅ Relationship inference from conversations
- ✅ Neo4j integration
- ✅ Score-based filtering
- ✅ Quick reply buttons (calendar, destinations, themes)
- ✅ Interactive world map with golden pins
- ✅ Admin dashboard for data quality
- ✅ Test scripts for scoring validation
- ✅ Comprehensive documentation
- ✅ All 14 relationship types managed
- ✅ POI Search & Edit feature (Dec 17)
- ✅ ChatNeo4j natural language interface (Dec 17)
- ✅ Manual POI creation form (Dec 17)
- ✅ Destination browser with statistics (Dec 17)
- ✅ Fix repeated enrichment attempts (Dec 17)
- ✅ Propagate 1M+ emotional relationships (Dec 17) ⭐
- ✅ Fix 100% LOCATED_IN relationships (Dec 17) ⭐
- ✅ Batch size increased 50→100 (Dec 18)
- ✅ Discovery script filters score 6-10 only (Dec 18)
- ✅ Cost estimation tool (Dec 18)
- ✅ Strategic pivot documentation (Dec 18) ⭐
- ✅ Activity-first discovery strategy (Dec 18) ⭐ GAME CHANGER

---

## 💡 Ideas Parking Lot

Future exploration (not prioritized yet):

### **Marketing & Growth** (From User Priority List)
- [ ] **Social Media Outreach Engine/Agent** (Complexity: Very High)
  - [ ] Automated content generation
  - [ ] Post scheduling
  - [ ] Engagement tracking
  - [ ] User mentioned in priority #7
- [ ] **Win First Paying Users** (Priority #8 from user)
  - [ ] Launch strategy
  - [ ] Beta program
  - [ ] Pricing tiers

### **Advanced AI Features**
- Vector embeddings for semantic search
- GPT-4 Vision for POI image analysis
- Voice cloning for personalized LEXA voice
- Automatic itinerary video generation
- AR previews of destinations
- AI-generated travel photography tips
- **Codebreaker AI Integration** - Enhanced conversation analysis (mentioned by user)

### **Gamification**
- Travel achievement badges
- Captain reputation system
- Community voting on best tips
- Travel challenges and quests
- Virtual stamps for visited places

### **Integration Ideas**
- Connect to booking systems (Booking.com, Expedia)
- Integrate with Google Calendar
- Connect to airline APIs for flight data
- Integrate with expense tracking
- Connect to weather APIs
- Link to restaurant reservation systems

### **Social Features**
- Captain community forum
- Share travel stories
- Follow other travelers
- Group trip planning
- Travel buddy matching

### **Business Features**
- White-label solution for travel agencies
- API access for partners
- Commission tracking
- Affiliate link integration
- Revenue analytics

---

## 📊 Backlog Statistics

- **Total Items**: 120+
- **High Priority**: 25+ (includes strategic pivot items)
- **Quick Wins**: 6 (ready to implement)
- **Medium Priority**: 35+
- **Low Priority**: 30+
- **Ideas Parking Lot**: 25+
- **Completed (Dec 2025)**: 24
- **Critical Path**: Multi-source discovery → Emotional intelligence → User features
- **Last Major Update**: Dec 18, 2025 (Strategic Pivot to Activity-First Discovery)

---

## 🔄 How to Use This Backlog

### **When Starting New Work:**
1. Check "Quick Wins" - Can you knock out 2-3 easy items?
2. Review "High Priority" - What's most urgent?
3. Check "In Progress" - Don't start new work if something's unfinished
4. Consider complexity vs. value

### **When Adding New Ideas:**
1. Add to appropriate priority section
2. Estimate complexity (Low/Medium/High/Very High)
3. Add any relevant context or links
4. Tag with category (Feature/Improvement/Bug)

### **When Completing Items:**
- Move to "Completed" with completion date
- Update statistics
- Archive old completed items monthly

### **Quarterly Review:**
- Reprioritize based on user feedback
- Archive completed items
- Promote ideas from parking lot
- Remove obsolete items

---

## 📝 Contributing to Backlog

Anyone can add ideas! Include:
- **Title**: Clear, actionable description
- **Category**: Feature/Improvement/Bug/Task
- **Priority**: High/Medium/Low
- **Complexity**: Low (<2h) / Medium (2-8h) / High (1-3 days) / Very High (>3 days)
- **Value**: Why is this important?
- **Context**: Links, screenshots, user requests

**Example:**
```markdown
- [ ] **Add Dark Mode** - UI dark theme toggle (Complexity: Low, 2h)
  - User request from 5 Captains
  - Improves accessibility
  - Easy implementation with Tailwind dark: classes
  - Related: docs/UI_ENHANCEMENT_SUMMARY.md
```


