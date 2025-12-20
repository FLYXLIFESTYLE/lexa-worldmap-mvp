# LEXA Frontend Development Plan

## 🎯 Vision Recap

**LEXA:** An elegant, mobile-friendly web app where wealthy clients interact with AIlessia to design their perfect luxury travel experience.

**Core Flow:**
```
Client Onboarding
    ↓
Region Selection (Interactive Map)
    ↓
Theme/Mood Exploration
    ↓
Constraints & Preferences (Conversational)
    ↓
AIlessia Recommendations (Interactive)
    ↓
Experience Script Generation
    ↓
Polished PDF Download
```

---

## 📱 Design Principles

### **1. Mobile-First Luxury**
- Touch-optimized interface
- Gesture-based navigation
- Full-screen immersive experiences
- Responsive for desktop/tablet

### **2. Emotional Connection**
- Cinematic imagery
- Smooth animations
- Sensory design language
- Personal, intimate feeling

### **3. Simplicity & Power**
- Hide complexity behind elegance
- Progressive disclosure
- Smart defaults
- AIlessia guides everything

---

## 🎨 Tech Stack Recommendation

### **Framework: Next.js 14 (App Router)**
**Why:**
- ✅ React with TypeScript
- ✅ Server-side rendering for SEO
- ✅ Built-in API routes (edge functions)
- ✅ Image optimization
- ✅ Mobile-first by default

### **UI Library: Shadcn/ui** (as you specified)
**Why:**
- ✅ Tailwind CSS based
- ✅ Accessible components
- ✅ Customizable design system
- ✅ Beautiful animations
- ✅ You already requested this!

### **State Management: Zustand**
**Why:**
- ✅ Simple, lightweight
- ✅ TypeScript friendly
- ✅ Perfect for conversation state
- ✅ No boilerplate

### **API Client: TanStack Query (React Query)**
**Why:**
- ✅ Caching & synchronization
- ✅ Optimistic updates
- ✅ Real-time data fetching
- ✅ Perfect for chat interface

### **Animation: Framer Motion**
**Why:**
- ✅ Smooth page transitions
- ✅ Gesture animations
- ✅ Scroll-based reveals
- ✅ Luxury feel

### **Map: Mapbox GL JS**
**Why:**
- ✅ Beautiful, customizable maps
- ✅ 3D destination previews
- ✅ Touch gestures
- ✅ Luxury yacht routes visualization

---

## 🏗️ Project Structure

```
lexa-frontend/
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   └── signup/
│   ├── (main)/
│   │   ├── page.tsx                 # Landing page
│   │   ├── onboarding/
│   │   │   └── page.tsx             # Client onboarding
│   │   ├── experience/
│   │   │   ├── region/
│   │   │   │   └── page.tsx         # Region selection (map)
│   │   │   ├── theme/
│   │   │   │   └── page.tsx         # Theme/mood selection
│   │   │   ├── conversation/
│   │   │   │   └── page.tsx         # AIlessia conversation
│   │   │   └── preview/
│   │   │       └── page.tsx         # Script preview
│   │   └── script-space/
│   │       └── page.tsx             # Personal Script Space
│   ├── api/                         # Next.js API routes (proxy to backend)
│   └── layout.tsx
├── components/
│   ├── ui/                          # Shadcn components
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── dialog.tsx
│   │   └── ...
│   ├── ailessia/
│   │   ├── chat-interface.tsx       # Main chat component
│   │   ├── message-bubble.tsx
│   │   ├── typing-indicator.tsx
│   │   └── suggestion-cards.tsx
│   ├── experience/
│   │   ├── region-map.tsx           # Interactive map
│   │   ├── theme-selector.tsx       # Visual theme cards
│   │   ├── constraint-form.tsx      # Preferences form
│   │   └── poi-card.tsx             # POI recommendation card
│   └── script/
│       ├── script-preview.tsx       # Experience Script preview
│       ├── pdf-viewer.tsx
│       └── share-controls.tsx
├── lib/
│   ├── api/
│   │   ├── ailessia.ts              # API client for AIlessia
│   │   ├── recommendations.ts       # POI recommendations API
│   │   └── accounts.ts              # Account management
│   ├── store/
│   │   ├── conversation-store.ts    # Conversation state
│   │   ├── experience-store.ts      # Experience builder state
│   │   └── auth-store.ts            # User auth state
│   ├── types/
│   │   ├── ailessia.ts
│   │   ├── experience.ts
│   │   └── poi.ts
│   └── utils/
│       ├── format.ts
│       └── animations.ts
├── styles/
│   └── globals.css                  # Global styles (Shadcn + custom)
└── public/
    ├── images/
    └── fonts/
```

---

## 🎭 User Flow (Detailed)

### **Phase 1: Landing & Onboarding**

#### **1.1 Landing Page** (`/`)
**Design:**
- Hero: Full-screen cinematic video (luxury yachts, Mediterranean sunsets)
- Tagline: "Your desires. AIlessia's intelligence. Unforgettable experiences."
- CTA: "Begin Your Journey" (gradient button)
- Scroll reveals: "How It Works" (3 steps with animations)

**Components:**
- `<HeroSection />`
- `<HowItWorks />`
- `<TestimonialCarousel />`
- `<Footer />`

#### **1.2 Onboarding** (`/onboarding`)
**Design:**
- Clean form: Email, Name (optional Phone)
- AIlessia's greeting animation (avatar fades in)
- Warm, personal welcome message
- "Let's get to know each other" CTA

**Data Captured:**
- Email, Name, Phone
- **API Call:** `POST /api/ailessia/account/create`
- **Store:** account_id, session_id in Zustand

---

### **Phase 2: Experience Builder**

#### **2.1 Region Selection** (`/experience/region`)
**Design:**
- Full-screen interactive Mapbox map
- Destination clusters with pins (French Riviera, Amalfi Coast, etc.)
- Click pin → Region card slides up from bottom
  - Beautiful imagery
  - Quick stats (203 experiences, 4.8★ avg)
  - "Explore This Region" button
- Selected region highlights on map

**Interaction:**
- Tap/click region → Preview card
- Swipe up → Full region details
- "Choose This" → Saves to state, proceeds

**API Call:** None (static region data)
**State:** `experienceStore.setRegion('French Riviera')`

#### **2.2 Theme/Mood Selection** (`/experience/theme`)
**Design:**
- Grid of theme cards (2 columns mobile, 4 desktop)
- Each card:
  - Large background image
  - Theme name overlay
  - Icon representing mood
  - Hover/tap: Expands with description
  
**Themes:**
- 🌅 Romantic Escape
- 🎭 Cultural Immersion
- ⛵ Adventure & Freedom
- 🍷 Gastronomic Journey
- 🧘 Wellness & Renewal
- 🏆 Prestige & Luxury
- 🎨 Art & Sophistication
- 🌊 Coastal Serenity

**Interaction:**
- Multi-select (can choose 1-3 themes)
- Visual feedback (checkmark, border glow)
- "Continue" button activates when >= 1 selected

**State:** `experienceStore.setThemes(['Romantic Escape', 'Gastronomic Journey'])`

#### **2.3 AIlessia Conversation** (`/experience/conversation`)
**Design:**
- **Mobile:** Full-screen chat interface
- **Desktop:** Split view (chat left, context panel right)

**Left Panel: Chat**
- AIlessia's avatar (animated, breathing effect)
- Message bubbles (AIlessia: left, User: right)
- Input field at bottom (expandable textarea)
- Microphone button (future: voice input)
- Typing indicator when AIlessia responds

**Right Panel (Desktop): Context**
- Selected region map preview
- Chosen themes as badges
- Constraint summary (updates real-time)
- Progress indicator (conversation stage)

**Conversation Topics (Structured Discovery):**
1. **Opening:** "Tell me about your perfect experience..."
2. **Travel Dates:** "When are you planning to travel?"
3. **Duration:** "How many days can you dedicate?"
4. **Travel Style:** "Private yacht? Villa? Hotel? Mix?"
5. **Must-Haves:** "What are your absolute must-haves?"
6. **Budget:** "Investment range?" (elegant phrasing)
7. **Dining:** "Fine dining every night or mix with casual?"
8. **Activities:** "What draws you?" (suggest based on theme)
9. **Companions:** "Solo, partner, family, friends?"
10. **Special Occasions:** "Anniversary, birthday, celebration?"

**Smart Features:**
- AIlessia suggests missing choices
- Proactive recommendation cards (inline)
- Can jump back to edit any constraint
- Voice of AIlessia adapts to emotional state

**API Calls:**
- `POST /api/ailessia/converse` (each message)
- Returns: AIlessia response, tone, emotional reading, suggestions

**State:** 
- `conversationStore.addMessage()`
- `experienceStore.setConstraints()`

---

### **Phase 3: Recommendations & Refinement**

#### **3.1 POI Recommendations** (Within conversation)
**Design:**
- AIlessia suggests: "I have three perfect experiences for you..."
- Recommendation cards slide in:
  
**POI Card Design:**
```
┌─────────────────────────────┐
│  [Beautiful Image]          │
│                              │
│  POI Name                    │
│  ⭐ 4.9 (234 reviews)        │
│                              │
│  Activity Badge              │
│  Emotions: Romance, Prestige │
│                              │
│  "Perfect fit: 92%"          │
│  ↳ Why: "Your romantic..."  │
│                              │
│  [Learn More]  [Add to Trip]│
└─────────────────────────────┘
```

**Interaction:**
- Tap card → Expands to full details
  - More images (gallery)
  - Full description
  - Reviews
  - Personality fit breakdown
  - Archetype match explanation
- "Add to Trip" → Saves to experience
- "Show Similar" → More recommendations

**API Call:** `POST /api/ailessia/recommendations/pois`
**State:** `experienceStore.addPOI(poi)`

#### **3.2 Refinement**
**Design:**
- User can say: "Show me more romantic restaurants"
- AIlessia adjusts: Fetches with activity filter
- Conversation-based refinement (natural)

---

### **Phase 4: Experience Script**

#### **4.1 Script Generation** (Triggered when conversation reaches "closing" stage)
**Design:**
- Loading animation: "AIlessia is crafting your experience..."
- Cinematic reveal: Script preview fades in

**API Call:** `POST /api/ailessia/compose-script`

#### **4.2 Script Preview** (`/experience/preview`)
**Design:**
- **Hero Section:**
  - Destination hero image
  - Script title (cinematic)
  - AIlessia's message: "I've created something special for you..."

- **Cinematic Hook:**
  - Full-width text with parallax background
  - Emotional narrative

- **Emotional Arc:**
  - Timeline visualization
  - Day-by-day flow with emotions

- **Signature Highlights (5-8 experiences):**
  - Beautiful cards with images
  - POI name, activity, timing
  - Why it's perfect for you
  - Personality fit score

- **Practical Details:**
  - Duration, investment range
  - Included: Yacht charter, private dining, etc.
  - Transportation notes

**Actions:**
- **Download PDF:** Generate & download
- **Share:** Email, WhatsApp (future)
- **Refine:** Back to conversation
- **Book Now:** Contact concierge (future)

**API Call:** None (data already in state)

#### **4.3 PDF Generation**
**API Call:** `GET /api/ailessia/script/{script_id}/pdf`
**Backend:** Existing `script_pdf_generator.py`

---

### **Phase 5: Personal Script Space**

#### **5.1 Dashboard** (`/script-space`)
**Design:**
- **Header:**
  - "Welcome back, Victoria"
  - Archetype badge ("The Romantic")
  - Personality breakdown (radar chart)

- **My Scripts:**
  - Grid of script cards
  - Each shows: Destination, date created, status
  - Click → View script

- **AIlessia's Suggestions:**
  - "Based on your French Riviera experience..."
  - Recommended destinations
  - Upsell opportunities (wine tasting add-on)

- **Profile:**
  - Emotional profile visualization
  - Past bookings
  - Preferences

**API Call:** `GET /api/ailessia/script-space/{account_id}`

---

## 🎨 Design System

### **Colors (Luxury Palette)**
```css
--primary: #1a1a2e        /* Deep navy (sophistication) */
--secondary: #d4af37      /* Gold (luxury) */
--accent: #ff6b9d         /* Soft rose (warmth) */
--background: #ffffff     /* Clean white */
--surface: #f8f9fa        /* Soft gray */
--text: #2c3e50           /* Dark blue-gray */
--text-muted: #7f8c8d     /* Muted gray */

/* Gradients */
--gradient-hero: linear-gradient(135deg, #667eea 0%, #764ba2 100%)
--gradient-luxury: linear-gradient(135deg, #d4af37 0%, #aa8a2e 100%)
```

### **Typography**
```css
--font-heading: 'Playfair Display', serif    /* Elegant headings */
--font-body: 'Inter', sans-serif             /* Clean, readable */
--font-accent: 'Italiana', serif             /* Cinematic moments */
```

### **Spacing (Generous for Luxury)**
- Mobile padding: 24px
- Desktop padding: 48px
- Section spacing: 80px
- Card spacing: 16px

### **Animations**
- Page transitions: 400ms ease
- Hover effects: 200ms ease
- Scroll reveals: Fade + slide up
- AIlessia messages: Typing effect

---

## 🔌 Backend Integration

### **API Client (`lib/api/ailessia.ts`)**
```typescript
export const ailessi aAPI = {
  // Accounts
  createAccount: (data: AccountCreateRequest) => 
    post('/api/ailessia/account/create', data),
  
  // Conversation
  converse: (data: ConverseRequest) => 
    post('/api/ailessia/converse', data),
  
  // Recommendations
  getPOIs: (data: POIRecommendationRequest) => 
    post('/api/ailessia/recommendations/pois', data),
  
  // Scripts
  composeScript: (data: ComposeScriptRequest) => 
    post('/api/ailessia/compose-script', data),
  
  getScriptSpace: (accountId: string) => 
    get(`/api/ailessia/script-space/${accountId}`),
  
  downloadPDF: (scriptId: string) => 
    get(`/api/ailessia/script/${scriptId}/pdf`)
}
```

### **State Management (`lib/store/conversation-store.ts`)**
```typescript
interface ConversationState {
  accountId: string | null
  sessionId: string | null
  messages: Message[]
  isTyping: boolean
  emotionalReading: EmotionalReading | null
  
  // Actions
  addMessage: (message: Message) => void
  setTyping: (typing: boolean) => void
  sendMessage: (content: string) => Promise<void>
}
```

---

## 📅 Implementation Phases

### **Phase 1: Foundation (Week 1)**
- ✅ Next.js project setup
- ✅ Shadcn/ui installation & theming
- ✅ Global styles (colors, typography)
- ✅ Basic routing structure
- ✅ API client setup
- ✅ Zustand stores

**Deliverable:** Empty app with routing + styling

### **Phase 2: Onboarding (Week 2)**
- ✅ Landing page with hero
- ✅ Onboarding form
- ✅ Account creation flow
- ✅ AIlessia greeting animation

**Deliverable:** User can create account, see AIlessia greeting

### **Phase 3: Experience Builder (Week 3-4)**
- ✅ Region selection (map)
- ✅ Theme/mood selector
- ✅ Chat interface
- ✅ Conversation flow

**Deliverable:** User can select region, themes, chat with AIlessia

### **Phase 4: Recommendations (Week 5)**
- ✅ POI recommendation cards
- ✅ Inline suggestions in chat
- ✅ POI detail modal
- ✅ Add to trip functionality

**Deliverable:** User sees personalized POI recommendations

### **Phase 5: Script Generation (Week 6)**
- ✅ Script preview page
- ✅ PDF generation integration
- ✅ Download functionality
- ✅ Share options

**Deliverable:** User gets Experience Script PDF

### **Phase 6: Script Space (Week 7)**
- ✅ Dashboard/profile
- ✅ Script history
- ✅ Suggestions panel
- ✅ Settings

**Deliverable:** Complete user dashboard

### **Phase 7: Polish & Testing (Week 8)**
- ✅ Mobile optimization
- ✅ Animations
- ✅ Performance optimization
- ✅ User testing
- ✅ Bug fixes

**Deliverable:** Production-ready app

---

## 🎯 Success Metrics

### **User Experience:**
- Time to first recommendation: < 5 minutes
- Conversation satisfaction: > 4.5/5
- Script download rate: > 80%
- Mobile usability score: > 90

### **Technical:**
- Page load time: < 2s
- Chat response time: < 1s
- Mobile-responsive: 100%
- Accessibility score: > 95

---

## 🚀 Quick Start Commands

```bash
# Create Next.js app
npx create-next-app@latest lexa-frontend --typescript --tailwind --app

# Install dependencies
cd lexa-frontend
npm install zustand @tanstack/react-query framer-motion
npm install mapbox-gl @mapbox/mapbox-gl-draw
npm install date-fns clsx tailwind-merge

# Install Shadcn/ui
npx shadcn-ui@latest init
npx shadcn-ui@latest add button card dialog input textarea

# Run dev server
npm run dev
```

---

## 📖 Documentation to Create

1. **COMPONENT_LIBRARY.md** - All reusable components
2. **API_INTEGRATION.md** - Backend API usage
3. **DESIGN_SYSTEM.md** - Colors, typography, spacing
4. **USER_FLOWS.md** - Detailed user journeys
5. **DEPLOYMENT.md** - Vercel deployment guide

---

## 🎉 End Result

**A luxury web app where:**
- Wealthy clients feel understood and valued
- AIlessia creates emotional connections
- POI recommendations feel truly personalized
- Experience Scripts are beautiful and inspiring
- The entire experience is mobile-perfect and elegant

**Ready to build the frontend?** 🚀

Let me know if you want me to:
1. **Start implementing** (create Next.js project structure)
2. **Refine the plan** (adjust anything)
3. **Create detailed component specs** (design system docs)

