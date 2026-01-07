/**
 * LEXA canonical 14 themes (experience-first).
 * Keep this list stable: it drives onboarding, preference learning, and Neo4j theme nodes.
 * 
 * Updated Jan 2026: Added Nightlife & Entertainment, Sports & Active
 */

export const LEXA_THEMES_14 = [
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
  'Nightlife & Entertainment',
  'Sports & Active',
] as const;

// Backward compatibility alias
export const LEXA_THEMES_12 = LEXA_THEMES_14;

export type LexaTheme = (typeof LEXA_THEMES_14)[number];

export function formatThemeMenu(): string {
  return LEXA_THEMES_14.map((t, i) => `${i + 1}. ${t}`).join('\n');
}

// UI metadata for theme quick-reply cards (license-free icons via lucide on frontend)
export const LEXA_THEME_UI: Record<LexaTheme, { id: string; icon: string; accent: 'gold' | 'navy' | 'rose' | 'emerald' | 'sky' | 'violet' | 'amber' }> = {
  'Romance & Intimacy': { id: 'romance', icon: 'Heart', accent: 'rose' },
  'Adventure & Exploration': { id: 'adventure', icon: 'Mountain', accent: 'amber' },
  'Wellness & Transformation': { id: 'wellness', icon: 'Sparkles', accent: 'emerald' },
  'Culinary Excellence': { id: 'culinary', icon: 'Utensils', accent: 'gold' },
  'Cultural Immersion': { id: 'culture', icon: 'Landmark', accent: 'violet' },
  'Pure Luxury & Indulgence': { id: 'luxury', icon: 'Crown', accent: 'gold' },
  'Nature & Wildlife': { id: 'nature', icon: 'Leaf', accent: 'emerald' },
  'Water Sports & Marine': { id: 'water', icon: 'Waves', accent: 'sky' },
  'Art & Architecture': { id: 'art', icon: 'Palette', accent: 'violet' },
  'Family Luxury': { id: 'family', icon: 'Users', accent: 'navy' },
  'Celebration & Milestones': { id: 'celebration', icon: 'PartyPopper', accent: 'amber' },
  'Solitude & Reflection': { id: 'solitude', icon: 'Moon', accent: 'navy' },
  'Nightlife & Entertainment': { id: 'nightlife', icon: 'Music', accent: 'violet' },
  'Sports & Active': { id: 'sports', icon: 'Trophy', accent: 'amber' },
};

export const LEXA_THEME_COPY: Record<LexaTheme, { hook: string; description: string }> = {
  'Romance & Intimacy': {
    hook: 'Fall in love with each other all over again.',
    description:
      'Your script designs quiet, unhurried moments made just for two – sunrise coffees in hidden bays, starlit dinners on deck, and small surprises that feel deeply personal. Less program, more presence, so you can actually feel each other again.',
  },
  'Adventure & Exploration': {
    hook: 'For when comfort isn’t enough – you want a story.',
    description:
      'This script turns your journey into a sequence of discoveries: remote anchorages, off-the-map experiences, and challenges chosen to excite, not exhaust. You return home with stories you can’t find on Google – and a renewed appetite for life.',
  },
  'Wellness & Transformation': {
    hook: 'Leave as yourself. Return as your next chapter.',
    description:
      'Your script blends gentle rituals, movement, and deep rest into the rhythm of each day. Think sunrise breaths on the bow, tailored treatments, and meaningful conversations that create real inner shifts – without feeling like a “program.”',
  },
  'Culinary Excellence': {
    hook: 'Travel through taste, one unforgettable course at a time.',
    description:
      'This script is built around flavor: market-to-table experiences, hidden local gems, and bespoke menus on board inspired by your story. Every meal becomes a memory, and every day has a signature dish you’ll talk about long after you’ve left.',
  },
  'Cultural Immersion': {
    hook: 'Not just another destination – a deeper connection.',
    description:
      'Your script opens doors that don’t exist for regular tourists: private encounters with local hosts, traditions shared in intimate settings, and stories that bring each place to life. You don’t just visit – you briefly belong.',
  },
  'Pure Luxury & Indulgence': {
    hook: 'Give yourself permission to want exactly what you want.',
    description:
      'This script is dedicated to effortless pleasure: seamless service, beautiful spaces, and every detail tuned to your personal tastes. No guilt, no rush – just days that feel soft, generous, and quietly extraordinary.',
  },
  'Nature & Wildlife': {
    hook: 'Get close to the world that usually stays out of reach.',
    description:
      'Your script follows the rhythm of the natural world: sunrise encounters, golden-hour sightings, and respectful access to fragile environments. You feel the scale of nature again – and your place within it.',
  },
  'Water Sports & Marine': {
    hook: 'Live your days at sea, not just look at the water.',
    description:
      'This script keeps you moving: custom-selected toys, guided sessions, and play built into every stop. From effortless fun to skill-building experiences, the ocean becomes your private playground.',
  },
  'Art & Architecture': {
    hook: 'Walk inside the world’s most beautiful ideas.',
    description:
      'Your script curates galleries, ateliers, and iconic spaces – plus a few places that never make it to the guidebooks. You meet the minds behind the work, feel the history in the walls, and let beauty quietly reshape your perspective.',
  },
  'Family Luxury': {
    hook: 'Time together that everyone will remember – not just the kids.',
    description:
      'This script balances shared moments and personal space, with age-appropriate experiences woven into one story. No chaos, no over-scheduling – just simple, joyful days that become part of your family legend.',
  },
  'Celebration & Milestones': {
    hook: 'Mark the moment so it never blurs into the rest.',
    description:
      'Your script builds towards one signature occasion – a birthday, anniversary, or life achievement – with meaningful touches along the way. Every detail is designed so that when you look back, this moment stands out clearly in your memory.',
  },
  'Solitude & Reflection': {
    hook: 'Finally, the space to hear yourself again.',
    description:
      'This script protects your quiet: minimal obligations, soft structure, and places chosen for their stillness. Gentle prompts, private rituals, and simple beauty help you process, reset, and return with clarity.',
  },
  'Nightlife & Entertainment': {
    hook: 'When the sun sets, your evening begins.',
    description:
      'This script opens doors to exclusive after-hours experiences: VIP club access, private performances, and late-night discoveries that most travelers never see. From rooftop lounges to underground venues, your nights become as memorable as your days.',
  },
  'Sports & Active': {
    hook: 'Luxury isn\'t passive – it\'s powerful.',
    description:
      'This script keeps you moving with purpose: championship golf courses, private tennis coaching, elite fitness sessions, and active wellness experiences. Whether mastering a skill or testing your limits, you return energized and accomplished.',
  },
};

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
    for (const t of LEXA_THEMES_14) {
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


