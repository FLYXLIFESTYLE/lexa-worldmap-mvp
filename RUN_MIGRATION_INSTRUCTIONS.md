# 🚀 Run Upload Tracking Migration

## Simple 3-Step Process

### **Step 1: Open Supabase SQL Editor**

1. Go to: https://supabase.com/dashboard
2. Select your project: **lexa-worldmap-mvp**
3. Click **"SQL Editor"** in left sidebar

---

### **Step 2: Copy Migration SQL**

Open this file and copy ALL contents:
```
supabase/migrations/create_upload_tracking.sql
```

---

### **Step 3: Run Migration**

1. Paste the SQL into the SQL Editor
2. Click **"Run"** button
3. Wait for success message

---

## ✅ Expected Result

You should see:
```
Success. No rows returned.
```

This means the table was created successfully!

---

## 🔍 Verify It Worked

Run this query in SQL Editor:

```sql
SELECT * FROM upload_tracking LIMIT 1;
```

**Expected:** "Success. No rows returned" (table exists, just empty)  
**Error:** "relation does not exist" (migration didn't run)

---

## ⏱️ Time Required

**~30 seconds**

---

## 🆘 If You Get Errors

**Error: "relation already exists"**
→ ✅ Good! Table already created, you're done.

**Error: "permission denied"**
→ ❌ Use service role key or run as admin

**Error: "syntax error"**
→ ❌ Make sure you copied the entire file

---

**After running this migration, the upload tracking system will be fully functional!**

