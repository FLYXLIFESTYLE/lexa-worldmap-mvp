# 🧹 CLEANUP JUNK POIs - Quick Guide

## Problem
Before the quality filter was implemented, the auto-import cron pulled junk POIs (embassies, AC companies, utilities, etc.) into your Captain review queue.

**Current situation:**
- ❌ ~500+ junk POIs imported (embassies, technical services, government offices)
- ✅ Quality filter now active (future imports will be clean)
- ⚠️ Need to clean up existing junk

---

## Solution: Two-Step Cleanup

### **Step 1: Run Migration `027` in Supabase** (Required)

This adds the script contribution scoring fields so you can see which POIs are low-value.

**Go to:** https://supabase.com/dashboard → SQL Editor

**Copy/paste:** `supabase/migrations/027_poi_script_contribution_scoring.sql`

**Click:** "Run"

**What it creates:**
- `script_contribution_score` column (0-100)
- `emotion_potential`, `activity_types`, `theme_alignments` columns
- `cleanup_low_value_pois()` function (auto-delete junk)
- `low_value_pois` view (preview junk POIs)

---

### **Step 2: Delete Junk POIs**

#### **Option A: Bulk Delete by Keywords (Fast)**

Run this in your browser console on `/captain/browse`:

```javascript
// Preview what would be deleted:
await fetch('/api/captain/pois/bulk-delete-by-keywords', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    keywords: [
      'embassy', 'consulate', 'technical services', 'ministry', 'government',
      'air india', 'envida', 'municipality', 'police', 'fire station'
    ],
    dryRun: true
  })
}).then(r => r.json()).then(d => console.log('Would delete:', d.would_delete, 'POIs'));

// Actually delete them:
await fetch('/api/captain/pois/bulk-delete-by-keywords', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    keywords: [
      'embassy', 'consulate', 'technical services', 'ministry', 'government',
      'air india', 'envida', 'municipality', 'police', 'fire station',
      'parking', 'atm', 'bank branch', 'post office', 'bus stop'
    ],
    dryRun: false
  })
}).then(r => r.json()).then(d => console.log('Deleted:', d.deleted, 'POIs'));
```

#### **Option B: Enrich + Auto-Delete (Slower but Smarter)**

This approach uses Claude to evaluate script contribution score, then auto-deletes low-value POIs.

**Steps:**
1. Go to `/captain/browse`
2. Filter: "Enriched: Not enriched"
3. Click "Import Generated POIs" → limit 100 → source "any"
4. Wait for import
5. Select all visible POIs
6. Click "Verify selected" (triggers enrichment)
7. Claude scores each POI for script contribution
8. POIs with `script_contribution_score < 40` AND `luxury_score < 4` are **auto-deleted**
9. Only valuable POIs remain

**Recommended:** Use Option A (keywords) for quick cleanup, then Option B for fine-grained quality control.

#### **Option C: SQL Direct Delete (Admin Only)**

Run this in Supabase SQL Editor to delete obvious junk:

```sql
-- Preview junk POIs:
SELECT id, name, destination, category
FROM extracted_pois
WHERE
  verified = false
  AND (
    LOWER(name) LIKE '%embassy%'
    OR LOWER(name) LIKE '%consulate%'
    OR LOWER(name) LIKE '%ministry%'
    OR LOWER(name) LIKE '%technical service%'
    OR LOWER(name) LIKE '%government%'
    OR LOWER(name) LIKE '%municipality%'
    OR LOWER(name) LIKE '%parking%'
    OR LOWER(name) LIKE '%atm%'
  )
LIMIT 100;

-- Delete them:
DELETE FROM extracted_pois
WHERE
  verified = false
  AND (
    LOWER(name) LIKE '%embassy%'
    OR LOWER(name) LIKE '%consulate%'
    OR LOWER(name) LIKE '%ministry%'
    OR LOWER(name) LIKE '%technical service%'
    OR LOWER(name) LIKE '%government%'
    OR LOWER(name) LIKE '%municipality%'
    OR LOWER(name) LIKE '%parking%'
    OR LOWER(name) LIKE '%atm%'
  );
```

---

## Expected Results

**Before cleanup:**
- ~700 POIs in Captain Browse
- ~70-80% are junk (embassies, utilities, generic businesses)
- ~20-30% are experience-valuable

**After cleanup:**
- ~100-200 POIs remaining
- ~80-90% are experience-valuable
- Much easier to review and verify

---

## How to Prevent Future Junk

**✅ Already implemented:**
1. Pre-import filter rejects obvious junk (embassies, utilities, government)
2. Enrich-first architecture: Claude evaluates script value BEFORE keeping POI
3. Post-enrichment quality gate: Auto-deletes if `script_contribution_score < 40`

**Going forward:**
- Auto-import cron will only pull experience-relevant POIs
- Each POI is enriched immediately after import
- Low-value POIs are auto-deleted (never reach Captain review)
- You'll only see POIs that Claude thinks can enhance scripts

---

## Testing the New Flow

**After migration `027` runs + Vercel deploys:**

1. Go to `/captain/browse`
2. Click "Import Generated POIs"
3. Select: source "overture", destination "French Riviera", limit 50
4. Click "Import"
5. Wait 1-2 minutes (POIs are being auto-enriched in background)
6. Refresh page
7. **Expected:** Only ~10-20 POIs remain (rest were auto-deleted for low value)
8. **Quality:** All remaining POIs have descriptions, scores, themes

---

## Monitoring Quality

**View low-value POIs (before auto-delete):**
```sql
SELECT * FROM low_value_pois LIMIT 100;
```

**Check script contribution scores:**
```sql
SELECT
  name,
  destination,
  script_contribution_score,
  luxury_score,
  emotion_potential,
  activity_types,
  theme_alignments
FROM extracted_pois
WHERE script_contribution_score IS NOT NULL
ORDER BY script_contribution_score DESC
LIMIT 50;
```

**See what Claude thinks is valuable:**
```sql
-- High-value POIs (script-ready)
SELECT name, destination, script_contribution_score, emotion_potential
FROM extracted_pois
WHERE script_contribution_score >= 70
LIMIT 20;

-- Low-value POIs (candidates for deletion)
SELECT name, destination, script_contribution_score, luxury_score
FROM extracted_pois
WHERE script_contribution_score < 40
LIMIT 20;
```

---

**🎯 Run Option A (keyword delete) now for immediate cleanup, then let the enrich-first architecture handle quality automatically going forward!**
