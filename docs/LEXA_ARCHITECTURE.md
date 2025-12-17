# LEXA - Luxury Experience Agent
## Complete Architecture Overview & Feature List

**Version**: 1.0  
**Last Updated**: December 17, 2024  
**Deployment**: [lexa-worldmap-mvp.vercel.app](https://lexa-worldmap-mvp.vercel.app/)

---

## Table of Contents
1. [System Overview](#system-overview)
2. [Core Architecture](#core-architecture)
3. [Agents & Automation](#agents--automation)
4. [Scoring Systems](#scoring-systems)
5. [Data Enrichment](#data-enrichment)
6. [Relationship Management](#relationship-management)
7. [Captain's Knowledge Portal](#captains-knowledge-portal)
8. [LEXA Chat Interface](#lexa-chat-interface)
9. [API Integrations](#api-integrations)
10. [Data Flow](#data-flow)

---

## System Overview

LEXA is a sophisticated luxury travel experience designer that combines AI-powered conversation, graph database intelligence, and real-time data enrichment to create personalized travel experiences.

### Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | Next.js 16 (React 19) | Web application framework |
| **Styling** | Tailwind CSS 4 | UI design system |
| **AI Engine** | Anthropic Claude Sonnet 4.5 | Conversational AI & knowledge extraction |
| **Database** | Neo4j Aura | Graph database for POIs, relationships |
| **Auth & Storage** | Supabase | User authentication & file storage |
| **Deployment** | Vercel | Hosting & CI/CD |
| **Search** | Tavily.ai | Real-time web search |
| **Maps** | Leaflet + React-Leaflet | Interactive world map |

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         LEXA Platform                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────────┐        ┌──────────────────┐              │
│  │  Web Interface   │        │  Captain Portal  │              │
│  │  (Next.js)       │        │  (Admin UI)      │              │
│  └────────┬─────────┘        └────────┬─────────┘              │
│           │                           │                          │
│           └───────────┬───────────────┘                         │
│                       │                                          │
│           ┌───────────▼────────────┐                           │
│           │   API Layer (Next.js)  │                           │
│           │   - Chat API            │                           │
│           │   - Knowledge API       │                           │
│           │   - Data Quality API    │                           │
│           │   - Tavily Search       │                           │
│           └───────────┬────────────┘                           │
│                       │                                          │
│       ┌───────────────┼───────────────┐                        │
│       │               │               │                         │
│   ┌───▼────┐    ┌────▼─────┐   ┌────▼─────┐                  │
│   │ Claude │    │  Neo4j   │   │ Supabase │                   │
│   │   AI   │    │  Graph   │   │   Auth   │                   │
│   └────────┘    └──────────┘   └──────────┘                   │
│                                                                  │
│  ┌──────────────────────────────────────────────────┐          │
│  │           Background Services                     │          │
│  │  - Scheduler (Cron)                              │          │
│  │  - Data Quality Agent                            │          │
│  │  - Enrichment Workers                            │          │
│  └──────────────────────────────────────────────────┘          │
│                                                                  │
│  ┌──────────────────────────────────────────────────┐          │
│  │        External Integrations                      │          │
│  │  - Tavily.ai (Search)                            │          │
│  │  - Google Places (Optional)                       │          │
│  │  - OpenStreetMap (Nominatim)                     │          │
│  │  - Wikipedia                                      │          │
│  └──────────────────────────────────────────────────┘          │
└─────────────────────────────────────────────────────────────────┘
```

---

## Core Architecture

### 1. Application Structure

```
lexa-worldmap-mvp/
├── app/                          # Next.js App Router
│   ├── page.tsx                  # Landing page
│   ├── app/page.tsx              # LEXA Chat interface
│   ├── auth/                     # Authentication pages
│   │   ├── signin/
│   │   ├── signup/
│   │   └── set-password/
│   ├── admin/                    # Captain's Portal
│   │   ├── knowledge/            # Knowledge management
│   │   │   ├── page.tsx          # Dashboard
│   │   │   ├── upload/           # File upload
│   │   │   ├── editor/           # Manual entry
│   │   │   └── scraped-urls/     # URL tracking
│   │   ├── users/                # User management
│   │   └── data-quality/         # Agent monitoring
│   └── api/                      # API Routes
│       ├── lexa/chat/            # Chat endpoint
│       ├── knowledge/            # Knowledge APIs
│       ├── data-quality/         # Agent APIs
│       └── tavily/search/        # Search API
│
├── lib/                          # Core Libraries
│   ├── lexa/                     # LEXA AI System
│   │   ├── claude-client.ts      # Claude integration
│   │   ├── state-machine.ts      # Conversation flow
│   │   ├── stages/               # Conversation stages
│   │   ├── types.ts              # TypeScript types
│   │   └── recommendation-engine.ts
│   ├── neo4j/                    # Neo4j Integration
│   │   ├── client.ts             # Database connection
│   │   ├── queries.ts            # Query functions
│   │   ├── data-quality-agent.ts # Quality automation
│   │   ├── scoring-engine.ts     # Luxury & confidence scoring
│   │   ├── relationship-inference.ts # AI relationship creation
│   │   └── enrich-unnamed-pois.ts # POI enrichment
│   ├── knowledge/                # Knowledge Management
│   │   ├── chatgpt-parser.ts     # ChatGPT export parser
│   │   ├── ai-processor.ts       # AI knowledge extraction
│   │   ├── knowledge-ingestor.ts # Neo4j ingestion
│   │   └── url-tracker.ts        # URL scraping tracker
│   ├── enrichment/               # External Data Sources
│   │   ├── google-places-client.ts
│   │   ├── wikipedia-client.ts
│   │   └── osm-client.ts
│   ├── integrations/             # Third-party APIs
│   │   └── tavily-client.ts      # Tavily search
│   ├── supabase/                 # Supabase clients
│   └── services/                 # Background services
│       ├── scheduler.ts          # Cron job scheduler
│       ├── init.ts               # Service initialization
│       └── logger.ts             # Logging system
│
├── components/                   # React Components
│   ├── chat/                     # Chat UI components
│   ├── map/                      # World map component
│   └── knowledge/                # Knowledge portal components
│
├── scripts/                      # Utility Scripts
│   ├── add_luxury_scores.py     # Python scoring script
│   ├── bulk-enrich.ts           # Batch enrichment
│   ├── run-quality-check.ts     # Manual agent trigger
│   └── *.cypher                 # Neo4j query scripts
│
└── docs/                         # Documentation
    ├── LEXA_ARCHITECTURE.md     # This file
    ├── DATA_QUALITY_AGENT_README.md
    ├── SCORING_SYSTEM.md
    ├── RELATIONSHIP_MANAGEMENT.md
    ├── URL_SCRAPING_PREVIEW.md
    └── TAVILY_INTEGRATION.md
```

---

## Agents & Automation

### 1. Data Quality Agent

**Purpose**: Automated database maintenance and data quality assurance

**Location**: `lib/neo4j/data-quality-agent.ts`

**Schedule**: Daily at midnight UTC (via `node-cron`)

**Functions**:

| Function | Description | Batch Size |
|----------|-------------|------------|
| `findAndMergeDuplicates()` | Detect and merge duplicate POIs | 50 duplicates/run |
| `enrichAndRemoveUnnamedPOIs()` | Enrich unnamed POIs or remove if unidentifiable | 100 POIs/run |
| `ensureRelations()` | Create missing relationships across 14 types | 1000 POIs/run |
| `verifyScoring()` | Auto-calculate luxury & confidence scores | 1000 POIs/run |

**Duplicate Detection Strategy**:
1. By source+source_id
2. By name + coordinates (within 100m)
3. By poi_uid

**Merge Priority** (highest to lowest):
1. Luxury score
2. Number of relationships
3. Property completeness
4. Most recent `updated_at`

**Manual Trigger**:
- UI: `/admin/data-quality`
- API: `POST /api/data-quality/run`
- CLI: `npm run quality-check`

### 2. Scheduler Service

**Purpose**: Manage automated background tasks

**Location**: `lib/services/scheduler.ts`

**Implementation**: `node-cron`

**Active Jobs**:

| Job | Schedule | Function |
|-----|----------|----------|
| Data Quality Check | `0 0 * * *` (Midnight UTC) | `runFullCheck()` |

**Status**: Initialized via `instrumentation.ts` on app startup

---

## Scoring Systems

### 1. Luxury Score (POI Property)

**Range**: 0-100

**Purpose**: Quantify the luxury level of a POI

**Calculation Method**: Rule-based + AI-powered

**Location**: `lib/neo4j/scoring-engine.ts`

#### Rule-Based Scoring

| Criteria | Points |
|----------|--------|
| **Type Base** | 5-25 pts |
| - Ultra-luxury (Michelin, Forbes 5-star) | 25 pts |
| - High-end (5-star hotels, fine dining) | 20 pts |
| - Premium (4-star, upscale) | 15 pts |
| - Mid-range (3-star, casual) | 10 pts |
| - Basic | 5 pts |
| **Name Indicators** | +5-15 pts |
| - "Michelin", "Forbes", "Relais & Châteaux" | +15 pts |
| - "5-star", "luxury", "exclusive" | +10 pts |
| - "boutique", "premium" | +5 pts |
| **Price Level** | 0-20 pts |
| - Ultra-high ($$$$$) | 20 pts |
| - High ($$$$) | 15 pts |
| - Mid ($$$) | 10 pts |
| **Ratings** | 0-15 pts |
| - 9.0+ or 5.0/5.0 | 15 pts |
| - 8.0-8.9 or 4.5-4.9 | 10 pts |
| - 7.0-7.9 or 4.0-4.4 | 5 pts |
| **Amenities** | +1-2 pts each |
| - Private beach, helipad, spa, concierge | +2 pts |
| - Pool, fitness center, room service | +1 pt |
| **Location Exclusivity** | +5-10 pts |
| - Remote islands, exclusive resorts | +10 pts |
| - Prime locations (Monaco, St. Tropez) | +5 pts |

**AI Enhancement**: Claude analyzes description for luxury indicators

**Properties Stored**:
```cypher
poi.luxury_score = 85
poi.luxury_confidence = 0.8
poi.luxury_evidence = "Michelin 3-star, Forbes 5-star, waterfront"
poi.scored_at = datetime()
```

### 2. Confidence Score (Relationship Property)

**Range**: 0.0-1.0

**Purpose**: Quantify reliability of a relationship

**Location**: `lib/neo4j/scoring-engine.ts`

**Calculation Factors**:

| Factor | Weight | Calculation |
|--------|--------|-------------|
| **Source Quality** | 30% | Data source reliability |
| **Evidence Strength** | 40% | Quality of supporting evidence |
| **Data Freshness** | 15% | How recent the data is |
| **Cross-validation** | 15% | Confirmed by multiple sources |

**Confidence Levels**:
- **0.9-1.0**: Verified (explicit documentation)
- **0.7-0.9**: High (clear context, multiple sources)
- **0.5-0.7**: Medium (inferred, single source)
- **0.3-0.5**: Low (weak signals)
- **0.0-0.3**: Very low (speculative)

**Properties Stored**:
```cypher
rel.confidence = 0.85
rel.evidence = "official website + 3 reviews"
rel.created_at = datetime()
```

### 3. Auto-Scoring Process

**Trigger**: Data Quality Agent (daily) or manual

**Function**: `scoreAllUnscored()`

**Process**:
1. Find POIs without luxury_score (limit: 1000/run)
2. Calculate luxury score using rules + AI
3. Find relationships without confidence
4. Calculate confidence based on evidence
5. Store scores in Neo4j
6. Log results

**Performance**: ~1000 POIs + relationships per run

---

## Data Enrichment

### 1. Unnamed POI Enrichment

**Purpose**: Find names for unnamed POIs to prevent data loss

**Location**: `lib/neo4j/enrich-unnamed-pois.ts`

**Pattern Detection**: 
- `Unnamed POI (osm:osm_node_123456)`
- `null`, `''`, or whitespace names

**Enrichment Sources** (in order):

| Source | Method | Success Rate |
|--------|--------|--------------|
| **OSM Overpass API** | Extract OSM ID, query node details | High |
| **Nominatim (Reverse Geocode)** | Use coordinates to find location | Medium |
| **Google Places** (optional) | High-luxury POIs only | High (costly) |

**Process**:
1. Detect unnamed POI
2. Extract OSM ID from name (if present)
3. Query OSM Overpass for node data
4. If not found, reverse geocode coordinates
5. If still unnamed, construct name from location + type
6. Update Neo4j with new name + enrichment source
7. If completely unidentifiable → delete

**Batch Size**: 100 POIs per run (to respect API limits)

**Properties Added**:
```cypher
poi.name = "Beach Bar in Santorini"
poi.enriched_at = datetime()
poi.enrichment_source = "osm_overpass"
```

### 2. URL Scraping & Knowledge Extraction

**Purpose**: Extract structured travel knowledge from web pages

**Location**: `app/api/knowledge/scrape-url/route.ts`

**Process Flow**:
```
1. User pastes URL
   ↓
2. Check if already scraped (last 30 days)
   ↓
3. Fetch HTML content
   ↓
4. Extract main text + title
   ↓
5. Detect subpage links (same domain)
   ↓
6. Process with Claude AI
   ↓
7. Extract: POIs, Relationships, Wisdom
   ↓
8. Save to Neo4j via ingestKnowledge()
   ↓
9. Record in ScrapedURL node
   ↓
10. Return stats to user
```

**AI Extraction** (via Claude):
- **POIs**: Name, type, destination, luxury indicators
- **Relationships**: Between POIs, themes, activities, emotions
- **Wisdom**: Travel tips, best practices, local knowledge

**Duplicate Prevention**: 30-day cooldown (can force re-scrape)

**Subpage Detection**: Up to 20 subpages, returns first 10 to UI

**Tracking Node**:
```cypher
(:ScrapedURL {
  url: "https://...",
  scraped_at: datetime(),
  status: "success",
  knowledge_count: 5,
  pois_extracted: 12,
  relationships_created: 45,
  subpages_found: [...],
  contributor_name: "Captain Chris"
})
```

### 3. External API Enrichment

#### Google Places API (Optional)
- **Purpose**: POI details, ratings, reviews
- **Usage**: High-luxury POIs only (cost management)
- **Location**: `lib/enrichment/google-places-client.ts`
- **Data**: Name, address, rating, reviews, photos, phone

#### OpenStreetMap (Nominatim)
- **Purpose**: Reverse geocoding, location data
- **Usage**: Unnamed POI enrichment
- **Location**: `lib/enrichment/osm-client.ts`
- **Data**: Address, display name, administrative boundaries

#### Wikipedia
- **Purpose**: Historical context, descriptions
- **Usage**: Major destinations and landmarks
- **Location**: `lib/enrichment/wikipedia-client.ts`
- **Data**: Summaries, wikidata, images

### 4. Tavily.ai Real-time Search

**Purpose**: Current events, weather, real-time information

**Location**: `lib/integrations/tavily-client.ts`

**Use Cases**:
1. **Destination Info**: Latest guides, attractions, pricing
2. **Events**: Festivals, yacht shows, Grand Prix, exhibitions
3. **Weather**: Current conditions, seasonal patterns
4. **POI Research**: Recent reviews, awards, availability
5. **Travel Requirements**: Visa, entry rules, health requirements

**API Endpoint**: `/api/tavily/search`

**Search Types**:
- `destination_info`
- `events`
- `weather`
- `poi`
- `travel_requirements`
- `general`

**Cost Management**:
- Free tier: 1,000 requests/month
- Use 'basic' depth for quick queries
- Use 'advanced' for critical information only
- Cache results for 24 hours

---

## Relationship Management

### Relationship Types (14 Total)

Neo4j stores 14 different relationship types connecting various nodes:

#### 1. Geographic Relationships

| Relationship | From | To | Purpose |
|--------------|------|-----|---------|
| `LOCATED_IN` | POI | Destination | Physical location |
| `IN_AREA` | Destination | Area | Regional grouping |
| `IN_REGION` | Area | Region | Broader geography |
| `IN_CONTINENT` | Region | Continent | Continental grouping |

#### 2. Activity & Theme Relationships

| Relationship | From | To | Purpose |
|--------------|------|-----|---------|
| `SUPPORTS_ACTIVITY` | POI | Activity | What activities POI enables |
| `HAS_THEME` | POI/Destination | Theme | Thematic categorization |
| `BELONGS_TO` | Activity | Theme | Activity-theme grouping |

#### 3. Psychological Relationships

| Relationship | From | To | Purpose |
|--------------|------|-----|---------|
| `EVOKES` | POI | Emotion | Emotional response triggered |
| `AMPLIFIES_DESIRE` | POI | Desire | Aspirational fulfillment |
| `MITIGATES_FEAR` | POI | Fear | Concern addressed |
| `RELATES_TO` | Emotion | Desire/Fear | Psychological connections |

#### 4. Seasonal & Content Relationships

| Relationship | From | To | Purpose |
|--------------|------|-----|---------|
| `AVAILABLE_IN` | POI | Season | Seasonal availability |
| `PROMINENT_IN` | POI | Season | Peak season indicator |
| `FEATURED_IN` | POI | Knowledge | Knowledge source reference |

### Relationship Creation Methods

#### 1. Rule-Based (Automatic)
**Location**: `lib/neo4j/data-quality-agent.ts` → `ensureRelations()`

**Logic**:
- `LOCATED_IN`: POI.destination_name → Destination.name
- `SUPPORTS_ACTIVITY`: POI.type → Activity (e.g., marina → sailing)
- `HAS_THEME`: POI.luxury_score + type → Theme
- `AVAILABLE_IN`: POI.seasonal_months → Season nodes

**Batch Processing**: 1000 POIs per run

#### 2. AI-Powered Inference
**Location**: `lib/neo4j/relationship-inference.ts`

**Process**:
1. Analyze POI name + description
2. Use Claude to infer psychological relationships
3. Assign confidence scores based on evidence
4. Create relationships with evidence field

**Example**:
```cypher
(poi:poi {name: "Spa at Marina Bay Sands"})
-[:EVOKES {
  confidence: 0.85,
  evidence: "spa, wellness, tranquility keywords"
}]->
(emotion:Emotion {name: "Peace"})
```

#### 3. Manual (Captain Portal)
Captains can create relationships when adding knowledge with specific destinations/POIs.

### Emotional Nodes

**Created via**: `scripts/create-emotion-nodes.cypher`

**Node Types**:
- **Emotions** (8): Peace, Excitement, Romance, Joy, Awe, Serenity, Adventure, Connection
- **Desires** (8): Discovery, Luxury, Authenticity, Escape, Rejuvenation, Exploration, Indulgence, Prestige
- **Fears** (6): Disappointment, Boredom, Crowds, Unsafety, Isolation, Overwhelm

**Relationship Creation**: `scripts/create-emotional-relationships.cypher`

---

## Captain's Knowledge Portal

### Overview

Web-based interface for travel experts (Captains) to contribute knowledge to LEXA's database.

**Base URL**: `/admin/knowledge`

### Features

#### 1. Knowledge Dashboard
**Route**: `/admin/knowledge`

**Features**:
- Quick stats (contributions, POIs, knowledge entries)
- Access to all portal features
- Recent activity feed

#### 2. Upload Knowledge
**Route**: `/admin/knowledge/upload`

**Supported Formats**:
- ChatGPT JSON exports
- Zoom call transcripts (.vtt, .srt)
- Text documents (.txt)
- PDFs (.pdf)
- Word documents (.docx)

**Process**:
1. Drag & drop or select files
2. System processes with AI (Claude)
3. Extracts POIs, relationships, wisdom
4. Saves to Neo4j
5. Files NOT stored (processed in memory)
6. Tracks contribution attribution

**API**: `POST /api/knowledge/upload`

#### 3. Write Knowledge (Manual Entry)
**Route**: `/admin/knowledge/editor`

**Form Fields**:

| Field | Type | Purpose |
|-------|------|---------|
| **Title** | Text | Knowledge title |
| **Content** | Rich Text | Main content/insights |
| **URL** | URL | Optional source URL (auto-scrapes) |
| **Coordinates** | Lat/Lon | Location coordinates |
| **Photos** | File Upload | Upload/capture images |
| **Topic** | Select | Categorization (accommodation, dining, etc.) |
| **Tags** | Multi-select | Keywords for search |
| **Destinations** | Multi-select | Applicable destinations |
| **Confidence** | Slider | Reliability (0-100%) |
| **Unique Requests** | Text | Special guest requests fulfilled |
| **Never Thought Possible** | Text | Extraordinary experiences |
| **Best Practices** | Sections | Toys, Activities, Concierge, Agents |

**Features**:
- Info tooltips on every field
- URL auto-scraping with Tavily integration
- Photo upload to Supabase Storage
- Coordinate picker (future: map integration)
- Real-time preview

**API**: `POST /api/knowledge/create`

#### 4. URL Tracking & Management
**Route**: `/admin/knowledge/scraped-urls`

**Features**:
- View all scraped URLs
- Filter by status (success/failed/processing)
- See extraction statistics
- View detected subpages
- Re-scrape button (force)
- Delete URL records
- Pagination (50/page)

**Data Displayed**:
- URL + scraped date
- Status badge
- Contributor name
- Knowledge count
- POIs extracted
- Relationships created
- Subpages found (first 5 shown)
- Error messages (if failed)

**API**: `GET/DELETE /api/knowledge/scraped-urls`

#### 5. User Management
**Route**: `/admin/users`

**Purpose**: Create and manage Captain accounts

**Features**:
- Create new captain users
- Send password setup links
- View all captains
- Deactivate accounts (future)
- Set roles and permissions (future)

**Process**:
1. Admin creates user with email + display name
2. System generates temporary password link
3. Captain sets their own password
4. Profile created in Supabase
5. Attribution tracking enabled

**Future**: Commission tracking for external contributors

**API**: `POST /api/admin/users`

### Attribution & Tracking

**Purpose**: Track who contributed what knowledge

**Implementation**:
- `contributed_by`: User UUID
- `contributor_name`: Display name
- `contribution_type`: 'upload', 'manual', 'url_scrape'

**Stored in**:
- POI nodes
- Knowledge nodes
- ScrapedURL nodes

**Future Use**: Commission calculation for external contributors

---

## LEXA Chat Interface

### Overview

Conversational AI interface for designing luxury travel experiences.

**Route**: `/app`

**Engine**: Anthropic Claude Sonnet 4.5

### Conversation Stage Machine

**Location**: `lib/lexa/state-machine.ts`

**Stages** (12 total):

| Stage | Purpose | Duration |
|-------|---------|----------|
| `WELCOME` | Initial greeting, set voice preference | 1 message |
| `INITIAL_QUESTIONS` | Ask When/Where/What Theme | 3 questions |
| `DISARM` | Build trust, assess signals | 1-2 messages |
| `MIRROR` | Reflect understanding | 1 message |
| `MICRO_WOW` | Deliver surprise insight | 1 message |
| `COMMIT` | Confirm brief path (fast/deep) | 1 message |
| `BRIEFING_FAST` | Quick essential questions | 3-5 messages |
| `BRIEFING_DEEP` | Detailed exploration | 5-10 messages |
| `BRIEFING_COLLECT` | Final details gathering | 2-3 messages |
| `SCRIPT_DRAFT` | Generate experience script | 1 message |
| `REFINE` | Iterate and refine | Variable |
| `HANDOFF` | Deliver final brief | 1 message |
| `FOLLOWUP` | Post-experience check-in | Variable |

### Session State

**Stored Fields**:
```typescript
{
  stage: ConversationStage,
  client: {
    name: string,
    language: string,
    voice_reply_enabled: boolean
  },
  brief: {
    when_at: WhenData,
    where_at: WhereData,
    theme: string,
    budget: BudgetData,
    duration: DurationData,
    must_haves: string[],
    bucket_list: string[],
    best_experiences: ExperienceItem[],
    worst_experiences: ExperienceItem[]
  },
  emotions: {
    desired: string[],
    avoid_fears: string[],
    success_definition: string
  },
  signals: {
    skepticism: number,
    arrogance: number,
    trust: number
  },
  micro_wow: {
    delivered: boolean,
    hook: string
  },
  script: {
    draft_id: string,
    theme: string,
    signature_moments: string[],
    protocols: string[],
    legacy_artifact: string
  }
}
```

### Quick Reply Buttons

**Component**: `components/chat/quick-replies.tsx`

**Types**:

#### 1. Month Selection
- Calendar-style buttons (12 months)
- 3-letter abbreviations (Jan, Feb, Mar...)
- Red header with "holes" (calendar aesthetic)
- Gold hover effect
- Active when "When" question shown

#### 2. Destination Selection
- 12 luxury destinations
- Button grid layout
- Shows in UI and on world map
- Pre-defined coordinates for map pins

**Destinations**:
1. French Riviera
2. Amalfi Coast
3. Cyclades (Greece)
4. Ionian Sea
5. Balearics (Spain)
6. Bahamas
7. BVI (British Virgin Islands)
8. USVI (US Virgin Islands)
9. French Antilles
10. Dutch Antilles
11. Arabian Gulf (UAE)
12. Adriatic (North/Central/South)

#### 3. Theme Selection
- Fetched from Neo4j
- Dynamic based on database
- 6-8 theme categories

### World Map Integration

**Component**: `components/map/world-map.tsx`

**Library**: React-Leaflet

**Features**:
- Interactive pan/zoom
- Golden teardrop markers (custom icons)
- Marker click → destination selection
- Popup with destination info
- Best months to visit
- Description + region

**Tile Layer**: CartoDB Voyager (English-only labels)

**Markers**: All 12 quick-reply destinations

### Neo4j RAG Integration

**Purpose**: Enhance AI responses with graph database knowledge

**Process**:
1. User answers initial questions (When/Where/What)
2. Query Neo4j for matching POIs/destinations
3. Include results in Claude prompt context
4. AI generates response with real data
5. Update brief with selected destination

**Query Functions** (`lib/neo4j/queries.ts`):
- `getThemeCategories()`
- `getDestinationsByMonth()`
- `searchDestinations()`
- `getRecommendations(filters)`

### Recommendation Engine

**Location**: `lib/lexa/recommendation-engine.ts`

**Filters**:
- Minimum luxury score
- Confidence level threshold
- Themes
- Activities
- Emotions desired
- Avoid fears
- Destinations
- Budget range
- Season/month

**Presets**:
- Ultra Luxury (90+ score)
- Romantic Getaway
- Adventure Seeker
- Cultural Explorer
- Culinary Journey

**API**: `POST /api/lexa/recommendations`

---

## API Integrations

### Internal APIs

#### 1. Chat API
- **Endpoint**: `POST /api/lexa/chat`
- **Purpose**: LEXA conversation handling
- **Auth**: Required (Supabase)
- **Features**: Session management, state machine, Claude integration

#### 2. Knowledge APIs

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/knowledge/upload` | POST | Upload files for processing |
| `/api/knowledge/create` | POST | Manual knowledge entry |
| `/api/knowledge/scrape-url` | POST | Scrape & extract from URL |
| `/api/knowledge/scraped-urls` | GET/DELETE | Manage scraped URLs |
| `/api/knowledge/upload-photo` | POST | Upload photos to Supabase |

#### 3. Data Quality APIs

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/data-quality/run` | POST | Trigger quality check manually |
| `/api/data-quality/status` | GET | Check agent status |
| `/api/data-quality/scoring-stats` | GET | Get scoring statistics |

#### 4. Tavily Search API
- **Endpoint**: `POST /api/tavily/search`
- **Purpose**: Real-time web search
- **Types**: destination_info, events, weather, poi, travel_requirements, general

### External APIs

#### Anthropic Claude
- **Model**: Claude Sonnet 4.5 (`claude-sonnet-4-5-20250929`)
- **Purpose**: Conversational AI, knowledge extraction
- **Max Tokens**: 1024 (responses), 8000 (extraction)
- **System Prompts**: Stage-specific, luxury-focused

#### Neo4j Aura
- **Driver**: `neo4j-driver` v6.0.1
- **Connection**: Bolt protocol (encrypted)
- **Pool Size**: 50 connections
- **Timeout**: 30 seconds

#### Supabase
- **Auth**: Email/password, magic links (future)
- **Storage**: Public bucket for photos
- **Database**: Captain profiles, user metadata
- **RLS**: Row-level security enabled

#### Tavily.ai
- **Endpoint**: `https://api.tavily.com/search`
- **Auth**: API key
- **Free Tier**: 1,000 requests/month
- **Rate Limit**: Managed client-side

#### Google Places (Optional)
- **Status**: Configured but optional
- **Usage**: High-luxury POI enrichment only
- **Cost**: Pay-per-request

#### OpenStreetMap (Nominatim)
- **Endpoint**: `https://nominatim.openstreetmap.org`
- **Auth**: None (rate-limited)
- **Usage**: Reverse geocoding, unnamed POI enrichment
- **Rate Limit**: 1 request/second

---

## Data Flow

### 1. URL Scraping Flow

```
User Action: Paste URL in editor
          ↓
Check if already scraped (30-day cooldown)
          ↓
Fetch HTML content
          ↓
Extract text + title + subpages
          ↓
Create ParsedConversation object
          ↓
Process with Claude AI
          ↓
Extract:
  - POIs (name, type, luxury indicators)
  - Relationships (POI→Theme, POI→Activity)
  - Wisdom (tips, best practices)
          ↓
Get user attribution (contributor ID + name)
          ↓
Call ingestKnowledge()
          ↓
Neo4j Ingestion:
  - Create/update POI nodes
  - Create Knowledge nodes
  - Create relationships
  - Calculate luxury/confidence scores
          ↓
Record in ScrapedURL node
          ↓
Return stats to user:
  - POIs extracted
  - Wisdom created
  - Relationships added
  - Subpages found
```

### 2. Data Quality Agent Flow

```
Trigger: Cron (midnight) or Manual
          ↓
Step 1: Find & Merge Duplicates
  - Detect by source+ID, name+coords, poi_uid
  - Merge by priority (luxury, relationships, completeness)
  - Merge properties (max values, latest dates)
  - Merge relationships (highest confidence)
  - Delete duplicate nodes
          ↓
Step 2: Enrich & Remove Unnamed POIs
  - Find unnamed POIs with coordinates
  - Query OSM Overpass API
  - Reverse geocode with Nominatim
  - Update name if found
  - Delete if truly unidentifiable
          ↓
Step 3: Ensure All Relationships
  - Check 1000 POIs
  - Create missing LOCATED_IN
  - Create missing SUPPORTS_ACTIVITY
  - Create missing HAS_THEME
  - Add seasonal availability
  - Create emotional relationships
          ↓
Step 4: Verify & Calculate Scoring
  - Find POIs without luxury_score
  - Calculate using rules + AI
  - Find relationships without confidence
  - Calculate based on evidence
  - Store scores in Neo4j
          ↓
Log Results
  - Duration
  - Stats per step
  - Errors encountered
          ↓
Return summary to UI/API
```

### 3. Knowledge Contribution Flow

```
Captain: Upload file OR manually enter
          ↓
Authentication: Verify Supabase session
          ↓
Get captain profile (contributor ID + name)
          ↓
IF FILE UPLOAD:
  - Read file into memory
  - Parse based on type
  - Extract conversations/content
  - Process with Claude AI
  - Extract POIs, relationships, wisdom
ELSE (Manual Entry):
  - Receive form data
  - Create Knowledge node directly
          ↓
Ingest to Neo4j:
  - Create POI nodes (with luxury_score)
  - Create Knowledge nodes
  - Create relationships (with confidence)
  - Add attribution (contributed_by, contributor_name)
          ↓
Track contribution:
  - Link to captain profile
  - Count contributions
  - (Future: Calculate commission)
          ↓
Return success + stats to UI
```

### 4. LEXA Chat Flow

```
User: Sends message
          ↓
Load session state from Supabase
          ↓
Determine current conversation stage
          ↓
Build system prompt for stage
          ↓
IF INITIAL_QUESTIONS stage:
  - Extract When/Where/What from input
  - Query Neo4j for recommendations
  - Include results in context
          ↓
Call Claude API with:
  - System prompt
  - Session state
  - User message
  - Neo4j context (if applicable)
          ↓
Claude returns response + extracted signals
          ↓
Update session state:
  - Apply state machine transition
  - Update brief fields
  - Update signals (trust, skepticism)
  - Advance to next stage if ready
          ↓
Save session state to Supabase
          ↓
Return response to user
          ↓
Update UI:
  - Show message
  - Update quick replies (if stage changed)
  - Show/hide world map
```

---

## Environment Variables

### Required for All Environments

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbG...
SUPABASE_SERVICE_ROLE_KEY=eyJhbG...

# Anthropic Claude
ANTHROPIC_API_KEY=sk-ant-...

# Neo4j
NEO4J_URI=neo4j+s://xxx.databases.neo4j.io
NEO4J_USER=neo4j
NEO4J_PASSWORD=xxx

# Site Configuration
NEXT_PUBLIC_SITE_URL=https://lexa-worldmap-mvp.vercel.app
```

### Optional

```bash
# Google Places (for POI enrichment)
GOOGLE_PLACES_API_KEY=AIza...

# Tavily (for real-time search)
TAVILY_API_KEY=tvly-...
```

---

## Performance Metrics

### Data Quality Agent

| Metric | Value |
|--------|-------|
| POIs processed per run | 1,000 |
| Duplicates merged per run | 50 |
| Unnamed POIs enriched per run | 100 |
| Relationships created per run | 2,000+ |
| Average run time | 3-5 minutes |
| Success rate | 95%+ |

### URL Scraping

| Metric | Value |
|--------|-------|
| Average extraction time | 10-15 seconds |
| POIs per URL | 5-15 |
| Knowledge entries per URL | 3-8 |
| Relationships per URL | 20-50 |
| Subpages detected | 10-20 |

### LEXA Chat

| Metric | Value |
|--------|-------|
| Average response time | 2-4 seconds |
| Context window | 200K tokens |
| Max tokens per response | 1,024 |
| Session timeout | 30 minutes |
| Concurrent users | 100+ |

---

## Deployment

### Platform
- **Hosting**: Vercel
- **Framework**: Next.js 16 (Turbopack)
- **Region**: Washington, D.C., USA (East) - iad1
- **Node Version**: 18.x

### CI/CD
- **GitHub Integration**: Auto-deploy on push to main
- **Build Command**: `npm run build`
- **Environment**: Production, Preview, Development

### Monitoring
- **Build Logs**: Vercel Dashboard
- **Runtime Logs**: Vercel Functions
- **Database**: Neo4j Aura Console
- **Auth**: Supabase Dashboard

---

## Future Enhancements

### Planned Features

1. **Operations Agent**
   - Connect user preferences to experiences
   - Generate experience scripts automatically
   - Match emotional goals with POIs

2. **Monetization Features**
   - Upsell recommendations
   - Subscription tiers
   - Marketplace for experiences

3. **User Account Area**
   - Saved preferences
   - Travel history
   - Designed scripts library

4. **Social Media Agent**
   - Content generation
   - Scheduled posts
   - Engagement tracking

5. **Enhanced Tavily Integration**
   - Auto-enrichment in chat
   - Real-time event calendar
   - Weather widgets

6. **Subpage Auto-Crawler**
   - Batch crawl detected subpages
   - Rate-limited processing
   - Progress tracking

7. **Commission System**
   - Track knowledge → booking
   - Calculate payouts
   - Payment processing

### Backlog
See `BACKLOG.md` for full prioritized feature list

---

## Documentation

### Core Docs
- `LEXA_ARCHITECTURE.md` - This file
- `DATA_QUALITY_AGENT_README.md` - Agent details
- `SCORING_SYSTEM.md` - Luxury & confidence scoring
- `RELATIONSHIP_MANAGEMENT.md` - 14 relationship types
- `URL_SCRAPING_PREVIEW.md` - Data extraction & storage
- `TAVILY_INTEGRATION.md` - Real-time search integration

### Guides
- `DEPLOYMENT_GUIDE.md` - Vercel deployment
- `DEPLOYMENT_CHECKLIST.md` - Pre-launch checklist
- `CAPTAIN_PORTAL_GUIDE.md` - Portal usage
- `QUICK_START_CAPTAIN_PORTAL.md` - Portal quick start

### API References
- See individual `/api/*/route.ts` files for endpoint docs
- Neo4j queries: `lib/neo4j/queries.ts`
- Claude integration: `lib/lexa/claude-client.ts`

---

## Support & Contact

**Project**: LEXA - Luxury Experience Agent  
**Version**: 1.0  
**Deployment**: https://lexa-worldmap-mvp.vercel.app/  
**Captain Portal**: https://lexa-worldmap-mvp.vercel.app/admin/knowledge

For technical support or questions, refer to the documentation files listed above.

---

**Last Updated**: December 17, 2024  
**Next Review**: January 2025

