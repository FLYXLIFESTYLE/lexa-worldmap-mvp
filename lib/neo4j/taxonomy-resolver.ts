import type { Session } from 'neo4j-driver';

export type CanonicalTaxonomyLabel = 'Emotion' | 'Desire' | 'Fear';

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

/**
 * Normalize LEXA’s 9 “experience dimensions” (stored as EmotionalTag).
 */
export function normalizeLexaDimensionName(name: string): string {
  const raw = name.trim();
  const key = raw.toLowerCase();
  const map: Record<string, string> = {
    exclusivity: 'Exclusivity',
    prestige: 'Prestige',
    discovery: 'Discovery',
    indulgence: 'Indulgence',
    romance: 'Romance',
    adventure: 'Adventure',
    legacy: 'Legacy',
    freedom: 'Freedom',
    transformation: 'Transformation',
  };
  return map[key] || raw;
}

function looksLikeCode(s: string): boolean {
  // e.g. AWE, LOSS_OF_PRIVACY, MASTERY_ACHIEVEMENT
  return /^[A-Z0-9_]+$/.test(s);
}

/**
 * Resolve a canonical taxonomy node (Emotion/Desire/Fear) from Neo4j.
 *
 * IMPORTANT:
 * - We do NOT create new canonical nodes here.
 * - If we can’t resolve to a canonical code, return null (caller should skip).
 */
export async function resolveCanonicalTaxonomy(
  session: Session,
  label: CanonicalTaxonomyLabel,
  idOrName: string
): Promise<{ code: string; name?: string } | null> {
  const raw = (idOrName || '').trim();
  if (!raw) return null;

  const codeCandidate = looksLikeCode(raw) ? raw : null;
  const nameCandidate = raw;

  const result = await session.run(
    `
    MATCH (t:${label})
    WHERE
      (t.layer = 'LEXA_TAXONOMY' OR t.layer IS NULL)
      AND (
        ($code IS NOT NULL AND t.code = $code)
        OR toLower(t.name) = toLower($name)
      )
    RETURN t.code AS code, t.name AS name
    LIMIT 1
    `,
    { code: codeCandidate, name: nameCandidate }
  );

  const rec = result.records[0];
  if (!rec) return null;
  const code = rec.get('code') as string | null;
  const name = rec.get('name') as string | null;
  if (!code || typeof code !== 'string' || !code.trim()) return null;
  return { code: code.trim(), name: typeof name === 'string' ? name : undefined };
}

