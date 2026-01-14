# Technical Context

## Technology Stack

### Frontend

**Framework**: Next.js 16.0.10
- App Router (not Pages Router)
- Turbopack for fast builds
- Server-side rendering for SEO
- Built-in API routes

**Language**: TypeScript 5.7.3
- Strict mode enabled
- Type-safe API calls
- Interface-driven development

**Styling**:
- Tailwind CSS 3.4.18
- Custom colors in `global.css`:
  - `lexa-gold`: #D4AF37
  - `lexa-navy`: #1E293B
- Shadcn/ui component library
- Responsive design (mobile-first future, desktop-first now)

**Key Libraries**:
- `@supabase/supabase-js` (2.47.10) - Auth & database
- `@supabase/ssr` (0.5.2) - Server-side rendering support
- `framer-motion` (11.16.2) - Animations (future use)
- `lucide-react` (0.469.0) - Icons
- `next-themes` (0.4.4) - Light/dark mode
- `sonner` (1.7.3) - Toast notifications

### Backend

**Framework**: FastAPI (Python 3.10+)
- Async support for concurrent requests
- Automatic OpenAPI docs at `/docs`
- Pydantic for data validation
- CORS enabled for frontend communication

**AI/ML**:
- `anthropic` - Claude Sonnet API client
- Model (current): `claude-sonnet-4-20250514`
- Max tokens: sized per task (higher for extraction passes)
- Temperature: 0.3–0.7 (low for extraction, higher for narrative)
- Pattern: **multi-pass extraction** (outline → expand → validate/dedupe → report writer), captain approval, source-backed claims; generic fallbacks must be labeled as such.

**Key Libraries**:
- `neo4j` - Graph database driver
- `supabase` - Python client for Supabase
- `uvicorn` - ASGI server
- `python-dotenv` - Environment variable management
- `sentence-transformers` - Embeddings (future use)

### Databases

**Neo4j AuraDB** (Cloud-hosted graph database)
- Version: 5.x
- Driver: `neo4j-driver` for Python, `neo4j` npm package
- Connection: `neo4j+s://` (secure WebSocket)
- Query language: Cypher
- Current data:
  - 300,000+ POI nodes
  - 14 theme category nodes
  - 350+ destination nodes
  - 299,986+ relationships

**Supabase** (PostgreSQL + Auth + Storage + Realtime)
- PostgreSQL 15
- pgvector extension for vector search
- Row Level Security (RLS) enabled
- Auth: Email/password (invite-only access; admin creates captain/admin users)
- Storage: Public bucket for images (future)

### APIs & Services

**Anthropic Claude API**
- Endpoint: `https://api.anthropic.com/v1/messages`
- Rate limit: 50 requests/minute (tier-dependent)
- Cost: $3 per million input tokens, $15 per million output tokens

**Tavily + External Real-Time APIs (planned/paid tier)**
- Tavily web search for citations
- Dedicated APIs when more reliable (weather, advisories, events/places “open now”)
- Gated for “Right now” concierge tier (not live yet)

**Captain Upload Frontend**
- Uses env `NEXT_PUBLIC_BACKEND_URL` when provided; fallback to Render URL.
- File rows display quick summary of extracted counts and keep/dump state.
- Editor supports bulk select/delete for POIs/Experiences/Providers; per-item confidence via 0–100% UI (stored as 0–1).
- Providers handled separately from competitors; competitor data mapped into providers when present.
- Removed top-level confidence/emotion/count boxes to reduce noise.

**Paid enrichment APIs (optional, later)**
- For MVP brain hardening we rely on **open/free sources + scraping + manual enrichment**.
- Paid APIs (Google Places, etc.) can be re-enabled later behind a feature flag / paid tier when desired.

**Google Vision API**
- Text Detection (OCR): $1.50 per 1,000 images
- Used for yacht destination screenshot extraction
- Service account authentication

**Unsplash** (Free tier)
- License-free images for themes & destinations
- API for dynamic image loading
- Configured in `next.config.ts` remote patterns

## Development Setup

### Prerequisites

1. **Node.js**: 18.17.0 or higher
2. **Python**: 3.10 or higher
3. **Git**: Latest version
4. **Package Managers**:
   - npm (comes with Node.js)
   - pip (comes with Python)

### Environment Variables

**Frontend (.env.local)**:
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://[project].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[anon-key]
SUPABASE_SERVICE_ROLE_KEY=[service-role-key]

# Backend API
NEXT_PUBLIC_API_URL=http://localhost:8010

# Google APIs (optional for admin)
GOOGLE_PLACES_API_KEY=[api-key]
GOOGLE_APPLICATION_CREDENTIALS=./google-vision-credentials.json

# Site (production only)
NEXT_PUBLIC_SITE_URL=https://luxury-travel-designer.com
```

**Backend (.env in rag_system/)**:
```env
# Anthropic
ANTHROPIC_API_KEY=sk-ant-[key]

# Neo4j
NEO4J_URI=neo4j+s://[instance].databases.neo4j.io
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=[password]

# Supabase
SUPABASE_URL=https://[project].supabase.co
SUPABASE_SERVICE_KEY=[service-role-key]

# Logging
LOG_LEVEL=INFO
```

### Local Development

**Start Backend**:
```bash
cd rag_system
python -m venv venv
# Windows:
venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate

pip install -r requirements.txt
uvicorn api.main:app --reload --port 8010
```

**Start Frontend** (separate terminal):
```bash
npm install
npm run dev
```

**Access**:
- Frontend: http://localhost:3000
- Backend API docs: http://localhost:8010/docs
- Backend health: http://localhost:8010/health

### Build Commands

**Frontend**:
- `npm run dev` - Development server with hot reload
- `npm run build` - Production build
- `npm run start` - Serve production build
- `npm run lint` - Run ESLint
- `npm run type-check` - TypeScript type checking

**Backend**:
- `uvicorn api.main:app --reload` - Development
- `uvicorn api.main:app --host 0.0.0.0 --port 8000` - Production

## Technical Constraints

### Performance:
- **Response time**: < 2 seconds for chat responses
- **Graph queries**: < 500ms for POI searches
- **Page load**: < 3 seconds initial load
- **Image optimization**: Next.js Image component for lazy loading

### Browser Support:
- Chrome/Edge: Latest 2 versions
- Firefox: Latest 2 versions
- Safari: Latest 2 versions
- Mobile: iOS Safari, Chrome Android

### API Rate Limits:
- **Anthropic Claude**: 50 req/min (tier 1), 1000 req/min (tier 2+)
- **Paid enrichers (optional later)**: budget depends on provider; not required for MVP brain hardening
- **Neo4j Aura**: must be on a tier that supports the current dataset (free tier is below 300K+ POIs scale)
- **Supabase Free**: 500MB database, 1GB file storage, 2GB bandwidth

### Data Constraints:
- **POI Luxury Filter**: rating ≥ 4.0, price level ≥ $$
- **Theme Categories**: 14 core themes (UI + chat + script engine must stay in sync)
- **Session Storage**: Limited to 5MB in browser (use Supabase for persistence)
- **Neo4j Query Timeout**: 30 seconds max

## Dependencies

### Frontend Package.json (Key Dependencies):
```json
{
  "next": "16.0.10",
  "react": "19.0.0",
  "react-dom": "19.0.0",
  "typescript": "5.7.3",
  "@supabase/supabase-js": "2.47.10",
  "tailwindcss": "3.4.18",
  "framer-motion": "11.16.2",
  "lucide-react": "0.469.0",
  "neo4j-driver": "5.27.0",
  "google-auth-library": "^9.15.0"
}
```

### Backend Requirements.txt (Key Dependencies):
```txt
fastapi==0.115.6
uvicorn==0.34.0
anthropic==0.42.0
neo4j==5.27.0
supabase==2.15.0
python-dotenv==1.0.1
pydantic==2.10.5
```

### Global Dependencies (System):
- Git
- Node.js (includes npm)
- Python 3.10+
- pip
- PowerShell (Windows) or Bash (Mac/Linux)

## Deployment Configuration

### Vercel (Frontend)

**Framework Preset**: Next.js
**Build Command**: `npm run build`
**Output Directory**: `.next`
**Install Command**: `npm install`
**Node Version**: 18.x

**Environment Variables** (must be set in Vercel dashboard):
- All `NEXT_PUBLIC_*` variables
- All Supabase keys
- Google API keys

**Domains**:
- Production: luxury-travel-designer.com
- Preview: auto-generated per branch

### Railway/Render (Backend - Planned)

**Runtime**: Python 3.10
**Start Command**: `uvicorn api.main:app --host 0.0.0.0 --port $PORT`
**Build Command**: `pip install -r requirements.txt`
**Health Check**: `/health`

**Environment Variables**:
- All backend `.env` variables
- `PORT` (provided by platform)

### Neo4j Aura

**Tier**: Free (currently)
**Region**: Closest to users (EU/US)
**Backup**: Automatic daily snapshots
**Upgrade Path**: Professional ($65/month) when scaling

**Connection**:
- URI: `neo4j+s://[id].databases.neo4j.io`
- Auth: Basic (username/password)
- TLS: Required

### Supabase

**Tier**: Free (currently)
**Region**: EU/US (must match Neo4j)
**Backup**: Point-in-time recovery (Pro tier)
**Upgrade Path**: Pro ($25/month) for scaling

**Features Used**:
- Authentication (email/password)
- PostgreSQL database
- Row Level Security
- pgvector extension
- Realtime (future)

## CI/CD Pipeline

### Current (Manual):
1. Local development & testing
2. Git commit & push to main
3. Vercel auto-deploys from main branch
4. Backend deployed manually (for now)

### Future (Automated):
1. Push to branch → Preview deployment (Vercel)
2. PR to main → Run tests
3. Merge to main → Deploy to production
4. Backend: Railway/Render auto-deploy from main
5. Database migrations: Manual review required

## Monitoring & Logging

### Current (MVP):
- Console logs (frontend)
- Python logging (backend)
- Supabase logs (auth, database)
- Neo4j query logs
- Vercel deployment logs

### Future (Production):
- **Frontend**: Sentry for error tracking
- **Backend**: Datadog for performance monitoring
- **Database**: Neo4j monitoring dashboard
- **API**: Rate limit tracking
- **User Analytics**: PostHog or Mixpanel

## Known Technical Issues

### Windows-Specific:
1. **File Lock on .next Folder**
   - Symptom: Build fails with EPERM error
   - Fix: Delete `.next` folder manually, retry build
   - Cause: Windows file locking during hot reload

2. **PowerShell Emoji Issues**
   - Symptom: Commit messages with emojis fail
   - Fix: Use simple ASCII characters in PowerShell
   - Workaround: Commit from VS Code or Git Bash

3. **Port Already in Use**
   - Symptom: `Address already in use` when starting dev server
   - Fix: Kill process on port 3000 or 8010
   - Command: `netstat -ano | findstr :3000` then `taskkill /PID [pid] /F`

4. **Node.js High Memory Usage** ⚠️ IMPORTANT
   - **Symptom**: Task Manager shows 10-20 GB RAM usage by multiple `node.exe` processes (85-89% memory)
   - **Cause**: Next.js dev server (`npm run dev`) keeps running in background
   - **Why It Happens**: 
     - Next.js with Turbopack watches ALL files and keeps them in memory
     - Hot Module Replacement (HMR) caches components
     - Spawns multiple worker processes
     - Memory leaks accumulate during long sessions
   - **Fix**: 
     ```bash
     # Stop all Node.js processes:
     taskkill /F /IM node.exe
     ```
   - **When to Run Dev Server**:
     - ✅ When actively coding/testing in browser
     - ✅ When developing new features
     - ❌ NOT when just reading code or writing docs
   - **Memory Management**:
     - Stop dev server when not needed (saves 10-20 GB RAM)
     - Restart periodically to clear memory leaks
     - Use `npm run build && npm start` for testing (uses less RAM)
     - Check running processes: `Get-Process node | Select-Object Id, ProcessName, WorkingSet`

### Cross-Platform:
1. **Stale Browser Sessions**
   - Symptom: Auth works but admin pages restricted
   - Fix: Clear cookies, or use incognito
   - Cause: Cached session without updated captain_profile

2. **API Port Mismatch**
   - Symptom: Frontend can't reach backend
   - Fix: Ensure `NEXT_PUBLIC_API_URL` matches backend port
   - Default: Backend on 8010, frontend expects 8000

3. **Next.js Image Optimization**
   - Symptom: Images fail to load from external sources
   - Fix: Add domain to `next.config.ts` remotePatterns
   - Currently configured: images.unsplash.com

## Performance Optimization

### Current Optimizations:
- Next.js Image component (lazy loading)
- Tailwind CSS purge (removes unused styles)
- Neo4j indexed properties (luxury_score, destination_name)
- Supabase connection pooling

### Future Optimizations:
- Redis caching for frequent queries
- CDN for static assets
- Code splitting (Next.js dynamic imports)
- Database query optimization (EXPLAIN PLAN in Neo4j)
- Service worker for offline support

## Security Measures

### Current:
- Environment variables for secrets
- Supabase Row Level Security (RLS)
- HTTPS only in production (Vercel automatic)
- API key restrictions (domain-based)
- Input validation (TypeScript + Pydantic)
- Neo4j read-only chat endpoints with strict query limits; block “list all/schema” prompts
- Separation of source-backed vs. generic output; no hallucinated facts
- Role-based access for ingestion/approval flows (captain/admin)

### Future:
- Rate limiting on API endpoints
- DDoS protection (Cloudflare)
- API key rotation
- Security headers (CSP, HSTS)
- Penetration testing

## Backup & Recovery

### Current:
- Git repository (code)
- Neo4j Aura automatic snapshots (daily)
- Supabase automatic backups (7 days retention)
- No backup for local `.env` files (by design)

### Future:
- Weekly full database exports
- Monthly Neo4j graph backups (exported to JSON)
- Disaster recovery plan
- Point-in-time recovery (Supabase Pro)

## Development Tools

### IDE:
- **Primary**: Cursor (AI-powered VS Code fork)
- **Alternative**: VS Code with Copilot

### Extensions (Recommended):
- ESLint
- Prettier
- Tailwind CSS IntelliSense
- Python extension
- Neo4j Cypher extension

### CLI Tools:
- Supabase CLI (for migrations)
- Vercel CLI (for deployments)
- Neo4j Cypher Shell (for direct queries)

## Version Control

### Git Strategy:
- **Main branch**: Production-ready code
- **Feature branches**: For development (future)
- **Commits**: Descriptive messages, no emojis in PowerShell
- **Ignore**: `.env`, `.env.local`, `node_modules`, `venv`, `.next`

### Current Repository:
- Location: GitHub (assumed, based on project structure)
- Branch: main
- Deployment: Auto-deploy from main (Vercel)

## Future Technical Considerations

### Scalability:
- Horizontal scaling for FastAPI (load balancer)
- Neo4j read replicas for high traffic
- Supabase Pro tier for dedicated compute
- CDN for global distribution

### Features:
- WebSocket for real-time chat (Supabase Realtime)
- Mobile app (React Native)
- Offline support (service workers)
- Multi-language (i18n)

### Infrastructure:
- Kubernetes for container orchestration (if needed)
- Message queue (Redis, RabbitMQ) for background jobs
- Elasticsearch for advanced POI search (if graph queries insufficient)

