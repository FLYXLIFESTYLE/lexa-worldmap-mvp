# 🔗 LEXA Frontend-Backend Integration Guide

## ✅ What's Been Integrated

### **Complete API Client Library** (`lib/api/lexa-client.ts`)
A full-featured TypeScript client for communicating with your FastAPI backend:

```typescript
// Main exports
import { 
  lexaAPI,                    // Singleton API client instance
  saveToLocalStorage,         // Save data with expiry
  loadFromLocalStorage,       // Load data with expiry check
  formatConversationHistory,  // Format messages for API
  extractContextFromBuilder,  // Extract context from builder state
  clearLexaData              // Clear all LEXA localStorage
} from '@/lib/api/lexa-client';
```

### **Integrated Pages:**

#### 1. **Sign Up** (`app/auth/signup/page.tsx`)
✅ Creates Supabase auth account
✅ Creates LEXA account in backend via `/api/ailessia/account/create`
✅ Saves account info to localStorage
✅ Handles errors gracefully (continues even if backend is unavailable)

#### 2. **Chat Interface** (`app/experience/chat/page.tsx`)
✅ Loads LEXA account from localStorage
✅ Starts conversation with context from builder
✅ Sends messages to `/api/ailessia/converse`
✅ Displays AIlessia's responses with real emotional intelligence
✅ Shows proactive suggestions as quick reply buttons
✅ Auto-redirects to script when conversation is complete

#### 3. **Script Preview** (`app/experience/script/page.tsx`)
✅ Calls `/api/ailessia/compose-script` to generate experience script
✅ Displays real backend-generated script
✅ Falls back to mock data if backend unavailable
✅ PDF download ready (endpoint needs to be implemented)

---

## 🚀 How to Test the Integration

### **Step 1: Ensure Backend is Running**

```bash
# In the rag_system directory
cd rag_system
uvicorn api.main:app --host 0.0.0.0 --port 8000 --reload
```

**Verify backend health:**
```bash
curl http://localhost:8000/api/health
```

Expected response:
```json
{
  "status": "healthy",
  "neo4j": "connected",
  "qdrant": "connected"
}
```

### **Step 2: Test Frontend Flow**

1. **Open Frontend:**
   - http://localhost:3000

2. **Create Account:**
   - Click "Begin Your Journey"
   - Enter email: `test@example.com`
   - Enter password: `test123`
   - Click "Create Account"
   
   **What happens:**
   - Supabase creates auth account
   - Backend creates LEXA account
   - localStorage stores: `lexa_account` with `account_id` and `session_id`
   - Redirects to `/experience`

3. **Build Experience:**
   - Choose entry point (Time/Destination/Theme)
   - Select your preference
   - Review LEXA's recommendations
   - Click "Yes, let's continue"
   
   **What happens:**
   - localStorage stores: `lexa_builder_state` with selections
   - Redirects to `/experience/chat`

4. **Chat with AIlessia:**
   - Backend API: `/api/ailessia/converse` called on page load
   - AIlessia greets you with context from builder
   - Type responses or click quick reply buttons
   - Each message triggers API call
   
   **What happens:**
   - Real emotional intelligence reading
   - Archetype calculation and storage
   - Proactive suggestions
   - Progress tracking

5. **View Script:**
   - After conversation, auto-redirects to `/experience/script`
   - Backend API: `/api/ailessia/compose-script` called
   - Displays generated experience script
   
   **What happens:**
   - Real POI recommendations
   - Personalized highlights
   - Script generation

---

## 🔍 Debugging Tools

### **Check localStorage Data**

Open browser console (F12) and run:

```javascript
// View all LEXA data
console.log('Account:', JSON.parse(localStorage.getItem('lexa_account')));
console.log('Builder:', JSON.parse(localStorage.getItem('lexa_builder_state')));
console.log('Conversation:', JSON.parse(localStorage.getItem('lexa_conversation')));

// Clear all data (if needed)
['lexa_account', 'lexa_session', 'lexa_builder_state', 'lexa_conversation'].forEach(
  key => localStorage.removeItem(key)
);
```

### **Monitor API Calls**

1. **Open Network Tab** (F12 → Network)
2. **Filter by:** `Fetch/XHR`
3. **Look for:**
   - `/api/ailessia/account/create` - Account creation
   - `/api/ailessia/converse` - Chat messages
   - `/api/ailessia/compose-script` - Script generation

### **Check Backend Logs**

In your terminal running the backend, watch for:

```
INFO     New account created with greeting account_id=... email=...
INFO     Archetype weights calculated and stored account_id=... weights=...
INFO     Client synced to Neo4j for marketing tracking account_id=...
```

---

## 🐛 Common Issues & Solutions

### **Issue 1: "No LEXA account found"**

**Cause:** Backend API call failed during signup

**Solution:**
1. Check backend is running: `curl http://localhost:8000/api/health`
2. Check browser console for error messages
3. Try clearing localStorage and signing up again

### **Issue 2: "Account not found" in chat**

**Cause:** Account ID not saved to localStorage

**Solution:**
```javascript
// Check if account exists
const account = JSON.parse(localStorage.getItem('lexa_account'));
console.log(account);

// If null, sign up again
```

### **Issue 3: CORS errors**

**Cause:** Backend not accepting requests from frontend

**Solution:**
Check `rag_system/api/main.py` has CORS middleware:
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### **Issue 4: Backend responds but data is wrong**

**Cause:** API response format doesn't match frontend expectations

**Solution:**
1. Check browser console for response data
2. Update type definitions in `lib/api/lexa-client.ts` if needed
3. Check backend response models in `rag_system/api/routes/ailessia.py`

---

## 📊 Data Flow Diagram

```
User Signs Up
    ↓
Supabase Auth (email/password)
    ↓
Backend: POST /api/ailessia/account/create
    ↓
localStorage: { account_id, session_id, email }
    ↓
Experience Builder (3 steps)
    ↓
localStorage: { time, destination, theme, approved: true }
    ↓
Chat: POST /api/ailessia/converse (with context)
    ↓
AIlessia responds with emotional intelligence
    ↓
Multiple conversation turns...
    ↓
Archetype weights calculated & stored in Neo4j
    ↓
Progress >= 0.9 → Redirect to script
    ↓
Script: POST /api/ailessia/compose-script
    ↓
Display generated script with POI recommendations
    ↓
Download PDF (optional)
```

---

## 🎯 API Endpoints Used

| Endpoint | Method | Used In | Purpose |
|----------|--------|---------|---------|
| `/api/ailessia/account/create` | POST | signup | Create LEXA account |
| `/api/ailessia/converse` | POST | chat | Send message to AIlessia |
| `/api/ailessia/compose-script` | POST | script | Generate experience script |
| `/api/ailessia/script/:id/pdf` | GET | script | Download PDF (TODO) |
| `/api/ailessia/recommendations/pois` | POST | - | Get POI recommendations (TODO) |
| `/api/health` | GET | - | Check backend health |

---

## ✅ Integration Checklist

- [x] API client library created (`lib/api/lexa-client.ts`)
- [x] Sign up integrated with backend account creation
- [x] localStorage management for account data
- [x] Chat interface connected to conversation API
- [x] Real-time emotional intelligence responses
- [x] Proactive suggestions displayed as quick replies
- [x] Script composition integrated
- [x] Error handling and fallbacks
- [ ] PDF download endpoint (backend needs to implement)
- [ ] POI recommendations in script (optional enhancement)
- [ ] Feedback submission (optional)

---

## 🚀 Next Steps

1. **Test the full flow** with backend running
2. **Check logs** to ensure data is being saved correctly
3. **Verify Neo4j** is storing client profiles
4. **Test error scenarios** (backend down, network issues)
5. **Mobile testing** (responsive design)

---

## 💡 Pro Tips

1. **Keep backend logs open** while testing to see real-time activity
2. **Use browser DevTools** Network tab to inspect API calls
3. **Clear localStorage between tests** for clean state
4. **Check Neo4j Browser** (`http://localhost:7474`) to verify data storage
5. **Monitor Supabase Dashboard** for auth activity

---

**You now have a fully integrated LEXA MVP! 🎉**

**The frontend and backend are connected and talking to each other! 🚀**

