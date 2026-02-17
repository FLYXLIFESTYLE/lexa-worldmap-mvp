# Stage 1: Discovery Output (Chat Response)

## Purpose
Immediate response in chat that creates desire and emotional resonance. This is what the user sees first — it must hook them instantly.

---

## When Generated
- **Trigger:** User expresses interest through chat conversation
- **Timing:** Real-time, immediate response
- **Also generated:** Alongside Stage 5 (Teaser) for admin-created experiences

---

## Deliverables

### 1.1 Experience Name & Tagline

**Format:**
```
{EXPERIENCE_NAME}™
{Tagline}
```

**Example:**
```
Because of Us™
Back to Me. Back to You. Back to Us.
```

**Generation Logic:**
- If using existing arc: Pull from `experience_arc.name` and `experience_arc.tagline`
- If custom: Generate based on emotional theme + journey type

**Neo4j Query:**
```cypher
MATCH (ea:experience_arc {code: $arc_code})
RETURN ea.name AS name, ea.tagline AS tagline
```

---

### 1.2 Hook (2-3 sentences)

**Purpose:** Create immediate emotional recognition. The reader should feel "they understand me."

**Format:** 2-3 sentences, poetic but grounded, speaks directly to pain point.

**Examples:**

*Phoenix Rising:*
```
You've conquered markets. Built empires. Won battles others couldn't even see.
But somewhere along the way, the fire that drove you started burning you instead.
```

*Because of Us:*
```
You started this together. You built everything together — the empire, the family, 
the life others envy. But somewhere along the way, you stopped being lovers 
and became logistics partners.
```

**Generation Logic:**
```typescript
interface HookInput {
  arc_code: string;
  guest_archetype: string;
  custom_keywords?: string[];
}

// Pull from arc if standard
// Generate custom if keywords suggest variation
```

**Neo4j Query:**
```cypher
MATCH (ea:experience_arc {code: $arc_code})
RETURN ea.hook AS hook
```

**Customization Rules:**
- If user mentioned specific pain points, weave them in
- Keep under 50 words
- End with a pivot toward hope/solution

---

### 1.3 Emotional Description (150-200 words)

**Purpose:** Paint the picture of what's possible. Not logistics — feeling.

**Structure:**
1. Acknowledge the current state (1-2 sentences)
2. Introduce the solution concept (2-3 sentences)
3. Describe the transformation journey (3-4 sentences)
4. End with the outcome/feeling (1-2 sentences)

**Example (Because of Us):**
```
Because of Us™ is an eight-day wellness voyage along the French Riviera, 
designed for couples who have built extraordinary lives together — and are 
ready to remember why.

This is not couples therapy on water. It's not a romantic package with rose 
petals and champagne. It's something far more rare: space and permission to 
return — first to yourself, then to each other.

The journey begins with individual restoration. World-class spas. Personalised 
wellness protocols. Time to release what you've been carrying and remember who 
you are beneath all the roles you play. Then, restored, you turn toward each 
other. And what you see is not the exhausted co-pilot you've been managing 
life with — but the person you fell in love with.

You will forget the name of the yacht. You will forget the spa. But you will 
never forget the moment you looked at each other and realised: we're still us.
```

**Generation Logic:**
```typescript
interface DescriptionInput {
  arc: ExperienceArc;
  region: string;
  duration: number;
  journey_type: string;
  primary_themes: string[];
}

function generateDescription(input: DescriptionInput): string {
  // Template structure with variable insertion
  // Pull arc.description as base
  // Customize with region and duration
  // Add theme-specific language
}
```

**Neo4j Query:**
```cypher
MATCH (ea:experience_arc {code: $arc_code})
MATCH (ea)-[:PRIMARY_THEME]->(pt:theme_category)
RETURN ea.description AS base_description,
       ea.core_transformation AS transformation,
       collect(pt.name) AS themes
```

---

### 1.4 Signature Highlights (5-7 items)

**Purpose:** Tantalizing glimpses that create intrigue without revealing the full journey.

**Format:** Title + 1-2 sentence description

**Rules:**
- Never reveal full day-by-day
- Focus on emotional outcomes, not logistics
- Include at least one "legendary" reference (famous POI or unique access)
- Include the kit/takeaway

**Example (Phoenix Rising):**
```
◈ Pre-Voyage Power Profiling
  Before you board, a confidential consultation maps your stress patterns 
  and restoration goals. Your journey is calibrated to you.

◈ The Riviera's Most Legendary Sanctuaries
  Hotel du Cap-Eden-Roc. Thermes Marins Monte-Carlo. Cheval Blanc St-Tropez. 
  Pilgrimages to places where the world's most powerful have come to remember themselves.

◈ The Nietzsche Path
  Walk the clifftop trail where the philosopher conceived his vision of eternal 
  return — not power over others, but power over oneself.

◈ Precision Longevity Protocols
  IV therapy, NAD+, cryotherapy, thermal circuits — your cells receiving what 
  they've been requesting.

◈ The Stillpoint
  There is a day — the sacred pause — where transformation becomes possible. 
  Not through doing, but through finally stopping.

◈ Memory Anchors
  Each day is designed around a single powerful phrase. When life gets loud 
  again, these anchors bring you back.

◈ The Phoenix Rising™ Kit
  Sleep ritual elements, guided meditation, and your written Experience Script. 
  The fire becomes portable.
```

**Generation Logic:**
```typescript
interface HighlightsInput {
  arc: ExperienceArc;
  signature_pois: POI[];
  rituals: RitualTemplate[];
  region: string;
}

function generateHighlights(input: HighlightsInput): Highlight[] {
  const highlights = [];
  
  // Always include:
  // 1. Pre-voyage element
  // 2. Signature POI(s) - grouped as "legendary sanctuaries"
  // 3. One unique experience (path, ritual, etc.)
  // 4. Wellness/longevity element
  // 5. The emotional turning point
  // 6. Memory anchors concept
  // 7. The kit/takeaway
  
  return highlights.slice(0, 7);
}
```

**Neo4j Query:**
```cypher
MATCH (ea:experience_arc {code: $arc_code})
MATCH (rt:ritual_template)-[:USED_IN]->(ea)
OPTIONAL MATCH (ea)-[:PRIMARY_THEME]->(tc:theme_category)
RETURN ea.name AS arc,
       collect(DISTINCT rt.name) AS rituals,
       collect(DISTINCT tc.name) AS themes
```

---

### 1.5 Target Guest Profile

**Purpose:** Help user self-identify. "This is for me."

**Format:** "This voyage is for those who..." + 5-7 criteria

**Example (Phoenix Rising):**
```
This Voyage Is For Those Who...

◆ Have achieved extraordinary success — and are exhausted by the weight of maintaining it
◆ Are tired of being the strong one, the capable one, the one everyone depends on
◆ Know they're running on empty but haven't had permission to stop
◆ Want restoration without sacrificing quality, privacy, or sophistication
◆ Don't need another achievement — they need to feel alive again
◆ Are ready to stop proving and start living
```

**Generation Logic:**
```typescript
function generateTargetProfile(archetype: GuestArchetype): string[] {
  // Pull from archetype.core_need, archetype.fears, archetype.desires
  // Transform into "for those who..." statements
  return criteria;
}
```

**Neo4j Query:**
```cypher
MATCH (ea:experience_arc {code: $arc_code})-[:RESONATES_WITH]->(ga:guest_archetype)
RETURN ga.name AS archetype,
       ga.core_need AS core_need,
       ga.fears AS fears,
       ga.desires AS desires,
       ga.trigger_phrases AS triggers
```

---

### 1.6 Voyage Quick Facts

**Purpose:** Practical info at a glance

**Format:** Simple key-value display

**Example:**
```
Duration:     8 Days / 7 Nights
Region:       French Riviera
Season:       Summer 2026
Embarkation:  St-Laurent-du-Var
Type:         Individual Wellness
```

**Generation Logic:**
- Pull from script input parameters
- Format consistently

---

## Complete Stage 1 Output Structure

```typescript
interface Stage1Output {
  experience_name: string;
  tagline: string;
  hook: string;
  description: string;
  highlights: {
    title: string;
    description: string;
  }[];
  target_profile: {
    intro: string;
    criteria: string[];
  };
  quick_facts: {
    duration: string;
    region: string;
    season: string;
    embarkation: string;
    type: string;
  };
  
  // Metadata
  arc_code: string;
  journey_type: string;
  generated_at: Date;
}
```

---

## Chat Display Template

```markdown
## {experience_name}™
*{tagline}*

---

{hook}

───

{description}

---

### A Glimpse of What Awaits

{highlights - formatted as list}

---

### This Voyage Is For Those Who...

{target_profile.criteria - formatted as list}

---

**{duration}** · **{region}** · **{type}**

---

*Would you like to see the day-by-day journey? I can save it to your account.*
```

---

## Quality Checklist

- [ ] Hook creates immediate emotional recognition
- [ ] Description paints transformation, not logistics
- [ ] Highlights tantalize without revealing full journey
- [ ] Target profile enables self-identification
- [ ] Language is intimate, not salesy
- [ ] Under 500 words total (scannable)
- [ ] Ends with clear next step (save to account)

---

## Files to Implement

```
/src/documents/stage1/
├── generator.ts      # Main generation logic
├── templates.ts      # Text templates by arc
├── formatters.ts     # Output formatting
└── types.ts          # TypeScript interfaces
```

---

## API Endpoint

```typescript
POST /api/scripts/generate/stage1

Request:
{
  conversation_id?: string,
  arc_code: string,
  journey_type: string,
  region: string,
  duration: number,
  guest_keywords?: string[],
  custom_name?: string
}

Response:
{
  success: boolean,
  stage1: Stage1Output,
  script_id: string  // For saving to account
}
```
