# 🚀 QUICK TEST GUIDE - New Features

## ⚡ **READY TO TEST IMMEDIATELY**

---

## 1️⃣ **Run Supabase Migrations (REQUIRED)**

**Go to:** [Supabase Dashboard](https://supabase.com/dashboard) → Your Project → SQL Editor → New Query

**Run these 3 scripts in order:**

### **Script 1: Bug Reports**
```sql
-- Copy entire contents from:
supabase/migrations/create_bug_reports.sql
-- Paste and Run
```

### **Script 2: Error Logs**
```sql
-- Copy entire contents from:
supabase/migrations/create_error_logs.sql
-- Paste and Run
```

### **Script 3: Add Logging to Backlog**
```sql
-- Copy entire contents from:
SUPABASE_ADD_LOGGING.sql
-- Paste and Run
```

✅ **Done? Continue to testing!**

---

## 2️⃣ **Test Bug Reporting** (All Users)

### **Step 1: See the Button**
1. Visit **ANY page** on LEXA
2. Look at **bottom-right corner**
3. See **red floating button** with ⚠️ icon

### **Step 2: Submit a Bug**
1. Click the red button
2. Fill in:
   - **Title:** "Test Bug Report"
   - **Description:** "Just testing the system"
   - **Severity:** High
   - **Category:** UI
3. Click **"Submit Bug Report"**
4. See **success message** ✅

### **Step 3: View as Admin**
1. Go to **`/admin/bugs`**
2. See your test bug
3. Click **"▼ More"** to expand
4. Click **"✓ Resolve"**
5. Switch filter to **"Resolved"**
6. See bug moved to resolved section

✅ **Bug Reporting Working!**

---

## 3️⃣ **Test Error Logging** (Automatic)

### **Step 1: Trigger a Test Error**
1. Visit any page
2. Open **Browser Console** (F12)
3. Type: `throw new Error("Test Error - Please Ignore")`
4. Press Enter
5. Error is now logged!

### **Step 2: View in Admin**
1. Go to **`/admin/errors`**
2. See your test error
3. Check:
   - Error type: "Error"
   - Message: "Test Error - Please Ignore"
   - Occurrence count: 1
   - Page URL shown
4. Click **"▼ Stack"** to see stack trace
5. Click **"✓ Fixed"** to mark as resolved

### **Step 3: Test Auto-Deduplication**
1. Go back to browser console
2. Run same error again: `throw new Error("Test Error - Please Ignore")`
3. Refresh `/admin/errors`
4. See **occurrence count = 2** (not 2 separate errors)

✅ **Error Logging Working!**

---

## 4️⃣ **Test Online Users** (Admins Only)

### **Step 1: See Your Presence**
1. Sign in as **admin/captain**
2. Go to any admin page
3. Look **left of AdminNav dropdown** (top-right)
4. See green badge: **"🟢 1 online"**

### **Step 2: See Details**
1. **Hover** over the badge
2. See popup with:
   - "Online Admins (1)"
   - Your email
   - "Active now"

### **Step 3: Test Multiple Users** (Optional)
1. Open **incognito window**
2. Sign in as **different admin**
3. In original window, wait 15 seconds
4. See count change to **"🟢 2 online"**
5. Hover to see both users

✅ **Presence Tracking Working!**

---

## 5️⃣ **Test Dashboard Cards**

1. Go to **`/admin/dashboard`**
2. Scroll to **"Admin Tools"** section
3. See new cards:
   - **📋 Development Backlog**
     - "Track and manage all development tasks and priorities"
     - Features: Open/Resolved tracking, Priority management, Status tracking
   - **🐛 Bug Reports**
     - "User-reported bugs and issues requiring attention"
     - Features: Open/Resolved tickets, Severity levels, Auto-backlog integration
   - **⚠️ Error Logs**
     - "System errors and exceptions with auto-tracking"
     - Features: Auto-deduplication, Occurrence tracking, Stack traces
4. Click each card to navigate

✅ **Dashboard Cards Working!**

---

## 6️⃣ **Test Open/Resolved Filters**

### **Backlog:**
1. Go to **`/admin/backlog`**
2. Click filter buttons: **Pending**, **In Progress**, **Completed**, **All**
3. See items filter in real-time

### **Bug Reports:**
1. Go to **`/admin/bugs`**
2. Click filter buttons: **Open**, **Resolved**, **All**
3. See bugs filter by status

### **Error Logs:**
1. Go to **`/admin/errors`**
2. Click filter buttons: **Open**, **Resolved**, **All**
3. See errors filter by status

✅ **Filters Working!**

---

## 7️⃣ **Test Auto-Backlog Integration**

### **Critical Bug → Backlog:**
1. Report a **critical severity** bug (from floating button)
2. Go to **`/admin/backlog`**
3. See new backlog item: **"Bug: [Your Title]"**
4. Priority: **Critical**
5. Category: **bug**
6. Notes mention bug report ID

### **Frequent Error → Backlog:**
1. Trigger same error **10 times** in console:
   ```js
   for(let i=0; i<10; i++) {
     throw new Error("Frequent Test Error");
   }
   ```
2. Go to **`/admin/errors`**
3. See occurrence count: **10+**
4. Go to **`/admin/backlog`**
5. See new backlog item: **"Fix: Error"**
6. Priority: **High** or **Critical**
7. Notes mention error log ID

✅ **Auto-Integration Working!**

---

## 8️⃣ **Test AdminNav Entries**

1. Click **AdminNav dropdown** (top-right)
2. See all entries:
   - 📊 Admin Dashboard
   - 📚 Captain's Portal
   - 💬 ChatNeo4j
   - **📋 Backlog** ← NEW
   - **🐛 Bug Reports** ← NEW
   - **⚠️ Error Logs** ← NEW
   - 🗺️ Destinations
   - ✏️ POI Editor
   - 🌐 Scraped URLs
   - 📖 Documentation
   - 📝 Release Notes
3. Click each new entry to navigate

✅ **AdminNav Updated!**

---

## 🎉 **TESTING COMPLETE**

If all tests passed, you now have:

✅ Bug Reporting (All Users)  
✅ Error Logging (Automatic)  
✅ Online Presence (Real-time)  
✅ Dashboard Cards  
✅ Open/Resolved Filters  
✅ Auto-Backlog Integration  
✅ AdminNav Updated  
✅ Neo4j Dashboard Links  

---

## 📊 **WHERE TO FIND EVERYTHING**

| Feature | URL | Access |
|---------|-----|--------|
| Admin Dashboard | `/admin/dashboard` | Admins |
| Backlog | `/admin/backlog` | Admins |
| Bug Reports | `/admin/bugs` | Admins |
| Error Logs | `/admin/errors` | Admins |
| Bug Report Button | All pages (floating) | Everyone |
| Online Users | Top-right (left of menu) | Admins |
| Dashboard Cards | `/admin/dashboard` | Admins |

---

## 🐛 **IF SOMETHING DOESN'T WORK:**

### **"Floating button not showing"**
- Check: Is `BugReportButton` in `app/layout.tsx`?
- Clear cache and hard refresh (Ctrl+Shift+R)

### **"Can't see bugs/errors I submitted"**
- Check: Did you run Supabase migrations?
- Check browser console for API errors

### **"Online users not showing"**
- Check: Are you signed in as admin/captain?
- Wait 15-30 seconds for heartbeat
- Check `/api/admin/presence` endpoint

### **"Auto-backlog not working"**
- Check: Is bug severity Critical or High?
- Check: Is error occurrence count ≥ 10?
- Refresh `/admin/backlog` page

---

## 🆘 **TROUBLESHOOTING**

**Check Browser Console:**
```
F12 → Console → Look for errors
```

**Check Network Tab:**
```
F12 → Network → Filter by "Fetch/XHR"
Look for /api/bugs, /api/errors, /api/admin/presence
```

**Check Supabase:**
```sql
-- Verify tables exist
SELECT * FROM bug_reports LIMIT 1;
SELECT * FROM error_logs LIMIT 1;
SELECT * FROM backlog_items WHERE title LIKE '%Bug:%' OR title LIKE '%Fix:%';
```

---

## ✅ **CHECKLIST**

- [ ] Ran all 3 Supabase migrations
- [ ] Saw floating bug button
- [ ] Submitted test bug
- [ ] Viewed bug in `/admin/bugs`
- [ ] Triggered test error
- [ ] Viewed error in `/admin/errors`
- [ ] Saw online users indicator
- [ ] Saw new dashboard cards
- [ ] Tested Open/Resolved filters
- [ ] Verified auto-backlog integration
- [ ] Checked AdminNav dropdown

---

**Time Required:** ~10 minutes

**Difficulty:** Easy

**Result:** Fully tested system!

🎉 **Happy Testing!**

