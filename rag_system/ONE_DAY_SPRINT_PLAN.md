# LEXA MVP - ONE DAY SPRINT PLAN 🚀

## 🎯 Goal: Working MVP in 24 Hours

**Target:** Functional LEXA that impresses investors
- ✅ Account creation (with affiliate explanation)
- ✅ 3-step initial capture (Time/Destination/Theme)
- ✅ 3 "wow" emotional questions
- ✅ Detailed constraints collection
- ✅ AIlessia conversation (with quick action buttons)
- ✅ Script preview with signature highlights
- ✅ Beta badge everywhere

---

## ⏰ Timeline (12 Hours = 1 Working Day)

### **Hour 1-2: Foundation & Setup**
- Create Next.js project
- Install Shadcn/ui
- Setup basic styling (global.css)
- Create layout with BETA badge

### **Hour 3-4: Account & Onboarding**
- Landing page (simple hero + CTA)
- Account creation form with explanation
- Connect to backend API

### **Hour 5-6: Experience Builder (3-Step)**
- Destination selector (simple cards, not map yet)
- Theme selector (visual cards)
- Time picker (calendar icons)
- Approval flow with quick actions

### **Hour 7-8: AIlessia Conversation**
- Chat interface
- 3 "wow" questions
- Detailed constraints
- Quick action buttons (3 suggestions)

### **Hour 9-10: Recommendations & Script**
- POI recommendation display
- Script preview page
- Simple PDF download button

### **Hour 11-12: Polish & Deploy**
- Error handling
- Loading states
- Deploy to Vercel
- Test complete flow

---

## 📁 MINIMAL File Structure

```
lexa-mvp/
├── app/
│   ├── page.tsx                    # Landing (BETA)
│   ├── onboarding/
│   │   └── page.tsx                # Account creation
│   ├── experience/
│   │   ├── page.tsx                # 3-step builder (all in one page!)
│   │   └── chat/
│   │       └── page.tsx            # AIlessia conversation
│   ├── preview/
│   │   └── page.tsx                # Script preview
│   └── layout.tsx
├── components/
│   ├── beta-badge.tsx              # BETA indicator
│   ├── destination-cards.tsx       # Simple destination selector
│   ├── theme-cards.tsx             # Theme selector
│   ├── time-picker.tsx             # Time selector
│   ├── chat-interface.tsx          # Main chat (with quick actions)
│   └── script-preview.tsx          # Script display
├── lib/
│   ├── api.ts                      # API client (simple fetch wrapper)
│   └── store.ts                    # Zustand store (one file)
└── styles/
    └── globals.css                 # Shadcn + custom styles
```

---

## 🎨 Simplified User Flow

```
Landing (BETA Badge) 
    ↓
Account Creation
    [Why create account? Explanation box]
    ↓
3-Step Builder (ONE PAGE)
    ┌─────────────────────┐
    │ 1. Destination      │ ← Cards, pick 1 or skip
    │ 2. Theme            │ ← Cards, pick 1 or skip
    │ 3. Time            │ ← Calendar, pick or skip
    │                     │
    │ [Continue]          │ ← At least 1 required
    └─────────────────────┘
    ↓
AIlessia Conversation
    ├─ 3 "Wow" Questions (emotional profiling)
    │  [Quick Action 1] [Quick Action 2] [Quick Action 3]
    │
    ├─ Detailed Questions (budget, duration, must-haves)
    │  [Quick Action 1] [Quick Action 2] [Quick Action 3]
    │
    └─ POI Recommendations (inline during chat)
    ↓
Script Preview
    ├─ Theme Name
    ├─ Cinematic Hook
    ├─ Emotional Description
    └─ 5-8 Signature Highlights
    [Download PDF]
```

---

## 🚀 Quick Start (Copy-Paste Tomorrow Morning!)

```bash
# 1. Create project (say YES to all defaults)
npx create-next-app@latest lexa-mvp --typescript --tailwind --app

cd lexa-mvp

# 2. Install essentials only
npm install zustand axios date-fns lucide-react

# 3. Install Shadcn (say YES to defaults)
npx shadcn-ui@latest init

# 4. Add components we need
npx shadcn-ui@latest add button card input textarea badge calendar dialog alert

# 5. Run dev
npm run dev
```

---

## 📝 Complete Checklist for Tomorrow

```
□ Hour 1-2: Setup
  □ Create Next.js project  
  □ Install Shadcn
  □ Setup global.css

□ Hour 3-4: Pages
  □ Landing page (with BETA)
  □ Onboarding page (with explanation)

□ Hour 5-6: Builder
  □ 3-step experience builder
  □ Connect to backend (test account creation)

□ Hour 7-8: Chat
  □ Chat interface
  □ Quick action buttons
  □ Connect to converse API

□ Hour 9-10: Script
  □ Script preview page
  □ Connect to compose-script API
  □ PDF download button

□ Hour 11-12: Deploy
  □ Test complete flow
  □ Fix bugs
  □ Deploy to Vercel
  □ Share link for feedback!
```

---

## ⚡ Speed Hacks

1. **No database yet** - Use localStorage
2. **No authentication** - Just email collection
3. **No animations** - Add later
4. **No map** - Use simple cards
5. **Hardcode lists** - Connect to Neo4j later
6. **Simple PDF** - Backend already works

---

## 🚀 **You CAN do this in ONE DAY!** 💪

All code templates are in `ONE_DAY_CODE_TEMPLATES.md` (creating next...)

