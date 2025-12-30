/**
 * LEXA canonical 12 themes (experience-first).
 * Keep this list stable: it drives onboarding, preference learning, and Neo4j theme nodes.
 */

export const LEXA_THEMES_12 = [
  'Romance & Intimacy',
  'Adventure & Exploration',
  'Wellness & Transformation',
  'Culinary Excellence',
  'Cultural Immersion',
  'Pure Luxury & Indulgence',
  'Nature & Wildlife',
  'Water Sports & Marine',
  'Art & Architecture',
  'Family Luxury',
  'Celebration & Milestones',
  'Solitude & Reflection',
] as const;

export type LexaTheme = (typeof LEXA_THEMES_12)[number];

export function formatThemeMenu(): string {
  return LEXA_THEMES_12.map((t, i) => `${i + 1}. ${t}`).join('\n');
}

function normalize(s: string) {
  return s
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s&-]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Parse user selection of 1-3 themes.
 * Supports:
 * - numbers: "1, 3, 8"
 * - partial names: "wellness, culinary"
 */
export function parseThemeSelection(input: string): LexaTheme[] {
  const n = normalize(input);
  if (!n) return [];

  // 1) Number selection
  const nums = Array.from(n.matchAll(/\b(\d{1,2})\b/g))
    .map((m) => Number(m[1]))
    .filter((x) => Number.isFinite(x) && x >= 1 && x <= LEXA_THEMES_12.length);

  const out: LexaTheme[] = [];
  for (const num of nums) {
    const t = LEXA_THEMES_12[num - 1];
    if (t && !out.includes(t)) out.push(t);
  }

  // 2) Name selection (keywords / partial match)
  if (out.length < 3) {
    for (const t of LEXA_THEMES_12) {
      const tn = normalize(t);
      // allow matching on any significant word
      const words = tn.split(' ').filter((w) => w.length >= 4 && w !== 'and');
      const hit = words.some((w) => n.includes(w)) || n.includes(tn);
      if (hit && !out.includes(t)) out.push(t);
      if (out.length >= 3) break;
    }
  }

  return out.slice(0, 3);
}


