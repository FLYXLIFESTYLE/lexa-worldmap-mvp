# LEXA - Luxury Experience Agent

> "I don't give lists. I design the feeling behind the decision."

LEXA is a production-ready conversational AI agent for luxury travel experience design. Built with Next.js 14, Anthropic Claude, and a sophisticated 10-stage conversation flow.

## Features

### LEXA Chat Agent
✅ **10-Stage Conversation Flow** - From WELCOME to HANDOFF with intelligent state management  
✅ **Voice Input/Output** - Browser-native speech recognition and synthesis  
✅ **Flexible Data Collection** - Intelligently gathers 10 required fields for experience briefs  
✅ **Suggestion Engine** - Recommends destinations/themes based on partial input  
✅ **Operations Agent Handoff** - Creates structured experience briefs for downstream processing  
✅ **Neo4j RAG Integration** - Graph database for POI recommendations

### Captain's Knowledge Portal
✅ **Knowledge Upload** - Process transcripts, PDFs, itineraries (files not stored)  
✅ **Rich Knowledge Editor** - URL scraping, photos, coordinates, best practices  
✅ **Commission Tracking** - Automatic attribution and commission calculation  
✅ **User Management** - Admin-controlled user creation with roles  
✅ **Supabase Authentication** - Secure user authentication and session management  
✅ **Neo4j Knowledge Graph** - Structured knowledge storage with relationships  
✅ **AI-Powered Extraction** - Claude AI extracts structured data from unstructured content  

---

## Quick Start (For Beginners)

### Prerequisites

You need these installed on your computer:
1. **Node.js** (version 18 or higher) - [Download here](https://nodejs.org/)
2. **Git** - [Download here](https://git-scm.com/)

### Step 1: Installation

Open your terminal and run:

```bash
cd lexa-worldmap-mvp
npm install
```

**What this does:** Installs all the code libraries LEXA needs to run.

### Step 2: Set Up Your Accounts

You need accounts with two services (both have free tiers):

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

### Step 3: Configure Environment Variables

Create a file named `.env.local` in the `lexa-worldmap-mvp` folder and add your keys:

```env
# Supabase (Database & Authentication)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Anthropic Claude API
ANTHROPIC_API_KEY=sk-ant-...
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

```bash
npm run dev
```

**What this does:** Starts LEXA on your computer.

Open your browser to: **http://localhost:3000**

---

## How LEXA Works

### Conversation Flow

LEXA guides users through 10 stages:

1. **WELCOME** - Permission & positioning
2. **DISARM** - Surface hidden dissatisfaction
3. **MIRROR** - Reflect hypothesis & get score
4. **MICRO_WOW** - Prove value with one recommendation
5. **COMMIT** - Choose Fast or Deep path
6. **BRIEFING_COLLECT** - Gather 10 required fields
7. **SCRIPT_DRAFT** - Deliver experience script
8. **REFINE** - Up to 3 adjustments
9. **HANDOFF** - Create experience brief for Operations Agent
10. **FOLLOWUP** - 24-48h relationship loop

### Required Data Fields

LEXA collects these 10 fields for the Operations Agent:

**Core Trio** (at least one required):
- When (timeframe/dates) - stored as `when_at`
- Where (destination) - stored as `where_at`
- Theme (experience type)

**Additional Fields**:
- Budget
- Duration
- Emotional goals
- Must-haves
- Best experiences (and why)
- Worst experiences (and why)
- Bucket list items

### Operations Agent Handoff

When a conversation reaches the HANDOFF stage, LEXA automatically:
1. Extracts all collected data from the session
2. Creates a record in the `experience_briefs` table
3. Sets status to `'complete'`
4. Includes conversation signals (trust score, skepticism, tone)

The Operations Agent can then query:
```sql
SELECT * FROM experience_briefs WHERE status = 'complete';

-- Note: Column names use when_at and where_at (not reserved keywords)
```

---

## Project Structure

```
lexa-worldmap-mvp/
├── app/
│   ├── api/lexa/          # API routes
│   │   ├── chat/          # Main conversation endpoint
│   │   ├── preferences/   # User settings
│   │   ├── session/       # Session history
│   │   └── brief/         # Experience brief retrieval
│   ├── app/               # Protected chat UI
│   ├── page.tsx           # Landing page
│   ├── layout.tsx         # Root layout with Clerk
│   └── globals.css        # LEXA brand styling
├── components/
│   ├── chat/              # Chat UI components
│   └── voice/             # Voice input/output
├── hooks/                 # React hooks for speech
├── lib/
│   ├── lexa/              # Core conversation logic
│   │   ├── types.ts       # TypeScript types
│   │   ├── state-machine.ts   # Stage transitions
│   │   ├── claude-client.ts   # Anthropic integration
│   │   ├── suggestion-engine.ts # Destination/theme recommendations
│   │   ├── briefing-processor.ts # Data collection
│   │   └── stages/        # Stage-specific modules
│   └── supabase/          # Database client
├── supabase/
│   └── migrations/        # SQL schema
└── middleware.ts          # Clerk auth middleware
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

### POST `/api/lexa/chat`

Send a message to LEXA.

**Request:**
```json
{
  "message": "I want to travel in June",
  "sessionId": "optional-session-uuid"
}
```

**Response:**
```json
{
  "message": "Perfect. June is when...",
  "sessionId": "session-uuid",
  "stage": "BRIEFING_COLLECT",
  "voiceEnabled": false
}
```

### GET `/api/lexa/session/:id`

Get full session history.

**Response:**
```json
{
  "session": { ... },
  "messages": [{ ... }]
}
```

### GET `/api/lexa/brief/:sessionId`

Get experience brief (for Operations Agent).

**Response:**
```json
{
  "when": { ... },
  "where": { ... },
  "theme": "Mediterranean Indulgence",
  "budget": { ... },
  "status": "complete",
  ...
}
```

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

- **Frontend**: Next.js 14 (App Router), React, TypeScript
- **Styling**: Tailwind CSS, Custom LEXA Design System
- **Authentication**: Clerk
- **Database**: Supabase (Postgres + RLS)
- **AI**: Anthropic Claude 3.5 Sonnet
- **Voice**: Web Speech API (browser-native)
- **Deployment**: Vercel

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