# 🔧 COMPLETE SQL FIX - Grant Admin Access to All Team Members

## **Run This in Supabase SQL Editor**

Copy and paste this **complete script** into Supabase SQL Editor and click **Run**:

```sql
-- ============================================
-- GRANT ADMIN ACCESS TO ALL TEAM MEMBERS
-- ============================================

-- Step 1: Check which users exist in auth.users
SELECT 
  id, 
  email, 
  created_at,
  'auth.users' as source
FROM auth.users 
WHERE email IN (
  'chh@flyxlifestyle.com',
  'chi@flyxlifestyle.com',  -- In case this is also you
  'captain.paulbickley@gmail.com',
  'bakcooli@gmail.com'
)
ORDER BY email;

-- Step 2: Check existing profiles in lexa_user_profiles
SELECT 
  id, 
  email, 
  role,
  created_at,
  'lexa_user_profiles' as source
FROM lexa_user_profiles 
WHERE email IN (
  'chh@flyxlifestyle.com',
  'chi@flyxlifestyle.com',
  'captain.paulbickley@gmail.com',
  'bakcooli@gmail.com'
)
ORDER BY email;

-- Step 3: Create profiles for users that don't have one yet
-- This will only insert if the profile doesn't exist (ON CONFLICT DO NOTHING)
INSERT INTO lexa_user_profiles (id, email, role, created_at, updated_at)
SELECT 
  au.id,
  au.email,
  'admin' as role,
  NOW() as created_at,
  NOW() as updated_at
FROM auth.users au
WHERE au.email IN (
  'chh@flyxlifestyle.com',
  'chi@flyxlifestyle.com',
  'captain.paulbickley@gmail.com',
  'bakcooli@gmail.com'
)
ON CONFLICT (id) DO NOTHING;

-- Step 4: Update ALL existing profiles to have admin role
UPDATE lexa_user_profiles 
SET 
  role = 'admin',
  updated_at = NOW()
WHERE email IN (
  'chh@flyxlifestyle.com',
  'chi@flyxlifestyle.com',
  'captain.paulbickley@gmail.com',
  'bakcooli@gmail.com'
);

-- Step 5: Verify the results
SELECT 
  lup.id,
  lup.email,
  lup.role,
  au.email as auth_email,
  CASE 
    WHEN lup.role = 'admin' THEN '✅ Admin Access'
    WHEN lup.role = 'captain' THEN '⚠️ Captain Only'
    ELSE '❌ No Access'
  END as status
FROM lexa_user_profiles lup
LEFT JOIN auth.users au ON lup.id = au.id
WHERE lup.email IN (
  'chh@flyxlifestyle.com',
  'chi@flyxlifestyle.com',
  'captain.paulbickley@gmail.com',
  'bakcooli@gmail.com'
)
ORDER BY lup.email;
```

---

## **What This Script Does:**

1. **Step 1:** Shows which users exist in `auth.users` (the authentication table)
2. **Step 2:** Shows which profiles exist in `lexa_user_profiles` (the profile table)
3. **Step 3:** Creates missing profiles (if any) with `admin` role
4. **Step 4:** Updates existing profiles to have `admin` role
5. **Step 5:** Shows final results with ✅ status

---

## **After Running the SQL:**

### **1. Check the Results**
Look at the final table from Step 5. You should see:
```
email                           | role  | status
--------------------------------|-------|----------------
chh@flyxlifestyle.com           | admin | ✅ Admin Access
captain.paulbickley@gmail.com   | admin | ✅ Admin Access
bakcooli@gmail.com              | admin | ✅ Admin Access
```

### **2. Sign Out & Sign In Again**
1. Click the red button: **"Sign Out & Sign In Again"**
2. Sign in with: `chh@flyxlifestyle.com` (or whichever account you're using)
3. Password: (your password)

### **3. Test Access**
Go to: `https://lexa-worldmap-mvp.vercel.app/captain/upload`

✅ **Should work now!**

---

## **If It Still Doesn't Work:**

### **Possibility 1: You're signed in with a different email**

Run this to see which email is actually signed in:
```sql
-- Show ALL users and their roles
SELECT 
  id,
  email,
  role,
  created_at
FROM lexa_user_profiles
ORDER BY created_at DESC
LIMIT 10;
```

Look for the email that matches what you see on the "Access Restricted" page.

### **Possibility 2: Profile doesn't exist at all**

If the user appears in `auth.users` but NOT in `lexa_user_profiles`, run this:

```sql
-- Get the user ID first
SELECT id, email FROM auth.users 
WHERE email = 'chh@flyxlifestyle.com';  -- Replace with actual email

-- Then create the profile (replace YOUR_USER_ID with the ID from above)
INSERT INTO lexa_user_profiles (id, email, role, created_at, updated_at)
VALUES (
  'YOUR_USER_ID',  -- Replace this!
  'chh@flyxlifestyle.com',  -- Replace this!
  'admin',
  NOW(),
  NOW()
);
```

---

## **Debug: Which Email Are You Actually Using?**

The screenshot shows you're signed in as `chi@flyxlifestyle.com`, but you said the admin is `chh@flyxlifestyle.com`.

**Two options:**

### **Option A: Change the signed-in account**
1. Sign out from `chi@flyxlifestyle.com`
2. Sign in with `chh@flyxlifestyle.com`
3. Try accessing Captain Portal again

### **Option B: Grant admin to the current account**
If you want to use `chi@flyxlifestyle.com`, run:
```sql
UPDATE lexa_user_profiles 
SET role = 'admin'
WHERE email = 'chi@flyxlifestyle.com';
```

---

## **Quick Test Commands**

After running the main script, test with:

```bash
# Check if backend is awake
curl https://lexa-worldmap-mvp-rlss.onrender.com/health

# Test from browser
https://lexa-worldmap-mvp.vercel.app/captain/upload
```

---

**Run the SQL script above, then sign out/in and try again! Let me know what you see in Step 5 (the final results table)! 🚀**
