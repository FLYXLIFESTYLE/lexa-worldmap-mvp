# Stage 2: Experience Script (Full Document)

## Purpose
The complete emotional journey document — day-by-day narrative with themes, anchors, and experiences. This is what the user accesses in their account and what becomes the "product" for the charter experience.

---

## When Generated
- **Trigger:** User saves experience to account OR admin requests full generation
- **Timing:** Background generation (async), typically 10-30 seconds
- **Access:** Gated to saved/premium/booked users

---

## Document Structure

### 2.1 Cover Page

**Elements:**
```
[LEXA Curated Experiences header]

{EXPERIENCE_NAME}™
{Tagline}

───  ✦  ───

{Subtitle / Positioning Statement}
{Journey Type} · {Region} · {Duration}

[Hook quote box]
"{Full hook text}"

[LEXA footer]
```

**Example:**
```
LEXA Curated Experiences
French Riviera · Summer 2026 · 8 Days

PHOENIX RISING™
Rise From Within

───  ◈  ───

A Wellness Voyage for Those Ready to Reclaim Their Power

"You've conquered markets. Built empires. Won battles others couldn't even see.
But somewhere along the way, the fire that drove you started burning you instead.
The fire never went out. It's waiting for you to return."

LEXA · Never Ask 'Now What?' Again.
```

---

### 2.2 The Philosophy

**Purpose:** Explain WHY this journey works — the underlying insight.

**Length:** 200-300 words

**Structure:**
1. Opening insight (the core truth)
2. Why typical approaches fail
3. How this approach is different
4. The promise/outcome

**Example (Because of Us):**
```
THE PHILOSOPHY
Why This Journey Works

You cannot pour from an empty cup. And you cannot truly see your partner 
when you've forgotten how to see yourself.

This is why most couples retreats fail. They ask two exhausted people to 
"reconnect" without first giving each person the space to remember who they 
are. You end up performing intimacy instead of experiencing it.

Because of Us™ is designed differently. The first days are about individual 
restoration — releasing what you've been carrying, rediscovering who you are 
beneath all the roles you play. Your partner is right there, doing the same 
sacred work alongside you. You're not apart. You're parallel.

Then, when you've each begun to find yourselves again, you turn toward each 
other. And what you see is not the exhausted logistics partner you've been 
managing life with — but the person you fell in love with.

By the final days, you're not reconnecting — you're amplifying. Two whole 
people choosing each other, with nothing left to prove.

Things don't slow down. You slow them. Together. Because of us.
```

**Neo4j Query:**
```cypher
MATCH (ea:experience_arc {code: $arc_code})
RETURN ea.description AS base,
       ea.core_transformation AS transformation,
       ea.narrative_structure AS structure
```

---

### 2.3 The Arc (Visual Journey)

**Purpose:** Visual representation of the emotional journey phases.

**Format:** Timeline or phase boxes showing progression

**Structure:**
```
Phase 1 Name (Days X-Y)    →    Phase 2 Name (Days X-Y)    →    Phase 3 Name
Emotional Focus                  Emotional Focus                  Emotional Focus
Brief descriptor                 Brief descriptor                 Brief descriptor
```

**Example (Phoenix Rising):**
```
THE ARC
The Journey of Rising

┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│    WELCOME      │    │    DESCENT      │    │    RISING       │
│    Day 1        │ →  │    Days 2-3     │ →  │    Days 4-6     │
│                 │    │                 │    │                 │
│    Relief       │    │  Stillness →    │    │  Recognition →  │
│                 │    │  Confrontation  │    │  Vitality →     │
│  "You made it"  │    │                 │    │  Power          │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                                      │
                                                      ▼
                                          ┌─────────────────┐
                                          │    FLIGHT       │
                                          │    Days 7-8     │
                                          │                 │
                                          │  Integration →  │
                                          │  Freedom        │
                                          │                 │
                                          │  "Forever       │
                                          │   rising"       │
                                          └─────────────────┘
```

**Day-by-Day Quick Reference:**
```
Day 1: Arrive    (Welcome)  → Relief
Day 2: Release   (Descent)  → Surrender  
Day 3: Ashes     (Descent)  → Confrontation
Day 4: Ember     (Rising)   → Recognition
Day 5: Spark     (Rising)   → Vitality
Day 6: Flame     (Rising)   → Power
Day 7: Rise      (Flight)   → Integration
Day 8: Flight    (Flight)   → Freedom
```

**Neo4j Query:**
```cypher
MATCH (ap:arc_phase)-[:BELONGS_TO]->(ea:experience_arc {code: $arc_code})
RETURN ap.sequence AS sequence,
       ap.name AS phase_name,
       ap.typical_days AS days,
       ap.emotional_core AS emotional_core,
       ap.description AS description,
       ap.color_code AS color
ORDER BY ap.sequence
```

---

### 2.4 Day-by-Day Journey

**Purpose:** The heart of the document — full narrative for each day.

**Format per Day:**
```
[Phase Indicator]

DAY {NUMBER}
{TITLE}

{Subtitle: Locations}
{Theme Line}

┌─────────────────────────────────────────┐
│  Emotional Core: {EMOTION}              │
└─────────────────────────────────────────┘

{Full Narrative - 150-250 words}

┌─────────────────────────────────────────┐
│  Memory Anchor                          │
│  "{Anchor phrase}"                      │
└─────────────────────────────────────────┘

Experiences:
• {Experience 1}
• {Experience 2}
• {Experience 3}
...
```

**Example (Day 3 - Phoenix Rising):**
```
                              DESCENT

                            DAY THREE
                             ASHES

              Monaco → Cap d'Antibes
      Truth · Confrontation · What Have You Been Sacrificing?

            ┌─────────────────────────────────────────┐
            │     Emotional Core: CONFRONTATION       │
            └─────────────────────────────────────────┘

This is the day the phoenix must acknowledge the ashes. At Hotel du Cap-Eden-Roc 
— perhaps the most legendary sanctuary on this coast — you have space to finally 
ask the question you've been avoiding: What have I been sacrificing?

Not the obvious things. The quiet ones. The parts of yourself you set aside 
because there wasn't time, wasn't space, wasn't permission. The hobbies that 
made you feel alive. The friendships that required maintenance. The dreams that 
seemed impractical once success demanded everything.

This isn't comfortable. Transformation never is. But in the stillness of these 
gardens, in the care of hands that ask nothing of you, something shifts. The 
ashes aren't failure. They're fertilizer. They're the necessary clearing for 
what wants to grow next.

By evening, you notice: the question isn't painful anymore. It's clarifying. 
And in that clarity, something stirs. A recognition that what burned away 
wasn't your power — it was everything that was obscuring it.

            ┌─────────────────────────────────────────┐
            │  Memory Anchor                          │
            │  "What have you been sacrificing?       │
            │   It's safe to look now."               │
            └─────────────────────────────────────────┘

• Morning mobility & breathwork
• Scenic cruise to Cap d'Antibes
• Hotel du Cap-Eden-Roc Spa — bespoke treatment journey
• Private garden reflection time
• NAD+ IV therapy
• Journaling & integration
• Magnesium sleep ritual
```

**Neo4j Query:**
```cypher
MATCH (day:script_day)-[:PART_OF]->(es:experience_script {lexa_uid: $script_id})
MATCH (day)-[:IN_PHASE]->(ap:arc_phase)
OPTIONAL MATCH (exp:script_experience)-[:SCHEDULED_ON]->(day)
OPTIONAL MATCH (exp)-[:USES_POI]->(poi:poi)
WITH day, ap, exp, poi
ORDER BY day.day_number, exp.sequence
WITH day, ap, collect({
  sequence: exp.sequence,
  description: coalesce(exp.custom_description, poi.short_description),
  poi_name: poi.name,
  timing: exp.timing
}) AS experiences
RETURN day.day_number AS day_number,
       day.title AS title,
       day.subtitle AS subtitle,
       day.theme AS theme,
       day.emotional_core AS emotional_core,
       day.narrative AS narrative,
       day.memory_anchor AS anchor,
       ap.name AS phase,
       ap.color_code AS phase_color,
       experiences
ORDER BY day.day_number
```

---

### 2.5 Signature Experiences (Expanded)

**Purpose:** Detailed description of key experiences (more than Stage 1 highlights).

**Format:** 7-10 experiences with full descriptions

**Example:**
```
SIGNATURE EXPERIENCES
The Pillars of Your Rising

01  PRE-VOYAGE POWER PROFILING
    Before you board, a confidential consultation maps your stress patterns, 
    energy leaks, and restoration goals. Sleep quality. Nutritional gaps. 
    Movement preferences. Recovery priorities. Your journey is calibrated to 
    where you actually are — not a generic wellness programme.

02  THERMES MARINS MONTE-CARLO
    The legendary thermal spa becomes your temple of release. Seawater pools, 
    cryotherapy chambers, and the hands of therapists who have restored 
    everyone from royalty to founders. Your protocol is designed specifically 
    for what your body is requesting.

03  THE NIETZSCHE PATH
    Walk the clifftop trail in Èze where the philosopher conceived his vision 
    of eternal return — not power over others, but power over oneself. Between 
    earth and sky, no one needs your opinion, your decision, your strength. 
    Just your presence.

...
```

---

### 2.6 The Kit

**Purpose:** What they take home — making the experience portable.

**Format:** List with descriptions

**Example (Phoenix Rising):**
```
THE PHOENIX RISING™ KIT
The Fire Becomes Portable

You leave with more than memories:

◈ Sleep Ritual Elements
  The specific components of your onboard sleep protocol — 
  magnesium, essential oils, and the exact practices that restored you.

◈ Guided Power Meditation
  A recorded meditation capturing the voice and pacing that 
  brought you back to yourself during the journey.

◈ Your Experience Script
  This document — personalized with your notes, insights, and 
  the specific anchors that resonated most deeply.

◈ Memory Anchor Cards
  Each day's anchor phrase on a card you can place anywhere 
  you need a reminder of who you are when fully restored.

◈ Signature Scent
  The specific fragrance that accompanied your transformation — 
  one inhale returns you to the moment you rose.
```

---

### 2.7 Closing Invitation

**Purpose:** Emotional close that frames departure as beginning.

**Format:** Poetic closing, 100-150 words

**Example (Phoenix Rising):**
```
THE INVITATION

───  ◈  ───

You have nothing left to prove.

Only everything left to live.

The world will keep demanding.
Life will keep piling on.

But now you know something you didn't before:
The fire never went out.
It was waiting for you to return.

And now that you've returned —
now that you've risen from within —
that fire is yours.

Not to burn yourself.
Not to prove your worth.

But to light the way forward.
To warm what matters.
To illuminate what's possible when you stop
exhausting yourself into achievement
and start living from power.

You rose from within.
And that fire is yours now.

Forever.

───  ◈  ───

PHOENIX RISING™
Rise From Within

A LEXA Curated Experience
Never Ask 'Now What?' Again.
```

---

## Complete Stage 2 Output Structure

```typescript
interface Stage2Output {
  // Document metadata
  document_id: string;
  script_id: string;
  generated_at: Date;
  version: number;
  
  // Cover
  cover: {
    experience_name: string;
    tagline: string;
    subtitle: string;
    journey_type: string;
    region: string;
    duration: string;
    hook: string;
  };
  
  // Philosophy
  philosophy: {
    title: string;
    content: string;  // 200-300 words
  };
  
  // Arc
  arc: {
    title: string;
    phases: {
      name: string;
      days: string;
      emotional_core: string;
      description: string;
      color: string;
    }[];
    day_summary: {
      day: number;
      title: string;
      phase: string;
      emotion: string;
    }[];
  };
  
  // Days
  days: {
    day_number: number;
    title: string;
    subtitle: string;
    theme: string;
    phase: string;
    phase_color: string;
    emotional_core: string;
    narrative: string;
    memory_anchor: string;
    experiences: {
      sequence: number;
      description: string;
      poi_name?: string;
      timing?: string;
    }[];
  }[];
  
  // Signature experiences
  signature_experiences: {
    number: string;
    title: string;
    description: string;
  }[];
  
  // Kit
  kit: {
    title: string;
    subtitle: string;
    items: {
      name: string;
      description: string;
    }[];
  };
  
  // Closing
  closing: {
    title: string;
    content: string;
    experience_name: string;
    tagline: string;
  };
}
```

---

## Document Generation

### Output Formats

| Format | Use Case | Generator |
|--------|----------|-----------|
| **DOCX** | Download, print, share | docx library (Node.js) |
| **PDF** | Formal presentation | Puppeteer or docx→PDF |
| **HTML** | In-app viewing | React component |
| **JSON** | API response, storage | Direct from Neo4j |

### DOCX Generation Template

```typescript
// src/documents/stage2/generator.ts

import { Document, Packer, Paragraph, TextRun, Table } from 'docx';

export async function generateStage2Document(
  scriptId: string
): Promise<Buffer> {
  
  // 1. Fetch all data from Neo4j
  const scriptData = await fetchScriptData(scriptId);
  const arcData = await fetchArcData(scriptData.arc_code);
  const daysData = await fetchDaysData(scriptId);
  
  // 2. Build document sections
  const doc = new Document({
    sections: [{
      children: [
        ...buildCoverPage(scriptData, arcData),
        ...buildPhilosophySection(arcData),
        ...buildArcSection(arcData),
        ...buildDaySections(daysData),
        ...buildSignatureSection(scriptData),
        ...buildKitSection(arcData),
        ...buildClosingSection(arcData)
      ]
    }]
  });
  
  // 3. Generate buffer
  return await Packer.toBuffer(doc);
}
```

---

## Quality Checklist

- [ ] Cover creates immediate premium impression
- [ ] Philosophy explains the "why" clearly
- [ ] Arc visualization is easy to understand
- [ ] Each day narrative is 150-250 words
- [ ] Each day has clear emotional core
- [ ] Memory anchors are memorable and portable
- [ ] Experiences listed are specific, not generic
- [ ] Signature experiences go deeper than Stage 1
- [ ] Kit contents are tangible and useful
- [ ] Closing frames departure as beginning
- [ ] Total document is 15-25 pages
- [ ] Consistent formatting throughout
- [ ] No logistics (booking info, pricing) — this is the story

---

## Files to Implement

```
/src/documents/stage2/
├── generator.ts        # Main DOCX generation
├── sections/
│   ├── cover.ts
│   ├── philosophy.ts
│   ├── arc.ts
│   ├── days.ts
│   ├── signature.ts
│   ├── kit.ts
│   └── closing.ts
├── styles.ts           # Document styling constants
├── queries.ts          # Neo4j queries for data
└── types.ts            # TypeScript interfaces
```

---

## API Endpoint

```typescript
POST /api/scripts/:script_id/generate/stage2

Request:
{
  format: "docx" | "pdf" | "json"
}

Response (JSON):
{
  success: boolean,
  document_url?: string,  // For docx/pdf
  stage2?: Stage2Output   // For json
}

GET /api/scripts/:script_id/documents/stage2

Headers:
{
  Authorization: "Bearer {token}"
}

Response:
- 200: Document file stream
- 403: Insufficient access level
- 404: Document not generated
```
