# 🚀 UPDATED Migration Guide - Captain Portal & Intelligence

**Issue Fixed:** The `lexa_user_profiles` table needs a `role` column before migrations 011 and 012 will work.

**Solution:** Run migrations in order: 010b → 011 → 012

---

## ✅ **Step-by-Step: Run Migrations (UPDATED ORDER)**

### **1. Open Supabase Dashboard**
- Go to: https://supabase.com/dashboard
- Select your project: `LEXA MVP`
- Click **SQL Editor** in left sidebar

---

### **2. Run Migration 010b FIRST** (Add Role Column) ⚠️ **NEW**

**Copy this entire file:**
`supabase/migrations/010b_add_role_column.sql`

**Paste into SQL Editor and click "Run"**

**Creates:**
- ✅ Adds `role` column to `lexa_user_profiles`
- ✅ Default value: `'user'`
- ✅ Allowed values: `'user'`, `'captain'`, `'admin'`
- ✅ Index for fast role-based queries

**Verify:** Check `lexa_user_profiles` table - should now have `role` column.

---

### **3. Set Your Role to Admin** (Optional but Recommended)

Run this SQL to make yourself an admin:

```sql
-- Find your user_id first
SELECT id, raw_user_meta_data->>'email' as email 
FROM auth.users;

-- Then set your role to admin (replace YOUR_USER_ID)
UPDATE lexa_user_profiles 
SET role = 'admin' 
WHERE user_id = 'YOUR_USER_ID_FROM_ABOVE';
```

**OR** if you haven't created your profile yet:

```sql
-- Insert your profile with admin role (replace YOUR_USER_ID)
INSERT INTO lexa_user_profiles (user_id, role, emotional_profile, preferences)
VALUES (
    'YOUR_USER_ID',
    'admin',
    '{}'::jsonb,
    '{}'::jsonb
)
ON CONFLICT (user_id) DO UPDATE SET role = 'admin';
```

---

### **4. Run Migration 011 SECOND** (Captain Portal Tables)

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

### **5. Run Migration 012 THIRD** (Intelligence Tables)

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

**Check role column exists:**

```sql
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'lexa_user_profiles'
  AND column_name = 'role';
```

**Expected:** 1 row showing `role | text | 'user'::text`

---

## 📊 **What Each Migration Does:**

### **Migration 010b** (Prerequisites) ⚠️ **MUST RUN FIRST**
- Adds `role` column to existing `lexa_user_profiles` table
- Enables captain/admin access control
- **Dependencies:** None (but must run before 011)

### **Migration 011** (Foundation)
- Captain file uploads
- POI extraction pipeline
- URL scraping system
- Keyword monitoring
- **Dependencies:** Requires 010b (role column)

### **Migration 012** (Intelligence)
- Experience ideas for script inspiration
- Market trends for positioning
- Client insights for personalization
- Price intelligence for budgeting
- Competitor analysis
- Operational knowledge
- **Dependencies:** Requires 011 (captain_uploads table)

---

## ⚠️ **Important:**

1. **Order matters:** Must run 010b → 011 → 012
2. **Set your role:** Make yourself `admin` to access Captain Portal
3. **No harm in re-running:** `IF NOT EXISTS` and `ADD COLUMN IF NOT EXISTS` prevent errors
4. **RLS policies work with roles:** The `role` column is checked by all policies

---

## 🎉 **After All Three Migrations:**

Your database will have:
- ✅ **Role-based access control** (user, captain, admin)
- ✅ **12 new tables** for Captain Portal & Intelligence
- ✅ **35 indexes** for fast queries (including role index)
- ✅ **24 RLS policies** for security
- ✅ Complete data pipeline for business intelligence

---

## 👤 **User Roles Explained:**

| Role | Access | Who |
|------|--------|-----|
| **user** | LEXA chat, own scripts, account | Regular users (default) |
| **captain** | Captain Portal, data upload, intelligence | You, Paul, Bakary, future captains |
| **admin** | Everything + Admin Dashboard | You, Paul, Bakary |

---

## 🚀 **Next Steps:**

1. ✅ Run migration 010b (add role column)
2. ✅ Set your user to `admin` role
3. ✅ Run migration 011 (captain portal)
4. ✅ Run migration 012 (intelligence)
5. Deploy backend services
6. Access Captain Portal at `/captain`
7. Start uploading documents!

---

**🎯 Remember:** You need to be `captain` or `admin` role to access the Captain Portal and upload data!
