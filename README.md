# LEXA - Luxury Experience Assistant

> "Emotional Intelligence for Luxury Travel"

LEXA is a production-ready conversational AI agent for luxury travel experience design. Built with Next.js 14, FastAPI backend, Neo4j emotional knowledge graph, and Anthropic Claude for emotional intelligence.

## Features

### LEXA Experience Builder & Chat
✅ **3-Step Experience Builder** - When, Where, What (only one required, LEXA suggests the rest)  
✅ **Seasonal Intelligence** - Warns about unsuitable destination/season combinations  
✅ **Year Validation** - Prevents booking experiences in the past  
✅ **Visual Selection** - License-free images for all destinations and themes  
✅ **Back Navigation** - Easy navigation through the experience builder flow  
✅ **Interactive Chat** - Conversational refinement with LEXA after initial selection  
✅ **Quick Action Buttons** - Contextual suggestions (or write your own answers)  
✅ **Light/Dark Mode** - Luxury-appealing design with theme toggle  
✅ **Experience Script Preview** - AI-generated personalized experience scripts  
✅ **Neo4j RAG Integration** - Graph database for emotional POI recommendations

### User Account System
✅ **Supabase Authentication** - Secure signup and login  
✅ **Account Creation Flow** - Clear explanation of why accounts are necessary  
✅ **Backend Account Management** - Accounts synced with AIfred backend  
✅ **Session Tracking** - Persistent conversations and preferences  
✅ **Archetype Detection** - Multi-dimensional personality profiling during conversation

### Captain's Knowledge Portal (Admin)
✅ **Knowledge Upload** - Process transcripts, PDFs, itineraries (files not stored)  
✅ **Rich Knowledge Editor** - URL scraping, photos, coordinates, best practices  
✅ **Commission Tracking** - Automatic attribution and commission calculation  
✅ **User Management** - Admin-controlled user creation with roles  
✅ **Neo4j Knowledge Graph** - Structured knowledge storage with relationships  
✅ **AI-Powered Extraction** - Claude AI extracts structured data from unstructured content  
✅ **Knowledge Nuggets Inbox** - Keeps valuable sentence fragments/events/signals (not valid POIs yet) for Captain review + enrichment  

---

## Quick Start (For Beginners)

### Prerequisites

You need these installed on your computer:
1. **Node.js** (version 18 or higher) - [Download here](https://nodejs.org/)
2. **Git** - [Download here](https://git-scm.com/)
3. **Python 3.10+** - For the backend API - [Download here](https://www.python.org/)

### Step 1: Installation

**Frontend:**
```bash
cd lexa-worldmap-mvp
npm install
```

**Backend (AIfred):**
```bash
cd rag_system
python -m venv venv
venv\Scripts\activate  # On Windows
pip install -r requirements.txt
```

**What this does:** Installs all the code libraries LEXA needs to run (frontend and backend).

### Step 2: Set Up Your Accounts

You need accounts with these services:

#### A. Supabase (Database & Authentication)
1. Go to [supabase.com](https://supabase.com) and sign up
2. Create a new project
3. Go to Settings → API
4. Copy your:
   - **Project URL**
   - **Anon/Public Key**
   - **Service Role Key**

#### B. Anthropic (AI)
1. Go to [console.anthropic.com](https://console.anthropic.com) and sign up
2. Go to API Keys
3. Create a new key and copy it

#### C. Neo4j AuraDB (Knowledge Graph)
1. Go to [neo4j.com/cloud/aura](https://neo4j.com/cloud/aura) and sign up
2. Create a free AuraDB instance
3. Copy your:
   - **Connection URI**
   - **Username** (usually `neo4j`)
   - **Password**

### Step 3: Configure Environment Variables

**Frontend** - Create `.env.local` in the project root:

```env
# Supabase (Database & Authentication)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Backend API URL
NEXT_PUBLIC_API_URL=http://localhost:8000
```

**Backend** - Create `.env` in the `rag_system` folder:

```env
# Anthropic Claude API
ANTHROPIC_API_KEY=sk-ant-...

# Neo4j AuraDB
NEO4J_URI=neo4j+s://your-instance.databases.neo4j.io
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=your-password

# Supabase (for account sync)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key

# Optional
LOG_LEVEL=INFO
```

**What this does:** Connects LEXA to your accounts securely.

### Step 4: Set Up Database

Run this command to create the database tables:

```bash
# If you have Supabase CLI installed:
supabase db push

# If not, copy the SQL from supabase/migrations/001_lexa_schema.sql
# and run it in your Supabase SQL Editor
```

**What this does:** Creates 4 tables (sessions, messages, preferences, experience_briefs) with proper security.

### Step 5: Run Locally

**Start the backend (AIfred):**
```bash
cd rag_system
venv\Scripts\activate  # On Windows
uvicorn api.main:app --reload --port 8000
```

**Start the frontend (in a new terminal):**
```bash
npm run dev
```

**What this does:** Starts both LEXA's backend API and frontend interface.

Open your browser to: **http://localhost:3000**

---

## How LEXA Works

### Frontend Experience Builder Flow

LEXA guides users through a simple 3-step process:

1. **WHEN** - Choose when you want to travel (month + year)
   - Calendar selection with year dropdown
   - Prevents selection of past dates
   - Seasonal warnings for unsuitable combinations

2. **WHERE** - Choose your destination
   - Visual destination cards with high-quality images
   - Organized by region and country
   - "Suggest best option" button for AI recommendations

3. **WHAT** - Choose your experience theme
   - Visual theme cards (Adventure, Romance, Wellness, etc.)
   - Descriptions of each experience type
   - Option to let LEXA suggest based on When/Where

**Key Features:**
- Only ONE of the three (When, Where, What) is required
- LEXA can suggest the best options for the other two
- Persistent display of selections on the main page
- Back buttons for easy navigation
- Seasonal warnings (e.g., "UAE in July is very hot - consider October-April")

### Chat Conversation Flow

After the initial selection, LEXA engages in conversation to:

1. **Understand Emotions** - "What does this trip mean to you?"
2. **Detect Archetype** - Identifies if you're Romantic, Achiever, Hedonist, etc.
3. **Refine Preferences** - Budget, duration, must-haves, deal-breakers
4. **Compose Script** - Creates personalized experience preview
5. **Handoff** - Delivers to Operations team for booking

### Emotional Intelligence System

LEXA uses a Neo4j knowledge graph to:
- Map POIs to emotional tags (Romance, Adventure, Serenity, etc.)
- Connect experiences to client archetypes
- Calculate weighted personality vectors
- Recommend destinations based on emotional alignment

---

## Project Structure

```
lexa-worldmap-mvp/
├── app/                          # Frontend Next.js App Router
│   ├── page.tsx                  # Landing page with BETA badge
│   ├── auth/
│   │   ├── signup/page.tsx       # Account creation with explanation
│   │   └── signin/page.tsx       # Login page
│   ├── experience/
│   │   ├── page.tsx              # 3-step experience builder
│   │   ├── chat/page.tsx         # LEXA conversation interface
│   │   └── script/page.tsx       # Experience script preview
│   ├── api/                      # Next.js API routes
│   └── globals.css               # LEXA brand styling
├── components/                   # Reusable React components
├── lib/
│   ├── api/
│   │   └── lexa-client.ts        # Frontend API client for backend
│   └── supabase/                 # Supabase client
├── rag_system/                   # Backend (AIfred)
│   ├── api/
│   │   ├── main.py               # FastAPI application
│   │   └── routes/
│   │       ├── ailessia.py       # LEXA conversation endpoints
│   │       └── health.py         # Health checks
│   ├── database/
│   │   ├── neo4j_client.py       # Neo4j connection
│   │   ├── supabase_vector_client.py  # Supabase vector DB
│   │   └── account_manager.py    # Account sync
│   ├── services/
│   │   ├── desire_anticipator.py # Emotional intelligence
│   │   ├── script_composer.py    # Experience script generation
│   │   └── poi_recommendation.py # POI recommendations
│   └── requirements.txt          # Python dependencies
├── docs/                         # Documentation
│   ├── FRONTEND_BACKEND_INTEGRATION.md
│   ├── TESTING_CHECKLIST.md
│   ├── EXPERIENCE_BUILDER_REDESIGN.md
│   └── CHAT_REDESIGN_SUMMARY.md
└── supabase/
    └── migrations/               # Database schemas
```

---

## Deployment to Vercel

### Quick Deploy

1. **Push to GitHub:**
   ```bash
   git add .
   git commit -m "Ready for deployment"
   git push origin main
   ```

2. **Connect to Vercel:**
   - Go to [vercel.com](https://vercel.com)
   - Import your GitHub repository
   - Add all environment variables (see `.env.example`)
   - Click "Deploy"

3. **Complete Setup:**
   - Run Supabase migrations (see `DEPLOYMENT_GUIDE.md`)
   - Create first admin user
   - Test all features

**📖 Full deployment guide:** See `DEPLOYMENT_GUIDE.md` for detailed instructions.

**✅ Quick checklist:** See `DEPLOYMENT_CHECKLIST.md` for step-by-step verification.

---

## API Documentation

### Frontend API Client (`lib/api/lexa-client.ts`)

The frontend communicates with the backend via these methods:

#### `lexaAPI.createAccount(email, userId)`
Creates a new account in the backend when user signs up.

#### `lexaAPI.converse(message, conversationContext)`
Sends a message to LEXA and receives a response.

**Request:**
```typescript
{
  message: "I want to travel in June to Monaco",
  conversation_context: {
    when: "June 2026",
    where: "Monaco",
    what: null
  }
}
```

**Response:**
```typescript
{
  reply: "Monaco in June is perfect timing...",
  conversation_id: "uuid",
  session_state: {...}
}
```

#### `lexaAPI.composeScript(conversationId)`
Generates an experience script based on the conversation.

#### `lexaAPI.getRecommendations(preferences)`
Gets POI recommendations based on user preferences.

#### `lexaAPI.downloadPdf(scriptData)`
Downloads experience script as PDF.

### Backend API Endpoints (FastAPI)

**Base URL:** `http://localhost:8000` (development) or `https://your-api.com` (production)

#### `POST /api/v1/ailessia/account`
Creates a new user account.

#### `POST /api/v1/ailessia/converse`
Main conversation endpoint.

#### `POST /api/v1/ailessia/script`
Composes an experience script.

#### `GET /api/v1/ailessia/recommendations`
Gets POI recommendations.

#### `GET /health`
Health check endpoint.

---

## Configuration

### Voice Settings

- **Voice Input**: Browser-native Web Speech API (Chrome/Edge/Safari)
- **Voice Output**: SpeechSynthesis API
- **Default**: Voice replies disabled (user must opt-in)

### Claude Settings

- **Model**: Claude 3.5 Sonnet
- **Max Tokens**: 1024 per response
- **Rate Limit**: 50 requests/minute (configurable)

### Supabase RLS

All tables have Row Level Security enabled. Users can only access their own data.

---

## Troubleshooting

### "Unauthorized" Error
- Check your Clerk keys in `.env.local`
- Make sure you're signed in

### "Failed to send message"
- Check Anthropic API key
- Verify you have API credits
- Check browser console for details

### Voice Not Working
- Voice input requires HTTPS (works on localhost)
- Check browser compatibility (Chrome/Edge recommended)
- Grant microphone permissions

### Database Errors
- Verify Supabase URL and keys
- Run migrations: `supabase db push`
- Check Supabase dashboard for errors

---

## Development

### Run Tests
```bash
npm test
```

### Build for Production
```bash
npm run build
```

### Lint Code
```bash
npm run lint
```

---

## Tech Stack

**Frontend:**
- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- Shadcn/ui components
- Zustand (state management)
- TanStack Query (data fetching)
- Mapbox GL JS (maps)
- Framer Motion (animations)

**Backend:**
- FastAPI (Python)
- Anthropic Claude 3.5 Sonnet (AI)
- Neo4j AuraDB (knowledge graph)
- Supabase (vector database + auth)
- Pydantic (data validation)
- Sentence Transformers (embeddings)
- Uvicorn (ASGI server)

**Database & Storage:**
- Supabase (Postgres with pgvector)
- Neo4j AuraDB (graph database)

**Deployment:**
- Vercel (frontend)
- Railway/Render (backend options)

**APIs & Services:**
- Anthropic Claude API
- Google Places API (POI data)
- Mapbox API (maps)

---

## Contributing

This is an MVP. Future enhancements:
- Neo4j integration for POI recommendations
- Multi-language support
- Advanced voice controls
- Real-time collaboration
- Mobile app (React Native)

---

## License

Proprietary - LEXA Travel Experience Design

---

## Support

For issues or questions:
- Check the troubleshooting section above
- Review error logs in browser console
- Check Supabase/Clerk/Anthropic dashboards

---

**Built with ❤️ for luxury travel experience design**
#   l e x a - w o r l d m a p - m v p 
 
 