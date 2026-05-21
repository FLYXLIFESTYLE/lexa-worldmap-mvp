/**
 * LEXA Script Engine - Stage 1: Discovery Output
 *
 * Generates the immediate chat response that creates desire
 * and emotional resonance. This is what the user sees first.
 *
 * Deliverables:
 * - Experience Name & Tagline
 * - Hook (2-3 sentences)
 * - Emotional Description (150-200 words)
 * - Signature Highlights (5-7 items)
 * - Target Guest Profile
 * - Voyage Quick Facts
 */

import Anthropic from "@anthropic-ai/sdk";
import { fetchArcData, fetchSignaturePOIs } from "../queries";
import type {
  Stage1Output,
  ExperienceArc,
  ArcPhase,
  GuestArchetype,
  RitualTemplate,
} from "../types";

// ============================================================================
// MAIN GENERATOR
// ============================================================================

export async function generateStage1(input: {
  arc_code: string;
  journey_type: string;
  region: string;
  duration: number;
  guest_keywords?: string[];
  custom_name?: string;
  season?: string;
  emotional_profile?: {
    desired_feelings?: string[];
    avoid_fears?: string[];
    activity_interests?: string[];
  };
}): Promise<Stage1Output> {
  // 1. Fetch all arc data from Neo4j
  const arcData = await fetchArcData(input.arc_code);
  if (!arcData) {
    throw new Error(`Arc not found: ${input.arc_code}`);
  }

  const { arc, phases, archetypes, rituals } = arcData;

  // 2. Fetch signature POIs — now uses emotional profile for better matching
  const pois = await fetchSignaturePOIs(
    input.region,
    undefined,
    10,
    input.emotional_profile
  );

  // 3. Generate each section
  const experience_name = input.custom_name || arc.name;
  const tagline = arc.tagline;
  const hook = await generateHook(arc, archetypes, input.guest_keywords);
  const description = await generateDescription(
    arc,
    input.region,
    input.duration,
    input.journey_type
  );
  const highlights = generateHighlights(arc, pois, rituals, input.region);
  const target_profile = generateTargetProfile(archetypes);

  const season = input.season || determineSeason();

  return {
    experience_name,
    tagline,
    hook,
    description,
    highlights,
    target_profile,
    quick_facts: {
      duration: `${input.duration} Days / ${input.duration - 1} Nights`,
      region: input.region,
      season,
      embarkation: determineEmbarkation(input.region),
      type: formatJourneyType(input.journey_type, arc.name),
    },
    arc_code: input.arc_code,
    journey_type: input.journey_type,
    generated_at: new Date().toISOString(),
  };
}

// ============================================================================
// SECTION GENERATORS
// ============================================================================

/**
 * Generate the hook — 2-3 sentences that create immediate emotional recognition.
 * Uses the arc's built-in hook, customised with guest keywords if available.
 */
async function generateHook(
  arc: ExperienceArc,
  archetypes: GuestArchetype[],
  guestKeywords?: string[]
): Promise<string> {
  // If no custom keywords, use the arc's standard hook
  if (!guestKeywords || guestKeywords.length === 0) {
    return arc.hook;
  }

  // With keywords, use Claude to personalise the hook
  try {
    const anthropic = new Anthropic();
    const primaryArchetype = archetypes[0];

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 200,
      messages: [
        {
          role: "user",
          content: `You are writing for LEXA, an ultra-luxury yacht experience company. 
          
Create a personalised hook (2-3 sentences, under 50 words) for the "${arc.name}" experience.

Base hook: "${arc.hook}"

The guest used these words/phrases: ${guestKeywords.join(", ")}

Archetype: ${primaryArchetype?.name} — ${primaryArchetype?.description}

Rules:
- Speak directly to their pain point
- End with a pivot toward hope/solution
- Intimate, not salesy
- Under 50 words
- Do NOT use quotation marks around the result

Return ONLY the hook text, nothing else.`,
        },
      ],
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text : "";
    return text.trim() || arc.hook;
  } catch {
    // Fallback to standard hook if Claude fails
    return arc.hook;
  }
}

/**
 * Generate the emotional description — 150-200 words painting the transformation.
 */
async function generateDescription(
  arc: ExperienceArc,
  region: string,
  duration: number,
  journeyType: string
): Promise<string> {
  try {
    const anthropic = new Anthropic();

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 400,
      messages: [
        {
          role: "user",
          content: `You are writing for LEXA, an ultra-luxury yacht experience company.

Write an emotional description (150-200 words) for the "${arc.name}" experience.

Details:
- Region: ${region}
- Duration: ${duration} days
- Journey type: ${journeyType}
- Tagline: ${arc.tagline}
- Core transformation: ${arc.core_transformation}
- Base description: ${arc.description}

Structure:
1. What this is (1-2 sentences) — name, duration, region, who it's for
2. What this is NOT (differentiation) — 1-2 sentences
3. The approach (high-level) — 2-3 sentences
4. The outcome/feeling — 1-2 sentences with a memorable closing line

Rules:
- Paint transformation, not logistics
- Intimate, poetic but grounded
- No bullet points
- No pricing or booking info
- 150-200 words
- Do NOT use quotation marks around the result

Return ONLY the description text, nothing else.`,
        },
      ],
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text : "";
    return text.trim() || arc.description;
  } catch {
    return arc.description;
  }
}

/**
 * Generate signature highlights — 5-7 tantalising glimpses.
 */
function generateHighlights(
  arc: ExperienceArc,
  pois: { name: string; category: string; short_description: string }[],
  rituals: RitualTemplate[],
  region: string
): { title: string; description: string }[] {
  const highlights: { title: string; description: string }[] = [];

  // 1. Pre-voyage element (always first)
  highlights.push({
    title: "Pre-Voyage Profiling",
    description:
      "Before you board, a confidential consultation maps your goals and preferences. Your journey is calibrated to you.",
  });

  // 2. Signature POIs — grouped as legendary sanctuaries
  const topPois = pois.slice(0, 3);
  if (topPois.length > 0) {
    const poiNames = topPois.map((p) => p.name).join(". ");
    highlights.push({
      title: `${region}'s Most Legendary Sanctuaries`,
      description: `${poiNames}. Pilgrimages to places where the world's most discerning have come to remember themselves.`,
    });
  }

  // 3. Unique experience based on arc
  const uniqueExperience = getUniqueExperience(arc);
  if (uniqueExperience) {
    highlights.push(uniqueExperience);
  }

  // 4. Wellness/longevity element
  highlights.push({
    title: "Precision Wellness Protocols",
    description:
      "World-class treatments, cutting-edge longevity science, and ancient healing wisdom — your body receiving what it has been requesting.",
  });

  // 5. The emotional turning point
  highlights.push({
    title: "The Stillpoint",
    description:
      "There is a day — the sacred pause — where transformation becomes possible. Not through doing, but through finally stopping.",
  });

  // 6. Memory anchors
  highlights.push({
    title: "Memory Anchors",
    description:
      "Each day is designed around a single powerful phrase. When life gets loud again, these anchors bring you back.",
  });

  // 7. The kit/takeaway
  highlights.push({
    title: `The ${arc.name}\u2122 Kit`,
    description:
      "Sleep ritual elements, guided meditation, and your written Experience Script. The transformation becomes portable.",
  });

  return highlights.slice(0, 7);
}

/**
 * Generate target guest profile — "This voyage is for those who..."
 */
function generateTargetProfile(
  archetypes: GuestArchetype[]
): { intro: string; criteria: string[] } {
  const primary = archetypes[0];
  if (!primary) {
    return {
      intro: "This Voyage Is For Those Who...",
      criteria: [
        "Are ready for something beyond ordinary luxury",
        "Seek transformation, not just relaxation",
        "Value privacy, quality, and depth",
      ],
    };
  }

  const criteria: string[] = [];

  // Build criteria from archetype data
  for (const desire of primary.desires.slice(0, 3)) {
    criteria.push(`Seek ${desire.toLowerCase()}`);
  }
  for (const fear of primary.fears.slice(0, 2)) {
    criteria.push(
      `Are tired of ${fear.toLowerCase().replace(/^being /, "").replace(/^that /, "")}`
    );
  }

  // Add the core need as closing criterion
  criteria.push(
    `Are ready: ${primary.core_need}`
  );

  return {
    intro: "This Voyage Is For Those Who...",
    criteria: criteria.slice(0, 6),
  };
}

// ============================================================================
// HELPERS
// ============================================================================

function getUniqueExperience(
  arc: ExperienceArc
): { title: string; description: string } | null {
  const experiences: Record<string, { title: string; description: string }> = {
    PHOENIX_RISING: {
      title: "The Nietzsche Path",
      description:
        "Walk the clifftop trail where the philosopher conceived his vision of eternal return — not power over others, but power over oneself.",
    },
    BECAUSE_OF_US: {
      title: "The Turn",
      description:
        "There is a moment — carefully designed but never forced — when you stop being parallel and turn toward each other. You will know it when it happens.",
    },
    AWAKENING: {
      title: "The Sensory Revival",
      description:
        "Each day awakens a different sense. Taste. Touch. Sound. Sight. Until the world has colour again and you remember what it feels like to be moved.",
    },
    CELEBRATION: {
      title: "The Crescendo Moment",
      description:
        "Every day builds toward this: the celebration that matches the magnitude of what you have achieved, survived, or become. Tears and laughter welcome.",
    },
    LEGACY_JOURNEY: {
      title: "The Family Legend",
      description:
        "The adventure designed to become the story your family tells for decades. Not a holiday — a shared triumph that bonds generations.",
    },
    DISCOVERY: {
      title: "Behind the Curtain",
      description:
        "Exclusive access to what tourists never see. Local artisans, hidden kitchens, secret gardens — the real story of a place revealed to those who stay long enough.",
    },
    THRESHOLD: {
      title: "The Space Between",
      description:
        "A day held in stillness — not rushing forward, not looking back. In the space between chapters, clarity lives. This day honours the crossing.",
    },
  };

  return experiences[arc.code] || null;
}

function determineSeason(): string {
  const month = new Date().getMonth();
  if (month >= 2 && month <= 4) return "Spring " + new Date().getFullYear();
  if (month >= 5 && month <= 7)
    return "Summer " + new Date().getFullYear();
  if (month >= 8 && month <= 10) return "Autumn " + new Date().getFullYear();
  return "Winter " + (new Date().getFullYear() + (month === 0 || month === 1 ? 0 : 1));
}

function determineEmbarkation(region: string): string {
  const embarkations: Record<string, string> = {
    "French Riviera": "St-Laurent-du-Var",
    "Amalfi Coast": "Naples",
    Balearics: "Palma de Mallorca",
    Cyclades: "Athens (Piraeus)",
    BVI: "Tortola",
    USVI: "St. Thomas",
    Bahamas: "Nassau",
    "Arabian Gulf": "Dubai",
    Croatia: "Split",
    Adriatic: "Split",
    "Ionian Sea": "Corfu",
  };

  for (const [key, value] of Object.entries(embarkations)) {
    if (region.toLowerCase().includes(key.toLowerCase())) return value;
  }
  return region;
}

function formatJourneyType(code: string, arcName: string): string {
  const types: Record<string, string> = {
    INDIVIDUAL: "Individual Wellness",
    COUPLES: "Couples",
    FAMILY: "Family",
    GROUP: "Group",
  };
  return `${types[code] || code} — ${arcName}`;
}
