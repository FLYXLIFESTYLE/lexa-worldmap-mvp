# Fix Supabase Email Confirmation - Production URL Setup

## Problem
Email confirmation links are pointing to `localhost` instead of `https://www.luxury-travel-designer.com`, preventing users from completing signup.

---

## Solution: Update Supabase Project Settings

### Step 1: Access Supabase Dashboard
1. Go to https://supabase.com/dashboard
2. Select your LEXA project
3. Navigate to **Authentication** → **URL Configuration**

---

### Step 2: Update Site URL
**Current (likely):** `http://localhost:3000`  
**Update to:** `https://www.luxury-travel-designer.com`

**Where to find:**
- Authentication → URL Configuration → **Site URL**

**What it does:**
- This is the default redirect URL for authentication
- Used as the base URL for email templates

---

### Step 3: Add Redirect URLs (Whitelist)
**Current (likely):** Only `http://localhost:3000/**` is whitelisted  
**Add these URLs:**

```
https://www.luxury-travel-designer.com/**
https://lexa-worldmap-mvp.vercel.app/**
http://localhost:3000/**
```

**Where to find:**
- Authentication → URL Configuration → **Redirect URLs**

**Important:**
- Use `**` wildcard to allow all subpaths
- Keep localhost for local development
- Add both your custom domain and Vercel domain
- Separate each URL with a comma or new line

---

### Step 4: Update Email Templates (Optional but Recommended)

**Navigate to:**
Authentication → Email Templates → **Confirm signup**

**Default template has:**
```html
{{ .ConfirmationURL }}
```

**This should work automatically**, but verify the template looks like this:

```html
<h2>Confirm your signup</h2>

<p>Follow this link to confirm your account:</p>
<p><a href="{{ .ConfirmationURL }}">Confirm your email address</a></p>

<p>Or copy and paste this URL into your browser:</p>
<p>{{ .ConfirmationURL }}</p>
```

---

### Step 5: Update Auth Email Sender (Recommended)

**Navigate to:**
Authentication → Email Templates → Settings

**Update:**
1. **Sender email:** Set to your custom email (e.g., `hello@luxury-travel-designer.com`)
2. **Sender name:** `LEXA`

**Why:**
- Currently emails come from `noreply@mail.app.supabase.io`
- Custom sender email looks more professional
- Improves email deliverability

**Requirements:**
- Must verify domain ownership (SPF/DKIM records)
- Or use SendGrid/AWS SES integration

---

### Step 6: Verify Environment Variables

Check your Vercel environment variables:

**Required:**
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

**Verify in Vercel:**
1. Go to https://vercel.com
2. Select your project
3. Settings → Environment Variables
4. Make sure all three are set for **Production**

---

### Step 7: Force Re-deploy on Vercel

After updating Supabase settings:

1. Go to Vercel dashboard
2. Select your LEXA project
3. Click **Deployments**
4. Find the latest deployment
5. Click **⋯** (three dots) → **Redeploy**
6. Select **Use existing Build Cache: No**
7. Click **Redeploy**

---

## Testing the Fix

### 1. Test Signup Flow
1. Open **incognito/private window**
2. Go to https://www.luxury-travel-designer.com
3. Click **Begin Your Journey**
4. Fill out signup form with a **real email** (one you have access to)
5. Submit the form

### 2. Check Email
- **Subject:** Should be "Confirm Your Signup" or similar
- **Sender:** Should be from Supabase (or your custom email if configured)
- **Link:** Should start with `https://www.luxury-travel-designer.com/auth/callback?...`

**NOT:**
- ❌ `http://localhost:3000/auth/callback`

### 3. Click Confirmation Link
- Should redirect to your production site
- Should show success message
- Should auto-redirect to `/experience` page

---

## Quick Fix: Disable Email Confirmation (Not Recommended)

If you need immediate access for testing, you can temporarily disable email confirmation:

**Supabase Dashboard:**
1. Authentication → Providers → Email
2. Toggle **Confirm email** to OFF
3. Save

**Warning:** This allows anyone to create accounts without verification. Only use for testing!

---

## Alternative: Resend Verification Email

If a user already signed up with localhost link:

**Option A: Via Supabase Dashboard**
1. Authentication → Users
2. Find the user
3. Click **...** → **Resend email verification**

**Option B: Via Code (we can add this feature)**
Create a `/auth/resend-verification` page with button to trigger:
```typescript
const { error } = await supabase.auth.resend({
  type: 'signup',
  email: userEmail
});
```

---

## Expected Email Format (After Fix)

```
From: LEXA <hello@luxury-travel-designer.com>
Subject: Confirm your signup

Hi there,

Thank you for signing up for LEXA!

Follow this link to confirm your account:
[Confirm your email address]
(https://www.luxury-travel-designer.com/auth/callback?token=...)

Or copy and paste this URL into your browser:
https://www.luxury-travel-designer.com/auth/callback?token=...

If you didn't sign up for LEXA, you can safely ignore this email.

Best regards,
The LEXA Team
```

---

## Troubleshooting

### Issue: Still receiving localhost links
**Solution:** Clear browser cache and cookies, or test in incognito mode

### Issue: Email not arriving
**Check:**
1. Spam/junk folder
2. Supabase email rate limits (5 emails per hour during development)
3. Email provider blocking Supabase emails

### Issue: "Invalid redirect URL" error
**Solution:** Make sure you added the exact URL with `**` wildcard to Supabase redirect URLs

### Issue: Confirmation link expired
**Solution:**
- Links expire after 24 hours
- Request new verification email
- Or temporarily disable email confirmation

---

## Summary of Changes Needed in Supabase

1. ✅ **Site URL:** `https://www.luxury-travel-designer.com`
2. ✅ **Redirect URLs:** Add production domain with `/**`
3. ✅ **Email sender:** Update to custom email (optional)
4. ✅ **Email template:** Verify uses `{{ .ConfirmationURL }}`

**No code changes needed!** The app already uses `window.location.origin` which automatically detects the production domain.

---

## Let Me Know

After making these changes in Supabase:
1. Tell me when you've updated the settings
2. I can help test the signup flow
3. Or we can add a "Resend verification email" feature if needed

**Want me to create a resend verification page for users who already signed up with localhost links?**

