# 🗺️ LEXA SYSTEM ARCHITECTURE - VISUAL GUIDE

**See the big picture of what you're building!** 👁️

---

## 🎯 THE COMPLETE SYSTEM

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER JOURNEY                            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│                      FRONTEND (Next.js)                          │
│  ┌────────────┐  ┌────────────┐  ┌─────────┐  ┌──────────┐    │
│  │  Landing   │→ │ Onboarding │→ │ Builder │→ │   Chat   │    │
│  │    Page    │  │  (Account) │  │ (3-step)│  │ AIlessia │    │
│  └────────────┘  └────────────┘  └─────────┘  └──────────┘    │
│                                                       ↓          │
│                                    ┌──────────────────────┐    │
│                                    │  Script Preview      │    │
│                                    │  (PDF Download)      │    │
│                                    └──────────────────────┘    │
└──────────────────────────────────────────────────────────────────┘
                              │
                              ▼ API Calls (HTTP/JSON)
┌──────────────────────────────────────────────────────────────────┐
│                     BACKEND (FastAPI)                            │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              AIlessia Intelligence Layer                  │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │   │
│  │  │   Emotion    │  │   Desire     │  │  Personality │  │   │
│  │  │ Interpreter  │  │ Anticipator  │  │    Mirror    │  │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘  │   │
│  │  ┌──────────────┐  ┌──────────────┐                    │   │
│  │  │    Script    │  │   Archetype  │                    │   │
│  │  │   Composer   │  │  Calculator  │                    │   │
│  │  └──────────────┘  └──────────────┘                    │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │             Recommendation Engine                        │   │
│  │  ┌──────────────┐  ┌──────────────┐                    │   │
│  │  │     POI      │  │  Emotional   │                    │   │
│  │  │   Matcher    │  │   Resonance  │                    │   │
│  │  └──────────────┘  └──────────────┘                    │   │
│  └─────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────┘
                              │
                    ┌─────────┴─────────┐
                    ▼                   ▼
┌──────────────────────────┐  ┌──────────────────────────┐
│   Neo4j Graph Database   │  │  Supabase (PostgreSQL)   │
│                          │  │                          │
│  • 200k+ POIs            │  │  • Client Accounts       │
│  • 70+ Activities        │  │  • Conversation History  │
│  • Emotional Tags        │  │  • Experience Scripts    │
│  • Geographic Hierarchy  │  │  • Archetype Profiles    │
│  • 3M+ Relationships     │  │  • PDF Storage           │
└──────────────────────────┘  └──────────────────────────┘
```

---

## 🔄 DATA FLOW (User Creates Experience)

```
1. USER LANDS
   │
   ├─→ Landing Page (BETA)
   │   "Begin Your Journey"
   │
   ▼

2. ACCOUNT CREATION
   │
   ├─→ User enters: email + name
   │
   ├─→ POST /api/ailessia/account/create
   │   ├─→ Creates account in Supabase
   │   └─→ Returns: account_id + session_id
   │
   ├─→ Store in localStorage
   │
   ▼

3. INITIAL CHOICES (3-Step Builder)
   │
   ├─→ User selects:
   │   • Destination (e.g., French Riviera)
   │   • Theme (e.g., Romantic Escape)
   │   • Time (optional date)
   │
   ├─→ Store in localStorage
   │
   ▼

4. CONVERSATION (AIlessia Chat)
   │
   ├─→ User sends message
   │
   ├─→ POST /api/ailessia/converse
   │   Request:
   │   {
   │     account_id,
   │     session_id,
   │     message: "It's our 10th anniversary",
   │     conversation_history: [...]
   │   }
   │   │
   │   ├─→ AIlessia processes:
   │   │   ├─→ Emotion Interpreter analyzes sentiment
   │   │   ├─→ Archetype Calculator updates profile
   │   │   ├─→ Desire Anticipator predicts needs
   │   │   └─→ Personality Mirror adapts tone
   │   │
   │   ├─→ Queries Neo4j for matching POIs
   │   │   WHERE poi.destination = "French Riviera"
   │   │   AND poi.personality_romantic > 0.7
   │   │
   │   ├─→ Syncs profile to Neo4j
   │   │   CREATE (:Client {archetype_weights})
   │   │
   │   └─→ Generates response with Claude API
   │
   ├─→ AIlessia responds:
   │   {
   │     ailessia_response: "A decade of love...",
   │     emotion_analysis: {...},
   │     proactive_suggestions: [POI1, POI2, POI3]
   │   }
   │
   ├─→ Display response + quick action buttons
   │
   ├─→ Repeat 5-10 times (conversation)
   │
   ▼

5. SCRIPT GENERATION
   │
   ├─→ POST /api/ailessia/compose-script
   │   Request:
   │   {
   │     account_id,
   │     session_id,
   │     selected_choices: {...}
   │   }
   │   │
   │   ├─→ Script Composer retrieves:
   │   │   ├─→ Client profile from Supabase
   │   │   ├─→ Archetype weights from Neo4j
   │   │   ├─→ Conversation history from Supabase
   │   │   └─→ Matching POIs from Neo4j
   │   │
   │   ├─→ Claude generates:
   │   │   ├─→ Theme name
   │   │   ├─→ Cinematic hook
   │   │   ├─→ Emotional arc
   │   │   ├─→ 5-8 signature highlights
   │   │   └─→ Personal message
   │   │
   │   └─→ Saves to Supabase
   │       CREATE experience_script
   │
   ├─→ Returns complete script
   │
   ├─→ Display beautiful preview
   │
   ▼

6. PDF DOWNLOAD (Optional)
   │
   ├─→ GET /api/ailessia/script/{id}/pdf
   │
   ├─→ Backend generates PDF (ReportLab)
   │
   └─→ User downloads PDF
```

---

## 🧠 AILESSIA INTELLIGENCE FLOW

```
┌─────────────────────────────────────────────────────┐
│            User Message Arrives                     │
│            "It's our 10th anniversary"              │
└─────────────────────────────────────────────────────┘
                        │
        ┌───────────────┼───────────────┐
        ▼               ▼               ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│   Emotion    │ │  Archetype   │ │    Desire    │
│ Interpreter  │ │  Calculator  │ │ Anticipator  │
└──────────────┘ └──────────────┘ └──────────────┘
        │               │               │
        ▼               ▼               ▼
┌──────────────────────────────────────────────────┐
│         Unified Client Understanding             │
│                                                  │
│  • Emotion: Romance, Nostalgia, Celebration     │
│  • Archetype: 85% Romantic, 60% Connoisseur     │
│  • Desires: Intimacy, Prestige, Memory-making   │
│  • Stage: Early discovery (2/10)                │
└──────────────────────────────────────────────────┘
                        │
        ┌───────────────┼───────────────┐
        ▼               ▼               ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│   Neo4j      │ │  Personality │ │    Script    │
│ POI Query    │ │    Mirror    │ │   Composer   │
│              │ │  (Adapt Tone)│ │              │
└──────────────┘ └──────────────┘ └──────────────┘
        │               │               │
        └───────────────┼───────────────┘
                        ▼
┌─────────────────────────────────────────────────────┐
│              AIlessia Response                      │
│                                                     │
│  "A decade of love deserves a setting that         │
│   mirrors its depth. Imagine sunset on the         │
│   French Riviera, where golden light dances..."    │
│                                                     │
│  Quick Actions:                                     │
│  [Tell me more] [Perfect!] [Actually...]           │
│                                                     │
│  Proactive Suggestions:                            │
│  • Private yacht sunset (Monaco)                   │
│  • Le Louis XV Michelin dining                     │
│  • Villa Monaco luxury suite                       │
└─────────────────────────────────────────────────────┘
```

---

## 🗄️ DATABASE RELATIONSHIPS

```
NEO4J GRAPH:

    ┌──────────┐
    │   POI    │
    └──────────┘
         │
    ┌────┴────┬────────┬──────────┬──────────┐
    │         │        │          │          │
    ▼         ▼        ▼          ▼          ▼
┌────────┐ ┌────┐ ┌─────────┐ ┌─────┐ ┌──────────┐
│Activity│ │City│ │Emotional│ │Theme│ │  Client  │
│  Type  │ │    │ │  Tag    │ │     │ │ Profile  │
└────────┘ └────┘ └─────────┘ └─────┘ └──────────┘
    │                  │                     │
    ▼                  ▼                     ▼
┌────────┐       ┌──────────┐          ┌─────────┐
│Archetype│      │  Desire  │          │Interests│
└────────┘       └──────────┘          └─────────┘

Example Query:
MATCH (c:Client {id: $client_id})
MATCH (c)-[:HAS_ARCHETYPE]->(a:ClientArchetype)
MATCH (a)<-[:APPEALS_TO]-(act:activity_type)
MATCH (act)<-[:OFFERS]-(poi:poi)
WHERE poi.destination_name = $destination
  AND poi.luxury_score >= 0.7
RETURN poi
ORDER BY poi.personality_romantic DESC
LIMIT 10


SUPABASE TABLES:

client_accounts
├─ id (uuid)
├─ email
├─ name
├─ personality_archetype_weights (jsonb)
│  {
│    "romantic": 0.85,
│    "connoisseur": 0.60,
│    "hedonist": 0.40,
│    "contemplative": 0.30,
│    "achiever": 0.50,
│    "adventurer": 0.20
│  }
└─ created_at

conversation_sessions
├─ id (uuid)
├─ account_id (fk)
├─ messages (jsonb[])
│  [
│    {"role": "user", "content": "..."},
│    {"role": "ailessia", "content": "..."}
│  ]
└─ created_at

experience_scripts
├─ id (uuid)
├─ account_id (fk)
├─ session_id (fk)
├─ title
├─ cinematic_hook
├─ emotional_arc
├─ signature_highlights (text[])
├─ selected_choices (jsonb)
└─ created_at
```

---

## 🎨 FRONTEND COMPONENT HIERARCHY

```
app/
│
├─ layout.tsx (Root)
│  ├─ BETA Badge (fixed top-right)
│  └─ {children}
│
├─ page.tsx (Landing)
│  ├─ Hero Section
│  │  ├─ Title: "LEXA"
│  │  ├─ Subtitle
│  │  └─ CTA Button → /onboarding
│  └─ Feature Cards (3)
│
├─ onboarding/page.tsx
│  ├─ Card Container
│  │  ├─ Title
│  │  ├─ Info Alert (why create account)
│  │  ├─ Form
│  │  │  ├─ Email Input
│  │  │  ├─ Name Input
│  │  │  └─ Submit Button → /experience
│  │  └─ Error Display
│
├─ experience/page.tsx
│  ├─ Page Header
│  ├─ Destination Cards Grid (4)
│  │  └─ Card (clickable, highlight on select)
│  ├─ Theme Cards Grid (6)
│  │  └─ Card (emoji + name + description)
│  ├─ Calendar (date picker)
│  └─ Sticky Footer
│     └─ Continue Button (disabled until ≥1 selected)
│
├─ experience/chat/page.tsx
│  ├─ Header Bar
│  │  ├─ AIlessia Avatar
│  │  └─ Status Text
│  ├─ Messages Container (scrollable)
│  │  └─ Message Bubble
│  │     ├─ Content Text
│  │     └─ Quick Action Buttons (if AIlessia)
│  └─ Input Bar (sticky bottom)
│     ├─ Textarea
│     └─ Send Button
│
└─ preview/page.tsx
   ├─ Loading Spinner (conditional)
   ├─ Hero Card (gradient)
   │  ├─ Script Title
   │  └─ Client Name
   ├─ Vision Card
   │  └─ Cinematic Hook
   ├─ Journey Card
   │  └─ Emotional Arc
   ├─ Action Buttons
   │  ├─ Download PDF
   │  └─ Share
   └─ AIlessia Message Card
```

---

## 🚀 DEPLOYMENT ARCHITECTURE

```
┌─────────────────────────────────────────────────────┐
│                   PRODUCTION                        │
└─────────────────────────────────────────────────────┘

┌──────────────┐
│    USER      │
│  (Browser)   │
└──────┬───────┘
       │ HTTPS
       ▼
┌──────────────────┐
│  Vercel CDN      │  ← Frontend deployed here
│  (Next.js)       │     (Auto-deploy from GitHub)
└──────┬───────────┘
       │ API Calls
       ▼
┌──────────────────┐
│  Railway/Render  │  ← Backend deployed here
│  (FastAPI)       │     (Python + Uvicorn)
└──────┬───────────┘
       │
   ┌───┴────┐
   ▼        ▼
┌─────┐  ┌─────────┐
│Neo4j│  │Supabase │  ← Managed databases
│Cloud│  │  Cloud  │     (Already setup)
└─────┘  └─────────┘


DEVELOPMENT (Tomorrow):

┌──────────────┐
│  localhost   │
│    :3000     │  ← Next.js dev server
└──────┬───────┘     (npm run dev)
       │
       ▼
┌──────────────┐
│  localhost   │
│    :8000     │  ← FastAPI dev server
└──────┬───────┘     (uvicorn api.main:app)
       │
   ┌───┴────┐
   ▼        ▼
┌─────┐  ┌─────────┐
│Neo4j│  │Supabase │
│Cloud│  │  Cloud  │
└─────┘  └─────────┘
```

---

## 📊 DATA VOLUME (Current)

```
Neo4j Graph Database:
├─ 203,065 POI nodes
├─ 247 POIs in French Riviera (luxury, Google-enriched)
├─ 70+ Activity Type nodes
├─ 10 Emotional Tag nodes
├─ 6 Client Archetype nodes
├─ 56 Country nodes
├─ 36 Region nodes
└─ ~3,000,000 relationships

Supabase Database:
├─ 0 client accounts (fresh start!)
├─ 0 conversation sessions
└─ 0 experience scripts

Tomorrow you'll create the FIRST client! 🎉
```

---

## 🎯 MVP SCOPE (What You're Building)

```
✅ IN SCOPE (Tomorrow):
   ├─ Landing page with BETA badge
   ├─ Account creation (email + name)
   ├─ 3-step builder (destination/theme/time)
   ├─ AIlessia conversation (with quick actions)
   ├─ Script preview (title + hook + arc)
   ├─ Basic mobile responsiveness
   └─ Deploy to Vercel

❌ OUT OF SCOPE (Later):
   ├─ Interactive map (use cards instead)
   ├─ Complex animations
   ├─ Payment integration
   ├─ Admin dashboard
   ├─ Email notifications
   ├─ Social login (Google/Apple)
   ├─ Image uploads
   ├─ Video content
   └─ Advanced analytics
```

---

## 🔄 USER STATE MANAGEMENT

```
Browser (LocalStorage):
{
  lexa_account_id: "uuid",
  lexa_session_id: "uuid",
  lexa_name: "John Doe",
  lexa_selections: {
    destination: "French Riviera",
    theme: "Romantic Escape",
    time: "2025-07-15"
  }
}

Persisted on: Account creation
Used by: All pages (auth check, personalization)
Cleared on: Logout (future feature)


Backend Session (Supabase):
{
  account_id: "uuid",
  conversation_sessions: [...messages],
  personality_profile: {...archetype_weights},
  generated_scripts: [...]
}

Created on: Account creation
Updated on: Every conversation turn
```

---

**Print this page for visual reference while building!** 🖨️

**Now you see the full picture! 🗺️**

