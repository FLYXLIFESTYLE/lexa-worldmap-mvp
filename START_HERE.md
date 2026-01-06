# 🚨 CURSOR: READ THIS FIRST - EVERY TIME

**Purpose:** Ensure Cursor remembers existing architecture and doesn't recreate things  
**Updated:** Every time architecture changes  
**Status:** MANDATORY READ before any task

---

## ⚠️ CRITICAL: EXISTING AGENT ARCHITECTURE

**DO NOT CREATE NEW AGENTS WITHOUT CHECKING THIS FIRST!**

### LEXA's Named Agents (Already Built):

#### 1. **AIlessia** (The Conversational Artist) 🎨
- **Location:** `rag_system/core/ailessia/` (8 modules)
- **Personality:** Emotional, intuitive, creative, storytelling
- **Modules:**
  - `script_composer.py` - Cinematic experience scripts
  - `emotion_interpreter.py` - Emotional subtext reading
  - `personality_mirror.py` - Adaptive communication
  - `emotional_profile_builder.py` - Incremental profiling
  - `weighted_archetype_calculator.py` - Archetype calculation
  - `context_extractor.py` - Conversation context
  - `conversation_os.py` - Intake questions
- **API:** `/api/v1/ailessia/converse` (legacy), `/api/lexa/converse` (new)

#### 2. **AIbert** (The Analytical Psychologist) 🧠
- **Location:** `rag_system/core/aibert/`
- **Personality:** Analytical, logical, pattern-recognition
- **Modules:**
  - `desire_anticipator.py` - Anticipates unstated desires
- **Integration:** Works WITH AIlessia to anticipate desires

#### 3. **Intelligence Extractor** (The Data Archaeologist) 📊
- **Location:** `rag_system/app/services/intelligence_extractor.py`
- **Purpose:** Documents → structured intelligence
- **Status:** ✅ Just upgraded to investor-pitch quality (Jan 2026)

#### 4. **Multipass Enrichment Agent** (The Validator) ✅
- **Location:** `rag_system/app/services/multipass_extractor.py`
- **Purpose:** Deep 4-pass extraction for complex docs
- **Status:** ✅ Just upgraded with LEXA context (Jan 2026)

#### 5. **Knowledge Retrieval (Brain v2)** (The Librarian) 📚
- **Location:** `lib/brain/retrieve-v2.ts`
- **Purpose:** Grounded POI retrieval (Neo4j + Supabase drafts)
- **Status:** ✅ Production ready

#### 6. **Scraping Agent** (The Web Crawler) 🕷️
- **Location:** `rag_system/app/api/captain_scraping.py`
- **Purpose:** URLs → clean text → intelligence extraction
- **Status:** ✅ Production ready

---

## 📁 MEMORY BANK (READ THESE FIRST!)

**Location:** `memory-bank/`

### MANDATORY FILES (Read at task start):
1. `productContext.md` - Why LEXA exists, Experience DNA framework
2. `systemPatterns.md` - Architecture, AIlessia + AIbert integration
3. `activeContext.md` - Current MVP completion plan, new requirements
4. `progress.md` - What's complete, what's next
5. `techContext.md` - Technologies and setup

### Why Memory Bank Matters:
- Contains existing agent architecture
- Documents deployment process (GitHub → Vercel/Render auto-deploy)
- Tracks MVP completion roadmap
- Preserves architectural decisions

---

## 🔄 DEPLOYMENT PROCESS (Stop Asking!)

**It's documented in memory-bank, but here's the simple version:**

### Every commit auto-deploys:
```bash
git add -A
git commit -m "Description"
git push origin main
```

### What happens automatically:
1. GitHub receives push
2. Vercel detects commit → builds frontend → deploys (~2 min)
3. Render detects commit → builds backend → deploys (~3-5 min)

**That's it. No manual steps. No asking "should I deploy?"**

---

## 🎯 MVP COMPLETION SEQUENCE (Current Focus)

**From `memory-bank/activeContext.md` and `MVP_COMPLETION_ROADMAP.md`:**

1. ✅ **Phase 0: Tier Definitions** (COMPLETE - migrated to database)
2. ⏳ **Phase 1: Script Design Engine** (CURRENT) - 5 days
   - POI injection into scripts
   - Day-by-day generator
   - Booking links & coordinates
   - Script refinement logic
3. **Phase 2: Finalize LEXA Chat** - 4 days
4. **Phase 3: Tiers & Upsells + Marketplace** - 8 days
5. **Phase 4: Emotional Profile Display** - 2 days
6. **Phase 5: Landing Page Enhancements** - 2 days
7. **Phase 6: Data Ingestion** (Ongoing/Parallel)

---

## 🚫 COMMON MISTAKES TO AVOID

### ❌ DON'T:
1. Create new agents without checking existing AIlessia/AIbert
2. Ask about deployment process (it's automated!)
3. Ignore memory-bank files (they contain the architecture!)
4. Recreate functionality that already exists
5. Change agent personalities (AIlessia = emotional, AIbert = analytical)

### ✅ DO:
1. Read memory-bank files FIRST
2. Check existing code before creating new files
3. Improve existing agents (don't replace)
4. Maintain AIlessia/AIbert separation of concerns
5. Commit frequently with clear messages
6. Update memory-bank when architecture changes

---

## 🔧 CURRENT AGENT STATUS

| Agent | Location | Status | Needs |
|-------|----------|--------|-------|
| AIlessia (Chat) | `core/ailessia/` | ✅ Working | Grounded POI integration |
| AIbert (Desire) | `core/aibert/` | ✅ Working | None |
| Intelligence Extractor | `app/services/` | ✅ Upgraded | Test with real docs |
| Multipass Enrichment | `app/services/` | ✅ Upgraded | Test with real docs |
| Knowledge Retrieval | `lib/brain/` | ✅ Working | None |
| Scraping Agent | `app/api/` | ✅ Working | None |

---

## 📝 NEXT NEW AGENT TO BUILD

**Market Intelligence Agent** (User requested)
- Purpose: Analyze aggregated data for business decisions
- Audience: Chris/Paul/Bakary
- Outputs: SYCC cruise recommendations, demand analysis, pricing optimization
- **DO NOT** duplicate AIbert or AIlessia - this is a separate strategic layer

---

## 🎓 HOW CURSOR SHOULD WORK

### At Task Start:
1. ✅ Read `START_HERE.md` (this file)
2. ✅ Read relevant memory-bank files
3. ✅ Check existing code before creating new
4. ✅ Ask clarifying questions if uncertain

### During Task:
1. ✅ Reference existing agents by name (AIlessia, AIbert)
2. ✅ Improve existing code (don't replace)
3. ✅ Maintain architectural patterns
4. ✅ Update documentation as you go

### At Task End:
1. ✅ Commit changes with clear message
2. ✅ Push to GitHub (auto-deploys)
3. ✅ Update memory-bank if architecture changed
4. ✅ Update this file if new agents added

---

**CURSOR: If you're reading this for the first time in a conversation, you forgot to read it at the start. Read memory-bank files now!**
