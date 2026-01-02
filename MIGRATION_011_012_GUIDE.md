# 🚀 Quick Migration Guide - Captain Portal & Intelligence

**Issue:** Migration 012 depends on tables from migration 011.

**Solution:** Run migrations in order via Supabase Dashboard.

---

## ✅ **Step-by-Step: Run Migrations**

### **1. Open Supabase Dashboard**
- Go to: https://supabase.com/dashboard
- Select your project: `LEXA MVP`
- Click **SQL Editor** in left sidebar

---

### **2. Run Migration 011 FIRST** (Captain Portal Tables)

**Copy this entire file:**
`supabase/migrations/011_captain_portal_tables.sql`

**Paste into SQL Editor and click "Run"**

**Creates:**
- ✅ `captain_uploads` (file uploads tracking)
- ✅ `extracted_pois` (POIs from uploads)
- ✅ `scraped_urls` (shared URL scraping)
- ✅ `keywords` (Google Alerts-style monitoring)
- ✅ `keyword_articles` (discovered articles)
- ✅ `scraping_queue` (processing queue)
- ✅ 18 indexes
- ✅ 12 RLS policies

**Verify:** Check "Table Editor" - you should see 6 new tables.

---

### **3. Run Migration 012 SECOND** (Intelligence Tables)

**Copy this entire file:**
`supabase/migrations/012_intelligence_extraction_tables.sql`

**Paste into SQL Editor and click "Run"**

**Creates:**
- ✅ `extracted_experiences` (experience ideas)
- ✅ `market_trends` (luxury travel trends)
- ✅ `client_insights` (traveler psychology)
- ✅ `price_intelligence` (pricing patterns)
- ✅ `competitor_analysis` (competitive intel)
- ✅ `operational_learnings` (practical knowledge)
- ✅ 16 indexes
- ✅ 12 RLS policies

**Verify:** Check "Table Editor" - you should now see 12 new tables total.

---

## 🔍 **Quick Verification**

Run this in SQL Editor to check all tables exist:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN (
    'captain_uploads',
    'extracted_pois',
    'scraped_urls',
    'keywords',
    'keyword_articles',
    'scraping_queue',
    'extracted_experiences',
    'market_trends',
    'client_insights',
    'price_intelligence',
    'competitor_analysis',
    'operational_learnings'
  )
ORDER BY table_name;
```

**Expected result:** 12 tables

---

## 📊 **What Each Migration Does:**

### **Migration 011** (Foundation)
- Captain file uploads
- POI extraction pipeline
- URL scraping system
- Keyword monitoring
- **Dependencies:** None (run first!)

### **Migration 012** (Intelligence)
- Experience ideas for script inspiration
- Market trends for positioning
- Client insights for personalization
- Price intelligence for budgeting
- Competitor analysis
- Operational knowledge
- **Dependencies:** Requires 011 (run second!)

---

## ⚠️ **Important:**

1. **Order matters:** Always run 011 before 012
2. **No harm in re-running:** `IF NOT EXISTS` prevents errors
3. **RLS policies:** Ensure your role is `captain` or `admin` in `lexa_user_profiles`

---

## 🎉 **After Both Migrations:**

Your database will have:
- ✅ **12 new tables** for Captain Portal & Intelligence
- ✅ **34 indexes** for fast queries
- ✅ **24 RLS policies** for security
- ✅ Complete data pipeline for business intelligence

---

## 🚀 **Next Step:**

Deploy the backend services:
1. `intelligence_extractor.py` (Claude AI extraction)
2. `intelligence_storage.py` (save/retrieve functions)
3. `captain_upload.py` (upload API)

Then start uploading documents and watch LEXA get smarter! 🎯
