# 🎯 Experience Builder - Complete Redesign Plan

## ✅ Your Requirements:

1. **Add BETA badge to all LEXA appearances**
2. **Add year selection with validation**
3. **Return to main page after each selection**
4. **Show selections on main page cards**
5. **Add seasonal warnings (UAE/July, Monaco/November)**
6. **Make summary page editable by clicking cards**
7. **"Please suggest best option" as default for unselected**

---

## 🔄 New Flow:

```
Main Page (choose_entry)
├─ Card 1: WHEN
│  ├─ If selected: Shows "February 2026" [Click to change]
│  └─ If not: "I know when I want to travel"
├─ Card 2: WHERE  
│  ├─ If selected: Shows "French Riviera" [Click to change]
│  └─ If not: "I know where I want to go"
├─ Card 3: WHAT
│  ├─ If selected: Shows "Romantic Escape" [Click to change]
│  └─ If not: "I know the type of experience"
└─ [Continue Button] (appears when at least 1 selected)
    ↓
Selection Pages (time/destination/theme)
├─ User selects option
├─ Returns to Main Page (not review!)
├─ Shows selection in card
└─ Can continue or select more
    ↓
Summary/Approval Page
├─ Shows all 3 with "You chose" or "Suggested"
├─ Cards are clickable to change
├─ Seasonal warnings shown
└─ [Continue to AIlessia]
```

---

## 📝 Key Changes Needed:

### 1. Main Page (`choose_entry`)
**Current:** Just 3 empty cards
**New:** 
- Cards show selections if made
- BETA badge on LEXA logo
- Continue button appears when ≥1 selection
- Cards change appearance when selected (gold border)
- Seasonal warning banner if issue detected

### 2. Month Selection (`time`)
**Current:** Just months
**New:**
- Year selector (2025, 2026, 2027, 2028)
- Validation: Don't allow past dates
- After selection → Return to main page
- No "review" page

### 3. Destination Selection (`destination`)
**Current:** 9 destinations
**Keep:** Same, but return to main page after

### 4. Theme Selection (`theme`)
**Keep:** Same, but return to main page after

### 5. Approval Page
**Current:** Static summary
**New:**
- Cards are buttons (clickable)
- Click card → Go to that selection page
- Shows seasonal warnings prominently
- Better button text

---

## 🎨 Visual Changes:

### Main Page Card States:

**Empty State:**
```
┌─────────────────┐
│    📅           │
│   When          │
│ I know when I   │
│ want to travel  │
└─────────────────┘
Border: white/10
Background: white/5
```

**Selected State:**
```
┌─────────────────┐ ← Gold border
│    📅 ✓         │
│   When          │
│ February 2026   │ ← Gold text, bold
│ Click to change │ ← Small, gray
└─────────────────┘
Border: lexa-gold
Background: lexa-gold/10
```

### Year Selector:

```
When do you dream of traveling?

Year: [2025▼] [2026▼] [2027▼] [2028▼]
      (if valid)

┌───┬───┬───┬───┐
│Jan│Feb│Mar│Apr│
├───┼───┼───┼───┤
│May│Jun│Jul│Aug│
├───┼───┼───┼───┤
│Sep│Oct│Nov│Dec│
└───┴───┴───┴───┘
```

### Seasonal Warning:

```
┌─────────────────────────────────────┐
│ 💡 Note: UAE in July can be         │
│ extremely hot (40°C+). Consider     │
│ October-April for comfort.          │
│ [Change Destination] [Keep Anyway]  │
└─────────────────────────────────────┘
Yellow background, prominent
```

---

## 🔧 Technical Implementation:

### State Management:
```typescript
const [builderState, setBuilderState] = useState({
  time: { month: null, year: 2026, defined: false },
  destination: { name: null, defined: false },
  theme: { name: null, defined: false },
});

const [seasonalWarning, setSeasonalWarning] = useState<string | null>(null);
const [selectedYear, setSelectedYear] = useState(2026);
```

### Seasonal Check Logic:
```typescript
function checkSeasonalCompatibility(month, destination) {
  const summerMonths = ['june', 'july', 'august'];
  const winterMonths = ['november', 'december', 'january', 'february'];
  
  if (summerMonths.includes(month) && destination.includes('Arab')) {
    return "UAE in summer is extremely hot (40°C+)...";
  }
  
  if (winterMonths.includes(month) && destination.includes('Monaco')) {
    return "Monaco in winter is low season...";
  }
  
  // More checks...
  return null;
}
```

### Date Validation:
```typescript
function isValidDate(month, year) {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth(); // 0-indexed
  
  const monthIndex = months.indexOf(month);
  
  if (year < currentYear) return false;
  if (year === currentYear && monthIndex < currentMonth) return false;
  
  return true;
}
```

---

## 📊 Flow Comparison:

### Old Flow:
```
Main → Select When → Review → Approval → Chat
       (choice)      (see all)  (confirm)
```

### New Flow:
```
Main (empty) → Select When → Main (updated) → Continue → Approval → Chat
                ↓                                ↓
         February 2026                    Fill suggestions
                ↓                                ↓
        Can select more                  Editable cards
```

---

## 💾 Implementation Steps:

1. ✅ Add state variables (seasonal warning, selected year)
2. ✅ Update main page to show selections
3. ✅ Add year selector to month page
4. ✅ Add date validation
5. ✅ Change flow to return to main instead of review
6. ✅ Add seasonal compatibility check
7. ✅ Make approval cards clickable
8. ✅ Add BETA badge to all LEXA appearances

---

## 🎯 Priority Order:

**Phase 1 (Critical):**
1. Fix flow: selections return to main page
2. Show selections on main page cards
3. Add continue button on main page

**Phase 2 (Important):**
4. Add year selector
5. Add date validation
6. Make approval cards editable

**Phase 3 (Polish):**
7. Add seasonal warnings
8. Add BETA badges everywhere
9. Improve copy/messaging

---

This is a significant redesign. Shall I:
**A)** Implement Phase 1 first (core flow fix)?
**B)** Implement all at once (may take longer)?
**C)** Create a new file and we swap it?

**What's your preference?** 🎯

