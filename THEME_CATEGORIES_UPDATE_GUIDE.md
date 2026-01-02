# Theme Categories Update Guide
**Date:** December 31, 2025  
**Impact Assessment:** Database, Neo4j, Scoring, UI

---

## 📊 Current State

### Supabase: `experience_briefs` Table
**NEW FIELD** (from migration 010):
- `theme_category` TEXT - High-level category name
- `hook` TEXT - Compelling one-liner
- `description` TEXT - Full description

### Neo4j Graph Database
**Current Theme Categories** (14 total):
According to memory-bank, you have **14 theme_category nodes** in Neo4j connected to 300,000+ POIs via `HAS_THEME` relationships.

**Documented 12 Themes** (from productContext.md):
1. Romance & Intimacy 💕
2. Adventure & Exploration 🏔️
3. Wellness & Transformation 🧘
4. Culinary Excellence 🍷
5. Cultural Immersion 🎭
6. Privacy & Seclusion 🏝️
7. Celebration & Milestones 🎉
8. Creative & Artistic 🎨
9. Active & Sport 🏃
10. Family Connection 👨‍👩‍👧‍👦
11. Business & Networking 💼
12. Spiritual & Mindfulness 🕉️

*(2 additional themes not documented - check Neo4j)*

---

## ⚠️ Impact Analysis: Updating Theme Categories

### 1. **Supabase `experience_briefs.theme_category`**
**Impact:** ✅ **LOW - Safe to update**

This is a NEW field (just added in migration 010). It's:
- Not yet populated with data
- No foreign key constraints
- Simple TEXT field
- Used only for display in ScriptLibraryCard

**What you can do:**
- Change category names freely
- Add new categories
- No migration needed (it's just a string)

**Example:**
```sql
-- Update existing scripts (when you have data)
UPDATE experience_briefs
SET theme_category = 'Romance & Connection'
WHERE theme_category = 'Romance & Intimacy';
```

---

### 2. **Neo4j Graph Database**
**Impact:** ⚠️ **MEDIUM - Requires careful planning**

Theme categories in Neo4j are **nodes** with relationships:
```cypher
(poi:poi)-[:HAS_THEME]->(theme:theme_category)
```

**What's affected:**
- 300,000+ POIs have `HAS_THEME` relationships
- These relationships determine which POIs appear for which themes
- Backend queries filter by `theme.name`
- Changes require Neo4j Cypher updates

**Options:**

#### **Option A: Rename Existing Themes (Preserves Relationships)**
```cypher
// Rename a theme category node
MATCH (t:theme_category {name: 'Romance & Intimacy'})
SET t.name = 'Romance & Connection'
RETURN t;
```
✅ Pros: All POI relationships stay intact  
⚠️ Cons: Must update every query that references old name

#### **Option B: Add New Theme + Migrate POIs**
```cypher
// 1. Create new theme
CREATE (t:theme_category {name: 'Romance & Connection'});

// 2. Copy relationships
MATCH (poi:poi)-[r:HAS_THEME]->(old:theme_category {name: 'Romance & Intimacy'})
CREATE (poi)-[:HAS_THEME]->(new:theme_category {name: 'Romance & Connection'});

// 3. Delete old relationships and node
MATCH (old:theme_category {name: 'Romance & Intimacy'})
DETACH DELETE old;
```
✅ Pros: Clean new structure  
⚠️ Cons: Downtime, requires transaction

#### **Option C: Keep Both (Alias System)**
```cypher
// Add alias property
MATCH (t:theme_category {name: 'Romance & Intimacy'})
SET t.display_name = 'Romance & Connection'
RETURN t;
```
✅ Pros: No breaking changes, backward compatible  
✅ **RECOMMENDED** for MVP

---

### 3. **Luxury Score & Confidence Score**
**Impact:** ✅ **NONE - Separate systems**

These scores are **NOT tied to theme categories**:

**Luxury Score:**
- Stored in `experience_entities.luxury_score_base` (Supabase)
- Stored in POI properties in Neo4j
- Based on: price level, ratings, amenities, awards
- **Independent of themes**

**Confidence Score:**
- Stored in `experience_entities.confidence_score` (Supabase)
- Based on: data source quality, verification status
- **Independent of themes**

**Example Query (unchanged):**
```cypher
MATCH (poi:poi)-[:HAS_THEME]->(theme:theme_category {name: 'Romance & Intimacy'})
WHERE poi.luxury_score > 0.8
  AND poi.confidence_score > 0.7
RETURN poi;
```

Theme name can change without affecting scores!

---

### 4. **Frontend UI Components**
**Impact:** ⚠️ **MEDIUM - Requires updates**

**Files to Update:**
1. `components/theme-selector.tsx` - Visual theme cards
2. `app/experience/page.tsx` - Theme selection page
3. `components/account/ScriptLibraryCard.tsx` - Display theme category
4. Any hardcoded theme arrays

**Example Update:**
```typescript
// OLD
const themes = [
  { name: 'Romance & Intimacy', icon: '💕' },
  // ...
];

// NEW
const themes = [
  { name: 'Romance & Connection', icon: '💕' },
  // ...
];
```

---

## 🎯 Recommended Approach: **Alias System**

### Step 1: Add Display Names to Neo4j
```cypher
// Add display_name property to all themes
MATCH (t:theme_category)
SET t.display_name = t.name  // Initially same as name
RETURN t;

// Then update specific ones
MATCH (t:theme_category {name: 'Romance & Intimacy'})
SET t.display_name = 'Romance & Connection'
RETURN t;
```

### Step 2: Update Backend Queries
```python
# OLD (direct name match)
query = """
MATCH (poi:poi)-[:HAS_THEME]->(theme:theme_category)
WHERE theme.name = $theme_name
RETURN poi
"""

# NEW (use internal name, display separately)
query = """
MATCH (poi:poi)-[:HAS_THEME]->(theme:theme_category)
WHERE theme.name = $theme_internal_name
RETURN poi, theme.display_name as theme_label
"""
```

### Step 3: Update Frontend
```typescript
// Map display names to internal names
const themeMapping = {
  'Romance & Connection': 'Romance & Intimacy',  // Display -> Internal
  'Adventure & Discovery': 'Adventure & Exploration',
  // ...
};

// Use display name in UI, send internal name to backend
<ThemeCard 
  displayName="Romance & Connection"
  internalName="Romance & Intimacy"
/>
```

### Step 4: Update Supabase
```sql
-- For new scripts, use display names
UPDATE experience_briefs
SET theme_category = 'Romance & Connection'
WHERE theme = 'Romance & Intimacy';
```

---

## 📝 What You Need to Decide

### **Question 1: What theme names do you want?**
Current 12:
1. Romance & Intimacy
2. Adventure & Exploration
3. Wellness & Transformation
4. Culinary Excellence
5. Cultural Immersion
6. Privacy & Seclusion
7. Celebration & Milestones
8. Creative & Artistic
9. Active & Sport
10. Family Connection
11. Business & Networking
12. Spiritual & Mindfulness

**Do you want to:**
- [ ] Keep these exactly as-is
- [ ] Rename some (which ones?)
- [ ] Add new ones
- [ ] Remove some

### **Question 2: Timeline**
- [ ] Update now (before launch)
- [ ] Update later (after we have real data)
- [ ] Use alias system (safest, backward compatible)

---

## 🚀 Next Steps (When You're Ready)

1. **Tell me which themes you want to update**
2. **I'll create the migration scripts for:**
   - Neo4j Cypher updates
   - Frontend component updates
   - Backend query updates
   - Supabase data migration (when needed)

3. **We'll test on staging first**
4. **Then deploy to production**

---

## 💡 My Recommendation

**Wait until after unstructured data upload is working**, then:
1. See what themes users actually choose
2. Analyze POI coverage per theme
3. Make data-driven decisions about renaming/merging
4. Use alias system for smooth transition

**For now:** Keep existing theme structure, focus on upload functionality.

---

## 📂 Ready for Unstructured Data Upload

Let me know when you're ready! We can work on:
- PDF upload (experience guides, brochures)
- Image upload with OCR (menus, flyers)
- Text extraction and embedding
- Automatic POI extraction
- Theme classification
- Neo4j integration

Just say "Let's start with unstructured data upload" and we'll begin! 🚀
