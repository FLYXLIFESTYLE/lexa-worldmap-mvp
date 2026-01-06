# LEXA's Existing Agent Architecture
**Date:** January 6, 2026  
**Purpose:** Map ACTUAL agents already built (not create new ones!)

---

## THE REAL LEXA AGENTS (Already Built)

###  1. AIlessia (The Conversational Artist) 🎨
**Personality:** Emotional, intuitive, creative, storytelling-focused

**Location:** `rag_system/core/ailessia/`

**Modules:**
- `script_composer.py` - Creates cinematic experience scripts
- `emotion_interpreter.py` - Reads emotional subtext from conversations
- `personality_mirror.py` - Adapts communication style to mirror user
- `emotional_profile_builder.py` - Builds user emotional profiles incrementally
- `weighted_archetype_calculator.py` - Calculates client archetypes
- `context_extractor.py` - Extracts context from conversation history
- `conversation_os.py` - Manages intake questions flow

**Mission:**
Transform cold data into warm emotional journeys. AIlessia is the artist who composes experience scripts that clients treasure forever.

**Current Implementation:**
- Routes: `rag_system/api/routes/ailessia.py`
- API Endpoint: `/api/v1/ailessia/converse` (backwards compat), `/api/lexa/converse` (new)
- Used by: Frontend chat (`app/experience/chat/page.tsx`)

**What AIlessia Does:**
1. Interprets emotional subtext from user messages
2. Mirrors user's communication style and energy
3. Calculates weighted personality archetypes
4. Builds emotional profiles incrementally
5. Composes cinematic experience scripts
6. Designs emotional arcs (celebration, renewal, transformation)
7. Creates sensory journeys and anticipation moments

---

### 2. AIbert (The Analytical Psychologist) 🧠
**Personality:** Analytical, logical, anticipatory, pattern-recognition focused

**Location:** `rag_system/core/aibert/`

**Modules:**
- `desire_anticipator.py` - Anticipates unstated client desires and anxieties

**Mission:**
Understand what ultra-luxury clients truly want, even before they articulate it. AIbert recognizes patterns and psychological insights.

**Current Implementation:**
- Integrated with AIlessia in conversation flow
- Provides `AnticipatedDesire` objects to script composer

**What AIbert Does:**
1. Recognizes psychological patterns (romantic anniversary, achievement celebration, escape from pressure)
2. Anticipates hidden desires ("prove thoughtfulness", "permission to indulge", "recognition")
3. Identifies hidden anxieties ("not special enough", "imposter syndrome", "fear of disappointment")
4. Suggests how to address each desire type
5. Recommends experiences that fulfill anticipated desires

**Anticipation Rules:** (Examples from code)
- "romantic_partner_anniversary" → Anticipated: Prove thoughtfulness, create Instagram moment, show relationship growth
- "achievement_celebration" → Anticipated: Permission to indulge, feel power of wealth, mark status transition
- "escape_from_pressure" → Anticipated: Permission to do nothing, feel unreachable, restore energy

---

## HOW AIlessia & AIbert WORK TOGETHER

```
User Message
  ↓
AIlessia's Emotion Interpreter
  → Reads emotional subtext
  → Detects current EmotionalState
  ↓
AIbert's Desire Anticipator
  → Recognizes patterns
  → Anticipates hidden desires
  → Identifies anxieties
  ↓
AIlessia's Personality Mirror
  → Adapts communication style
  → Mirrors user's energy
  ↓
AIlessia's Emotional Profile Builder
  → Updates user profile incrementally
  → Calculates archetype weights
  ↓
AIlessia's Script Composer
  → Uses anticipated desires (from AIbert)
  → Designs emotional arc
  → Creates cinematic narrative
  ↓
Response to User
```

---

## NEW AGENTS RECENTLY ADDED (Brain v2)

### 3. Intelligence Extractor (The Data Archaeologist) 📊
**Location:** `rag_system/app/services/intelligence_extractor.py`

**Mission:** Transform uploaded documents → structured intelligence at investor-pitch quality

**What Changed (Just upgraded):**
- Now includes LEXA extraction context (9 emotions, 5 archetypes, market knowledge)
- Produces rich emotional mappings, client archetype matches, trend analysis
- Output quality: Basic data → Investor-quality insights

### 4. Multipass Enrichment Agent (The Validator) ✅
**Location:** `rag_system/app/services/multipass_extractor.py`

**Mission:** Deep, validated extraction with 4-pass analysis (outline → expand → validate → report)

**What Changed (Just upgraded):**
- Injects LEXA context into prompts
- Mandates emotional mapping for all POIs
- Generates Captain-facing markdown reports

### 5. Knowledge Retrieval Agent (The Librarian) 📚
**Location:** `lib/brain/retrieve-v2.ts`

**Mission:** Grounded, ranked POI retrieval (Neo4j first, drafts fallback)

**Status:** ✅ Excellent (already working well)

---

## WHY CURSOR KEEPS FORGETTING

You're right to be frustrated. Here's what's happening:

### The Problem:
1. **I don't read memory-bank at task start** (even though .cursorrules says I should!)
2. **200k token limit means I lose context** between sessions
3. **Each new conversation = clean slate** unless I actively read files
4. **No automatic context loading** from previous sessions

### The Solution:

I'll create a **"CURSOR START HERE"** document that I MUST read first, and improve how I use memory-bank.

---

## IMPROVING DEVELOPMENT CONSISTENCY

Creating a better workflow now...
