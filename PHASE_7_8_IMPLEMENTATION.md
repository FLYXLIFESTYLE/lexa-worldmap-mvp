# 🔧 PHASE 7 & 8 IMPLEMENTATION GUIDE

**Status:** In Progress  
**Purpose:** Complete backend APIs and database setup before production deployment

---

## ✅ COMPLETED

### **Data Sources Documentation:**
- ✅ Created `DATA_SOURCES_VERIFIED.md` with all market research sources
- ✅ Corrected POI numbers (200K Supabase, 10K Neo4j, 100K relationships)
- ✅ Added full citations for all market claims
- ✅ Verified luxury travel ($1.2T), experience economy ($8T), HNWI (22.5M) data

### **Phase 7 - File Upload API:**
- ✅ Created `rag_system/app/api/captain_upload.py`
- ✅ Multi-format file upload (PDF, Word, Excel, images, text)
- ✅ Paste functionality for quick text entry
- ✅ File size validation (50MB max)
- ✅ Confidence score setting (default 80%)
- ✅ Cloud storage integration (Supabase Storage)
- ✅ Upload history (personal view)
- ✅ Delete functionality with ownership checks

---

## ⏳ PHASE 7: Backend APIs (Remaining)

### **1. File Processing Services** ⏳

**Files to Create:**

#### `rag_system/app/services/file_processor.py`
**Purpose:** Process different file formats and extract text

**Functions needed:**
```python
async def process_pdf(file_path: str) -> tuple[str, dict]:
    """Extract text from PDF using pdf-parse or PyPDF2"""
    # Returns: (extracted_text, metadata)
    
async def process_word(file_path: str) -> tuple[str, dict]:
    """Extract text from Word documents using python-docx"""
    # Returns: (extracted_text, metadata)
    
async def process_excel(file_path: str) -> tuple[str, dict]:
    """Extract text from Excel using openpyxl or pandas"""
    # Returns: (extracted_text, metadata)
    
async def process_image(file_path: str) -> tuple[str, dict]:
    """OCR on images using Google Vision API or Tesseract"""
    # Returns: (extracted_text, metadata)
    
async def process_text(file_path: str) -> tuple[str, dict]:
    """Process plain text files"""
    # Returns: (extracted_text, metadata)
```

**Dependencies:**
```bash
pip install PyPDF2 python-docx openpyxl pandas pillow pytesseract google-cloud-vision
```

---

#### `rag_system/app/services/poi_extractor.py`
**Purpose:** Extract POI data from unstructured text using Claude AI

**Functions needed:**
```python
async def extract_pois_from_text(
    text: str,
    confidence_score: int = 80,
    source_file: str = None
) -> list[dict]:
    """
    Use Claude 3.5 Sonnet to extract POI data from text
    
    Extracts:
    - POI name
    - Location/destination
    - Category (restaurant, hotel, activity, etc.)
    - Description
    - Coordinates (if mentioned)
    - Luxury indicators (Michelin stars, 5-star, exclusive, etc.)
    - Price level
    - Themes (romance, adventure, wellness, etc.)
    - Keywords and tags
    
    Returns list of POI dictionaries
    """
    
async def enrich_poi_with_google_places(poi: dict) -> dict:
    """
    Enrich POI with Google Places API data
    - Accurate coordinates
    - Photos
    - Reviews and ratings
    - Opening hours
    - Website
    """
```

**Dependencies:**
```bash
pip install anthropic googlemaps
```

---

### **2. URL Scraping API** ⏳

#### `rag_system/app/api/captain_scraping.py`
**Purpose:** Scrape URLs for POI data

**Endpoints needed:**
```python
@router.post("/scrape")
async def scrape_url(
    url: str,
    discover_subpages: bool = True,
    max_depth: int = 2,
    current_user: dict = Depends(get_current_user)
):
    """
    Scrape a URL for POI data
    - Extract main page content
    - Optionally discover and scrape subpages
    - Store in scraped_urls table
    - Extract POIs from content
    """

@router.get("/urls")
async def get_scraped_urls(
    limit: int = 50,
    offset: int = 0,
    status: Optional[str] = None,
    domain: Optional[str] = None
):
    """
    Get all scraped URLs (shared view for all captains)
    - Filterable by status and domain
    - Shows extraction statistics
    """

@router.post("/urls/{url_id}/rescrape")
async def rescrape_url(url_id: str):
    """Re-scrape a URL to get updated content"""

@router.delete("/urls/{url_id}")
async def delete_scraped_url(url_id: str):
    """Delete a scraped URL and associated POIs"""
```

---

#### `rag_system/app/services/web_scraper.py`
**Purpose:** Web scraping logic

**Functions needed:**
```python
async def scrape_webpage(url: str) -> tuple[str, dict]:
    """
    Scrape a webpage and extract content
    - Handle JavaScript rendering (Selenium/Playwright if needed)
    - Extract main content (remove nav, footer, ads)
    - Return clean text + metadata
    """

async def discover_subpages(url: str, max_depth: int = 2) -> list[str]:
    """
    Discover related subpages from a URL
    - Find links in same domain
    - Limit depth to avoid scraping entire site
    - Return list of discovered URLs
    """

async def extract_structured_data(html: str) -> dict:
    """
    Extract structured data (Schema.org, JSON-LD)
    - POI information
    - Business details
    - Reviews and ratings
    """
```

**Dependencies:**
```bash
pip install beautifulsoup4 requests selenium playwright lxml
```

---

### **3. POI CRUD API** ⏳

#### `rag_system/app/api/captain_pois.py`
**Purpose:** Browse, verify, enhance, and manage POIs

**Endpoints needed:**
```python
@router.get("/pois")
async def browse_pois(
    search: Optional[str] = None,
    category: Optional[str] = None,
    destination: Optional[str] = None,
    quality: Optional[str] = None,
    confidence_min: Optional[int] = None,
    confidence_max: Optional[int] = None,
    verified: Optional[bool] = None,
    enhanced: Optional[bool] = None,
    limit: int = 50,
    offset: int = 0
):
    """
    Browse and filter POIs
    - Search by name/description
    - Filter by category, destination, quality
    - Filter by confidence score range
    - Filter by verification/enhancement status
    """

@router.get("/pois/{poi_id}")
async def get_poi_details(poi_id: str):
    """Get full POI details including relationships"""

@router.patch("/pois/{poi_id}")
async def update_poi(
    poi_id: str,
    name: Optional[str] = None,
    description: Optional[str] = None,
    category: Optional[str] = None,
    confidence_score: Optional[int] = None,
    luxury_score: Optional[int] = None,
    tags: Optional[list[str]] = None,
    verified: Optional[bool] = None,
    enhanced: Optional[bool] = None,
    current_user: dict = Depends(get_current_user)
):
    """
    Update POI details
    - Captain can update any field
    - Confidence >80% requires approval flag
    - Tracks who made changes and when
    """

@router.delete("/pois/{poi_id}")
async def delete_poi(poi_id: str):
    """Delete a POI (captain can only delete own extractions)"""

@router.post("/pois/{poi_id}/verify")
async def verify_poi(
    poi_id: str,
    verified: bool = True,
    notes: Optional[str] = None
):
    """Mark POI as verified by captain"""

@router.post("/pois/{poi_id}/enhance")
async def enhance_poi(
    poi_id: str,
    enhanced_description: str,
    luxury_indicators: Optional[list[str]] = None,
    insider_tips: Optional[str] = None
):
    """Add captain's enhancements to POI"""
```

---

### **4. Keyword Monitoring API** ⏳

#### `rag_system/app/api/captain_keywords.py`
**Purpose:** Keyword monitoring (Google Alerts for travel)

**Endpoints needed:**
```python
@router.post("/keywords")
async def add_keyword(
    keyword: str,
    active: bool = True,
    current_user: dict = Depends(get_current_user)
):
    """Add a keyword to monitor"""

@router.get("/keywords")
async def get_keywords():
    """Get all keywords (all captains see all)"""

@router.patch("/keywords/{keyword_id}")
async def update_keyword(
    keyword_id: str,
    keyword: Optional[str] = None,
    active: Optional[bool] = None
):
    """Update keyword or toggle active status"""

@router.delete("/keywords/{keyword_id}")
async def delete_keyword(keyword_id: str):
    """Delete a keyword"""

@router.get("/articles")
async def get_articles(
    keyword_id: Optional[str] = None,
    status: Optional[str] = None,  # new, selected, scraped, deleted
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    limit: int = 50,
    offset: int = 0
):
    """
    Get discovered articles
    - Filter by keyword, status, date range
    - Shows article title, source, summary
    """

@router.post("/articles/select")
async def select_articles_for_scraping(
    article_ids: list[str]
):
    """Mark articles as selected for scraping"""

@router.post("/articles/unselect")
async def unselect_articles(article_ids: list[str]):
    """Unmark articles from scraping queue"""

@router.delete("/articles")
async def delete_articles(article_ids: list[str]):
    """Delete unwanted articles"""
```

---

#### `rag_system/app/services/keyword_scanner.py`
**Purpose:** Daily keyword scanning logic

**Functions needed:**
```python
async def scan_keywords_daily():
    """
    Main function to run daily at 11 PM
    - Get all active keywords
    - Search for recent articles (Tavily API or Google News)
    - Extract article metadata (title, source, URL, summary)
    - Store in keyword_articles table
    """

async def search_keyword_articles(
    keyword: str,
    days_back: int = 1
) -> list[dict]:
    """
    Search for articles about a keyword
    - Use Tavily API for real-time search
    - Filter for travel/luxury relevant content
    - Return article metadata
    """
```

**Dependencies:**
```bash
pip install tavily-python feedparser  # Tavily for search, feedparser for RSS
```

---

### **5. Stats & Analytics API** ⏳

#### `rag_system/app/api/captain_stats.py`
**Purpose:** Dashboard statistics for Captain Portal

**Endpoints needed:**
```python
@router.get("/stats/uploads")
async def get_upload_stats(
    captain_id: Optional[str] = None
):
    """
    Upload statistics
    - Total uploads, completed, processing, failed
    - Total POIs extracted
    - Total relationships created
    - Average confidence score
    """

@router.get("/stats/pois")
async def get_poi_stats():
    """
    POI statistics
    - Total POIs, verified, needs verification
    - Low quality count
    - Average confidence score
    - POIs by category
    - POIs by destination
    """

@router.get("/stats/urls")
async def get_url_stats():
    """
    URL scraping statistics
    - Total URLs, success, processing, failed
    - Total POIs from scraping
    - Total relationships from scraping
    - Unique domains
    """

@router.get("/stats/keywords")
async def get_keyword_stats():
    """
    Keyword monitoring statistics
    - Total keywords, active keywords
    - Total articles, new articles, queued articles
    - Articles scraped today/this week
    """
```

---

## ⏳ PHASE 8: Database Setup

### **1. Supabase Tables** ⏳

**Create migration file:** `supabase/migrations/011_captain_portal_tables.sql`

**Tables needed:**

```sql
-- Captain uploads tracking
CREATE TABLE IF NOT EXISTS captain_uploads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    uploaded_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    uploaded_by_email TEXT NOT NULL,
    filename TEXT NOT NULL,
    file_type TEXT NOT NULL CHECK (file_type IN ('pdf', 'word', 'excel', 'image', 'text', 'paste')),
    file_size BIGINT,
    file_url TEXT,
    keep_file BOOLEAN DEFAULT true,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processing_status TEXT NOT NULL DEFAULT 'processing' CHECK (processing_status IN ('processing', 'completed', 'failed')),
    extracted_text_length INTEGER,
    pois_discovered INTEGER DEFAULT 0,
    confidence_score INTEGER DEFAULT 80 CHECK (confidence_score >= 0 AND confidence_score <= 100),
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Extracted POIs from uploads (before promotion to main pois table)
CREATE TABLE IF NOT EXISTS extracted_pois (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    upload_id UUID REFERENCES captain_uploads(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES auth.users(id),
    name TEXT NOT NULL,
    destination TEXT,
    category TEXT,
    description TEXT,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    confidence_score INTEGER DEFAULT 80,
    luxury_score INTEGER CHECK (luxury_score >= 0 AND luxury_score <= 10),
    price_level INTEGER CHECK (price_level >= 0 AND price_level <= 4),
    themes TEXT[],
    keywords TEXT[],
    luxury_indicators TEXT[],
    verified BOOLEAN DEFAULT false,
    enhanced BOOLEAN DEFAULT false,
    promoted_to_main BOOLEAN DEFAULT false,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    verified_at TIMESTAMP WITH TIME ZONE,
    verified_by UUID REFERENCES auth.users(id)
);

-- Scraped URLs tracking
CREATE TABLE IF NOT EXISTS scraped_urls (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    url TEXT NOT NULL UNIQUE,
    domain TEXT NOT NULL,
    entered_by UUID NOT NULL REFERENCES auth.users(id),
    entered_by_email TEXT NOT NULL,
    scraped_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    scraping_status TEXT NOT NULL DEFAULT 'processing' CHECK (scraping_status IN ('processing', 'success', 'failed')),
    content_length INTEGER,
    pois_discovered INTEGER DEFAULT 0,
    relationships_discovered INTEGER DEFAULT 0,
    subpages_discovered INTEGER DEFAULT 0,
    subpages JSONB,
    error_message TEXT,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_scraped TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Keywords for monitoring (Google Alerts style)
CREATE TABLE IF NOT EXISTS keywords (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    keyword TEXT NOT NULL UNIQUE,
    active BOOLEAN DEFAULT true,
    created_by UUID NOT NULL REFERENCES auth.users(id),
    created_by_email TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_scanned TIMESTAMP WITH TIME ZONE,
    total_articles_found INTEGER DEFAULT 0
);

-- Articles discovered from keywords
CREATE TABLE IF NOT EXISTS keyword_articles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    keyword_id UUID NOT NULL REFERENCES keywords(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    url TEXT NOT NULL,
    source TEXT,
    author TEXT,
    published_date TIMESTAMP WITH TIME ZONE,
    summary TEXT,
    content_preview TEXT,
    discovered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'selected', 'scraped', 'deleted')),
    selected_by UUID REFERENCES auth.users(id),
    selected_at TIMESTAMP WITH TIME ZONE,
    scraped_at TIMESTAMP WITH TIME ZONE,
    pois_extracted INTEGER DEFAULT 0,
    metadata JSONB
);

-- Scraping queue (articles selected for scraping)
CREATE TABLE IF NOT EXISTS scraping_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    article_id UUID REFERENCES keyword_articles(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    priority INTEGER DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'completed', 'failed')),
    added_by UUID NOT NULL REFERENCES auth.users(id),
    added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_captain_uploads_user ON captain_uploads(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_captain_uploads_status ON captain_uploads(processing_status);
CREATE INDEX IF NOT EXISTS idx_captain_uploads_date ON captain_uploads(uploaded_at DESC);

CREATE INDEX IF NOT EXISTS idx_extracted_pois_upload ON extracted_pois(upload_id);
CREATE INDEX IF NOT EXISTS idx_extracted_pois_destination ON extracted_pois(destination);
CREATE INDEX IF NOT EXISTS idx_extracted_pois_category ON extracted_pois(category);
CREATE INDEX IF NOT EXISTS idx_extracted_pois_verified ON extracted_pois(verified);

CREATE INDEX IF NOT EXISTS idx_scraped_urls_domain ON scraped_urls(domain);
CREATE INDEX IF NOT EXISTS idx_scraped_urls_status ON scraped_urls(scraping_status);
CREATE INDEX IF NOT EXISTS idx_scraped_urls_date ON scraped_urls(scraped_at DESC);

CREATE INDEX IF NOT EXISTS idx_keywords_active ON keywords(active);
CREATE INDEX IF NOT EXISTS idx_keyword_articles_keyword ON keyword_articles(keyword_id);
CREATE INDEX IF NOT EXISTS idx_keyword_articles_status ON keyword_articles(status);
CREATE INDEX IF NOT EXISTS idx_keyword_articles_date ON keyword_articles(discovered_at DESC);
```

---

### **2. Row Level Security (RLS) Policies** ⏳

**Add to same migration file:**

```sql
-- Enable RLS
ALTER TABLE captain_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE extracted_pois ENABLE ROW LEVEL SECURITY;
ALTER TABLE scraped_urls ENABLE ROW LEVEL SECURITY;
ALTER TABLE keywords ENABLE ROW LEVEL SECURITY;
ALTER TABLE keyword_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE scraping_queue ENABLE ROW LEVEL SECURITY;

-- Captain uploads: Captains see only their own uploads, Admins see all
CREATE POLICY "Captains see own uploads" ON captain_uploads
    FOR SELECT USING (
        uploaded_by = auth.uid() OR
        EXISTS (SELECT 1 FROM lexa_user_profiles WHERE id = auth.uid() AND role = 'admin')
    );

CREATE POLICY "Captains insert own uploads" ON captain_uploads
    FOR INSERT WITH CHECK (uploaded_by = auth.uid());

CREATE POLICY "Captains delete own uploads" ON captain_uploads
    FOR DELETE USING (
        uploaded_by = auth.uid() OR
        EXISTS (SELECT 1 FROM lexa_user_profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- Extracted POIs: Same as uploads
CREATE POLICY "Captains see own extracted POIs" ON extracted_pois
    FOR SELECT USING (
        created_by = auth.uid() OR
        EXISTS (SELECT 1 FROM lexa_user_profiles WHERE id = auth.uid() AND role = 'admin')
    );

CREATE POLICY "Captains insert POIs" ON extracted_pois
    FOR INSERT WITH CHECK (created_by = auth.uid());

CREATE POLICY "Captains update own POIs" ON extracted_pois
    FOR UPDATE USING (created_by = auth.uid());

-- Scraped URLs: ALL captains see ALL URLs (shared knowledge)
CREATE POLICY "Captains see all scraped URLs" ON scraped_urls
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM lexa_user_profiles WHERE id = auth.uid() AND role IN ('captain', 'admin'))
    );

CREATE POLICY "Captains insert URLs" ON scraped_urls
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM lexa_user_profiles WHERE id = auth.uid() AND role IN ('captain', 'admin'))
    );

CREATE POLICY "Captains delete URLs" ON scraped_urls
    FOR DELETE USING (
        EXISTS (SELECT 1 FROM lexa_user_profiles WHERE id = auth.uid() AND role IN ('captain', 'admin'))
    );

-- Keywords: ALL captains see ALL keywords (shared)
CREATE POLICY "Captains see all keywords" ON keywords
    FOR ALL USING (
        EXISTS (SELECT 1 FROM lexa_user_profiles WHERE id = auth.uid() AND role IN ('captain', 'admin'))
    );

-- Articles: ALL captains see ALL articles (shared)
CREATE POLICY "Captains see all articles" ON keyword_articles
    FOR ALL USING (
        EXISTS (SELECT 1 FROM lexa_user_profiles WHERE id = auth.uid() AND role IN ('captain', 'admin'))
    );
```

---

### **3. Neo4j Constraints & Indexes** ⏳

**Create file:** `neo4j/captain_portal_constraints.cypher`

```cypher
// Ensure POI uniqueness
CREATE CONSTRAINT poi_uid_unique IF NOT EXISTS
FOR (p:POI) REQUIRE p.poi_uid IS UNIQUE;

// Ensure captain-created POIs have creator
CREATE CONSTRAINT captain_poi_creator IF NOT EXISTS
FOR (p:POI) REQUIRE p.created_by IS NOT NULL;

// Index on confidence scores for filtering
CREATE INDEX poi_confidence_score IF NOT EXISTS
FOR (p:POI) ON (p.confidence_score);

// Index on verification status
CREATE INDEX poi_verified IF NOT EXISTS
FOR (p:POI) ON (p.verified);

// Index on luxury scores
CREATE INDEX poi_luxury_score IF NOT EXISTS
FOR (p:POI) ON (p.luxury_score_base);

// Index on destinations for browsing
CREATE INDEX poi_destination IF NOT EXISTS
FOR (p:POI) ON (p.destination_name);

// Index on categories
CREATE INDEX poi_category IF NOT EXISTS
FOR (p:POI) ON (p.type);

// Full-text search on POI names and descriptions
CALL db.index.fulltext.createNodeIndex(
  "poi_fulltext_search",
  ["POI"],
  ["name", "description", "address", "keywords"],
  {analyzer: "standard"}
) IF NOT EXISTS;
```

---

### **4. Cron Job Setup** ⏳

**Option A: Vercel Cron (Recommended)**

Create `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/cron/scan-keywords",
      "schedule": "0 23 * * *"
    }
  ]
}
```

Create API route: `app/api/cron/scan-keywords/route.ts`
```typescript
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Call Python backend to scan keywords
  const response = await fetch(`${process.env.BACKEND_URL}/api/captain/keywords/scan`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.BACKEND_API_KEY}`
    }
  });

  const result = await response.json();
  
  return NextResponse.json({
    success: true,
    ...result
  });
}
```

**Option B: GitHub Actions (Alternative)**

Create `.github/workflows/keyword-scan.yml`:
```yaml
name: Daily Keyword Scan

on:
  schedule:
    - cron: '0 23 * * *'  # 11 PM UTC daily
  workflow_dispatch:  # Manual trigger

jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger keyword scan
        run: |
          curl -X POST \
            -H "Authorization: Bearer ${{ secrets.BACKEND_API_KEY }}" \
            https://your-backend-url.com/api/captain/keywords/scan
```

---

## 📝 Implementation Checklist

### Phase 7 - Backend APIs:
- [x] File upload API (`captain_upload.py`)
- [ ] File processing services (`file_processor.py`)
- [ ] POI extraction service (`poi_extractor.py`)
- [ ] URL scraping API (`captain_scraping.py`)
- [ ] Web scraper service (`web_scraper.py`)
- [ ] POI CRUD API (`captain_pois.py`)
- [ ] Keyword monitoring API (`captain_keywords.py`)
- [ ] Keyword scanner service (`keyword_scanner.py`)
- [ ] Stats & analytics API (`captain_stats.py`)

### Phase 8 - Database:
- [ ] Create Supabase migration (`011_captain_portal_tables.sql`)
- [ ] Run migration on production database
- [ ] Test RLS policies
- [ ] Create Neo4j constraints (`captain_portal_constraints.cypher`)
- [ ] Run Neo4j constraints on production
- [ ] Set up cron job (Vercel or GitHub Actions)
- [ ] Test daily keyword scanning
- [ ] Verify all endpoints work end-to-end

---

## 🚀 Next Steps

**To complete Phase 7 & 8:**

1. **Implement remaining services** (file_processor, poi_extractor, web_scraper, keyword_scanner)
2. **Create remaining API routes** (scraping, pois, keywords, stats)
3. **Write database migrations** (Supabase + Neo4j)
4. **Set up cron job** (keyword scanning at 11 PM)
5. **Test end-to-end** (upload file → extract POIs → verify → promote to Neo4j)
6. **Deploy to production** (run migrations, deploy backend, test all features)

**Estimated time:** 8-12 hours of focused development

---

**Last Updated:** December 31, 2024  
**Status:** Phase 7 in progress, Phase 8 pending
