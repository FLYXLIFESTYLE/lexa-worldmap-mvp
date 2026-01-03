# ✅ FIXES DEPLOYED + DIAGNOSTIC SQL

## **1. "LEXA Demo Chat" Button Removed** ✅

The button has been removed from the unauthorized page. After Vercel redeploys (1-2 minutes), you'll only see:
- "Sign In to Access Admin" (if not signed in)
- "Return to Home"

---

## **2. Access Issue - Run This Diagnostic**

Copy this **entire SQL block** into Supabase SQL Editor and click **Run**:

```sql
-- ============================================
-- DIAGNOSTIC: Find out WHY access is denied
-- ============================================

-- Step 1: Does the email exist in auth.users?
SELECT 
  'STEP 1: Auth User Check' as step,
  id,
  email,
  created_at,
  last_sign_in_at,
  CASE 
    WHEN id IS NOT NULL THEN '✅ User exists in auth'
    ELSE '❌ User does NOT exist'
  END as result
FROM auth.users 
WHERE email = 'chh@flyxlifestyle.com';

-- Step 2: Does the profile exist?
SELECT 
  'STEP 2: Profile Check' as step,
  id,
  email,
  role,
  created_at,
  CASE 
    WHEN role = 'admin' THEN '✅ Has admin role'
    WHEN role = 'captain' THEN '⚠️ Has captain role only'
    WHEN role IS NULL THEN '❌ Role is NULL'
    WHEN id IS NULL THEN '❌ Profile does NOT exist'
    ELSE '❌ Role is: ' || COALESCE(role, 'NULL')
  END as result
FROM lexa_user_profiles 
WHERE email = 'chh@flyxlifestyle.com';

-- Step 3: What emails DO exist?
SELECT 
  'STEP 3: All Existing Emails' as step,
  lup.email,
  lup.role,
  au.last_sign_in_at,
  CASE 
    WHEN lup.role = 'admin' THEN '✅ Admin'
    WHEN lup.role = 'captain' THEN '⚠️ Captain'
    ELSE '❌ ' || COALESCE(lup.role, 'NULL')
  END as status
FROM lexa_user_profiles lup
LEFT JOIN auth.users au ON lup.id = au.id
ORDER BY lup.created_at DESC
LIMIT 20;
```

---

## **What the Results Mean:**

### **If STEP 1 is EMPTY:**
❌ The email `chh@flyxlifestyle.com` has **never signed up**!

**FIX:**
1. Go to: `https://lexa-worldmap-mvp.vercel.app/auth/signup`
2. Sign up with `chh@flyxlifestyle.com`
3. Then come back and run the FIX SQL below

---

### **If STEP 2 is EMPTY:**
❌ The user exists but has **no profile**!

**FIX:** Run this:
```sql
-- Create profile with admin role
INSERT INTO lexa_user_profiles (id, email, role, created_at, updated_at)
SELECT 
  au.id,
  au.email,
  'admin',
  NOW(),
  NOW()
FROM auth.users au
WHERE au.email = 'chh@flyxlifestyle.com';

-- Verify
SELECT email, role FROM lexa_user_profiles WHERE email = 'chh@flyxlifestyle.com';
```

---

### **If STEP 2 shows role = NULL or role != 'admin':**
❌ Profile exists but **wrong role**!

**FIX:** Run this:
```sql
-- Update role to admin
UPDATE lexa_user_profiles 
SET role = 'admin', updated_at = NOW()
WHERE email = 'chh@flyxlifestyle.com';

-- Verify
SELECT email, role FROM lexa_user_profiles WHERE email = 'chh@flyxlifestyle.com';
```

---

### **If STEP 2 shows role = 'admin':**
✅ Database is correct! The issue is **session cache**.

**FIX:**
1. **Hard refresh** the unauthorized page: `Ctrl + Shift + R` (Windows) or `Cmd + Shift + R` (Mac)
2. Or clear browser cookies for `lexa-worldmap-mvp.vercel.app`
3. Sign out completely
4. Close browser
5. Open browser again
6. Sign in with `chh@flyxlifestyle.com`
7. Try Captain Portal again

---

## **Quick Fix for ALL Team Members**

If you want to fix all 3 emails at once:

```sql
-- Grant admin to all team members (creates or updates)
INSERT INTO lexa_user_profiles (id, email, role, created_at, updated_at)
SELECT 
  au.id,
  au.email,
  'admin',
  NOW(),
  NOW()
FROM auth.users au
WHERE au.email IN (
  'chh@flyxlifestyle.com',
  'captain.paulbickley@gmail.com',
  'bakcooli@gmail.com'
)
ON CONFLICT (id) DO UPDATE
SET role = 'admin', updated_at = NOW();

-- Verify
SELECT 
  email,
  role,
  CASE 
    WHEN role = 'admin' THEN '✅ ADMIN'
    ELSE '❌ ' || COALESCE(role, 'NULL')
  END as status
FROM lexa_user_profiles 
WHERE email IN (
  'chh@flyxlifestyle.com',
  'captain.paulbickley@gmail.com',
  'bakcooli@gmail.com'
)
ORDER BY email;
```

**Expected result:**
```
email                          | role  | status
-------------------------------|-------|--------
bakcooli@gmail.com             | admin | ✅ ADMIN
captain.paulbickley@gmail.com  | admin | ✅ ADMIN
chh@flyxlifestyle.com          | admin | ✅ ADMIN
```

---

## **After Running SQL:**

1. **Sign out completely** from Vercel app
2. **Close browser**
3. **Open browser again**
4. Go to: `https://lexa-worldmap-mvp.vercel.app/auth/signin`
5. Sign in with: `chh@flyxlifestyle.com`
6. Try: `https://lexa-worldmap-mvp.vercel.app/captain/upload`
7. ✅ **Should work!**

---

## **Still Not Working?**

If it STILL doesn't work after all this, check:

### **Check Middleware Logs:**
The middleware might be logging errors. Check browser console (F12):
1. Go to unauthorized page
2. Press F12
3. Go to "Console" tab
4. Look for errors mentioning "captain", "profile", or "role"

### **Check Network Tab:**
1. Press F12
2. Go to "Network" tab
3. Reload the page
4. Look for any failed requests
5. Click on failed requests to see error details

---

**Run the diagnostic SQL and tell me what STEP 1, 2, and 3 show! 🔍**
