# LEXA Admin Setup Guide

## Why You Lost Access

After implementing role-based access control (RBAC), the middleware now checks for a `captain_profiles` entry before allowing access to `/admin/*` routes.

**Before**: Anyone authenticated could access `/admin/*`  
**After**: Must have entry in `captain_profiles` table

## Quick Fix: Create Admin Accounts

### Option 1: Run SQL Script (FASTEST - 2 minutes)

1. Go to **Supabase Dashboard**
2. Navigate to **SQL Editor**
3. Open the file `scripts/create-admin-users.sql`
4. Copy the entire SQL script
5. Paste into Supabase SQL Editor
6. Click **Run**
7. Check the output - should show 3 admin users

**Done!** You can now sign in with any of these accounts:
- captain.paulbickley@gmail.com
- bakcooli@gmail.com
- chh@flyxlifestyle.com

Password for all: `Sycc8+8+2025#`

### Option 2: Manual Creation (5 minutes)

If the SQL script doesn't work, create each user manually:

#### For Each User:

1. **Create Auth User** (if not exists)
   - Go to **Authentication** → **Users**
   - Click **Add user** → **Create new user**
   - Enter email
   - Enter password: `Sycc8+8+2025#`
   - Uncheck "Send email confirmation"
   - Click **Create user**
   - **Copy the User ID** (UUID)

2. **Create Captain Profile**
   - Go to **Table Editor** → `captain_profiles`
   - Click **Insert** → **Insert row**
   - `user_id`: Paste the User ID from step 1
   - `display_name`: "Paul Bickley" (or respective name)
   - `role`: **admin** (type this exactly)
   - Leave other fields default
   - Click **Save**

Repeat for all 3 users.

---

## Verify Access

1. Sign out of current session
2. Go to `https://lexa-worldmap-mvp.vercel.app/auth/signin`
3. Sign in with one of the admin accounts
4. Navigate to `https://lexa-worldmap-mvp.vercel.app/admin/knowledge`
5. You should now have full access!

---

## Admin Accounts Created

| Name | Email | Role | Access |
|------|-------|------|--------|
| Paul Bickley | captain.paulbickley@gmail.com | admin | Full system |
| Bakary Coulibaly | bakcooli@gmail.com | admin | Full system |
| Christian Haack | chh@flyxlifestyle.com | admin | Full system |

All three accounts can:
- ✅ Access Captain's Knowledge Portal
- ✅ Upload and write knowledge
- ✅ Manage data quality
- ✅ Create new captain users
- ✅ View all analytics
- ✅ Full LEXA chat access

---

## Security Note

**After Testing**, consider:
1. Each admin changes their password via Settings (future feature)
2. Enable 2FA in Supabase for admin accounts
3. Rotate passwords every 90 days

**For Production**:
- Never commit passwords to code
- Use password reset links instead
- Require strong passwords (12+ chars, mixed case, numbers, symbols)

---

## Troubleshooting

### "Access Restricted" Error After Creating Profile

**Cause**: Browser cache or session not refreshed

**Fix**:
1. Sign out completely
2. Clear browser cache (Ctrl+Shift+Delete)
3. Sign in again
4. Should work now

### SQL Script Fails

**Error**: "permission denied" or "auth.users is read-only"

**Fix**: You need **service role** access to insert into `auth.users`. 

**Alternative**:
1. Create users via Supabase Dashboard (Authentication → Users)
2. Then manually create `captain_profiles` entries via Table Editor

### Cannot See captain_profiles Table

**Cause**: Table doesn't exist yet

**Fix**: Run the migration file:
```sql
-- Run the contents of:
-- supabase/migrations/create_captain_profiles.sql
```

---

## Next Steps After Setup

1. ✅ Sign in with one of the admin accounts
2. ✅ Test access to `/admin/knowledge`
3. ✅ Test creating a new captain user
4. ✅ Update your own password (security)
5. ✅ Start using the Knowledge Portal!

---

## Quick Test

```bash
# Test sign-in
curl -X POST https://lexa-worldmap-mvp.vercel.app/auth/signin \
  -H "Content-Type: application/json" \
  -d '{"email":"chh@flyxlifestyle.com","password":"Sycc8+8+2025#"}'

# Should return: { "success": true, ... }
```

You're all set! 🚀

