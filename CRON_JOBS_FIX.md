# 🔧 CRON JOBS FIX - Auto-Import & Auto-Enrich

## Problem
Your auto-import and auto-enrich cron jobs are configured in `vercel.json` to run every 30 minutes, but they're **failing silently** because of missing configuration.

---

## Why Your Captain Portal Still Shows 540 POIs

**Root cause:**
1. Cron jobs run every 30 minutes ✅
2. But they **fail immediately** with 500 error ❌
3. Reason: Missing `CRON_POI_USER_ID` environment variable
4. Secondary: Cron was looking for wrong `kind` (fixed in this commit)

**What the cron jobs do:**
- **Auto-import**: Pulls POIs from `experience_entities` (canonical) → `extracted_pois` (Captain's draft table)
- **Auto-enrich**: Enriches existing `extracted_pois` with Tavily + Claude

**Current state:**
- ✅ 2.17M canonical POIs in `experience_entities` (from Overture/OSM/Wikidata ingestion)
- ❌ Only 540 POIs in `extracted_pois` (Captain's review queue)
- ❌ Cron can't import more until `CRON_POI_USER_ID` is set

---

## Solution

### Step 1: Get Your User UUID

Run this command locally to get your user UUID:

```bash
node -e "require('dotenv').config({path:'.env'}); const {createClient} = require('@supabase/supabase-js'); const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY); (async()=>{const u=await admin.from('captain_profiles').select('user_id,email').limit(1).maybeSingle(); console.log('CRON_POI_USER_ID:', u.data?.user_id);})();"
```

Or go to Supabase Dashboard → Table Editor → `captain_profiles` → copy the `user_id` column for your email.

---

### Step 2: Set Environment Variable in Vercel

1. Go to: https://vercel.com/flyxlifestyle/lexa-worldmap-mvp/settings/environment-variables
2. Click "Add New"
3. Key: `CRON_POI_USER_ID`
4. Value: (paste your user UUID from Step 1)
5. Scope: Production, Preview, Development
6. Click "Save"

---

### Step 3: Redeploy

After setting the env var, you need to redeploy for cron to pick it up:

**Option A (Recommended):** Push a new commit (I just fixed the `kind` bug, so push that):
```bash
git add app/api/cron/auto-import-generated/route.ts
git commit -m "Fix cron auto-import: query kind=region instead of mvp_destination"
git push origin main
```

**Option B:** Manual redeploy:
1. Go to Vercel Dashboard → Deployments
2. Click the three dots on latest deployment
3. Click "Redeploy"

---

## How to Verify It's Working

### Check Vercel Cron Logs:
1. Go to: https://vercel.com/flyxlifestyle/lexa-worldmap-mvp/logs
2. Filter by: `/api/cron/auto-import-generated`
3. Look for:
   - ✅ `200` status (success)
   - ✅ `{"success":true,"mode":"sweep","total_created":...}`
   - ❌ `500` status or `"Server not configured"` error

### Check Captain Portal:
1. Go to: https://lexa-worldmap-mvp.vercel.app/captain/browse
2. Wait 30 minutes (next cron run)
3. Refresh page
4. You should see POI count increasing by ~250-750 per run (3 destinations × 250 limit)

---

## What the Cron Jobs Do

### Auto-Import (`/api/cron/auto-import-generated`)
**Runs:** Every 30 minutes  
**What it does:**
- Selects 3 random destinations (rotates deterministically)
- Pulls up to 250 POIs per destination from `experience_entities` → `extracted_pois`
- Source priority: `any` (OSM, Wikidata, Overture, Foursquare)
- Creates POIs owned by `CRON_POI_USER_ID`
- **Idempotent**: won't create duplicates (uses `generated_source + generated_source_id` unique key)

**Expected growth:**
- ~250-750 new POIs per run
- ~12,000-36,000 POIs per day (48 runs × 250-750)

### Auto-Enrich (`/api/cron/auto-enrich-pois`)
**Runs:** Every 30 minutes  
**What it does:**
- Finds POIs where `enhanced = false` OR `confidence_score < 70`
- Enriches up to 5 POIs with Tavily + Claude
- Updates: description, luxury_score, keywords, themes, confidence_score (min 70%)
- Marks `enhanced = true`

**Expected behavior:**
- ~5 POIs enriched per run
- ~240 POIs enriched per day (48 runs × 5)

---

## Manual Import (Immediate Fix)

If you want to import Overture POIs **right now** without waiting for cron:

1. Go to: https://lexa-worldmap-mvp.vercel.app/captain/browse
2. Click "Import Generated POIs"
3. Select: `source: overture`
4. Limit: 1000
5. Click "Import"
6. Repeat for other destinations

This will immediately pull Overture POIs into your Captain review queue.

---

## Where to See Enriched POIs

**In Captain Browse:**
- Filter by "Enriched: Yes"
- Look for the ✨ "Enhanced" badge on POI cards
- Check the `confidence_score` (70%+ after enrichment)
- Click "Edit & Enhance" to see enriched description, keywords, themes

**In Database (Supabase):**
- Table: `extracted_pois`
- Filter: `enhanced = true`
- Columns: `description`, `luxury_score`, `keywords`, `themes`, `enrichment` (JSON with Tavily results)

---

## Next: After Cron is Fixed

Once `CRON_POI_USER_ID` is set and you redeploy:
1. Cron will start importing ~750 POIs every 30 minutes
2. Auto-enrich will start enriching ~5 POIs every 30 minutes
3. Within 24 hours you'll have ~10,000+ POIs imported
4. Within a week you'll have ~50,000+ POIs imported

You can monitor progress in:
- Captain Browse (POI count at top)
- CEO Dashboard (live counts with auto-refresh)
- Vercel Logs (cron execution logs)

---

**Let me know your user UUID and I'll add it to a commit so you can push it!** 🚀
