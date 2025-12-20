# ✅ LEXA MVP Testing Checklist

## 🚀 Pre-Test Setup

- [ ] Backend running: `uvicorn api.main:app --reload` in `rag_system/`
- [ ] Frontend running: `npm run dev` (already running on port 3000)
- [ ] Backend health check passes: http://localhost:8000/api/health
- [ ] Neo4j is running and connected
- [ ] Browser DevTools open (F12) for monitoring

---

## 📝 Test Scenario 1: New User Sign Up

### Steps:
1. [ ] Navigate to http://localhost:3000
2. [ ] Click "Begin Your Journey"
3. [ ] Enter test email: `test@example.com`
4. [ ] Enter password: `test123`
5. [ ] See "Why Account" explanation panel
6. [ ] Click "Create Account"

### Expected Results:
- [ ] Success animation appears
- [ ] Console shows: `LEXA account created: { account_id, session_id... }`
- [ ] localStorage contains `lexa_account`
- [ ] Redirects to `/experience` after 1.5 seconds
- [ ] Backend logs show: "New account created with greeting"

### Check localStorage:
```javascript
JSON.parse(localStorage.getItem('lexa_account'))
// Should have: { account_id, session_id, email, name }
```

---

## 📝 Test Scenario 2: Experience Builder (3-Step)

### Steps:
1. [ ] Land on `/experience` page
2. [ ] See 3 entry point cards: When, Where, What
3. [ ] Click "Where" (destination)
4. [ ] See 6 destination cards (French Riviera, Amalfi Coast, etc.)
5. [ ] Click "French Riviera"

### Expected Results:
- [ ] Loading briefly
- [ ] Approval screen appears
- [ ] Shows:
  - **Where**: French Riviera (You chose ✓)
  - **When**: June 2026 (My suggestion ✨)
  - **What**: Culinary Journey (My suggestion ✨)
- [ ] Two buttons: "Start Over" and "Yes, let's continue"

### Continue:
6. [ ] Click "Yes, let's continue"
7. [ ] localStorage contains `lexa_builder_state`
8. [ ] Redirects to `/experience/chat`

### Check localStorage:
```javascript
JSON.parse(localStorage.getItem('lexa_builder_state'))
// Should have: { entryPoint, time, destination, theme, approved }
```

---

## 📝 Test Scenario 3: AIlessia Conversation

### Steps:
1. [ ] Land on `/experience/chat` page
2. [ ] See AIlessia's greeting with context from builder
3. [ ] See quick reply buttons below the greeting
4. [ ] Click a quick reply button (e.g., "Peace and relaxation")

### Expected Results:
- [ ] User message appears on right (dark navy background)
- [ ] AIlessia responds after ~1-2 seconds
- [ ] New quick reply buttons appear
- [ ] Backend API call in Network tab: `POST /api/ailessia/converse`
- [ ] Response includes: `ailessia_response`, `conversation_stage`, `progress`

### Continue Conversation:
5. [ ] Answer 3-4 more questions (mix of clicks and typed responses)
6. [ ] Watch progress increase
7. [ ] When progress >= 0.9, auto-redirect to `/experience/script`

### Check Network Tab:
- Each message triggers: `POST http://localhost:8000/api/ailessia/converse`
- Response status: 200
- Response includes emotional reading and suggestions

---

## 📝 Test Scenario 4: Script Preview

### Steps:
1. [ ] Auto-land on `/experience/script` after conversation
2. [ ] See loading spinner: "Composing your experience..."
3. [ ] After ~1-2 seconds, script appears

### Expected Results:
- [ ] Theme name displayed (large heading)
- [ ] Inspiring hook (quote style)
- [ ] Emotional description ("The Essence" section)
- [ ] 5-8 signature highlights (numbered cards)
- [ ] Meta info: Destination, Month, Duration
- [ ] Two action buttons: "Share" and "Download PDF"

### Test Actions:
4. [ ] Click "Download PDF" → Alert appears (feature coming soon)
5. [ ] Click "Create Another Experience" → Redirects to `/experience`
6. [ ] Check backend call: `POST /api/ailessia/compose-script`

---

## 🐛 Error Scenario Testing

### Test 1: Backend Offline
1. [ ] Stop backend: `Ctrl+C` in backend terminal
2. [ ] Try to sign up
3. [ ] Expected: Error logged, but continues (graceful fallback)
4. [ ] Try to chat
5. [ ] Expected: Error message in chat

### Test 2: No Account in localStorage
1. [ ] Clear localStorage: `localStorage.clear()`
2. [ ] Try to access `/experience/chat`
3. [ ] Expected: Redirects to `/auth/signup`

### Test 3: Invalid Account ID
1. [ ] Set fake account ID:
```javascript
localStorage.setItem('lexa_account', JSON.stringify({
  account_id: 'fake-id-12345',
  session_id: 'fake-session',
  email: 'test@example.com'
}));
```
2. [ ] Try to chat
3. [ ] Expected: Error handled gracefully

---

## 📱 Mobile Responsiveness Test

### Test on Different Sizes:
1. [ ] Desktop (1920x1080) - Full layout
2. [ ] Tablet (768x1024) - Grid adjusts
3. [ ] Mobile (375x667) - Stacked layout

### Pages to Test:
- [ ] Landing page (/)
- [ ] Sign up (/auth/signup)
- [ ] Experience builder (/experience)
- [ ] Chat interface (/experience/chat)
- [ ] Script preview (/experience/script)

### Check:
- [ ] Text is readable (not too small)
- [ ] Buttons are tappable (not too close)
- [ ] No horizontal scroll
- [ ] Quick reply buttons wrap nicely
- [ ] Calendar grid adjusts (12 months → 4x3 → 3x4)
- [ ] Headers don't overlap content

**How to test:**
1. Open DevTools (F12)
2. Click device icon (Ctrl+Shift+M)
3. Select different devices
4. Test all interactions

---

## 🔍 Backend Verification

### Check Neo4j Database:
1. [ ] Open Neo4j Browser: http://localhost:7474
2. [ ] Run query:
```cypher
// Find recently created client
MATCH (c:Client)
WHERE c.email = 'test@example.com'
RETURN c
```
3. [ ] Expected: Client node with archetype weights

### Check Backend Logs:
Look for these messages in terminal:
```
INFO     New account created with greeting account_id=... email=test@example.com
INFO     Archetype weights calculated and stored account_id=... weights={...}
INFO     Client synced to Neo4j for marketing tracking account_id=...
```

---

## ✅ Success Criteria

### Must Have:
- [ ] User can sign up successfully
- [ ] Account created in both Supabase and backend
- [ ] Experience builder completes all 3 steps
- [ ] Chat sends and receives messages from real backend
- [ ] Script displays generated content
- [ ] No console errors (except graceful fallbacks)
- [ ] Mobile responsive on all pages

### Nice to Have:
- [ ] Quick replies work smoothly
- [ ] Animations are smooth
- [ ] Loading states show appropriately
- [ ] Error messages are user-friendly

---

## 🎯 If Everything Works:

### You should see:
1. ✅ Complete user flow from landing → script
2. ✅ Real AI responses from AIlessia
3. ✅ Data saved to Neo4j
4. ✅ Beautiful, luxury-designed UI
5. ✅ Responsive on all screen sizes

### You are ready to:
- Deploy to Vercel
- Demo to investors
- Get user feedback
- Iterate and improve

---

## 🚨 If Something Breaks:

1. **Check browser console** for errors
2. **Check backend logs** for errors
3. **Check Network tab** for failed requests
4. **Clear localStorage** and try again
5. **Restart backend** if needed
6. **Check `FRONTEND_BACKEND_INTEGRATION.md`** for debugging tips

---

**Start testing now! Go through each scenario step by step! 🚀**

**Report back what works and what doesn't! 💪**

