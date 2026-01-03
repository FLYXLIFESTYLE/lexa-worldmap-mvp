# 🔐 GRANT CAPTAIN ACCESS - Quick Fix

## **Problem**
Your account (`chi@flyxlifestyle.com`) doesn't have the `captain` or `admin` role in the database yet.

## **Solution**

### **Step 1: Go to Supabase Dashboard**
1. Open: https://supabase.com/dashboard
2. Click on your project: `lexa-worldmap-mvp`
3. Click "SQL Editor" in the left sidebar

### **Step 2: Run This SQL**

Copy and paste this into the SQL Editor:

```sql
-- Check if your profile exists
SELECT id, email, role FROM lexa_user_profiles 
WHERE email = 'chi@flyxlifestyle.com';
```

Click **Run**.

---

### **Step 3: Grant Captain Role**

#### **If the profile exists (you see a row):**
Run this:
```sql
UPDATE lexa_user_profiles 
SET role = 'admin' 
WHERE email = 'chi@flyxlifestyle.com';
```

#### **If no profile exists (empty result):**
Run this:
```sql
-- First, get your user ID from auth.users
SELECT id, email FROM auth.users 
WHERE email = 'chi@flyxlifestyle.com';

-- Then insert a profile with that ID
-- Replace 'your-user-id-here' with the ID from above
INSERT INTO lexa_user_profiles (id, email, role, created_at, updated_at)
VALUES (
  'your-user-id-here',  -- Replace with actual user ID
  'chi@flyxlifestyle.com',
  'admin',
  NOW(),
  NOW()
);
```

---

### **Step 4: Sign Out & Sign In Again**

1. Click the red button: **"Sign Out & Sign In Again"**
2. Sign in again with your credentials
3. Try accessing `/captain/upload` again
4. ✅ Should work now!

---

## **Alternative: SQL Script to Grant Admin to All Team Members**

If you want to grant access to Chris, Paul, and Bakary all at once:

```sql
-- Grant admin role to all team members
UPDATE lexa_user_profiles 
SET role = 'admin' 
WHERE email IN (
  'chi@flyxlifestyle.com',
  'chris@flyxlifestyle.com',
  'paul@flyxlifestyle.com',
  'bakary@flyxlifestyle.com'
);

-- Check the results
SELECT id, email, role FROM lexa_user_profiles 
WHERE email IN (
  'chi@flyxlifestyle.com',
  'chris@flyxlifestyle.com',
  'paul@flyxlifestyle.com',
  'bakary@flyxlifestyle.com'
);
```

---

## **Why This Happened**

The middleware I just added checks for the `role` column in `lexa_user_profiles`:

```typescript
const { data: profile } = await supabase
  .from('lexa_user_profiles')
  .select('role')
  .eq('id', user.id)
  .maybeSingle();

if (!profile || (profile.role !== 'captain' && profile.role !== 'admin')) {
  // Access denied
}
```

Your account exists in `auth.users` (that's why you can sign in), but the `role` field in `lexa_user_profiles` is either:
- Not set (NULL)
- Set to 'user' (default)

Setting it to `'admin'` or `'captain'` will grant access.

---

## **Quick Test After Fixing**

1. Run the SQL to grant admin role
2. Sign out and sign in again
3. Go to: `https://lexa-worldmap-mvp.vercel.app/captain/upload`
4. ✅ Should see the upload page!
5. Upload a file to test

---

**Let me know once you've run the SQL and I'll help you test the upload!** 🚀
