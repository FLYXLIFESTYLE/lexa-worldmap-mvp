# System Patterns & Architecture

## Architecture Philosophy

### Core Principles:

1. **Graph-First, Not SQL-First**
   - Use Neo4j for complex relationship queries
   - SQL (Supabase) for transactional data (users, sessions, messages)
   - Don't try to model relationships in PostgreSQL

2. **RAG Over Fine-Tuning**
   - Retrieval Augmented Generation keeps responses grounded
   - Fine-tuning = expensive, hard to update, black box
   - RAG = flexible, transparent, updatable in real-time

3. **Emotional Intelligence as First-Class Concern**
   - Every POI tagged with emotional themes
   - Conversation flow designed for emotion discovery, not logistics
   - Graph queries optimized for feeling-based recommendations

4. **Separation of Concerns**
   - Frontend (Next.js): User experience, visual design, auth
   - Backend (FastAPI): AI logic, graph queries, data processing
   - Database (Neo4j): Knowledge graph relationships
   - Database (Supabase): Transactional data, auth, vector search

## System Components

### Frontend (Next.js 16 + TypeScript)

**Location**: `/app`, `/components`, `/lib`

**Key Patterns**:

1. **App Router Structure**:
   ```
   /app
     /page.tsx - Landing page
     /auth/signin, /auth/signup - Authentication (signup is invite-only)
     /experience - User experience builder
     /demo/chat - Admin testing
     /admin - Admin portal
     /knowledge - Brain Console (captains/admins only)
     /api - Next.js API routes (middleware)
   ```

2. **Component Organization**:
   - `/components` - Reusable React components
   - `components/theme-selector.tsx` - Visual theme cards
   - `components/luxury-background.tsx` - Reusable background component
   - `components/admin/*` - Admin-specific components

3. **State Management**:
   - React `useState` and `useEffect` for local state
   - Supabase client for auth state
   - Local storage for session persistence
   - No Redux/Zustand (keep it simple for now)

4. **Styling Approach**:
   - **Global styles in `app/globals.css`** (PRIMARY)
   - Tailwind CSS for utility classes
   - Shadcn/ui for component library
   - Custom colors: `lexa-gold` (#D4AF37), `lexa-navy` (#1E293B)

5. **API Communication**:
   - `lib/api/lexa-client.ts` - Frontend API client
   - Calls FastAPI backend at `NEXT_PUBLIC_API_URL`
   - Handles: `converse()`, `createAccount()`, `composeScript()`

### Backend (FastAPI + Python)

**Location**: `/rag_system`

**Key Patterns**:

1. **Service Architecture**:
   ```
   /rag_system
     /api
       /main.py - FastAPI app entry
       /routes - API endpoints
     /database
       /neo4j_client.py - Graph queries
       /supabase_vector_client.py - Vector search
       /account_manager.py - User sync
     /services
       /desire_anticipator.py - Emotional intelligence
       /script_composer.py - Experience script generation
       /poi_recommendation.py - Graph-based recommendations
   ```

2. **Conversation Flow**:
   - User message → `/api/v1/ailessia/converse`
   - Extract intent & emotion
   - Query Neo4j for relevant POIs
   - Pass context to Claude 3.5 Sonnet
   - Generate response with real data

3. **Neo4j Query Patterns**:
   ```cypher
   // Emotional POI recommendation
   MATCH (poi:poi)-[:HAS_THEME]->(theme:theme_category)
   WHERE theme.name = $theme_name
     AND poi.luxury_score > $min_score
     AND poi.destination_name CONTAINS $location
   RETURN poi
   ORDER BY poi.luxury_score DESC
   LIMIT $limit
   ```

4. **RAG Pattern**:
   ```python
   # 1. Query Neo4j for context
   context = neo4j_client.query_pois(theme, location, luxury_min)
   
   # 2. Build prompt with real data
   prompt = build_prompt(user_message, context, conversation_history)
   
   # 3. Call Claude with grounded context
   response = anthropic_client.messages.create(
       model="claude-3-5-sonnet-20241022",
       messages=[{"role": "user", "content": prompt}]
   )
   
   # 4. Return response (no hallucinations)
   return response
   ```

### Database Layer

#### Neo4j (Knowledge Graph)

**Purpose**: Relationship-rich POI data

**Node Types**:
- `poi` - Points of interest (300,000+)
- `theme_category` - Emotional themes (14)
- `destination` - Cities, regions, countries (350+)
- `yacht_route` - Curated yacht itineraries

**Relationship Types**:
- `(poi)-[:LOCATED_IN]->(destination)`
- `(poi)-[:HAS_THEME]->(theme_category)`
- `(poi)-[:SUPPORTS_ACTIVITY]->(activity)`
- `(route)-[:INCLUDES_PORT {order: N}]->(destination)`

**Key Properties**:
```cypher
poi {
  poi_uid: string,
  name: string,
  lat: float,
  lon: float,
  luxury_score: float (0-10),
  luxury_confidence: float (0-1),
  google_place_id: string,
  google_rating: float,
  google_price_level: int (1-4),
  enriched_at: datetime,
  destination_name: string
}
```

**Query Patterns**:
- Multi-hop traversals for complex recommendations
- Weighted scoring based on theme alignment
- Seasonal filtering
- Luxury threshold filtering

#### Supabase (PostgreSQL + Auth + Vector)

**Purpose**: Transactional data, user management

**Tables**:
1. `captain_profiles` - User roles (admin, agent, etc.)
2. `lexa_sessions` - Conversation sessions
3. `lexa_messages` - Chat history
4. `lexa_preferences` - User preferences
5. `experience_scripts` - Generated scripts
6. `google_places_places` - Cached Places API data
7. `places_enrichment_jobs` - POI enrichment tracking

**Row Level Security (RLS)**:
- Enabled on all tables
- Users can only access their own data
- Service role bypasses for admin operations

**Vector Search (pgvector)**:
- Future use for semantic POI search
- Fallback when graph queries insufficient

### Data Flow Patterns

#### 1. **User Conversation Flow**:
```
User Message (Frontend)
  → POST /api/lexa/chat (Next.js API route)
    → POST /api/v1/ailessia/converse (FastAPI)
      → Neo4j query for context
      → Claude 3.5 Sonnet with context
      → Response with real POI data
    ← AI response
  ← Display in chat UI
```

#### 2. **POI Enrichment Flow**:
```
Google Places API
  → Fetch place details
  → Calculate luxury score
  → Store in Neo4j
  → Link to themes & destinations
  → Store raw data in Supabase (audit trail)
```

#### 3. **Theme Selection Flow**:
```
User clicks theme card
  → Frontend: setSelectedTheme()
  → Send to LEXA: "I'm interested in [Theme]"
  → LEXA queries Neo4j: POIs matching theme
  → LEXA asks follow-up questions based on theme
  → Experience DNA discovered
  → Script generated
```

## Design Patterns in Use

### 1. **Repository Pattern** (Backend)
- `neo4j_client.py` abstracts graph queries
- `supabase_vector_client.py` abstracts vector operations
- Services use repositories, never direct DB calls

### 2. **Strategy Pattern** (Conversation Flow)
- Different conversation stages have different strategies
- `desire_anticipator.py` - emotion extraction
- `script_composer.py` - narrative generation
- Each service focuses on one concern

### 3. **Builder Pattern** (Experience Scripts)
- Step-by-step script construction
- Title → Hook → Emotional Description → Signature Highlights
- Validates completeness before returning

### 4. **Decorator Pattern** (API Middleware)
- Authentication checks
- Rate limiting
- Error handling
- Logging

### 5. **Observer Pattern** (Future - Real-time Updates)
- Planned for collaborative experience building
- WebSocket connections for live updates
- Supabase Realtime for push notifications

## Component Relationships

### Key Dependencies:

**Frontend depends on**:
- Supabase client (auth, database)
- FastAPI backend (conversation, recommendations)
- Neo4j (indirectly via backend)

**Backend depends on**:
- Neo4j driver (graph queries)
- Supabase client (user sync, vector search)
- Anthropic API (Claude 3.5 Sonnet)
- Google Places API (POI enrichment)

**Neo4j contains**:
- POI nodes from multiple sources (OSM, Google Places, manual uploads)
- Theme categories (seeded)
- Yacht destinations (uploaded)
- Relationships linking everything

**Supabase contains**:
- User accounts (via Supabase Auth)
- Conversation history
- Generated experience scripts
- Cached API responses
- Enrichment job tracking

### Data Source Priorities:

1. **Neo4j** - Primary source for POI recommendations
2. **Google Places API** - Real-time data enrichment
3. **Supabase** - User data, session state, caching
4. **OpenStreetMap** - Initial POI seeding (legacy)
5. **Manual uploads** - Curated destinations, routes

## Scalability Patterns

### Current Scale (MVP):
- 300,000 POIs in Neo4j (handles well)
- Single FastAPI instance
- Supabase free tier
- Neo4j Aura free tier

### Future Scale (10,000+ users):

**Horizontal Scaling**:
- Multiple FastAPI instances behind load balancer
- Neo4j Aura Professional (read replicas)
- Supabase Pro (connection pooling)
- Redis cache for frequent queries

**Vertical Scaling**:
- Increase Neo4j memory (graph fits in RAM = fast)
- Upgrade Supabase compute
- CDN for static assets (images, theme cards)

**Query Optimization**:
- Index Neo4j properties (`luxury_score`, `destination_name`)
- Cache popular POI queries (Redis)
- Batch Google Places requests
- Pagination for large result sets

## Error Handling Patterns

### Frontend:
```typescript
try {
  const response = await lexaAPI.converse(message);
  setMessages([...messages, response]);
} catch (error) {
  console.error('Conversation error:', error);
  showErrorToast('LEXA is temporarily unavailable');
}
```

### Backend:
```python
@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    logger.error(f"Unhandled error: {exc}")
    return JSONResponse(
        status_code=500,
        content={"error": "Internal server error"}
    )
```

### Neo4j:
- Retry on transient failures
- Graceful degradation if graph unavailable
- Fallback to cached data (Supabase)

## Security Patterns

### Authentication:
- Supabase Auth (email/password)
- JWT tokens for API requests
- Row Level Security in Supabase

### Authorization:
- Invite-only roles via `captain_profiles` (captain/admin access to Brain Console)
- Middleware checks on protected routes
- Captain profiles for admin access

### Data Protection:
- Environment variables for secrets
- `.env.local` never committed
- API keys restricted to specific domains
- HTTPS only in production

## Testing Strategy (Planned)

### Unit Tests:
- Service layer (emotion extraction, script generation)
- Neo4j query functions
- Luxury scoring algorithm

### Integration Tests:
- API endpoints (FastAPI)
- Neo4j → Backend → Frontend flow
- Authentication flow

### E2E Tests:
- User signup → theme selection → chat → script
- Admin upload → POI enrichment → recommendation

**Current Status**: Manual testing only (MVP phase)

## Deployment Architecture

### Current (Beta):
- **Frontend**: Vercel (luxury-travel-designer.com)
- **Backend**: Local/Railway (planned)
- **Neo4j**: Neo4j Aura (cloud)
- **Supabase**: Supabase cloud

### Production (Future):
- **Frontend**: Vercel (with CDN)
- **Backend**: Railway/Render (auto-scaling)
- **Neo4j**: Aura Professional (read replicas)
- **Supabase**: Pro tier (dedicated compute)
- **Monitoring**: Sentry, Datadog

## Key Architectural Decisions

### Why Next.js?
- React framework with built-in routing
- Server-side rendering for SEO
- API routes for middleware
- Excellent TypeScript support
- Vercel deployment is seamless

### Why FastAPI (not Node.js backend)?
- Python ecosystem for AI/ML (better Claude integration)
- Async support (handles concurrent requests)
- Automatic API docs (OpenAPI)
- Strong typing with Pydantic
- Neo4j driver well-supported

### Why Neo4j (not PostgreSQL)?
- Relationships are first-class citizens
- Multi-hop queries are simple
- Graph traversals in milliseconds
- Natural fit for recommendation engine
- SQL joins don't scale for this use case

### Why Claude 3.5 Sonnet (not GPT-4)?
- Better at emotional intelligence
- More nuanced language
- Follows instructions precisely
- Anthropic's safety features
- JSON mode for structured outputs

### Why Separate Frontend/Backend?
- Decoupling allows independent scaling
- Python backend for AI/ML workloads
- Next.js frontend for React excellence
- Easier to maintain
- Can deploy separately

## Anti-Patterns to Avoid

### ❌ Don't:
1. **Use SQL for complex relationships** → Use Neo4j
2. **Store everything in Neo4j** → Use Supabase for transactional data
3. **Let Claude hallucinate** → Always ground with RAG
4. **Optimize prematurely** → MVP first, scale later
5. **Over-engineer** → User wants simplicity
6. **Mix concerns** → Keep services focused
7. **Skip error handling** → Always catch and log
8. **Commit secrets** → Use environment variables

### ✅ Do:
1. **Query graph first** → Then pass to Claude
2. **Validate all inputs** → TypeScript + Pydantic
3. **Log everything** → Helps debugging
4. **Keep UI simple** → User is a beginner
5. **Document decisions** → Update memory bank
6. **Test on Windows** → User's environment
7. **Explain commands** → User needs to learn
8. **Global styles** → Consistency via global.css

