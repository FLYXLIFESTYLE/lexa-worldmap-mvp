/**
 * LEXA Script Engine - Stage 2: Experience Script (Full Document)
 *
 * The complete emotional journey document — day-by-day narrative
 * with themes, anchors, and experiences.
 *
 * Generated on-demand when user saves to account or admin requests full generation.
 * Uses Claude to generate rich narratives for each day.
 */

import { v4 as uuid } from "uuid";
import Anthropic from "@anthropic-ai/sdk";
import { fetchArcData, fetchSignaturePOIs } from "../queries";
import type {
  Stage2Output,
  Stage1Output,
  ExperienceArc,
  ArcPhase,
  GuestArchetype,
  RitualTemplate,
} from "../types";

// ============================================================================
// MAIN GENERATOR
// ============================================================================

export async function generateStage2(input: {
  script_id: string;
  stage1: Stage1Output;
  arc_code: string;
  region: string;
  duration: number;
  journey_type: string;
}): Promise<Stage2Output> {
  const arcData = await fetchArcData(input.arc_code);
  if (!arcData) {
    throw new Error(`Arc not found: ${input.arc_code}`);
  }

  const { arc, phases, archetypes, rituals } = arcData;
  const pois = await fetchSignaturePOIs(input.region, undefined, 15);

  // Generate each section
  const philosophy = await generatePhilosophy(arc);
  const arcVisualization = buildArcVisualization(arc, phases, input.duration);
  const days = await generateDays(arc, phases, pois, input.duration, input.region);
  const signatureExperiences = generateSignatureExperiences(arc, pois, rituals);
  const kit = generateKit(arc);
  const closing = generateClosing(arc);

  return {
    document_id: uuid(),
    script_id: input.script_id,
    generated_at: new Date().toISOString(),
    version: 1,

    cover: {
      experience_name: input.stage1.experience_name,
      tagline: input.stage1.tagline,
      subtitle: arc.core_transformation.split(" — ")[0] || "A LEXA Curated Experience",
      journey_type: input.journey_type,
      region: input.region,
      duration: input.stage1.quick_facts.duration,
      hook: input.stage1.hook,
    },

    philosophy,
    arc: arcVisualization,
    days,
    signature_experiences: signatureExperiences,
    kit,
    closing,
  };
}

// ============================================================================
// SECTION GENERATORS
// ============================================================================

async function generatePhilosophy(
  arc: ExperienceArc
): Promise<Stage2Output["philosophy"]> {
  try {
    const anthropic = new Anthropic();
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 600,
      messages: [
        {
          role: "user",
          content: `Write the Philosophy section (200-300 words) for the "${arc.name}" experience script.

Core transformation: ${arc.core_transformation}
Narrative structure: ${arc.narrative_structure}

Structure:
1. Opening insight — the core truth (1-2 sentences)
2. Why typical approaches fail (1-2 sentences)
3. How this approach is different (2-3 sentences)
4. The promise/outcome (1-2 sentences)

Rules:
- Intimate, philosophical tone
- No bullet points
- 200-300 words
- Do not wrap in quotation marks

Return ONLY the philosophy text, nothing else.`,
        },
      ],
    });
    const text = response.content[0].type === "text" ? response.content[0].text : "";
    return {
      title: "THE PHILOSOPHY\nWhy This Journey Works",
      content: text.trim() || arc.description,
    };
  } catch {
    return {
      title: "THE PHILOSOPHY\nWhy This Journey Works",
      content: arc.description,
    };
  }
}

function buildArcVisualization(
  arc: ExperienceArc,
  phases: ArcPhase[],
  duration: number
): Stage2Output["arc"] {
  // Distribute days across phases
  const daysPerPhase = distributeDaysAcrossPhases(phases, duration);

  const daySummary: Stage2Output["arc"]["day_summary"] = [];
  let dayNumber = 1;

  for (let i = 0; i < phases.length; i++) {
    const phase = phases[i];
    const numDays = daysPerPhase[i];
    const emotions = phase.emotional_core.split(" to ");

    for (let d = 0; d < numDays; d++) {
      daySummary.push({
        day: dayNumber,
        title: getDayTitle(arc.code, dayNumber, phase),
        phase: phase.name,
        emotion: emotions[Math.min(d, emotions.length - 1)] || phase.emotional_core,
      });
      dayNumber++;
    }
  }

  return {
    title: `THE ARC\nThe Journey of ${arc.name.split(" ").pop()}`,
    phases: phases.map((p, i) => ({
      name: p.name,
      days: daysPerPhase[i] === 1
        ? `Day ${sumBefore(daysPerPhase, i) + 1}`
        : `Days ${sumBefore(daysPerPhase, i) + 1}-${sumBefore(daysPerPhase, i) + daysPerPhase[i]}`,
      emotional_core: p.emotional_core,
      description: p.description,
      color: p.color_code,
    })),
    day_summary: daySummary,
  };
}

async function generateDays(
  arc: ExperienceArc,
  phases: ArcPhase[],
  pois: { name: string; category: string; short_description: string }[],
  duration: number,
  region: string
): Promise<Stage2Output["days"]> {
  const daysPerPhase = distributeDaysAcrossPhases(phases, duration);
  const days: Stage2Output["days"] = [];
  let dayNumber = 1;
  let poiIndex = 0;

  for (let phaseIdx = 0; phaseIdx < phases.length; phaseIdx++) {
    const phase = phases[phaseIdx];
    const numDays = daysPerPhase[phaseIdx];

    for (let d = 0; d < numDays; d++) {
      const title = getDayTitle(arc.code, dayNumber, phase);
      const memoryAnchor = getMemoryAnchor(arc.code, dayNumber);

      // Assign 2-3 POIs per day
      const dayPois = pois.slice(poiIndex, poiIndex + 2);
      poiIndex = (poiIndex + 2) % Math.max(pois.length, 1);

      const narrative = await generateDayNarrative(
        arc,
        phase,
        dayNumber,
        title,
        dayPois,
        region
      );

      days.push({
        day_number: dayNumber,
        title,
        subtitle: `${region}`,
        theme: phase.emotional_core,
        phase: phase.name,
        phase_color: phase.color_code,
        emotional_core: phase.emotional_core,
        narrative,
        memory_anchor: memoryAnchor,
        experiences: [
          { sequence: 1, description: "Morning wellness ritual", timing: "07:00" },
          ...dayPois.map((p, i) => ({
            sequence: i + 2,
            description: p.short_description || p.name,
            poi_name: p.name,
            timing: i === 0 ? "10:00" : "15:00",
          })),
          { sequence: dayPois.length + 2, description: "Evening integration", timing: "20:00" },
        ],
      });

      dayNumber++;
    }
  }

  return days;
}

async function generateDayNarrative(
  arc: ExperienceArc,
  phase: ArcPhase,
  dayNumber: number,
  dayTitle: string,
  pois: { name: string; short_description: string }[],
  region: string
): Promise<string> {
  try {
    const anthropic = new Anthropic();
    const poiContext = pois.map((p) => `${p.name}: ${p.short_description}`).join("\n");

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 400,
      messages: [
        {
          role: "user",
          content: `Write a day narrative (150-250 words) for Day ${dayNumber}: "${dayTitle}" of the "${arc.name}" experience.

Phase: ${phase.name}
Emotional core: ${phase.emotional_core}
Region: ${region}
Arc transformation: ${arc.core_transformation}

POIs available today:
${poiContext || "General experiences in " + region}

Rules:
- Describe the emotional journey of this day, not logistics
- Weave in POI names naturally
- Speak directly to the reader ("you")
- Intimate, literary tone
- 150-250 words
- No bullet points or headings
- Do not wrap in quotation marks

Return ONLY the narrative text.`,
        },
      ],
    });
    const text = response.content[0].type === "text" ? response.content[0].text : "";
    return text.trim() || `Day ${dayNumber} of your journey unfolds in the ${phase.name} phase.`;
  } catch {
    return `Day ${dayNumber} of your ${arc.name} journey continues through the ${phase.name} phase. ${phase.description}`;
  }
}

function generateSignatureExperiences(
  arc: ExperienceArc,
  pois: { name: string; category: string; short_description: string }[],
  rituals: RitualTemplate[]
): Stage2Output["signature_experiences"] {
  const experiences: Stage2Output["signature_experiences"] = [];

  // Pre-voyage profiling
  experiences.push({
    number: "01",
    title: "PRE-VOYAGE PROFILING",
    description:
      "Before you board, a confidential consultation maps your goals, preferences, and restoration priorities. Your journey is calibrated to where you actually are — not a generic programme.",
  });

  // Top POIs
  pois.slice(0, 5).forEach((poi, i) => {
    experiences.push({
      number: String(i + 2).padStart(2, "0"),
      title: poi.name.toUpperCase(),
      description: poi.short_description || `A curated experience at ${poi.name}.`,
    });
  });

  // Kit
  experiences.push({
    number: String(experiences.length + 1).padStart(2, "0"),
    title: `THE ${arc.name.toUpperCase()}\u2122 KIT`,
    description:
      "Sleep ritual elements, guided meditation, memory anchor cards, signature scent, and your written Experience Script. The transformation becomes portable.",
  });

  return experiences.slice(0, 10);
}

function generateKit(arc: ExperienceArc): Stage2Output["kit"] {
  return {
    title: `THE ${arc.name.toUpperCase()}\u2122 KIT`,
    subtitle: "The Transformation Becomes Portable",
    items: [
      {
        name: "Sleep Ritual Elements",
        description:
          "The specific components of your onboard sleep protocol — magnesium, essential oils, and the exact practices that restored you.",
      },
      {
        name: "Guided Meditation",
        description:
          "A recorded meditation capturing the voice and pacing that brought you back to yourself during the journey.",
      },
      {
        name: "Your Experience Script",
        description:
          "This document — personalised with your notes, insights, and the specific anchors that resonated most deeply.",
      },
      {
        name: "Memory Anchor Cards",
        description:
          "Each day's anchor phrase on a card you can place anywhere you need a reminder of who you are when fully restored.",
      },
      {
        name: "Signature Scent",
        description:
          "The specific fragrance that accompanied your transformation — one inhale returns you to the moment.",
      },
    ],
  };
}

function generateClosing(arc: ExperienceArc): Stage2Output["closing"] {
  return {
    title: "THE INVITATION",
    content: arc.closing_anchor +
      "\n\nThe world will keep demanding. Life will keep piling on.\n\nBut now you know something you did not before. And that knowledge is yours. Forever.",
    experience_name: arc.name,
    tagline: arc.tagline,
  };
}

// ============================================================================
// HELPERS
// ============================================================================

function distributeDaysAcrossPhases(phases: ArcPhase[], totalDays: number): number[] {
  // Simple distribution: first and last phase get 1 day, middle phases share the rest
  if (phases.length === 0) return [];
  if (phases.length === 1) return [totalDays];

  const result = new Array(phases.length).fill(1);
  let remaining = totalDays - phases.length;

  // Distribute remaining days to middle phases
  let idx = 1;
  while (remaining > 0) {
    result[idx % phases.length]++;
    remaining--;
    idx++;
  }

  return result;
}

function sumBefore(arr: number[], index: number): number {
  return arr.slice(0, index).reduce((a, b) => a + b, 0);
}

function getDayTitle(arcCode: string, dayNumber: number, phase: ArcPhase): string {
  const titles: Record<string, Record<number, string>> = {
    PHOENIX_RISING: {
      1: "Arrive", 2: "Release", 3: "Ashes", 4: "Ember",
      5: "Spark", 6: "Flame", 7: "Rise", 8: "Flight",
    },
    BECAUSE_OF_US: {
      1: "Permission", 2: "Remembering", 3: "Returning", 4: "The Turn",
      5: "Seeing", 6: "Choosing", 7: "Amplifying", 8: "Beginning",
    },
  };

  return titles[arcCode]?.[dayNumber] || `${phase.name} — Day ${dayNumber}`;
}

function getMemoryAnchor(arcCode: string, dayNumber: number): string {
  const anchors: Record<string, Record<number, string>> = {
    PHOENIX_RISING: {
      1: "You made it. You are here.",
      2: "The noise fades. What remains is what matters.",
      3: "What have you been sacrificing? It is safe to look now.",
      4: "The ember catches. Something stirs.",
      5: "This is not recovery. This is recognition.",
      6: "The fire was never about proving. It was about living.",
      7: "You rose from within.",
      8: "The fire is yours now. Forever.",
    },
    BECAUSE_OF_US: {
      1: "We are here. Together. That is enough for now.",
      2: "Who are you, beneath all the roles?",
      3: "Remember when this was easy?",
      4: "I see you. Not the role. You.",
      5: "We are still us.",
      6: "I choose you. Again.",
      7: "Two whole people. Nothing left to prove.",
      8: "Because of us. Always because of us.",
    },
  };

  return anchors[arcCode]?.[dayNumber] || "This moment is yours. Let it land.";
}
