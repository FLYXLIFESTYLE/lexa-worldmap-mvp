/**
 * POI Quality Filters - Luxury Travel Relevance
 *
 * Purpose: Prevent junk POIs (embassies, AC companies, utilities) from entering Captain review queue
 *
 * Why:
 * - Overture/OSM contain ALL places (businesses, government, infrastructure)
 * - Only ~5-10% are relevant for luxury travel experiences
 * - Captains shouldn't waste time reviewing irrelevant POIs
 *
 * Used by:
 * - /api/captain/pois/import-generated (manual import)
 * - /api/cron/auto-import-generated (auto-import cron)
 */

// Categories allowed for luxury travel experiences
const ALLOWED_CATEGORIES = new Set([
  'hotel',
  'resort',
  'restaurant',
  'cafe',
  'bar',
  'lounge',
  'beach_club',
  'nightclub',
  'spa',
  'wellness',
  'activity',
  'experience',
  'attraction',
  'museum',
  'gallery',
  'landmark',
  'viewpoint',
  'beach',
  'park',
  'garden',
  'marina',
  'yacht_club',
  'golf_course',
  'shopping',
  'boutique',
  'wine_cellar',
  'art_studio',
  'theater',
  'concert_hall',
  'casino',
  'sports_venue',
]);

// Keywords that indicate junk/non-experience POIs (reject if present)
const REJECT_KEYWORDS = [
  // Government/Admin
  'embassy', 'consulate', 'government', 'ministry', 'municipality', 'city hall', 'town hall',
  'police', 'fire station', 'post office', 'court', 'prison', 'jail',
  
  // Industrial/Commercial Services
  'warehouse', 'factory', 'industrial', 'logistics', 'shipping', 'cargo',
  'office building', 'business center', 'corporate', 'headquarters',
  'ac service', 'hvac', 'plumbing', 'electrical', 'mechanic', 'repair shop',
  'car wash', 'auto service', 'tire shop', 'oil change',
  
  // Infrastructure/Utilities
  'parking lot', 'parking garage', 'bus stop', 'bus station', 'gas station', 'petrol station',
  'atm', 'bank branch', 'money exchange', 'power plant', 'water treatment',
  'cell tower', 'antenna', 'substation', 'utility',
  
  // Healthcare/Medical (not experience-relevant)
  'hospital', 'clinic', 'pharmacy', 'dentist', 'doctor', 'medical center',
  
  // Education (not experience-relevant)
  'school', 'university', 'college', 'kindergarten', 'daycare',
  
  // Generic/Low-Value
  'convenience store', 'supermarket', 'grocery', 'mini mart',
  'laundromat', 'dry cleaner', 'tailor shop',
];

// Luxury indicators (if present, POI is likely relevant)
const LUXURY_INDICATORS = [
  'michelin', 'fine dining', 'gourmet', 'luxury', 'premium', 'exclusive', 'private',
  '5-star', 'five-star', 'boutique', 'designer', 'high-end', 'upscale',
  'yacht', 'villa', 'penthouse', 'suite', 'concierge',
  'spa', 'wellness', 'golf', 'beach club', 'rooftop',
];

/**
 * Check if a POI is relevant for luxury travel experiences
 */
export function isExperienceRelevant(entity: any): { relevant: boolean; reason: string } {
  const name = String(entity?.name || '').trim().toLowerCase();
  const tags: string[] = Array.isArray(entity?.tags) ? entity.tags.map((t) => String(t).toLowerCase()) : [];
  const catJson = JSON.stringify(entity?.categories || {}).toLowerCase();
  const text = `${name} ${tags.join(' ')} ${catJson}`;

  // Rule 1: Reject if unnamed (infrastructure nodes, not real places)
  if (!name || name.length < 2) {
    return { relevant: false, reason: 'unnamed' };
  }

  // Rule 2: Reject if contains junk keywords
  for (const keyword of REJECT_KEYWORDS) {
    if (text.includes(keyword)) {
      return { relevant: false, reason: `junk_keyword:${keyword}` };
    }
  }

  // Rule 3: Reject if inferred category not in allowlist
  const category = inferCategoryFromEntity(entity);
  if (category === 'other' || !ALLOWED_CATEGORIES.has(category)) {
    // Exception: if has luxury indicators, allow anyway
    const hasLuxurySignal = LUXURY_INDICATORS.some((indicator) => text.includes(indicator));
    if (!hasLuxurySignal) {
      return { relevant: false, reason: `category_not_allowed:${category}` };
    }
  }

  // Rule 4: Accept if passed all filters
  return { relevant: true, reason: 'experience_relevant' };
}

/**
 * Infer category from entity data (shared logic)
 */
function inferCategoryFromEntity(entity: any): string {
  const tags: string[] = Array.isArray(entity?.tags) ? entity.tags : [];
  const cat = JSON.stringify(entity?.categories || {}).toLowerCase();
  const name = String(entity?.name || '').toLowerCase();
  const text = `${tags.join(' ')} ${cat} ${name}`.toLowerCase();

  // Hotels & Accommodations
  if (text.includes('hotel') || text.includes('resort') || text.includes('villa')) return 'hotel';
  
  // Food & Beverage
  if (text.includes('restaurant') || text.includes('bistro') || text.includes('brasserie')) return 'restaurant';
  if (text.includes('cafe') || text.includes('coffee') || text.includes('tea house')) return 'cafe';
  if (text.includes('bar') || text.includes('lounge') || text.includes('pub') || text.includes('nightclub')) return 'bar';
  
  // Wellness & Recreation
  if (text.includes('spa') || text.includes('wellness') || text.includes('massage')) return 'spa';
  if (text.includes('beach') || text.includes('plage') || text.includes('spiaggia')) return 'beach';
  if (text.includes('golf') || text.includes('tennis') || text.includes('yacht') || text.includes('marina')) return 'activity';
  
  // Culture & Attractions
  if (text.includes('museum') || text.includes('gallery') || text.includes('art')) return 'attraction';
  if (text.includes('cathedral') || text.includes('church') || text.includes('temple') || text.includes('monument')) return 'attraction';
  if (text.includes('viewpoint') || text.includes('lookout') || text.includes('vista') || text.includes('belvedere')) return 'attraction';
  if (text.includes('park') || text.includes('garden') || text.includes('botanical')) return 'attraction';
  
  // Shopping
  if (text.includes('boutique') || text.includes('shop') || text.includes('store') || text.includes('market')) return 'shopping';
  
  // Entertainment
  if (text.includes('theater') || text.includes('theatre') || text.includes('cinema') || text.includes('concert')) return 'experience';
  if (text.includes('casino') || text.includes('club')) return 'experience';
  
  // Default: "other" (will be filtered out unless has luxury indicators)
  return 'other';
}

/**
 * Bulk filter: returns only experience-relevant entities
 */
export function filterExperienceRelevant(entities: any[]): {
  relevant: any[];
  rejected: Array<{ entity: any; reason: string }>;
} {
  const relevant: any[] = [];
  const rejected: Array<{ entity: any; reason: string }> = [];

  for (const entity of entities) {
    const check = isExperienceRelevant(entity);
    if (check.relevant) {
      relevant.push(entity);
    } else {
      rejected.push({ entity, reason: check.reason });
    }
  }

  return { relevant, rejected };
}
