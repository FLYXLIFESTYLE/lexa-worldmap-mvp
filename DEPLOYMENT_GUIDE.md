# Deployment Guide - Captain's Knowledge Portal

Complete guide for deploying LEXA's Captain's Knowledge Portal to production via GitHub and Vercel.

---

## Prerequisites

Before deploying, ensure you have:

1. ✅ **GitHub Account** - [github.com](https://github.com)
2. ✅ **Vercel Account** - [vercel.com](https://vercel.com) (free tier works)
3. ✅ **Supabase Project** - [supabase.com](https://supabase.com)
4. ✅ **Neo4j Database** - [neo4j.com/cloud](https://neo4j.com/cloud) (Aura free tier works)
5. ✅ **Anthropic API Key** - [console.anthropic.com](https://console.anthropic.com)

---

## Step 1: Prepare Your Code

### 1.1 Commit All Changes

```bash
# Check what files have changed
git status

# Add all files
git add .

# Commit with a descriptive message
git commit -m "feat: Captain's Knowledge Portal with commission tracking"

# Push to GitHub
git push origin main
```

**Important:** Make sure `.env.local` and `.env` are in `.gitignore` (they should be by default).

### 1.2 Verify Build Works Locally

```bash
# Test the production build
npm run build

# If build succeeds, you're ready to deploy!
```

---

## Step 2: Set Up GitHub Repository

### 2.1 Create Repository (if not exists)

1. Go to [github.com/new](https://github.com/new)
2. Repository name: `lexa-worldmap-mvp` (or your preferred name)
3. Description: "LEXA - Luxury Experience Agent with Captain's Knowledge Portal"
4. Choose **Public** or **Private**
5. **Don't** initialize with README (you already have one)
6. Click **Create repository**

### 2.2 Push Code to GitHub

```bash
# If you haven't initialized git yet
git init

# Add remote (replace YOUR_USERNAME with your GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/lexa-worldmap-mvp.git

# Push to GitHub
git branch -M main
git push -u origin main
```

---

## Step 3: Deploy to Vercel

### 3.1 Connect GitHub to Vercel

1. Go to [vercel.com](https://vercel.com)
2. Sign in with GitHub
3. Click **"Add New..."** → **"Project"**
4. Import your repository: `lexa-worldmap-mvp`
5. Click **"Import"**

### 3.2 Configure Project Settings

**Framework Preset:** Next.js (auto-detected)

**Root Directory:** `./` (leave as default)

**Build Command:** `npm run build` (auto-detected)

**Output Directory:** `.next` (auto-detected)

**Install Command:** `npm install` (auto-detected)

### 3.3 Add Environment Variables

**CRITICAL:** Add all these environment variables in Vercel before deploying:

Click **"Environment Variables"** and add:

#### Required Variables:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Anthropic Claude
ANTHROPIC_API_KEY=sk-ant-api03-...

# Neo4j
NEO4J_URI=neo4j+s://your-instance.databases.neo4j.io
NEO4J_USER=neo4j
NEO4J_PASSWORD=your-neo4j-password

# Site URL (IMPORTANT: Update after first deploy!)
NEXT_PUBLIC_SITE_URL=https://your-project.vercel.app
```

#### Optional Variables:

```env
# Google Places API (optional, for POI enrichment)
GOOGLE_PLACES_API_KEY=your-google-places-key
```

**Important Notes:**
- `NEXT_PUBLIC_*` variables are exposed to the browser
- `SUPABASE_SERVICE_ROLE_KEY` is server-side only (keep secret!)
- `NEXT_PUBLIC_SITE_URL` - After first deploy, Vercel will give you a URL. Update this variable and redeploy.

### 3.4 Deploy

1. Click **"Deploy"**
2. Wait for build to complete (2-5 minutes)
3. Vercel will give you a URL like: `https://lexa-worldmap-mvp.vercel.app`

### 3.5 Update Site URL and Redeploy

After first deployment:

1. Copy your Vercel URL (e.g., `https://lexa-worldmap-mvp.vercel.app`)
2. Go to **Settings** → **Environment Variables**
3. Update `NEXT_PUBLIC_SITE_URL` to your Vercel URL
4. Click **"Redeploy"** (or push a new commit)

---

## Step 4: Set Up Supabase

### 4.1 Run Database Migrations

1. Go to your Supabase Dashboard
2. Navigate to **SQL Editor**
3. Run the migrations in order:

**First Migration:**
```sql
-- Copy and paste contents of:
-- supabase/migrations/001_lexa_schema.sql
```

**Second Migration (Captain Portal):**
```sql
-- Copy and paste contents of:
-- supabase/migrations/create_captain_profiles.sql
```

### 4.2 Set Up Storage Bucket

1. Go to **Storage** in Supabase Dashboard
2. Click **"New bucket"**
3. Name: `public`
4. **Make it public** (toggle "Public bucket")
5. Click **"Create bucket"**

### 4.3 Configure Email (for password resets)

1. Go to **Settings** → **Auth**
2. Under **Email Templates**, customize the "Reset Password" template
3. Update the redirect URL to: `https://your-domain.vercel.app/auth/set-password`
4. Save changes

---

## Step 5: Verify Deployment

### 5.1 Test Public Routes

Visit your Vercel URL and test:

- ✅ Landing page loads: `https://your-domain.vercel.app`
- ✅ Sign in page: `https://your-domain.vercel.app/auth/signin`
- ✅ Sign up page: `https://your-domain.vercel.app/auth/signup`

### 5.2 Test Admin Routes (after sign-in)

- ✅ Knowledge Portal: `https://your-domain.vercel.app/admin/knowledge`
- ✅ Upload page: `https://your-domain.vercel.app/admin/knowledge/upload`
- ✅ Editor page: `https://your-domain.vercel.app/admin/knowledge/editor`
- ✅ User management: `https://your-domain.vercel.app/admin/users`

### 5.3 Test API Endpoints

```bash
# Test profile endpoint (requires auth)
curl https://your-domain.vercel.app/api/captain/profile

# Should return 401 (unauthorized) or profile data if authenticated
```

---

## Step 6: Set Up Custom Domain (Optional)

### 6.1 Add Domain in Vercel

1. Go to **Settings** → **Domains**
2. Enter your domain: `captain.lexa.com` (or your domain)
3. Follow DNS configuration instructions
4. Wait for DNS propagation (5-30 minutes)

### 6.2 Update Environment Variables

After custom domain is active:

1. Update `NEXT_PUBLIC_SITE_URL` to your custom domain
2. Update Supabase email redirect URLs
3. Redeploy

---

## Step 7: Create First Admin User

### 7.1 Sign Up First User

1. Go to your deployed site
2. Click **"Sign Up"**
3. Create an account with your admin email
4. Verify email (check Supabase dashboard if needed)

### 7.2 Create Captain Profile

**Option A: Via Supabase SQL Editor**

```sql
-- Replace 'your-user-id' with the UUID from auth.users table
INSERT INTO captain_profiles (user_id, display_name, role, commission_rate)
VALUES (
  'your-user-id-from-auth-users',
  'Admin User',
  'internal',
  0.00
);
```

**Option B: Via Admin UI** (after implementing admin check)

1. Sign in as admin
2. Go to `/admin/users`
3. Create captain user via UI

---

## Troubleshooting

### Build Fails

**Error: "Module not found"**
- Check all dependencies are in `package.json`
- Run `npm install` locally and commit `package-lock.json`

**Error: "Environment variable missing"**
- Verify all required env vars are set in Vercel
- Check variable names match exactly (case-sensitive)

### Runtime Errors

**Error: "Neo4j connection failed"**
- Verify `NEO4J_URI`, `NEO4J_USER`, `NEO4J_PASSWORD` are correct
- Check Neo4j Aura firewall allows Vercel IPs (or allow all IPs for testing)

**Error: "Supabase auth error"**
- Verify `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Check Supabase project is active
- Verify RLS policies are set correctly

**Error: "Failed to upload photo"**
- Verify Supabase Storage bucket `public` exists
- Check bucket is set to public
- Verify `SUPABASE_SERVICE_ROLE_KEY` is set

### Email Not Sending

**Password reset emails not received:**
- Check Supabase email settings
- Verify `NEXT_PUBLIC_SITE_URL` is correct
- Check spam folder
- Verify email template redirect URL

---

## Post-Deployment Checklist

- [ ] All environment variables set in Vercel
- [ ] Database migrations run in Supabase
- [ ] Storage bucket `public` created and public
- [ ] First admin user created
- [ ] Test file upload works
- [ ] Test manual knowledge entry works
- [ ] Test URL scraping works
- [ ] Test photo upload works
- [ ] Test user creation flow
- [ ] Test password reset flow
- [ ] Custom domain configured (if applicable)
- [ ] Email templates updated with production URL
- [ ] Monitoring set up (optional: Vercel Analytics)

---

## Continuous Deployment

Once connected to GitHub, Vercel will automatically:

- ✅ Deploy on every push to `main` branch
- ✅ Create preview deployments for pull requests
- ✅ Run builds automatically
- ✅ Update environment variables (requires manual redeploy)

### Workflow

1. Make changes locally
2. Test with `npm run dev`
3. Commit and push to GitHub
4. Vercel automatically deploys
5. Check deployment status in Vercel dashboard

---

## Security Checklist

- [ ] `SUPABASE_SERVICE_ROLE_KEY` is **never** exposed to client
- [ ] `NEO4J_PASSWORD` is server-side only
- [ ] `ANTHROPIC_API_KEY` is server-side only
- [ ] RLS policies enabled in Supabase
- [ ] Admin routes protected by middleware
- [ ] No secrets in code or git history
- [ ] Environment variables set in Vercel (not hardcoded)

---

## Monitoring & Analytics

### Vercel Analytics (Optional)

1. Go to **Settings** → **Analytics**
2. Enable Vercel Analytics (free tier available)
3. View real-time traffic and performance

### Error Tracking (Optional)

Consider adding:
- **Sentry** for error tracking
- **LogRocket** for session replay
- **Vercel Logs** for serverless function logs

---

## Rollback Plan

If something goes wrong:

1. Go to Vercel Dashboard → **Deployments**
2. Find last working deployment
3. Click **"..."** → **"Promote to Production"**
4. Fix issues and redeploy

---

## Support

**Common Issues:**
- Check Vercel deployment logs
- Check Supabase logs
- Review browser console errors
- Verify environment variables

**Resources:**
- [Vercel Docs](https://vercel.com/docs)
- [Supabase Docs](https://supabase.com/docs)
- [Next.js Deployment](https://nextjs.org/docs/deployment)

---

**Deployment Date:** ___________  
**Deployed By:** ___________  
**Production URL:** ___________  
**Status:** ✅ Ready for Production

