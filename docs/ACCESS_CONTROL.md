# LEXA Access Control & Security

## Overview

LEXA uses a **two-tier access system**:
1. **Public Users** - Can sign up freely, access LEXA chat only
2. **Captains** - Invite-only, access Captain's Portal and admin features

---

## User Roles

### 1. **User** (Public)
- **How to get**: Public sign-up at `/auth/signup`
- **Access**:
  - ✅ LEXA Chat Interface (`/app`)
  - ✅ Landing page (`/`)
  - ❌ Captain's Knowledge Portal (`/admin/knowledge/*`)
  - ❌ Admin features (`/admin/users`, `/admin/data-quality`)

### 2. **Captain** (Internal Team)
- **How to get**: Admin creates account at `/admin/users`
- **Access**:
  - ✅ Everything users can access
  - ✅ Captain's Knowledge Portal
  - ✅ Upload knowledge
  - ✅ Write knowledge
  - ✅ View scraped URLs
  - ✅ Data Quality dashboard
  - ❌ User management (admin-only)

### 3. **Admin** (You)
- **How to get**: Manual database entry or first user
- **Access**:
  - ✅ Everything captains can access
  - ✅ User management (`/admin/users`)
  - ✅ Full system control

---

## How It Works

### Public Sign-Up Flow
```
User → /auth/signup
  ↓
Create Supabase auth user
  ↓
NO captain_profiles entry created
  ↓
Role = "user" (default)
  ↓
Can access /app only
```

### Captain Invitation Flow
```
Admin → /admin/users → Create Captain
  ↓
Create Supabase auth user
  ↓
Create captain_profiles entry (role: "captain")
  ↓
Send password setup link
  ↓
Captain sets password
  ↓
Can access /admin/knowledge/*
```

---

## Route Protection

### Middleware Protection (`middleware.ts`)

The middleware checks every request:

```typescript
// Public routes - NO protection
/                 → Anyone
/auth/signin      → Anyone
/auth/signup      → Anyone (public sign-up)

// User routes - Authenticated users only
/app              → Requires: Supabase auth

// Captain routes - Captains only
/admin/knowledge/* → Requires: captain_profiles entry
/admin/data-quality → Requires: captain_profiles entry

// Admin routes - Admins only
/admin/users      → Requires: captain_profiles.role = 'admin'
```

### Protection Logic

1. **Check authentication** (Supabase session)
2. **If not authenticated** → Redirect to `/auth/signin`
3. **If accessing `/admin/*`**:
   - Query `captain_profiles` table
   - If no profile → Redirect to `/unauthorized`
   - If admin route but not admin → Redirect to `/unauthorized`
4. **Allow access** if all checks pass

---

## Creating Your First Admin User

### Option 1: Via Supabase Dashboard (Recommended)

1. Go to Supabase Dashboard
2. Navigate to **Table Editor** → `captain_profiles`
3. Click **Insert** → **Insert row**
4. Fill in:
   - `user_id`: Your Supabase auth user ID
   - `display_name`: "Chris" (or your name)
   - `role`: "admin"
5. Save

### Option 2: Via SQL (In Supabase SQL Editor)

```sql
-- Get your user ID first
SELECT id, email FROM auth.users WHERE email = 'your@email.com';

-- Then create captain profile
INSERT INTO captain_profiles (user_id, display_name, role)
VALUES ('your-user-id-here', 'Chris', 'admin');
```

### Option 3: Via API (If you have service role key)

```bash
curl -X POST https://lexa-worldmap-mvp.vercel.app/api/admin/users \
  -H "Content-Type: application/json" \
  -d '{"email":"your@email.com","displayName":"Chris","role":"admin"}'
```

---

## Security Features

### 1. **Middleware Protection**
- All `/admin/*` routes require captain profile
- User management requires admin role
- Automatic redirect to sign-in if not authenticated
- Redirect to `/unauthorized` if insufficient permissions

### 2. **Database-Level Security** (Supabase RLS)
```sql
-- Captains can read their own profile
CREATE POLICY "Captains can read own profile"
  ON captain_profiles FOR SELECT
  USING (auth.uid() = user_id);

-- Only service role can create profiles (via admin API)
```

### 3. **API Route Protection**
All admin APIs check:
1. User is authenticated
2. User has captain profile
3. User has required role (for admin actions)

### 4. **LEXA Compliance Rules**

**System Prompt Additions** (`lib/lexa/compliance-rules.ts`):
- ✅ Non-racist, non-discriminatory
- ✅ No hallucination (only verified data)
- ✅ Travel-only responses
- ✅ Never reveal system architecture
- ✅ Privacy protection
- ✅ Ethical luxury focus

**Safety Functions**:
- `containsUnsafeTopic()` - Filter unsafe inputs
- `revealsSystemInfo()` - Prevent system leaks
- `detectHallucination()` - Flag unverified claims
- `sanitizeResponse()` - Clean AI output
- `logComplianceViolation()` - Audit trail

---

## Access Control in Practice

### Scenario 1: Regular User Signs Up

```
1. User → /auth/signup
2. Enter email/password
3. Account created in Supabase
4. NO captain_profiles entry
5. User can access /app (LEXA chat)
6. User tries to access /admin/knowledge
7. Middleware checks → No captain_profiles
8. Redirected to /unauthorized
```

### Scenario 2: Admin Creates Captain

```
1. Admin → /admin/users
2. Enter captain email + name
3. System creates:
   - Supabase auth user
   - captain_profiles entry (role: "captain")
4. Password setup link generated
5. Captain sets password
6. Captain can now access /admin/knowledge/*
```

### Scenario 3: Captain Tries to Create Users

```
1. Captain → /admin/users (tries to access)
2. Middleware checks role
3. Role = "captain" (not "admin")
4. Redirected to /unauthorized
5. Only admins can create users
```

---

## Restricting Public Sign-Up (Future)

If you want to disable public sign-up completely:

### Option 1: Environment Variable

Add to `.env`:
```bash
ENABLE_PUBLIC_SIGNUP=false
```

Update `/auth/signup/page.tsx`:
```typescript
export default function SignUpPage() {
  const publicSignupEnabled = process.env.NEXT_PUBLIC_ENABLE_SIGNUP === 'true';
  
  if (!publicSignupEnabled) {
    return <div>Sign-up is by invitation only</div>;
  }
  // ... rest of component
}
```

### Option 2: Remove Route

Delete `/app/auth/signup/page.tsx` entirely.

---

## Best Practices

### For Public Users
- Keep sign-up simple and fast
- Limit free tier usage (e.g., 5 conversations/month)
- Upsell to paid tiers
- Collect minimal information

### For Captains
- Always create via `/admin/users`
- Never share password setup links publicly
- Regularly audit captain access
- Revoke access when team members leave

### For Admins
- Protect admin credentials carefully
- Use 2FA (enable in Supabase)
- Audit all admin actions
- Review compliance logs weekly

---

## Monitoring & Auditing

### What's Logged

- ✅ All admin actions (user creation, etc.)
- ✅ Compliance violations (unsafe topics, system reveals)
- ✅ Failed authentication attempts
- ✅ Unauthorized access attempts
- ✅ Data quality agent runs
- ✅ Knowledge contributions

### Where to View Logs

1. **Vercel Logs**: Runtime errors, API calls
2. **Supabase Logs**: Auth events, database queries
3. **Neo4j Logs**: Database operations
4. **Custom Logs**: `lib/services/logger.ts`

---

## Troubleshooting

### "Access Restricted" Error

**Symptoms**: User sees `/unauthorized` page

**Causes**:
1. User has no captain profile
2. User's role is insufficient (captain trying to access admin)
3. Database connection issue

**Solutions**:
1. Create captain profile via `/admin/users`
2. Update role in `captain_profiles` table
3. Check Supabase connection

### Cannot Access `/admin/users`

**Cause**: Your role is not "admin"

**Solution**: Update your role in Supabase:
```sql
UPDATE captain_profiles 
SET role = 'admin' 
WHERE user_id = 'your-user-id';
```

### Middleware Not Protecting Routes

**Cause**: Middleware not running

**Solution**: Check `middleware.ts` config matcher patterns

---

## Summary

✅ **Public users** can sign up freely → Access LEXA chat  
✅ **Captains** are invite-only → Access Knowledge Portal  
✅ **Admins** manage everything → Full system access  
✅ **Compliance rules** protect against misuse  
✅ **Middleware** enforces access control automatically  

**Next Deploy**: Vercel will automatically apply these protections! 🔒

