# ✅ VERIFICATION & TESTING GUIDE

## **Step-by-Step: Verify Admin Access is Working**

### **1. Check SQL Results**

After running the SQL script, you should see a table in Step 5 showing:

```
email                           | role  | status
--------------------------------|-------|----------------
bakcooli@gmail.com              | admin | ✅ Admin Access
captain.paulbickley@gmail.com   | admin | ✅ Admin Access
chh@flyxlifestyle.com           | admin | ✅ Admin Access
chi@flyxlifestyle.com           | admin | ✅ Admin Access
```

✅ **If you see this** → All accounts have admin access!

---

### **2. Sign Out & Sign In**

**On the "Access Restricted" page:**
1. Click the red button: **"Sign Out & Sign In Again"**
2. You'll be redirected to sign-in page
3. Sign in with your credentials:
   - Email: `chh@flyxlifestyle.com` (or whichever you prefer)
   - Password: (your password)

---

### **3. Test Captain Portal Access**

After signing in, you should be automatically redirected to:
```
https://lexa-worldmap-mvp.vercel.app/captain/upload
```

**What you should see:**
- ✅ Upload page with drag & drop zone
- ✅ Four tabs: Upload Files | Scrape URLs | Manual Entry | Yacht Destinations
- ✅ Admin dropdown menu in top right
- ✅ No more "Access Restricted" message

---

## **4. Test File Upload**

Now let's test if the upload actually works:

### **Step A: Prepare a Test File**
Use any of these:
- PDF document
- Word document (.docx)
- Excel file (.xlsx)
- Text file (.txt)
- Image (.jpg, .png)

Or use the file you tried earlier: `Itinerary - Wellness.docx`

### **Step B: Upload the File**

1. **Drag & drop** the file onto the blue dashed box, OR
2. **Click** the box to select a file
3. **Or paste** a screenshot directly (Ctrl+V)

### **Step C: Watch for Processing**

You should see:
1. File appears in "Uploaded Files (1)" section
2. Status shows: **"processing"** (blue text)
3. Confidence: **0%**

### **Step D: Wait for Completion**

**⚠️ IMPORTANT:** If this is the first request after a while, the backend might be sleeping (Render free tier). This is normal!

**What might happen:**
- **Best case:** Processing completes in 10-30 seconds
- **If backend is sleeping:** You'll see "processing" for ~30-60 seconds while backend wakes up

**Be patient!** The first request after inactivity takes longer.

### **Step E: Success!**

When processing completes, you should see:
```
✅ Itinerary - Wellness.docx uploaded successfully!
Status: completed
Confidence: 80%
POIs found: 5
Experiences: 2
Trends: 1
Insights: 3
```

---

## **5. Test Other Features**

### **Test URL Scraping:**
1. Click the **"🌐 Scrape URLs"** tab
2. Enter a URL: `https://www.superyachttimes.com/` (or any yacht-related site)
3. Check "Scrape subpages" (optional)
4. Click **"Start Scraping"**
5. Wait for results

### **Test Manual Entry:**
1. Click the **"✏️ Manual Entry"** tab
2. Fill in POI details manually
3. Click **"Save POI"**

### **Test Yacht Destinations:**
1. Click the **"⛵ Yacht Destinations"** tab
2. Upload an image with text (OCR will extract it)
3. Click **"Extract & Save"**

---

## **6. Access Other Captain Portal Pages**

### **Navigate to:**
- **Captain Dashboard:** `https://lexa-worldmap-mvp.vercel.app/captain`
- **Browse & Verify:** `https://lexa-worldmap-mvp.vercel.app/captain/browse`
- **Upload History:** `https://lexa-worldmap-mvp.vercel.app/captain/history`
- **Scraped URLs:** `https://lexa-worldmap-mvp.vercel.app/captain/urls`
- **Keyword Monitor:** `https://lexa-worldmap-mvp.vercel.app/captain/keywords`

All should load without "Access Restricted" error!

---

## **7. Access Admin Dashboard**

### **Navigate to:**
```
https://lexa-worldmap-mvp.vercel.app/admin/dashboard
```

You should see:
- **Section 1:** Statistics (platform overview)
- **Section 2:** Active Tools (captain portal link, bug reports, etc.)
- **Section 3:** Inactive/Development Tools (future features)

---

## **Troubleshooting**

### **Problem 1: Still Getting "Access Restricted"**

**Check this in Supabase:**
```sql
-- See what role your current email has
SELECT email, role FROM lexa_user_profiles 
WHERE email = 'chh@flyxlifestyle.com';  -- Use your actual email
```

**Should show:**
```
email                  | role
-----------------------|-------
chh@flyxlifestyle.com  | admin
```

**If it doesn't show `admin`**, run:
```sql
UPDATE lexa_user_profiles 
SET role = 'admin' 
WHERE email = 'chh@flyxlifestyle.com';  -- Use your actual email
```

Then sign out and sign in again.

---

### **Problem 2: Upload Stays at "Processing" Forever**

**Cause:** Backend is sleeping (Render free tier)

**Solution:** Wait 60 seconds, then:
1. Refresh the page
2. Try uploading again
3. Second upload should be faster

**To wake up backend manually:**
```
Open in new tab: https://lexa-worldmap-mvp-rlss.onrender.com/health
Wait for response (30-60 seconds)
Then try upload again
```

---

### **Problem 3: Upload Fails with Error**

**Check backend logs:**
1. Go to: https://dashboard.render.com
2. Click on your service: `lexa-worldmap-mvp`
3. Click "Logs" tab
4. Look for errors when you upload

**Common errors:**
- `ANTHROPIC_API_KEY not set` → Need to add environment variable
- `SUPABASE_URL not set` → Need to add environment variable
- `500 Internal Server Error` → Check logs for details

---

## **Environment Variables Check**

If upload fails, verify these are set in Render:

### **Go to Render Dashboard:**
```
https://dashboard.render.com
→ lexa-worldmap-mvp service
→ Environment tab
```

### **Required variables:**
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
ANTHROPIC_API_KEY=your-claude-api-key
```

### **Optional but recommended:**
```
GOOGLE_VISION_API_KEY=your-google-vision-key  # For OCR
GOOGLE_PLACES_API_KEY=your-places-key         # For POI enrichment
```

---

## **Success Checklist**

Check off each item as you test:

- [ ] SQL script ran successfully
- [ ] Step 5 showed all emails with "✅ Admin Access"
- [ ] Signed out and signed in again
- [ ] Can access `/captain/upload` without "Access Restricted"
- [ ] Can see upload form with drag & drop
- [ ] Uploaded a test file
- [ ] File status changed to "processing"
- [ ] File status changed to "completed"
- [ ] See extracted data (POIs, experiences, trends)
- [ ] Can access `/captain` dashboard
- [ ] Can access `/admin/dashboard`
- [ ] All team members can sign in and access

---

## **Next Steps After Successful Upload**

Once upload is working:

### **Phase C: Complete Remaining Features**
1. **Browse & Verify** - POI management (edit, verify, promote)
2. **Upload History** - Personal upload tracking
3. **Scraped URLs** - Shared URL management
4. **Keyword Monitor** - Daily article scanning

### **Phase D: Production Enhancements**
1. Set up daily cron job (keyword scanning at 11 PM)
2. Add error monitoring (Sentry)
3. Add progress indicators
4. Add bulk upload
5. Add CSV/JSON export

---

## **Current Status**

✅ **Frontend:** Fully deployed on Vercel
✅ **Backend:** Deployed on Render with all APIs
✅ **Database:** All migrations run
✅ **Auth:** Role-based access control working
✅ **CORS:** Configured for production
⏳ **Testing:** Waiting for your confirmation!

---

**Let me know:**
1. Did the SQL show all accounts with "✅ Admin Access"?
2. Can you access `/captain/upload` now?
3. Did the file upload work?
4. Any errors you see?

**I'm here to help troubleshoot! 🚀**
