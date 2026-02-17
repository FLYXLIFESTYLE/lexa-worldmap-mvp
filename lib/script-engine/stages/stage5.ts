/**
 * LEXA Script Engine - Stage 5: Broker Teaser
 *
 * Public-facing sales document for charter brokers and marketplace.
 * Creates desire without revealing the full journey.
 * Always generated alongside Stage 1.
 */

import Anthropic from "@anthropic-ai/sdk";
import { fetchArcData, fetchSignaturePOIs } from "../queries";
import type {
  Stage5Output,
  Stage1Output,
  ExperienceArc,
  GuestArchetype,
} from "../types";

// ============================================================================
// MAIN GENERATOR
// ============================================================================

/**
 * Generate Stage 5 from existing Stage 1 output + arc data.
 * Stage 5 reuses Stage 1 content but reformats for broker/marketplace audience.
 */
export async function generateStage5(input: {
  stage1: Stage1Output;
  arc_code: string;
  region: string;
  duration: number;
  script_id: string;
}): Promise<Stage5Output> {
  const arcData = await fetchArcData(input.arc_code);
  if (!arcData) {
    throw new Error(`Arc not found: ${input.arc_code}`);
  }

  const { arc, archetypes } = arcData;
  const pois = await fetchSignaturePOIs(input.region, undefined, 5);

  // Build hook with lines + pivot structure
  const hookParts = splitHookIntoParts(input.stage1.hook);

  // Generate a more polished description for broker audience
  const brokerDescription = await generateBrokerDescription(
    arc,
    input.region,
    input.duration,
    input.stage1.journey_type
  );

  // Generate closing hook
  const closing = generateClosing(arc);

  // Key destinations from POIs
  const keyDestinations = pois
    .slice(0, 4)
    .map((p) => {
      // Extract city/area from POI name if possible
      return p.name;
    })
    .join(", ");

  return {
    header: {
      brand: "LEXA Curated Experiences",
      region: input.region,
      season: input.stage1.quick_facts.season,
      duration: input.stage1.quick_facts.duration,
    },

    title: {
      experience_name: input.stage1.experience_name,
      tagline: input.stage1.tagline,
      positioning: generatePositioning(arc, input.stage1.journey_type),
    },

    hook: hookParts,

    description: {
      title: "THE EXPERIENCE",
      content: brokerDescription,
    },

    highlights: {
      title: "SIGNATURE HIGHLIGHTS",
      subtitle: "A Glimpse of What's Possible",
      items: input.stage1.highlights.map((h) => ({
        icon: "\u25C8", // ◈
        title: h.title,
        description: h.description,
      })),
    },

    target_profile: {
      title: "THE IDEAL GUEST",
      subtitle: input.stage1.target_profile.intro,
      criteria: input.stage1.target_profile.criteria,
    },

    voyage_details: {
      duration: input.stage1.quick_facts.duration,
      region: input.stage1.quick_facts.region,
      season: input.stage1.quick_facts.season,
      embarkation: input.stage1.quick_facts.embarkation,
      key_destinations: keyDestinations || input.region,
      experience_type: input.stage1.quick_facts.type,
    },

    closing,

    generated_at: new Date().toISOString(),
    script_id: input.script_id,
    arc_code: input.arc_code,
  };
}

// ============================================================================
// SECTION GENERATORS
// ============================================================================

/**
 * Split a hook into lines + pivot for the styled hook box.
 */
function splitHookIntoParts(hook: string): {
  lines: string[];
  pivot: string;
} {
  const sentences = hook
    .split(/(?<=[.!?])\s+/)
    .filter((s) => s.trim().length > 0);

  if (sentences.length <= 1) {
    return { lines: [hook], pivot: "" };
  }

  // Last sentence is usually the pivot (hopeful turn)
  const pivot = sentences[sentences.length - 1];
  const lines = sentences.slice(0, -1);

  return { lines, pivot };
}

/**
 * Generate positioning statement from arc and journey type.
 */
function generatePositioning(arc: ExperienceArc, journeyType: string): string {
  const typeLabels: Record<string, string> = {
    INDIVIDUAL: "a Personal",
    COUPLES: "a Couples",
    FAMILY: "a Family",
    GROUP: "a Group",
  };

  const typeLabel = typeLabels[journeyType] || "an";

  // Derive positioning from core_transformation
  const transformation = arc.core_transformation.split(" — ")[1] || arc.core_transformation;
  return `${typeLabel} Voyage — ${capitalize(transformation.slice(0, 60))}`;
}

/**
 * Generate broker-focused description — slightly more polished than Stage 1.
 */
async function generateBrokerDescription(
  arc: ExperienceArc,
  region: string,
  duration: number,
  journeyType: string
): Promise<string> {
  try {
    const anthropic = new Anthropic();

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 500,
      messages: [
        {
          role: "user",
          content: `You are writing a broker teaser for LEXA, an ultra-luxury yacht experience company. This is for charter brokers and marketplace listings.

Write a polished description (200-300 words) for the "${arc.name}" experience.

Details:
- Region: ${region}
- Duration: ${duration} days
- Journey type: ${journeyType}
- Core transformation: ${arc.core_transformation}
- Base description: ${arc.description}

Structure:
1. What this is (1-2 sentences)
2. What this is NOT (differentiation from generic luxury)
3. The approach/method (high-level, 3-4 sentences)
4. The outcome — what the guest will feel
5. Memorable closing line

Rules:
- Professional but emotionally compelling
- No day-by-day or full itinerary revealed
- Intimate, not salesy
- No pricing or booking info
- 200-300 words
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
 * Generate the closing section with emotional appeal + CTA.
 */
function generateClosing(arc: ExperienceArc): Stage5Output["closing"] {
  // Extract a short quote from closing_anchor
  const quote = arc.closing_anchor;

  // Build emotional closing content
  const content = `The world will keep demanding. Life will keep piling on.

But for these days, you get to stop. To remember who you are when no one needs anything from you. To ${arc.core_transformation.split(" — ")[1]?.toLowerCase() || "transform"}.

This is your return.`;

  return {
    quote,
    content,
    experience_name: arc.name,
    tagline: arc.tagline,
    cta: "For inquiries and availability, contact your LEXA representative.",
  };
}

// ============================================================================
// HELPERS
// ============================================================================

function capitalize(str: string): string {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}
