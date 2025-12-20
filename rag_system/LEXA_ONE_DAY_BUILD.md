# 🚀 LEXA MVP - COMPLETE ONE-DAY BUILD GUIDE

## 📋 Quick Overview

**Goal:** Working LEXA MVP in 12 hours (1 working day)  
**Status:** Backend ✅ Complete | Frontend ⏳ Ready to build  
**Pitch:** Mind-blowing demo for investor pitch contest

---

## ✅ What's Already Done (Backend)

1. ✅ AIlessia emotional intelligence system
2. ✅ Neo4j graph database (French Riviera = 247 luxury POIs ready)
3. ✅ Weighted archetype calculation (6D personality matching)
4. ✅ POI recommendation engine
5. ✅ Experience script generation
6. ✅ PDF export system
7. ✅ Client profile tracking
8. ✅ All API endpoints tested and working

**Backend is running:** `http://localhost:8000`

---

## 🎯 What You're Building Tomorrow (Frontend)

A beautiful, mobile-first web app with:

1. **Landing Page** - Hero with BETA badge
2. **Account Creation** - With affiliate explanation
3. **3-Step Builder** - Destination/Theme/Time selection
4. **AIlessia Chat** - Emotional conversation with quick actions
5. **Script Preview** - Polished experience script display
6. **PDF Download** - Export the final script

---

## ⚡ The ONE-DAY Schedule

```
08:00 - 10:00  Setup & Foundation (Next.js + Shadcn)
10:00 - 12:00  Landing + Account Creation
12:00 - 14:00  3-Step Experience Builder
14:00 - 16:00  AIlessia Chat Interface
16:00 - 18:00  Script Preview + PDF Download
18:00 - 20:00  Polish, Debug & Deploy to Vercel
```

---

## 📁 Key Files You'll Create

```
lexa-mvp/
├── app/
│   ├── page.tsx                    # Landing
│   ├── layout.tsx                  # Root layout with BETA badge
│   ├── onboarding/page.tsx         # Account creation
│   ├── experience/
│   │   ├── page.tsx                # 3-step builder
│   │   └── chat/page.tsx           # AIlessia conversation
│   └── preview/page.tsx            # Script preview
├── components/ui/                  # Shadcn components (auto-generated)
├── lib/
│   ├── api.ts                      # API client
│   └── storage.ts                  # LocalStorage helper
└── styles/globals.css              # Global styles
```

**Total:** ~7 core files (plus auto-generated Shadcn components)

---

## 🚀 Step-by-Step Tomorrow Morning

### **Step 1: Setup (30 min)**

```bash
# Create project (say YES to all)
npx create-next-app@latest lexa-mvp --typescript --tailwind --app

cd lexa-mvp

# Install dependencies
npm install zustand axios date-fns lucide-react

# Setup Shadcn (say YES to defaults)
npx shadcn-ui@latest init

# Add UI components
npx shadcn-ui@latest add button card input textarea badge calendar dialog alert
```

### **Step 2: Copy Code Templates (5 min)**

Open `rag_system/ONE_DAY_CODE_TEMPLATES.md` and copy-paste:

1. ✅ `styles/globals.css`
2. ✅ `app/layout.tsx`
3. ✅ `app/page.tsx`
4. ✅ `app/onboarding/page.tsx`
5. ✅ `app/experience/page.tsx`
6. ✅ `app/experience/chat/page.tsx`
7. ✅ `app/preview/page.tsx`

Then copy `lib/api.ts` from `rag_system/FRONTEND_API_CLIENT.md`

### **Step 3: Configure Environment (2 min)**

Create `.env.local`:

```bash
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### **Step 4: Start Development (1 min)**

```bash
npm run dev
```

Open `http://localhost:3000` - you should see the landing page!

### **Step 5: Test the Flow (15 min)**

Make sure your **backend is running** (`uvicorn api.main:app` in `rag_system/`), then:

1. ✅ Click "Begin Your Journey"
2. ✅ Create account (test@example.com)
3. ✅ Select French Riviera + Romantic Escape
4. ✅ Chat with AIlessia
5. ✅ See script preview

### **Step 6: Polish (2-3 hours)**

- Add loading states
- Improve error handling
- Test on mobile (Chrome DevTools)
- Adjust colors/spacing
- Add transitions (optional)

### **Step 7: Deploy to Vercel (30 min)**

```bash
# Push to GitHub
git init
git add .
git commit -m "LEXA MVP - Ready for pitch"
git push origin main

# Deploy on Vercel dashboard
# - Connect GitHub repo
# - Add environment variable: NEXT_PUBLIC_API_URL
# - Deploy!
```

---

## 🎨 Design Guidelines

### Colors (already in `globals.css`)

- **Primary:** Dark blue (`#1c2d47`) - Elegance
- **Secondary:** Gold (`#d4af37`) - Luxury
- **Accent:** Soft purple (`#9b7fb5`) - AIlessia's presence
- **Background:** Slate gray (`#f8fafc`) - Modern, clean

### Fonts

- **Headings:** Playfair Display (serif) - Classic luxury
- **Body:** Inter (sans-serif) - Modern readability

### Spacing

- Use Tailwind's spacing scale (`p-4`, `mb-6`, etc.)
- Keep max-width: `max-w-4xl` for content
- Mobile-first: Test on 375px width

### Interactions

- Hover effects on cards (`hover:shadow-lg`)
- Quick action buttons always visible
- Loading states with spinners
- Smooth scrolling (`scroll-behavior: smooth`)

---

## 🧪 Testing Checklist

Before deploying, test:

```
□ Landing page loads
□ Account creation works (creates account in backend)
□ 3-step builder saves selections
□ Chat sends messages to backend
□ Chat displays AIlessia responses
□ Quick action buttons work
□ Script preview generates
□ Page is mobile-responsive (test in Chrome DevTools)
□ All links work
□ BETA badge shows on all pages
```

---

## 🎯 What Makes This MVP "Mind-Blowing"

1. **Emotional Intelligence** - AIlessia feels different from chatbots
2. **Instant Personalization** - Archetype matching in real-time
3. **Beautiful Design** - Luxury aesthetic, not generic SaaS
4. **Working End-to-End** - From conversation to PDF script
5. **Real Data** - 247 luxury POIs in French Riviera, not mockups
6. **Smart Recommendations** - Based on 6D personality matching

---

## 📊 Pitch Deck Highlights

When presenting:

1. **Show the conversation** - How AIlessia understands emotions
2. **Reveal the script** - Cinematic hook + signature highlights
3. **Explain the backend** - Neo4j graph, 6D matching, 200k+ POIs
4. **Emphasize the vision** - Cruise lines, yacht charter, luxury brands
5. **Call to action** - Beta signup for feedback

---

## 🚨 Common Issues & Fixes

### Issue: API calls fail with CORS error
**Fix:** Add CORS middleware to backend (already done!)

### Issue: Calendar component doesn't show
**Fix:** Run `npx shadcn-ui@latest add calendar` again

### Issue: Build fails with TypeScript errors
**Fix:** Add `// @ts-ignore` above errors for MVP speed

### Issue: LocalStorage undefined on server
**Fix:** Wrap with `if (typeof window !== 'undefined')`

### Issue: Vercel deployment fails
**Fix:** Check you added `NEXT_PUBLIC_API_URL` in Vercel dashboard

---

## 🎉 You're Ready!

Everything you need is in these files:

1. `ONE_DAY_SPRINT_PLAN.md` - The schedule
2. `ONE_DAY_CODE_TEMPLATES.md` - All code (copy-paste)
3. `FRONTEND_API_CLIENT.md` - API integration
4. `LEXA_ONE_DAY_BUILD.md` - This file (overview)

**Tomorrow morning:**
1. ☕ Make coffee
2. 📁 Open `ONE_DAY_CODE_TEMPLATES.md`
3. 🚀 Start copying!

**Good luck! You've got this! 💪**

---

## 🆘 Emergency Contact

If something breaks:

1. Check backend is running: `http://localhost:8000/docs`
2. Check browser console for errors (F12)
3. Test API directly with Swagger UI docs
4. Restart both frontend and backend
5. Clear localStorage: `localStorage.clear()`

---

**Built with ❤️ by AIlessia's developer team**

