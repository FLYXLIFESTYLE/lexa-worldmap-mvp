# 🔍 FIXED SQL - Check Table Structure First

## **Step 1: Find Out What Columns Exist**

Run this in Supabase SQL Editor:

```sql
-- Check what columns the lexa_user_profiles table actually has
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'lexa_user_profiles' 
ORDER BY ordinal_position;
```

This will show you the actual column names.

---

## **Step 2: Once You Know the Column Names, Run This**

Based on what Step 1 shows, the table might use `user_id` instead of `id`, or have a different structure. Here's a flexible query:

```sql
-- Try to find your user in auth.users
SELECT 
  'AUTH USER' as source,
  id,
  email,
  created_at
FROM auth.users 
WHERE email = 'chh@flyxlifestyle.com';

-- Show ALL columns from lexa_user_profiles for your email
SELECT 
  'PROFILE' as source,
  *
FROM lexa_user_profiles 
WHERE email = 'chh@flyxlifestyle.com';

-- Show ALL profiles (to see what exists)
SELECT 
  'ALL PROFILES' as source,
  *
FROM lexa_user_profiles 
ORDER BY created_at DESC
LIMIT 10;
```

---

## **Step 3: Tell Me What Step 1 Shows**

Once you run Step 1, tell me what columns appear. It will probably show something like:

```
column_name    | data_type
---------------|----------
user_id        | uuid
email          | text
role           | text
created_at     | timestamp
updated_at     | timestamp
...
```

Then I can give you the correct SQL to fix the admin access based on the actual column names!

---

## **Quick Alternative: Use Table Editor**

Instead of SQL, you can do this visually:

1. Go to Supabase Dashboard
2. Click "Table Editor" (left sidebar)
3. Find table: `lexa_user_profiles`
4. Look for row with email: `chh@flyxlifestyle.com`
5. If you see it:
   - Click the row to edit
   - Find the `role` column
   - Change it to: `admin`
   - Click Save
6. If you DON'T see it:
   - Click "Insert Row"
   - Fill in the email and role manually
   - Click Save

Then sign out and sign in again!

---

**Run Step 1 and tell me what columns you see! 🔍**
