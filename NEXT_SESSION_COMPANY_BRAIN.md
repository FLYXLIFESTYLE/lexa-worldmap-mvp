# 🧠 NEXT SESSION: Company Brain + Script Engine

**Status:** Foundation ready, UI integration needed  
**Priority:** High (needed for Script Engine + investor demo)

---

## ✅ What's Built (Ready to Use)

### **1. Database Schema** ✅
- Migration `029_company_brain_sections.sql` (RUN THIS FIRST!)
- Tables: `company_brain_uploads`, `company_brain_sections`
- Views: `sections_needing_review`, `approved_company_knowledge`
- Functions: `approve_company_brain_section()`, `reject_company_brain_section()`

### **2. Upload API** ✅
- `/api/admin/company-brain/upload` (Next.js, uses Claude)
- Extracts structured sections (script examples, insights, principles)
- Stores in new table structure

### **3. Section Review APIs** ✅
- `/api/admin/company-brain/sections` (GET - list sections)
- `/api/admin/company-brain/sections/[id]/approve` (POST)
- `/api/admin/company-brain/sections/[id]/reject` (POST)

### **4. Review UI** ✅
- `/admin/company-brain/review` page
- Shows extracted sections with full content
- Approve/Reject buttons
- Filter by status

---

## ⚠️ What Needs Fixing

### **1. Company Brain Upload Page**

**Current:** Uses old Python backend (may not be running)  
**Fix needed:** Update `/admin/company-brain` page to use new Next.js API

**File:** `app/admin/company-brain/page.tsx`  
**Change:** Replace `API_BASE_URL` fetch calls with `/api/admin/company-brain/upload`

### **2. Upload History Modal Bug**

**Current:** Clicking document navigates away from history page  
**Fix needed:** Modal should open on same page, not navigate

**File:** `app/captain/history/page.tsx`  
**Change:** Make "Details" button open modal instead of router.push

### **3. Integrate Section Review into Upload Flow**

**Current:** Upload shows counts (2 scripts, 2 ideas) but not actual content  
**Fix needed:** After upload, show "View Extracted Sections" button → opens modal with approve/reject UI

---

## 📋 TODO: Complete Company Brain System

### **Phase 1: Fix Upload & Review Flow** (1-2 hours)

1. [ ] Update `/admin/company-brain` page to use Next.js API
2. [ ] Fix Upload History modal bug (stay on same page)
3. [ ] Add "View Sections" button to Upload History
4. [ ] Test: Upload historic chat → See sections → Approve/Reject
5. [ ] Migrate old Python extractions to new format (optional)

### **Phase 2: Section-Level Details in Upload History** (1 hour)

1. [ ] Add modal to Upload History that shows:
   - Document summary
   - All extracted sections (with approve/reject)
   - Stats (X script examples, Y insights, Z outdated)
2. [ ] Wire up approve/reject buttons
3. [ ] Refresh sections after approval/rejection

### **Phase 3: Build Standalone Script Engine** (2-3 hours)

1. [ ] Create `/admin/script-engine` page
2. [ ] Input form: Experience idea/theme/client brief
3. [ ] Three output modes:
   - Level 1: Hook + Highlights (Free tier preview)
   - Level 2: Day-by-Day Flow (Premium tier)
   - Level 3: Concierge Handbook (VIP tier)
4. [ ] Uses approved company brain sections + POI knowledge
5. [ ] Save to script library

### **Phase 4: Company Brain Retrieval** (1-2 hours)

1. [ ] Create retrieval function for approved sections
2. [ ] Query by: theme, client archetype, destination, emotion
3. [ ] Return: relevant script examples, successful patterns, design principles
4. [ ] Integrate with Script Engine

### **Phase 5: Batch Script Generator** (1 hour)

1. [ ] Script template system (mix themes × destinations × archetypes)
2. [ ] Generate 250 scripts from combinations
3. [ ] Store in script library
4. [ ] Bulk approve/edit UI

---

## 🎯 Testing Plan

### **Test Upload Flow:**
1. Run migration `029` in Supabase
2. Go to `/admin/company-brain`
3. Upload a historic chat (text file)
4. Should see: Upload progress → Success → Sections extracted
5. Go to `/admin/company-brain/review`
6. Should see: All sections with full content
7. Click "Approve" on script examples
8. Click "Reject" on outdated content
9. Check database: `SELECT * FROM approved_company_knowledge;`
10. Should see: Only approved sections

### **Test Upload History:**
1. Go to `/captain/history`
2. Click "Details" on any upload
3. Should open modal (NOT navigate away)
4. Modal shows: Summary, extracted sections, approve/reject buttons
5. Approve a section
6. Modal updates, Upload History stays open

---

## 🚀 Expected Output After Phase 3

### **Script Engine Input:**
```
Experience Idea: Mediterranean wellness retreat for stressed executive
Theme: Renewal + Prestige
Destination: French Riviera
Client Archetype: Achievement-driven, needs permission to disconnect
Duration: 5 days
```

### **Script Engine Output (Level 1 - Hook):**
```
HOOK: "What if slowing down felt like your most important achievement?"

EMOTIONAL DESCRIPTION:
This isn't a vacation from work—it's a masterclass in recalibration. Five days where the Mediterranean becomes your reset button, and permission to do nothing becomes your luxury. We've designed every moment to quiet the high-performance mind while satisfying your need for excellence. Think Michelin-starred wellness cuisine, private yacht meditation at sunrise, and a spa experience that feels more like emotional archaeology than indulgence.

SIGNATURE HIGHLIGHTS:
• Private sunrise meditation on anchored yacht (just you, the sea, and silence)
• Michelin-starred wellness lunch where every dish is both art and nutrition
• Artisan workshop where you create something with your hands (no emails, just clay)
• Exclusive spa ritual designed specifically for high-performers who never stop
• Sunset toast at a hidden terrace where locals go to remember what matters
```

### **Script Engine Output (Level 2 - Day-by-Day):**
[Full 5-day itinerary with timing, emotional narrative, logistics]

### **Script Engine Output (Level 3 - Concierge Handbook):**
[Complete script with vendor contacts, backup options, Captain notes, booking codes]

---

## 📊 Current Data State

**Your Uploads (Old Python Backend):**
- SeaTesla doc: 2 scripts, 2 ideas (in `company_brain_insights` table)
- Bloomberg PDF: 40 POIs (in `extracted_pois` table)
- LOVEadLEGACY: 11 POIs, 43 Experiences
- Itinerary: 15 POIs, 24 Experiences

**After Migration `029` + New Upload:**
- Each document → multiple sections
- Each section → approve/reject
- Only approved → Script Engine retrieval

---

## 🎯 Immediate Next Steps

**Tomorrow (Fresh Session):**
1. Fix company-brain page to use new Next.js API
2. Fix Upload History modal bug
3. Test: Upload → Review sections → Approve
4. Build Script Engine (standalone tool)
5. Create batch script generator

**Estimated time:** 4-6 hours total

---

**🎉 Today's accomplishments were MASSIVE. Let's continue with company brain + script engine in a fresh session!**
