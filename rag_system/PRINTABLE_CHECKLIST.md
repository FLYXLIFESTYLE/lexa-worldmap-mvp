# ✅ LEXA MVP - PRINTABLE CHECKLIST

Print this and check off as you build! 📋

---

## 🌅 MORNING SESSION (8:00 AM - 12:00 PM)

### ☐ Hour 1: Setup (8:00 - 9:00)
```
☐ Create Next.js project
  npx create-next-app@latest lexa-mvp --typescript --tailwind --app

☐ Install dependencies
  npm install zustand axios date-fns lucide-react

☐ Setup Shadcn
  npx shadcn-ui@latest init

☐ Add UI components
  npx shadcn-ui@latest add button card input textarea badge calendar dialog alert

☐ Create .env.local file
  NEXT_PUBLIC_API_URL=http://localhost:8000

☐ Start dev server
  npm run dev

☐ Verify http://localhost:3000 works
```

### ☐ Hour 2: Foundation Files (9:00 - 10:00)
```
☐ Copy globals.css from ONE_DAY_CODE_TEMPLATES.md
☐ Copy app/layout.tsx (with BETA badge)
☐ Test: Verify BETA badge shows in top-right
```

### ☐ Hour 3: Landing Page (10:00 - 11:00)
```
☐ Copy app/page.tsx
☐ Test: Open http://localhost:3000
☐ Verify: Hero text displays
☐ Verify: "Begin Your Journey" button shows
☐ Verify: Clicking button redirects (even if 404 for now)
```

### ☐ Hour 4: Account Creation (11:00 - 12:00)
```
☐ Create app/onboarding/ folder
☐ Copy app/onboarding/page.tsx
☐ Copy lib/api.ts from FRONTEND_API_CLIENT.md
☐ Start backend (in rag_system/): uvicorn api.main:app
☐ Test: Fill form and submit
☐ Verify: Account created (check browser console for IDs)
☐ Verify: Redirects to /experience
```

**☕ LUNCH BREAK (12:00 - 12:30)**

---

## ☀️ AFTERNOON SESSION (12:30 PM - 6:00 PM)

### ☐ Hour 5: 3-Step Builder (12:30 - 2:00)
```
☐ Create app/experience/ folder
☐ Copy app/experience/page.tsx
☐ Test: Destination cards clickable
☐ Test: Theme cards clickable
☐ Test: Calendar date selection works
☐ Test: "Continue" button enabled only when ≥1 selected
☐ Verify: Clicking Continue saves to localStorage
☐ Verify: Redirects to /experience/chat
```

### ☐ Hour 6-7: Chat Interface (2:00 - 4:00)
```
☐ Create app/experience/chat/ folder
☐ Copy app/experience/chat/page.tsx
☐ Verify: AIlessia greeting shows on load
☐ Test: Type message and send
☐ Verify: Message appears in chat
☐ Verify: AIlessia responds (check backend logs)
☐ Test: Quick action buttons work
☐ Test: Chat auto-scrolls to bottom
☐ Test: Enter key sends message
☐ Test: Shift+Enter creates new line
☐ Verify: After 6+ messages, AIlessia offers script
```

### ☐ Hour 8: Script Preview (4:00 - 5:00)
```
☐ Create app/preview/ folder
☐ Copy app/preview/page.tsx
☐ Test: Navigate to /preview
☐ Verify: Loading spinner shows
☐ Verify: Script generates (check backend)
☐ Verify: Title displays
☐ Verify: Cinematic hook displays
☐ Verify: Emotional arc displays
☐ Verify: "Download PDF" button shows
```

### ☐ Hour 9: Polish & Debug (5:00 - 6:00)
```
☐ Test complete flow from start to finish
☐ Fix any console errors
☐ Test on mobile view (Chrome DevTools, 375px)
☐ Add missing loading states
☐ Check all pages have BETA badge
☐ Verify all buttons have hover effects
☐ Test with different inputs (edge cases)
```

---

## 🌙 EVENING SESSION (6:00 PM - 8:00 PM)

### ☐ Hour 10: Pre-Deploy Checks (6:00 - 7:00)
```
☐ Run production build locally
  npm run build
  npm start

☐ Test production build works
☐ Fix any build errors
☐ Update API URL for production (if deploying backend too)
☐ Create GitHub repository
  git init
  git add .
  git commit -m "LEXA MVP - Ready for pitch"
  git remote add origin YOUR_REPO_URL
  git push -u origin main
```

### ☐ Hour 11: Deploy to Vercel (7:00 - 8:00)
```
☐ Go to vercel.com
☐ Click "New Project"
☐ Import GitHub repository
☐ Add environment variable:
  NEXT_PUBLIC_API_URL = YOUR_BACKEND_URL

☐ Deploy
☐ Wait for deployment to finish
☐ Open production URL
☐ Test complete flow on production
☐ Test on actual mobile phone
☐ Fix any production issues
```

---

## 🎯 FINAL VALIDATION

### ☐ Complete User Flow Test
```
☐ Open production URL on phone
☐ Create account with real email
☐ Select French Riviera
☐ Select Romantic Escape theme
☐ Choose a date
☐ Chat with AIlessia (at least 6 messages)
☐ View script preview
☐ Verify everything looks beautiful
☐ Share link with 2-3 friends for feedback
```

### ☐ Pitch Preparation
```
☐ Bookmark production URL
☐ Create demo account (demo@lexa.com)
☐ Prepare conversation flow for demo
☐ Screenshot key moments:
  - Landing page
  - 3-step builder
  - AIlessia conversation
  - Final script

☐ Test demo flow 3 times (practice makes perfect!)
```

---

## 🚨 TROUBLESHOOTING (If Needed)

### If API calls fail:
```
☐ Check backend is running (localhost:8000)
☐ Check .env.local has correct API URL
☐ Check browser console for CORS errors
☐ Restart both frontend and backend
```

### If build fails:
```
☐ Check all imports are correct
☐ Check Shadcn components are installed
☐ Run: npm install (in case of missing deps)
☐ Check for TypeScript errors (add // @ts-ignore if needed)
```

### If Vercel deploy fails:
```
☐ Check GitHub repo is pushed
☐ Check environment variable is set in Vercel
☐ Check build logs in Vercel dashboard
☐ Try manual deploy from CLI: vercel --prod
```

---

## 📊 SUCCESS METRICS

By end of day, you should have:

```
✅ Working production URL
✅ Mobile-responsive design
✅ Complete user flow (landing → script)
✅ Real backend integration
✅ Beautiful, luxury aesthetic
✅ 3-5 friends tested it
✅ Demo ready for pitch
✅ Screenshots for pitch deck
```

---

## 🎉 CELEBRATION CHECKLIST

```
☐ Share production URL on LinkedIn/Twitter
☐ Send to potential investors for feedback
☐ Celebrate with your favorite drink 🥂
☐ Get 8 hours of sleep before pitch day
☐ You did it! 🚀
```

---

**Print this page and check boxes with a pen as you complete them!**

**Remember:** Done is better than perfect. Ship it! 💪

---

## ⏰ TIME TRACKING

Start time: ___:___

| Task | Planned | Actual | Status |
|------|---------|--------|--------|
| Setup | 8:00-9:00 | ___:___ - ___:___ | ☐ |
| Foundation | 9:00-10:00 | ___:___ - ___:___ | ☐ |
| Landing | 10:00-11:00 | ___:___ - ___:___ | ☐ |
| Onboarding | 11:00-12:00 | ___:___ - ___:___ | ☐ |
| Builder | 12:30-2:00 | ___:___ - ___:___ | ☐ |
| Chat | 2:00-4:00 | ___:___ - ___:___ | ☐ |
| Preview | 4:00-5:00 | ___:___ - ___:___ | ☐ |
| Polish | 5:00-6:00 | ___:___ - ___:___ | ☐ |
| Pre-deploy | 6:00-7:00 | ___:___ - ___:___ | ☐ |
| Deploy | 7:00-8:00 | ___:___ - ___:___ | ☐ |

End time: ___:___

Total hours: ___

---

**GO CRUSH IT! 🚀💪**

