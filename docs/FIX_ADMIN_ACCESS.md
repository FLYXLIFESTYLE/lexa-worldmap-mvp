# Fix: Add Admin Captain Profile

## Problem
You're getting "Access Restricted" because the middleware checks for a `captain_profiles` entry, but your user doesn't have one yet.

## Solution
Run this SQL in your Supabase SQL Editor to add your admin profile.

## Step 1: Find Your User ID

Go to Supabase Dashboard → Authentication → Users, and copy your user's UUID.

## Step 2: Run This SQL

Replace `YOUR_USER_UUID_HERE` with your actual user UUID:

```sql
-- Add admin captain profile for your user
INSERT INTO captain_profiles (
  user_id,
  display_name,
  role,
  commission_rate
)
VALUES (
  'YOUR_USER_UUID_HERE'::uuid,  -- Replace with your user UUID
  'Admin',
  'admin',  -- This gives you full access
  0.00
)
ON CONFLICT (user_id) 
DO UPDATE SET 
  role = 'admin',
  display_name = 'Admin';

-- Verify it was created
SELECT 
  cp.display_name,
  cp.role,
  cp.created_at,
  u.email
FROM captain_profiles cp
JOIN auth.users u ON u.id = cp.user_id
WHERE cp.user_id = 'YOUR_USER_UUID_HERE'::uuid;
```

## Step 3: Log Out and Log Back In

After running the SQL:
1. Log out of LEXA
2. Log back in
3. You should now have access to all admin pages!

---

## Alternative: Quick Fix (If You Can't Find User UUID)

If you can't find your user UUID, run this to make the FIRST user an admin:

```sql
-- Make the first registered user an admin
INSERT INTO captain_profiles (
  user_id,
  display_name,
  role,
  commission_rate
)
SELECT 
  id,
  COALESCE(raw_user_meta_data->>'name', email) as display_name,
  'admin' as role,
  0.00 as commission_rate
FROM auth.users
ORDER BY created_at ASC
LIMIT 1
ON CONFLICT (user_id) 
DO UPDATE SET 
  role = 'admin';

-- Verify
SELECT 
  cp.display_name,
  cp.role,
  u.email,
  cp.created_at
FROM captain_profiles cp
JOIN auth.users u ON u.id = cp.user_id
WHERE cp.role = 'admin';
```

---

## What This Does

1. Creates a `captain_profiles` entry for your user
2. Sets `role = 'admin'` which gives you full access
3. The middleware will now recognize you as an admin

---

## After This Fix

You'll be able to access:
- ✅ All admin pages
- ✅ Upload yacht destinations
- ✅ Seed themes
- ✅ Knowledge portal
- ✅ User management
- ✅ Everything!

