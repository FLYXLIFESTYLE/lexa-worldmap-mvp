# 🔍 DEBUG: Check Actual Database State

Run this in Supabase SQL Editor to see what's **actually** in your database:

```sql
-- ============================================
-- STEP 1: Check if user exists in auth.users
-- ============================================
SELECT 
  id,
  email,
  created_at,
  last_sign_in_at,
  '✅ User exists in auth' as status
FROM auth.users 
WHERE email = 'chh@flyxlifestyle.com';

-- If this returns EMPTY, the user doesn't exist yet!
-- You need to sign up first.

-- ============================================
-- STEP 2: Check if profile exists
-- ============================================
SELECT 
  id,
  email,
  role,
  created_at,
  CASE 
    WHEN role = 'admin' THEN '✅ Has admin role'
    WHEN role = 'captain' THEN '⚠️ Has captain role (not admin)'
    WHEN role IS NULL THEN '❌ Role is NULL'
    ELSE '❌ Role is: ' || role
  END as status
FROM lexa_user_profiles 
WHERE email = 'chh@flyxlifestyle.com';

-- If this returns EMPTY, profile doesn't exist!

-- ============================================
-- STEP 3: Show ALL profiles (to see what emails DO exist)
-- ============================================
SELECT 
  email,
  role,
  created_at
FROM lexa_user_profiles
ORDER BY created_at DESC
LIMIT 20;

-- This shows you all accounts that exist

-- ============================================
-- STEP 4: FIX - Create profile if missing
-- ============================================
-- Run this ONLY if Step 2 was empty:

INSERT INTO lexa_user_profiles (id, email, role, created_at, updated_at)
SELECT 
  au.id,
  au.email,
  'admin' as role,
  NOW(),
  NOW()
FROM auth.users au
WHERE au.email = 'chh@flyxlifestyle.com'
ON CONFLICT (id) DO UPDATE
SET role = 'admin', updated_at = NOW();

-- ============================================
-- STEP 5: FIX - Update role if it exists but wrong
-- ============================================
-- Run this if Step 2 showed the profile but role was wrong:

UPDATE lexa_user_profiles 
SET role = 'admin', updated_at = NOW()
WHERE email = 'chh@flyxlifestyle.com';

-- ============================================
-- STEP 6: VERIFY - Check again
-- ============================================
SELECT 
  lup.email,
  lup.role,
  au.id as user_id,
  CASE 
    WHEN lup.role = 'admin' THEN '✅ ADMIN ACCESS GRANTED'
    ELSE '❌ STILL NO ACCESS'
  END as final_status
FROM lexa_user_profiles lup
JOIN auth.users au ON lup.id = au.id
WHERE lup.email = 'chh@flyxlifestyle.com';
```

---

## **What to Do:**

### **Run Steps 1-3 First**
This will show you:
- Does the email exist in `auth.users`? (Did you sign up?)
- Does the profile exist in `lexa_user_profiles`?
- What other emails DO exist?

### **Then Run Step 4 or 5**
- **If Step 2 was empty:** Run Step 4 (creates profile)
- **If Step 2 showed profile but wrong role:** Run Step 5 (fixes role)

### **Then Run Step 6**
Should show: `✅ ADMIN ACCESS GRANTED`

### **Then Sign Out & Sign In Again**
1. Go to: `https://lexa-worldmap-mvp.vercel.app/`
2. Sign out
3. Sign in with `chh@flyxlifestyle.com`
4. Try accessing Captain Portal again

---

## **Possible Issue: Email Doesn't Exist**

If Step 1 returns **EMPTY**, it means:
- You haven't signed up with `chh@flyxlifestyle.com` yet
- You're signed in with a DIFFERENT email

**Solution:**
1. Sign out completely
2. Go to: `https://lexa-worldmap-mvp.vercel.app/auth/signup`
3. Sign up with `chh@flyxlifestyle.com`
4. Then run the SQL to grant admin
5. Then try Captain Portal

---

## **Copy-Paste This Quick Fix**

If you just want to fix ALL your team emails at once:

```sql
-- Grant admin to ALL team members (creates if missing, updates if exists)
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

-- Verify it worked
SELECT email, role FROM lexa_user_profiles 
WHERE email IN (
  'chh@flyxlifestyle.com',
  'captain.paulbickley@gmail.com',
  'bakcooli@gmail.com'
)
ORDER BY email;
```

**Should show:**
```
email                          | role
-------------------------------|-------
bakcooli@gmail.com             | admin
captain.paulbickley@gmail.com  | admin
chh@flyxlifestyle.com          | admin
```

---

**Run this and tell me what Step 1, 2, and 3 show!**
