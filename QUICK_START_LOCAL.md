# Quick Start: Test Intelligence Extraction Locally

## Prerequisites
- Python 3.11+ installed
- Virtual environment set up
- Dependencies installed

## Setup (5 minutes)

### 1. Navigate to backend
```powershell
cd C:\Users\chris\OneDrive\Cursor_LEXA_MVP\lexa-worldmap-mvp\rag_system
```

### 2. Activate virtual environment (if not already active)
```powershell
.venv\Scripts\Activate
```

### 3. Install dependencies
```powershell
pip install -r requirements.txt
pip install pandas --only-binary :all:
```

### 4. Create `.env` file
Create `rag_system/.env`:
```env
# Anthropic (for Claude AI extraction)
ANTHROPIC_API_KEY=your_anthropic_key_here

# Supabase (for database)
SUPABASE_URL=https://otptbvgvvjvxsuxfpdqc.supabase.co
SUPABASE_SERVICE_KEY=your_supabase_service_role_key_here

# Google (optional - for POI enrichment & OCR)
GOOGLE_MAPS_API_KEY=your_google_maps_key_here
GOOGLE_CLOUD_VISION_CREDENTIALS=/path/to/credentials.json

# Tavily (optional - for keyword monitoring)
TAVILY_API_KEY=your_tavily_key_here
```

### 5. Start FastAPI server
```powershell
uvicorn app.main:app --reload --port 8000
```

### 6. Test the extraction
Open browser: http://localhost:8000/docs

Try the `/api/captain/upload/files` endpoint with a test PDF!

---

## What You'll See

Upload a luxury travel PDF → Claude extracts:
- POIs (places)
- Experience ideas
- Market trends
- Client insights
- Price intelligence
- Competitor analysis
- Operational learnings

All saved to your Supabase database! ✨
