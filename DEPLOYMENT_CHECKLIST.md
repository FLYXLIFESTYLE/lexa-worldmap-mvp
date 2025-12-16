# Deployment Checklist - Captain's Knowledge Portal

Quick checklist for deploying to production.

---

## Pre-Deployment

- [ ] Code is committed to Git
- [ ] `.env.local` is NOT committed (check `.gitignore`)
- [ ] Build works locally: `npm run build`
- [ ] No linting errors: `npm run lint`
- [ ] All tests pass (if any)

---

## GitHub Setup

- [ ] Repository created on GitHub
- [ ] Code pushed to GitHub
- [ ] Repository is public or private (as needed)
- [ ] README.md is up to date

---

## Vercel Setup

- [ ] Vercel account created
- [ ] GitHub connected to Vercel
- [ ] Project imported from GitHub
- [ ] Framework preset: Next.js
- [ ] Root directory: `./`

### Environment Variables (ALL REQUIRED)

- [ ] `NEXT_PUBLIC_SUPABASE_URL`
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] `SUPABASE_SERVICE_ROLE_KEY`
- [ ] `ANTHROPIC_API_KEY`
- [ ] `NEO4J_URI`
- [ ] `NEO4J_USER`
- [ ] `NEO4J_PASSWORD`
- [ ] `NEXT_PUBLIC_SITE_URL` (update after first deploy)
- [ ] `GOOGLE_PLACES_API_KEY` (optional)

---

## Supabase Setup

- [ ] Supabase project created
- [ ] Migration `001_lexa_schema.sql` run
- [ ] Migration `create_captain_profiles.sql` run
- [ ] Storage bucket `public` created
- [ ] Storage bucket is **public**
- [ ] Email templates configured
- [ ] Redirect URLs updated to production domain

---

## Neo4j Setup

- [ ] Neo4j Aura instance created
- [ ] Database credentials saved
- [ ] Firewall allows Vercel IPs (or all IPs for testing)
- [ ] Connection tested locally

---

## First Deployment

- [ ] Click "Deploy" in Vercel
- [ ] Build completes successfully
- [ ] Note the Vercel URL (e.g., `https://lexa-worldmap-mvp.vercel.app`)
- [ ] Update `NEXT_PUBLIC_SITE_URL` in Vercel
- [ ] Redeploy

---

## Post-Deployment Testing

### Public Routes

- [ ] Landing page loads: `/`
- [ ] Sign in page: `/auth/signin`
- [ ] Sign up page: `/auth/signup`

### Protected Routes (after sign-in)

- [ ] Knowledge Portal: `/admin/knowledge`
- [ ] Upload page: `/admin/knowledge/upload`
- [ ] Editor page: `/admin/knowledge/editor`
- [ ] User management: `/admin/users`

### Features

- [ ] File upload works
- [ ] Manual knowledge entry works
- [ ] URL scraping works
- [ ] Photo upload works
- [ ] User creation works
- [ ] Password reset works

### API Endpoints

- [ ] `/api/captain/profile` (requires auth)
- [ ] `/api/knowledge/upload` (requires auth)
- [ ] `/api/knowledge/create` (requires auth)
- [ ] `/api/admin/users` (requires auth)

---

## First Admin User

- [ ] Sign up with admin email
- [ ] Verify email received
- [ ] Create captain profile (via SQL or UI)
- [ ] Sign in successfully
- [ ] Access admin routes

---

## Custom Domain (Optional)

- [ ] Domain added in Vercel
- [ ] DNS configured correctly
- [ ] SSL certificate active
- [ ] `NEXT_PUBLIC_SITE_URL` updated
- [ ] Supabase redirect URLs updated
- [ ] Redeployed

---

## Monitoring

- [ ] Vercel Analytics enabled (optional)
- [ ] Error tracking set up (optional)
- [ ] Logs accessible
- [ ] Alerts configured (optional)

---

## Security

- [ ] No secrets in code
- [ ] No secrets in git history
- [ ] Environment variables set in Vercel
- [ ] RLS policies enabled
- [ ] Admin routes protected
- [ ] HTTPS enabled (automatic in Vercel)

---

## Documentation

- [ ] README.md updated
- [ ] Deployment guide created
- [ ] Environment variables documented
- [ ] API endpoints documented
- [ ] Troubleshooting guide available

---

## Final Steps

- [ ] Share production URL with team
- [ ] Test with real users
- [ ] Monitor for errors
- [ ] Set up backups (Supabase, Neo4j)
- [ ] Document any issues

---

**Deployment Date:** ___________  
**Deployed By:** ___________  
**Production URL:** ___________  
**Status:** ⬜ Not Started | ⬜ In Progress | ⬜ Complete

