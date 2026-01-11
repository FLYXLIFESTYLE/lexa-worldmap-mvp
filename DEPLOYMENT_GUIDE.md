# 🚀 DEPLOYMENT GUIDE - USER ACCOUNTS & CAPTAIN PORTAL

**Date:** December 31, 2024  
**Status:** ✅ Ready for Production Deployment  
**Build Status:** ✅ SUCCESS (96 pages generated)

---

## ✅ PRE-DEPLOYMENT CHECKLIST

### Build Status:
- ✅ Production build successful
- ✅ TypeScript compilation passed
- ✅ All routes validated
- ✅ 96 pages generated
- ✅ No build errors

### Code Status:
- ✅ All frontend pages complete (6 phases)
- ✅ Navigation integrated
- ✅ Next.js 16 dynamic routes fixed
- ✅ Memory bank updated
- ✅ Git commits up to date (29 commits ahead)

### Database Status:
- ⚠️ Migrations need to be run on production database
- ✅ Migration files ready in `supabase/migrations/`

---

## 📋 STEP-BY-STEP DEPLOYMENT

### **STEP 1: Run Database Migrations** ⚠️ IMPORTANT

You need to run these migrations on your **production Supabase** database:

#### Core Migrations (Required):
1. `001_lexa_schema.sql` - Base schema
2. `002_lexa_user_profiles.sql` - User profiles
3. `004_membership_tiers.sql` - Membership system
4. `005_enhanced_user_profiles.sql` - Enhanced profiles
5. `006_conversation_summaries.sql` - Conversation summaries
6. `007_script_library.sql` - Script library
7. `008_community_scripts.sql` - Community features
8. `009_marketplace_prep.sql` - Marketplace (future)
9. `010_add_script_metadata.sql` - Script metadata (theme_category, hook, description)

#### Admin/Captain Migrations:
10. `create_bug_reports.sql` - Bug reporting
11. `create_error_logs.sql` - Error logging
12. `create_backlog_items.sql` - Development backlog
13. `create_captain_profiles.sql` - Captain profiles
14. `create_upload_tracking.sql` - Upload tracking
15. `add_screenshot_data_to_bug_reports.sql` - Bug screenshots
16. `021_knowledge_nuggets.sql` - Unstructured knowledge inbox (sentence fragments, events, signals)

#### How to Run Migrations:

**Option A: Supabase Dashboard (Recommended for beginners)**
1. Go to your Supabase project: https://supabase.com/dashboard
2. Click on your project
3. Go to "SQL Editor" in the left sidebar
4. For each migration file:
   - Open the file in your code editor
   - Copy the entire SQL content
   - Paste into Supabase SQL Editor
   - Click "Run" button
   - Wait for "Success" message
   - Move to next file

**Option B: Supabase CLI (Advanced)**
```bash
# First, link to your production project
npx supabase link --project-ref YOUR_PROJECT_REF

# Then push all migrations
npx supabase db push
```

**WHAT THIS DOES:**
- Creates tables for user accounts, memberships, conversations, scripts
- Sets up bug reports and error logging
- Prepares for Captain Portal data (uploads, URLs, keywords)
- Adds indexes for performance

---

### **STEP 2: Set Environment Variables**

Make sure these are set in your **production environment** (Vercel, Railway, etc.):

#### Required:
```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

NEO4J_URI=bolt://your-neo4j-instance:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=your-password

ANTHROPIC_API_KEY=your-claude-api-key
```

#### Optional:
```bash
GOOGLE_VISION_API_KEY=your-google-vision-key  # For OCR
GOOGLE_PLACES_API_KEY=your-places-key         # For POI enrichment
ENABLE_DATA_QUALITY_SCHEDULER=true            # Run nightly Neo4j data-quality job (off by default)
```

**WHAT THIS DOES:**
- Connects your app to Supabase (database + auth)
- Connects to Neo4j (knowledge graph)
- Enables Claude AI conversations
- Enables OCR and POI enrichment

---

### **STEP 3: Deploy to Vercel** (Recommended)

#### First Time Setup:
1. Go to https://vercel.com
2. Click "Add New Project"
3. Import your GitHub repository
4. Configure:
   - **Framework Preset:** Next.js
   - **Root Directory:** `./`
   - **Build Command:** `npm run build`
   - **Output Directory:** `.next`
5. Add all environment variables from Step 2
6. Click "Deploy"

#### Subsequent Deployments:
```bash
# From your terminal
git push origin main
```

Vercel will automatically:
- Detect the push
- Run `npm install`
- Run `npm run build`
- Deploy to production
- Give you a URL like: `https://lexa-worldmap-mvp.vercel.app`

**WHAT THIS DOES:**
- Builds your Next.js app
- Deploys to Vercel's CDN (fast worldwide)
- Gives you a production URL
- Auto-deploys on every git push

---

### **STEP 4: Verify Deployment** ✅

After deployment, test these pages:

#### User-Facing Pages:
1. **Homepage:** `https://your-app.vercel.app/`
2. **Sign Up:** `https://your-app.vercel.app/auth/signup`
3. **Sign In:** `https://your-app.vercel.app/auth/signin`
4. **Account Dashboard:** `https://your-app.vercel.app/account`
5. **LEXA Chat:** `https://your-app.vercel.app/app`

#### Admin Pages (Test with admin account):
1. **Admin Dashboard:** `https://your-app.vercel.app/admin/dashboard`
2. **Bug Reports:** `https://your-app.vercel.app/admin/bugs`
3. **Error Logs:** `https://your-app.vercel.app/admin/errors`

#### Captain Portal (Test with captain account):
1. **Captain Dashboard:** `https://your-app.vercel.app/captain`
2. **Upload & Manual Entry:** `https://your-app.vercel.app/captain/upload`
3. **Browse, Verify & Enhance:** `https://your-app.vercel.app/captain/browse`
   - Includes **Nuggets inbox** tab (sentence fragments/signals that need Captain review)
4. **Upload History:** `https://your-app.vercel.app/captain/history`
5. **Scraped URLs:** `https://your-app.vercel.app/captain/urls`
6. **Keyword Monitor:** `https://your-app.vercel.app/captain/keywords`

**WHAT TO CHECK:**
- All pages load without errors
- Authentication works (sign up, sign in, sign out)
- User can create account and see dashboard
- Admin can access admin tools
- Captain can access captain tools
- Database connections work
- No console errors

---

## 🔐 ACCESS CONTROL SETUP

### Admin Accounts (Chris, Paul, Bakary):
You need to manually set these users as admins in Supabase:

1. Go to Supabase Dashboard
2. Go to "Table Editor"
3. Open `lexa_user_profiles` table
4. Find rows for Chris, Paul, Bakary (by email)
5. Edit the row
6. Set `role` column to `'admin'`
7. Save

**Or run this SQL:**
```sql
UPDATE lexa_user_profiles 
SET role = 'admin' 
WHERE email IN ('chris@lexa.com', 'paul@lexa.com', 'bakary@lexa.com');
```

### Captain Accounts:
Set other team members as captains:
```sql
UPDATE lexa_user_profiles 
SET role = 'captain' 
WHERE email IN ('captain1@lexa.com', 'captain2@lexa.com');
```

**WHAT THIS DOES:**
- Grants admin access to Chris, Paul, Bakary
- Grants captain access to other team members
- Controls who can see Admin Dashboard vs Captain Portal
- Required for role-based page access

---

## 📊 MIGRATIONS TO RUN (In Order)

### Core User System:
```
001_lexa_schema.sql              → Base tables (lexa_sessions, lexa_messages)
002_lexa_user_profiles.sql       → User profiles with preferences
004_membership_tiers.sql         → Membership tiers and subscriptions
005_enhanced_user_profiles.sql   → Enhanced profile fields
006_conversation_summaries.sql   → AI-generated summaries
007_script_library.sql           → User script library
008_community_scripts.sql        → Community sharing
009_marketplace_prep.sql         → Marketplace (future)
010_add_script_metadata.sql      → Script metadata fields
```

### Admin/Captain System:
```
create_bug_reports.sql           → Bug reporting system
add_screenshot_data_to_bug_reports.sql → Bug screenshots
create_error_logs.sql            → Error logging
create_backlog_items.sql         → Development backlog
create_captain_profiles.sql      → Captain profiles
create_upload_tracking.sql       → Upload history tracking
20251220001_upload_tracking_indexes.sql → Performance indexes
20251227001_experience_graph_core.sql → Experience graph
021_knowledge_nuggets.sql        → Knowledge Nuggets inbox
022_experience_entities_geo_indexes.sql → Geo indexes for faster bbox queries
023_experience_entity_destination_links.sql → Destination membership + per-destination source pointers
024_extracted_pois_generated_source.sql → Idempotent import of generated POIs into extracted_pois
```

---

## 🎯 POST-DEPLOYMENT TASKS

### Immediate:
1. ✅ Test all authentication flows
2. ✅ Create test admin account
3. ✅ Create test captain account
4. ✅ Verify page access controls
5. ✅ Test user account features

### Phase 7 (Backend APIs):
- [ ] Implement file upload API
- [ ] Implement file processing (PDF, Word, Excel, OCR)
- [ ] Implement URL scraping API
- [ ] Implement POI CRUD APIs
- [ ] Implement keyword monitoring API
- [ ] Implement article discovery API

### Phase 8 (Database):
- [ ] Create captain-specific Supabase tables
- [ ] Set up Row Level Security (RLS) policies
- [ ] Create Neo4j constraints
- [ ] Set up cron job for 11 PM keyword scanning

---

## 🐛 TROUBLESHOOTING

### "Can't access admin dashboard"
- Check: Is your email set as admin in `lexa_user_profiles`?
- Fix: Run the admin SQL query in Step "Access Control Setup"

### "Migrations failed"
- Check: Are you running them in order?
- Check: Is there already data that conflicts?
- Fix: Drop and recreate tables if needed (development only!)

### "Build errors"
- Check: Did you run `npm install`?
- Check: Are environment variables set?
- Fix: Clear `.next` folder and rebuild

### "Pages not loading"
- Check: Are environment variables set in Vercel?
- Check: Did migrations run successfully?
- Fix: Check Vercel deployment logs

---

## 📞 SUPPORT

### Get Help:
- Check build logs: Vercel Dashboard → Deployments → Logs
- Check runtime logs: Vercel Dashboard → Functions → Logs
- Check database: Supabase Dashboard → Table Editor
- Check errors: Your app → `/admin/errors`

---

## 🎉 SUCCESS CHECKLIST

After deployment, you should be able to:
- ✅ Create new user accounts
- ✅ Sign in and see account dashboard
- ✅ View membership tier
- ✅ Access LEXA chat
- ✅ Create experience scripts
- ✅ View script library
- ✅ Report bugs (with screenshot upload)
- ✅ Access admin dashboard (if admin)
- ✅ Access captain portal (if captain)
- ✅ See collapsible account sections
- ✅ Click username to go to account
- ✅ Reset chat with save/delete option

---

## 📝 WHAT'S DEPLOYED

### Frontend (Complete):
- User authentication system
- Account dashboard with membership badges
- Experience script library
- Bug reporting with screenshots
- Legal disclaimers and terms page
- Multi-language support (8 languages)
- Mobile-responsive design
- Admin Dashboard (3 sections)
- Captain Portal (5 pages)

### Backend (Partial - Mock Data):
- User authentication (Supabase Auth) ✅
- Database schema (Supabase + Neo4j) ✅
- API routes (structures ready) ⚠️
- File processing (to implement) ❌
- URL scraping (to implement) ❌
- Keyword scanning (to implement) ❌

### Next Phase:
Continue with Phase 7 (Backend APIs) and Phase 8 (Database Migrations) to make Captain Portal fully functional with real data processing.

---

**🚀 You're ready to deploy! Let me know if you need help with any step!**
