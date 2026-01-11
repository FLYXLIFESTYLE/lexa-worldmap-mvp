export type DestinationKind = 'mvp_destination' | 'city';

// MVP Set A (yacht-first)
export const MVP_DESTINATIONS = new Set([
  'French Riviera',
  'Amalfi Coast',
  'Balearics',
  'Cyclades',
  'Adriatic North',
  'Adriatic Central',
  'Adriatic South',
  'Ionian Sea',
  'Bahamas',
  'BVI',
  'USVI',
  'French Antilles',
]);

// Known city → MVP parent mapping (expand as needed)
export const CITY_TO_MVP_DESTINATION: Record<string, string> = {
  Monaco: 'French Riviera',
  'St. Tropez': 'French Riviera',
  Cannes: 'French Riviera',
  Nice: 'French Riviera',
};

export function slugifyDestination(input: string): string {
  return (input || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export function destinationKindForName(name: string): DestinationKind {
  return MVP_DESTINATIONS.has(name) ? 'mvp_destination' : 'city';
}

/**
 * Resolve a user/admin-provided destination name to:
 * - canonical: the MVP destination when the input is a mapped city, else the input itself
 * - terms: search terms we should match against Neo4j destination names (city + mvp when mapped)
 */
export function resolveCanonicalDestination(input: string): { canonical: string; terms: string[] } {
  const raw = (input || '').trim();
  if (!raw) return { canonical: '', terms: [] };

  if (MVP_DESTINATIONS.has(raw)) return { canonical: raw, terms: [raw] };

  const parent = CITY_TO_MVP_DESTINATION[raw];
  if (parent) return { canonical: parent, terms: [raw, parent] };

  return { canonical: raw, terms: [raw] };
}

