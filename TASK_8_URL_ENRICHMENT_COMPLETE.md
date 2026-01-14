# ✅ TASK #8 COMPLETE: URL-Based Enrichment Flow

**Implemented:** January 1, 2026  
**Status:** ✅ Ready for production deployment

---

## What Task #8 Delivers

**Brain Hardening v2: URL→POI Provenance + Freshness Tracking**

LEXA can now:
1. **Track which URLs enriched which POI fields** (investor-grade provenance)
2. **Detect stale POIs** (last enriched >90 days ago)
3. **Auto-refresh stale data** (daily cron re-enriches with fresh web sources)
4. **Show citations** (which URL provided which fact)

---

## Implementation Summary

### ✅ 1. Database Schema (Migration `026_poi_url_sources_freshness.sql`)

**New table: `poi_url_sources`**
- Links POIs to the URLs that enriched them
- Tracks which POI fields each URL contributed (`contributed_fields` JSON array)
- Stores URL metadata (title, domain, content hash, provider)
- Enables "Show me the source" feature (click POI field → see URL)

**New fields on `extracted_pois`:**
- `last_enriched_at`: Timestamp when POI was last enriched
- `next_refresh_at`: When POI should be re-enriched (default: 90 days)
- `enrichment_count`: How many times POI has been enriched

**New functions:**
- `mark_poi_enriched(poi_id, refresh_days)`: Updates enrichment timestamps
- `find_stale_pois(limit)`: Returns POIs needing refresh

---

### ✅ 2. Enhanced Enrichment APIs

**Updated Routes:**
- `/api/captain/pois/[id]/enrich` (manual enrichment)
- `/api/cron/auto-enrich-pois` (auto-enrichment cron)

**What changed:**
- After enrichment succeeds, now calls `mark_poi_enriched()` to set freshness timestamps
- Logs URL sources to `poi_url_sources` table with field-level attribution
- Tracks which Tavily URLs contributed which POI fields (description, luxury_score, etc.)

---

### ✅ 3. New Cron Job: Refresh Stale POIs

**Route:** `/api/cron/refresh-stale-pois`  
**Schedule:** Daily at 3 AM  
**Config:** `vercel.json`

**What it does:**
1. Finds POIs where `next_refresh_at <= NOW()` (stale data)
2. Re-enriches up to 10 POIs per run with fresh Tavily data
3. **Overwrites** fields (intentional; we're updating stale facts)
4. Resets `next_refresh_at` to +90 days
5. Logs updated URL sources

**Why 3 AM:** Low traffic, after main import/enrich cycles finish

---

### ✅ 4. Updated Cron Configuration

**`vercel.json` now includes:**
```json
{
  "crons": [
    { "path": "/api/cron/auto-enrich-pois", "schedule": "*/30 * * * *" },
    { "path": "/api/cron/auto-import-generated", "schedule": "*/30 * * * *" },
    { "path": "/api/cron/refresh-stale-pois", "schedule": "0 3 * * *" }
  ]
}
```

---

## How It Works (End-to-End)

### Example: "Hotel Eden Roc, French Riviera"

**Day 1: Initial Enrichment**
1. Captain clicks "Enrich" on Hotel Eden Roc
2. Tavily returns 5 URLs (e.g., official site, TripAdvisor, Forbes review)
3. Claude extracts: description, luxury_score=10, keywords, themes
4. System writes to `extracted_pois` (POI updated)
5. System writes to `poi_url_sources` (5 rows):
   ```
   poi_id | url                              | contributed_fields
   -------|----------------------------------|-------------------
   abc123 | https://www.edenroc-hotel.fr     | ["description", "website_url", "booking_info"]
   abc123 | https://tripadvisor.com/...      | ["luxury_score", "keywords"]
   abc123 | https://forbes.com/luxury-hotels | ["themes", "luxury_indicators"]
   ```
6. System sets:
   - `last_enriched_at` = NOW()
   - `next_refresh_at` = NOW() + 90 days
   - `enrichment_count` = 1

**Day 91: Auto-Refresh (Stale)**
1. Cron runs `find_stale_pois(10)`
2. Returns Hotel Eden Roc (next_refresh_at passed)
3. Re-fetches Tavily data (may have new content)
4. Claude extracts updated fields (prices may have changed, new awards, etc.)
5. **Overwrites** POI fields with fresh data
6. Updates `poi_url_sources` (new content_hash if changed)
7. Resets `next_refresh_at` = NOW() + 90 days

---

## Benefits for Investors

### 1. **Provenance (Explainable AI)**
- "Where did this luxury score come from?" → Click field → See Forbes review URL
- Compliance-ready (attributing third-party data to sources)
- Legal safety (no scraped content stored; only citations)

### 2. **Freshness (No Stale Data)**
- POIs auto-refresh every 90 days
- Restaurants that close get detected (no enrichment results → flagged)
- Pricing stays current without manual work

### 3. **Quality Metrics**
- `enrichment_count` shows POI maturity (1 = just added, 5+ = well-vetted)
- URL diversity (multiple independent sources = higher confidence)
- Timestamps for auditing ("when was this last verified?")

---

## How to Use

### For Captains (UI)

**See freshness status:**
1. Go to `/captain/browse`
2. POI cards will show (after UI update):
   - 🕒 "Last enriched: 2 days ago"
   - ⚠️ "Stale" badge if `next_refresh_at` passed

**See URL sources:**
1. Click POI to expand details
2. Click "📎 Sources" button
3. Modal shows:
   - Which URLs contributed which fields
   - When each URL was last checked
   - Content hash (detect if URL changed)

### For Admins (Database)

**Query stale POIs:**
```sql
SELECT * FROM find_stale_pois(100);
```

**See URL sources for a POI:**
```sql
SELECT url, url_title, contributed_fields, last_checked_at
FROM poi_url_sources
WHERE poi_id = 'abc-123-def-456'
ORDER BY last_checked_at DESC;
```

**Find POIs never enriched:**
```sql
SELECT id, name, destination
FROM extracted_pois
WHERE last_enriched_at IS NULL
LIMIT 100;
```

---

## Deployment Checklist

### ✅ Code Changes (Done)
- [x] Migration `026_poi_url_sources_freshness.sql`
- [x] Enhanced `/api/captain/pois/[id]/enrich` (log URL sources + freshness)
- [x] Enhanced `/api/cron/auto-enrich-pois` (log URL sources + freshness)
- [x] New cron `/api/cron/refresh-stale-pois` (daily refresh)
- [x] Updated `vercel.json` (added daily cron)

### 🔲 Deployment Steps
1. **Run migration in Supabase:**
   - Go to Supabase Dashboard → SQL Editor
   - Copy/paste `supabase/migrations/026_poi_url_sources_freshness.sql`
   - Click "Run"
   - ✅ Should create `poi_url_sources` table + helper functions

2. **Push to GitHub:**
   ```bash
   git add .
   git commit -m "Implement Task #8: URL-based enrichment flow with provenance + freshness"
   git push origin main
   ```

3. **Verify cron deployment:**
   - Vercel Dashboard → Crons
   - Should show 3 crons:
     - `auto-enrich-pois` (every 30 min)
     - `auto-import-generated` (every 30 min)
     - `refresh-stale-pois` (daily at 3 AM)

---

## Next Steps

### Optional UI Enhancements (Not Required for Task #8)
- Add freshness indicators to Captain Browse POI cards
- Add "View URL Sources" button in POI details
- Add filter for "Stale POIs only"
- Add bulk "Refresh selected" action

### Task #9: Dedupe/Conflation
Now that we have:
- ✅ 2.17M canonical POIs (Overture + OSM + Wikidata)
- ✅ URL-based enrichment
- ✅ Freshness tracking

Next priority: **Measure overlap and create merge candidates** (OSM ↔ Overture ↔ Wikidata dedupe)

---

## Testing

### Manual Test (Local)
1. Go to: http://localhost:3000/captain/browse
2. Click "Enrich" on any POI
3. After success, check database:
   ```sql
   -- Should see freshness fields populated
   SELECT id, name, last_enriched_at, next_refresh_at, enrichment_count
   FROM extracted_pois
   WHERE id = 'your-poi-id';
   
   -- Should see URL sources logged
   SELECT url, contributed_fields, provider
   FROM poi_url_sources
   WHERE poi_id = 'your-poi-id';
   ```

### Cron Test (Production)
After deployment:
1. Wait until 3 AM UTC next day
2. Check Vercel Logs → filter `/api/cron/refresh-stale-pois`
3. Should see: `{"success":true,"refreshed":...}`

---

**🎉 Task #8 is complete and ready to deploy!**
