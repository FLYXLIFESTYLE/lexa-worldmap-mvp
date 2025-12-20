# 🔧 LEXA MVP - TROUBLESHOOTING GUIDE

Quick solutions for common issues you might hit tomorrow! 🚨

---

## 🚨 SETUP ISSUES

### ❌ "command not found: npx"

**Problem:** Node.js not installed or wrong version

**Fix:**
```bash
# Check Node version (need 18+)
node --version

# If not installed or too old, download from nodejs.org
# Or use nvm:
nvm install 18
nvm use 18
```

---

### ❌ "Failed to create Next.js app"

**Problem:** Network issues or permissions

**Fix:**
```bash
# Try with --use-npm flag
npx create-next-app@latest lexa-mvp --typescript --tailwind --app --use-npm

# If still fails, try clearing npm cache
npm cache clean --force
```

---

### ❌ "Shadcn command not found"

**Problem:** Shadcn CLI not installed globally

**Fix:**
```bash
# Don't install globally, use npx:
npx shadcn-ui@latest init

# If that fails, check you're in the project directory:
cd lexa-mvp
pwd  # Should show .../lexa-mvp
```

---

## 🔌 API CONNECTION ISSUES

### ❌ "Failed to fetch" or "Network error"

**Problem:** Backend not running or wrong URL

**Fix:**
```bash
# 1. Check backend is running
# Open http://localhost:8000 in browser
# Should see: {"message": "LEXA Backend API"}

# 2. Check .env.local file exists
cat .env.local
# Should show: NEXT_PUBLIC_API_URL=http://localhost:8000

# 3. Restart both servers
# In rag_system/ terminal:
uvicorn api.main:app --reload

# In lexa-mvp/ terminal:
npm run dev

# 4. Check browser console (F12) for actual error
```

---

### ❌ "CORS policy" error

**Problem:** Browser blocking cross-origin requests

**Fix:**
```bash
# Backend CORS should already be configured, but if not:
# 1. Check rag_system/api/main.py has CORS middleware
# 2. Restart backend with --reload flag
# 3. Try in incognito/private window
# 4. Clear browser cache (Ctrl+Shift+Del)
```

---

### ❌ API returns 404 or 500

**Problem:** Wrong endpoint or backend error

**Fix:**
```bash
# 1. Check exact endpoint URL
# Open http://localhost:8000/docs
# Should see Swagger UI with all endpoints

# 2. Test endpoint in Swagger UI first
# Click "Try it out" → Enter data → Execute

# 3. Check backend terminal for error logs
# Look for Python traceback

# 4. Check request body matches expected format:
# {
#   "account_id": "uuid-here",
#   "session_id": "uuid-here",
#   "message": "Hello"
# }
```

---

## 💾 LOCALSTORAGE ISSUES

### ❌ "localStorage is not defined"

**Problem:** Server-side rendering trying to access localStorage

**Fix:**
```typescript
// Wrap in useEffect (client-side only)
useEffect(() => {
  const accountId = localStorage.getItem('lexa_account_id')
  // ... use accountId
}, [])

// OR check if window exists:
if (typeof window !== 'undefined') {
  const accountId = localStorage.getItem('lexa_account_id')
}
```

---

### ❌ Account ID is null

**Problem:** Account creation didn't save or user refreshed

**Fix:**
```typescript
// Add redirect guard in pages that need authentication
useEffect(() => {
  const accountId = localStorage.getItem('lexa_account_id')
  if (!accountId) {
    router.push('/onboarding')
  }
}, [router])
```

---

## 🎨 UI/COMPONENT ISSUES

### ❌ Shadcn components not found

**Problem:** Component not installed

**Fix:**
```bash
# Check which component is missing in error
# Example: "Cannot find module '@/components/ui/button'"

# Install it:
npx shadcn-ui@latest add button

# List all available components:
npx shadcn-ui@latest add
```

---

### ❌ Calendar component doesn't show

**Problem:** Missing date-fns dependency or component not installed

**Fix:**
```bash
# Install date-fns
npm install date-fns

# Reinstall calendar component
npx shadcn-ui@latest add calendar

# Restart dev server
npm run dev
```

---

### ❌ Styles not applying

**Problem:** Tailwind not configured or globals.css not imported

**Fix:**
```typescript
// 1. Check globals.css is imported in layout.tsx
import './globals.css'  // or import '@/styles/globals.css'

// 2. Check tailwind.config.js exists and has content paths:
content: [
  './pages/**/*.{js,ts,jsx,tsx,mdx}',
  './components/**/*.{js,ts,jsx,tsx,mdx}',
  './app/**/*.{js,ts,jsx,tsx,mdx}',
],

// 3. Restart dev server
npm run dev
```

---

### ❌ BETA badge not showing

**Problem:** Badge component not installed or layout.tsx not updated

**Fix:**
```bash
# Install badge component
npx shadcn-ui@latest add badge

# Check layout.tsx has:
import { Badge } from '@/components/ui/badge'

// And in JSX:
<Badge variant="secondary" className="bg-yellow-500">BETA</Badge>
```

---

## 🗨️ CHAT ISSUES

### ❌ Messages not sending

**Problem:** API call failing or missing data

**Fix:**
```typescript
// Add console.logs to debug:
const sendMessage = async (content: string) => {
  console.log('Sending:', content)
  console.log('Account ID:', accountId)
  console.log('Session ID:', sessionId)
  
  try {
    const response = await api.sendMessage(...)
    console.log('Response:', response)
  } catch (error) {
    console.error('Error details:', error)
    // Show user-friendly message
    alert('Failed to send message. Please try again.')
  }
}
```

---

### ❌ AIlessia doesn't respond

**Problem:** Backend error or conversation history format wrong

**Fix:**
```typescript
// Check conversation_history format:
conversation_history: messages.map(m => ({
  role: m.role,        // Must be 'user' or 'ailessia'
  content: m.content   // Must be string
}))

// Check backend logs for error:
# In rag_system/ terminal, look for Python errors
```

---

### ❌ Chat doesn't scroll to bottom

**Problem:** ref not attached or scroll not triggered

**Fix:**
```typescript
// Make sure ref is defined:
const messagesEndRef = useRef<HTMLDivElement>(null)

// Scroll function:
useEffect(() => {
  messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
}, [messages])  // Trigger on messages change

// Make sure div exists:
<div ref={messagesEndRef} />
```

---

## 📄 SCRIPT GENERATION ISSUES

### ❌ Script preview shows "undefined"

**Problem:** API returned data in different format

**Fix:**
```typescript
// Add optional chaining and fallbacks:
<h1>{script?.title || 'Your Experience'}</h1>
<p>{script?.cinematic_hook || 'Loading...'}</p>

// Log the actual response:
console.log('Script response:', data)
```

---

### ❌ Script generation takes forever

**Problem:** Claude API slow or error

**Fix:**
```typescript
// Add timeout and better loading state:
const [isLoading, setIsLoading] = useState(true)
const [error, setError] = useState<string | null>(null)

useEffect(() => {
  const timeout = setTimeout(() => {
    setError('Generation is taking longer than usual...')
  }, 10000)  // 10 second warning
  
  generateScript().finally(() => {
    clearTimeout(timeout)
    setIsLoading(false)
  })
}, [])
```

---

## 🏗️ BUILD ISSUES

### ❌ "npm run build" fails

**Problem:** TypeScript errors or missing dependencies

**Fix:**
```bash
# 1. Check exact error in terminal
npm run build

# 2. Common fixes:

# Missing dependency:
npm install

# TypeScript errors - add to file:
// @ts-ignore
<problematic line>

# Or disable type checking temporarily (NOT RECOMMENDED):
# In next.config.js:
typescript: {
  ignoreBuildErrors: true,
}

# 3. Clear cache and retry:
rm -rf .next
npm run build
```

---

### ❌ Build succeeds but pages are blank

**Problem:** Client-side only code running on server

**Fix:**
```typescript
// Add 'use client' directive at top of file:
'use client'

import { useState } from 'react'
// ... rest of component
```

---

## 🚀 DEPLOYMENT ISSUES

### ❌ Vercel deployment fails

**Problem:** Build errors on Vercel servers

**Fix:**
```bash
# 1. Check build logs in Vercel dashboard
# Look for specific error message

# 2. Test build locally first:
npm run build
npm start

# 3. Common issues:

# Missing environment variable:
# - Go to Vercel dashboard → Settings → Environment Variables
# - Add: NEXT_PUBLIC_API_URL

# TypeScript errors:
# - Fix locally or add // @ts-ignore
# - Or temporarily disable in next.config.js

# 4. Try redeploying:
git commit --allow-empty -m "Trigger redeploy"
git push origin main
```

---

### ❌ Production site works but API calls fail

**Problem:** Backend URL wrong or backend not accessible

**Fix:**
```bash
# 1. Check environment variable in Vercel:
# Must be: NEXT_PUBLIC_API_URL=https://your-backend.com
# NOT: http://localhost:8000

# 2. Deploy backend first (if not done):
# - Deploy to Railway/Render/Fly.io
# - Get production URL
# - Update Vercel env var
# - Redeploy frontend

# 3. For MVP, you can use localhost backend:
# - Only works on YOUR computer
# - For demo, run demo on your laptop
# - Use localhost:8000 as API URL
```

---

### ❌ "Module not found" on production

**Problem:** Import paths wrong

**Fix:**
```typescript
// Use @ alias (configured by default):
import { api } from '@/lib/api'         // ✅ Good
import { api } from '../../lib/api'     // ❌ Avoid

// Make sure tsconfig.json has:
"paths": {
  "@/*": ["./*"]
}
```

---

## 📱 MOBILE ISSUES

### ❌ Layout breaks on mobile

**Problem:** Fixed widths or non-responsive design

**Fix:**
```typescript
// Use responsive Tailwind classes:
<div className="w-full md:w-1/2">      // ✅ Responsive
<div className="w-[500px]">            // ❌ Fixed width

// Test in Chrome DevTools:
// 1. Press F12
// 2. Click device icon (top-left)
// 3. Select iPhone 12 Pro or similar
// 4. Refresh page
```

---

### ❌ Text too small on mobile

**Problem:** Not using responsive text sizes

**Fix:**
```typescript
// Use responsive text classes:
<h1 className="text-4xl md:text-6xl">  // ✅ Responsive
<h1 className="text-6xl">              // ❌ Too large on mobile

// Common responsive sizes:
text-base md:text-lg    // Body text
text-xl md:text-2xl     // Subtitles
text-3xl md:text-5xl    // Headings
```

---

### ❌ Buttons too small to tap

**Problem:** Touch targets too small

**Fix:**
```typescript
// Use larger sizes on mobile:
<Button size="lg" className="min-h-[48px]">  // ✅ 48px = good touch target
<Button size="sm">                           // ❌ Too small

// Apple/Google recommend 44-48px minimum
```

---

## 🐛 GENERAL DEBUGGING

### Debug Checklist
```
□ Check browser console (F12)
□ Check Network tab (F12 → Network)
□ Check backend terminal logs
□ Check localStorage (F12 → Application → Local Storage)
□ Test API in Swagger UI (http://localhost:8000/docs)
□ Restart both frontend and backend
□ Clear browser cache
□ Try incognito/private window
□ Check file paths are correct
□ Check imports are correct
```

---

## 🆘 NUCLEAR OPTION (If Everything Breaks)

```bash
# Start completely fresh:

# 1. Delete project
rm -rf lexa-mvp

# 2. Clear npm cache
npm cache clean --force

# 3. Recreate project
npx create-next-app@latest lexa-mvp --typescript --tailwind --app

# 4. Start over with templates
# (But you'll be faster second time!)
```

---

## 📞 QUICK HELP COMMANDS

```bash
# Check if backend is running:
curl http://localhost:8000
# Should return: {"message":"LEXA Backend API"}

# Check if frontend is running:
curl http://localhost:3000
# Should return HTML

# Check Node version:
node --version
# Should be 18+

# Check npm version:
npm --version
# Should be 9+

# List running processes:
lsof -i :3000  # Frontend
lsof -i :8000  # Backend

# Kill process on port:
kill -9 $(lsof -t -i:3000)
```

---

## 💡 PREVENTION TIPS

1. **Save often** - Cmd/Ctrl+S after every change
2. **Test incrementally** - Don't write 100 lines then test
3. **Read errors carefully** - Error messages tell you what's wrong
4. **Use console.log liberally** - Debug by printing values
5. **Keep backend logs visible** - Spot errors immediately
6. **Commit to git often** - Easy to roll back
7. **Take breaks** - Fresh eyes spot issues faster

---

**Remember: Every error is solvable! 💪**

**Most issues are:**
- Typo in variable name
- Missing import
- Wrong file path
- Service not running
- Missing environment variable

**Check these 5 things first! ✅**

