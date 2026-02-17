/**
 * LEXA Script Engine - Neo4j Query Functions
 *
 * All Cypher queries wrapped in callable TypeScript functions.
 * Uses the existing Neo4j client from lib/neo4j/client.ts
 */

import { getSession } from "@/lib/neo4j/client";
import type {
  ExperienceArc,
  ArcPhase,
  GuestArchetype,
  JourneyType,
  RitualTemplate,
  ArcMatch,
} from "./types";

// ============================================================================
// ARC MATCHING
// ============================================================================

/**
 * Match experience arcs based on journey type and guest keywords.
 * Scores arcs by how many archetype trigger_phrases overlap with keywords.
 */
export async function matchArcForInput(
  journeyType: string | undefined,
  guestKeywords: string[]
): Promise<ArcMatch[]> {
  const session = getSession();
  try {
    const lowerKeywords = guestKeywords.map((k) => k.toLowerCase());

    const query = `
      WITH $guestKeywords AS keywords
      MATCH (ea:experience_arc)
      ${journeyType ? "MATCH (ea)-[:DESIGNED_FOR]->(jt:journey_type {code: $journeyType})" : ""}
      MATCH (ea)-[:RESONATES_WITH]->(ga:guest_archetype)
      WITH ea, ga, keywords,
           [keyword IN keywords WHERE
             toLower(ga.description) CONTAINS keyword
             OR any(phrase IN ga.trigger_phrases WHERE toLower(phrase) CONTAINS keyword)
           ] AS matched_keywords
      WHERE size(matched_keywords) > 0
      WITH ea, collect(DISTINCT ga.name) AS matching_archetypes,
           sum(size(collect(DISTINCT matched_keywords))) AS raw_score
      RETURN ea.code AS arc_code,
             ea.name AS arc_name,
             ea.tagline AS tagline,
             ea.hook AS hook,
             matching_archetypes,
             raw_score AS match_score
      ORDER BY match_score DESC
    `;

    const params: Record<string, unknown> = { guestKeywords: lowerKeywords };
    if (journeyType) params.journeyType = journeyType;

    const result = await session.run(query, params);

    return result.records.map((record) => ({
      arc_code: record.get("arc_code"),
      arc_name: record.get("arc_name"),
      tagline: record.get("tagline"),
      hook: record.get("hook"),
      matching_archetypes: record.get("matching_archetypes"),
      match_score: typeof record.get("match_score") === "object"
        ? (record.get("match_score") as { toNumber(): number }).toNumber()
        : Number(record.get("match_score")),
    }));
  } finally {
    await session.close();
  }
}

// ============================================================================
// ARC DATA
// ============================================================================

/**
 * Fetch full arc data including phases, themes, and rituals.
 */
export async function fetchArcData(
  arcCode: string
): Promise<{
  arc: ExperienceArc;
  phases: ArcPhase[];
  archetypes: GuestArchetype[];
  rituals: RitualTemplate[];
  journey_types: JourneyType[];
} | null> {
  const session = getSession();
  try {
    // Fetch arc
    const arcResult = await session.run(
      `MATCH (ea:experience_arc {code: $arcCode})
       RETURN ea`,
      { arcCode }
    );

    if (arcResult.records.length === 0) return null;
    const arcNode = arcResult.records[0].get("ea").properties;
    const arc: ExperienceArc = {
      code: arcNode.code,
      name: arcNode.name,
      tagline: arcNode.tagline,
      hook: arcNode.hook,
      description: arcNode.description,
      core_transformation: arcNode.core_transformation,
      narrative_structure: arcNode.narrative_structure,
      closing_anchor: arcNode.closing_anchor,
      min_days: toNumber(arcNode.min_days),
      max_days: toNumber(arcNode.max_days),
      color_primary: arcNode.color_primary,
      color_accent: arcNode.color_accent,
      color_bg: arcNode.color_bg,
    };

    // Fetch phases
    const phases = await fetchArcPhases(arcCode);

    // Fetch archetypes
    const archetypes = await fetchGuestArchetypes(arcCode);

    // Fetch rituals
    const rituals = await fetchRitualTemplates(arcCode);

    // Fetch journey types
    const jtResult = await session.run(
      `MATCH (ea:experience_arc {code: $arcCode})-[:DESIGNED_FOR]->(jt:journey_type)
       RETURN jt`,
      { arcCode }
    );
    const journey_types: JourneyType[] = jtResult.records.map((r) => {
      const props = r.get("jt").properties;
      return { code: props.code, name: props.name, description: props.description };
    });

    return { arc, phases, archetypes, rituals, journey_types };
  } finally {
    await session.close();
  }
}

/**
 * Fetch ordered phases for an arc.
 */
export async function fetchArcPhases(arcCode: string): Promise<ArcPhase[]> {
  const session = getSession();
  try {
    const result = await session.run(
      `MATCH (ap:arc_phase)-[:BELONGS_TO]->(ea:experience_arc {code: $arcCode})
       RETURN ap
       ORDER BY ap.sequence`,
      { arcCode }
    );

    return result.records.map((r) => {
      const props = r.get("ap").properties;
      return {
        uid: props.uid,
        sequence: toNumber(props.sequence),
        name: props.name,
        typical_days: props.typical_days,
        emotional_core: props.emotional_core,
        description: props.description,
        color_code: props.color_code,
      };
    });
  } finally {
    await session.close();
  }
}

/**
 * Fetch guest archetypes that resonate with an arc.
 */
export async function fetchGuestArchetypes(
  arcCode: string
): Promise<GuestArchetype[]> {
  const session = getSession();
  try {
    const result = await session.run(
      `MATCH (ea:experience_arc {code: $arcCode})-[:RESONATES_WITH]->(ga:guest_archetype)
       RETURN ga
       ORDER BY ga.code`,
      { arcCode }
    );

    return result.records.map((r) => {
      const props = r.get("ga").properties;
      return {
        code: props.code,
        name: props.name,
        description: props.description,
        core_need: props.core_need,
        fears: props.fears || [],
        desires: props.desires || [],
        trigger_phrases: props.trigger_phrases || [],
      };
    });
  } finally {
    await session.close();
  }
}

/**
 * Fetch ritual templates for an arc.
 */
export async function fetchRitualTemplates(
  arcCode: string
): Promise<RitualTemplate[]> {
  const session = getSession();
  try {
    const result = await session.run(
      `MATCH (rt:ritual_template)-[:USED_IN]->(ea:experience_arc {code: $arcCode})
       RETURN rt
       ORDER BY rt.code`,
      { arcCode }
    );

    return result.records.map((r) => {
      const props = r.get("rt").properties;
      return {
        code: props.code,
        name: props.name,
        when_text: props.when_text,
        duration: props.duration,
        led_by: props.led_by,
        setup: props.setup || [],
        script_text: props.script_text,
        notes: props.notes || [],
      };
    });
  } finally {
    await session.close();
  }
}

// ============================================================================
// REFERENCE DATA
// ============================================================================

/**
 * Fetch all experience arcs (for admin dropdowns).
 */
export async function fetchAllArcs(): Promise<
  (ExperienceArc & { journey_types: string[] })[]
> {
  const session = getSession();
  try {
    const result = await session.run(
      `MATCH (ea:experience_arc)
       OPTIONAL MATCH (ea)-[:DESIGNED_FOR]->(jt:journey_type)
       WITH ea, collect(jt.code) AS journey_types
       RETURN ea, journey_types
       ORDER BY ea.name`
    );

    return result.records.map((r) => {
      const props = r.get("ea").properties;
      return {
        code: props.code,
        name: props.name,
        tagline: props.tagline,
        hook: props.hook,
        description: props.description,
        core_transformation: props.core_transformation,
        narrative_structure: props.narrative_structure,
        closing_anchor: props.closing_anchor,
        min_days: toNumber(props.min_days),
        max_days: toNumber(props.max_days),
        color_primary: props.color_primary,
        color_accent: props.color_accent,
        color_bg: props.color_bg,
        journey_types: r.get("journey_types"),
      };
    });
  } finally {
    await session.close();
  }
}

/**
 * Fetch all journey types.
 */
export async function fetchAllJourneyTypes(): Promise<JourneyType[]> {
  const session = getSession();
  try {
    const result = await session.run(
      `MATCH (jt:journey_type) RETURN jt ORDER BY jt.code`
    );
    return result.records.map((r) => {
      const props = r.get("jt").properties;
      return { code: props.code, name: props.name, description: props.description };
    });
  } finally {
    await session.close();
  }
}

/**
 * Fetch all guest archetypes.
 */
export async function fetchAllArchetypes(): Promise<GuestArchetype[]> {
  const session = getSession();
  try {
    const result = await session.run(
      `MATCH (ga:guest_archetype) RETURN ga ORDER BY ga.name`
    );
    return result.records.map((r) => {
      const props = r.get("ga").properties;
      return {
        code: props.code,
        name: props.name,
        description: props.description,
        core_need: props.core_need,
        fears: props.fears || [],
        desires: props.desires || [],
        trigger_phrases: props.trigger_phrases || [],
      };
    });
  } finally {
    await session.close();
  }
}

// ============================================================================
// POI QUERIES
// ============================================================================

/**
 * Fetch signature POIs for a region, optionally filtered by themes.
 * Returns top luxury POIs sorted by luxury_score.
 */
export async function fetchSignaturePOIs(
  region: string,
  themes?: string[],
  limit: number = 10
): Promise<
  {
    name: string;
    category: string;
    luxury_score: number;
    short_description: string;
    lat: number;
    lon: number;
  }[]
> {
  const session = getSession();
  try {
    const query = `
      MATCH (p:poi)-[:LOCATED_IN]->(d:destination)
      WHERE toLower(d.name) CONTAINS toLower($region)
        AND p.luxury_score IS NOT NULL
        AND p.luxury_score >= 7
      ${
        themes && themes.length > 0
          ? `OPTIONAL MATCH (p)-[:HAS_THEME]->(t:theme_category)
             WHERE t.name IN $themes
             WITH p, d, count(t) AS theme_matches
             ORDER BY theme_matches DESC, p.luxury_score DESC`
          : `WITH p, d
             ORDER BY p.luxury_score DESC`
      }
      RETURN p.name AS name,
             p.category AS category,
             p.luxury_score AS luxury_score,
             coalesce(p.short_description, p.description, '') AS short_description,
             p.lat AS lat,
             p.lon AS lon
      LIMIT $limit
    `;

    const params: Record<string, unknown> = { region, limit };
    if (themes && themes.length > 0) params.themes = themes;

    const result = await session.run(query, params);
    return result.records.map((r) => ({
      name: r.get("name"),
      category: r.get("category"),
      luxury_score: toNumber(r.get("luxury_score")),
      short_description: r.get("short_description"),
      lat: toNumber(r.get("lat")),
      lon: toNumber(r.get("lon")),
    }));
  } finally {
    await session.close();
  }
}

// ============================================================================
// HELPERS
// ============================================================================

/** Safely convert Neo4j Integer to JS number */
function toNumber(val: unknown): number {
  if (val === null || val === undefined) return 0;
  if (typeof val === "number") return val;
  if (typeof val === "object" && val !== null && "toNumber" in val) {
    return (val as { toNumber(): number }).toNumber();
  }
  return Number(val) || 0;
}
