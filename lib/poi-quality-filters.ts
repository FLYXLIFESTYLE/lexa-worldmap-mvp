/**
 * POI Quality Filters - Experience Script Value (RAG Relevance)
 *
 * Purpose: Only import POIs that can contribute to meaningful experience scripts
 *
 * Why:
 * - RAG retrieval needs POIs with semantic richness (emotions, activities, themes)
 * - A POI without experience value is useless for script generation
 * - Quality > Quantity: Better to have 10,000 useful POIs than 1M junk
 *
 * A POI is valuable if it can:
 * - Evoke emotions (peace, connection, awe, freedom)
 * - Support activities (sailing, dining, exploring, celebrating)
 * - Fit themes (Mediterranean Indulgence, Cultural Immersion, Wellness Retreat)
 * - Enhance narratives ("Why this?" — has story/context potential)
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

// Experience value indicators (POI can contribute to scripts)
const EXPERIENCE_VALUE_INDICATORS = [
  // Luxury signals
  'michelin', 'fine dining', 'gourmet', 'luxury', 'premium', 'exclusive', 'private',
  '5-star', 'five-star', 'boutique', 'designer', 'high-end', 'upscale',
  'yacht', 'villa', 'penthouse', 'suite', 'concierge',
  
  // Emotional resonance
  'romantic', 'intimate', 'peaceful', 'serene', 'vibrant', 'authentic', 'historic',
  'breathtaking', 'panoramic', 'sunset', 'sunrise', 'hidden', 'secret',
  
  // Activity potential
  'spa', 'wellness', 'golf', 'beach club', 'rooftop', 'terrace', 'garden',
  'vineyard', 'wine', 'tasting', 'cooking', 'art', 'music', 'performance',
  'sailing', 'diving', 'snorkeling', 'hiking', 'cycling',
  
  // Cultural/Story value
  'heritage', 'unesco', 'ancient', 'medieval', 'archaeological', 'artisan',
  'traditional', 'craft', 'workshop', 'atelier', 'local', 'family-run',
  
  // Theme alignment
  'coastal', 'seaside', 'waterfront', 'mountain', 'countryside', 'island',
  'mediterranean', 'adriatic', 'caribbean', 'riviera',
];

/**
 * Check if a POI has "experience value" (can contribute to RAG/scripts)
 */
function hasExperienceValue(entity: any, text: string): { hasValue: boolean; signals: string[] } {
  const signals: string[] = [];

  // Check for experience value indicators
  for (const indicator of EXPERIENCE_VALUE_INDICATORS) {
    if (text.includes(indicator)) {
      signals.push(indicator);
    }
  }

  // Check for rich metadata (descriptions, websites, categories)
  if (entity?.address && String(entity.address).trim().length > 5) signals.push('has_address');
  if (entity?.website && String(entity.website).trim().length > 5) signals.push('has_website');
  if (entity?.phone && String(entity.phone).trim().length > 5) signals.push('has_contact');
  if (entity?.categories && Object.keys(entity.categories).length > 0) signals.push('has_categories');

  // Check for semantic richness (can be mapped to emotions/activities/themes)
  const hasEmotionalPotential = 
    text.includes('view') || text.includes('vista') || text.includes('scenic') ||
    text.includes('historic') || text.includes('authentic') || text.includes('traditional') ||
    text.includes('romantic') || text.includes('peaceful') || text.includes('vibrant');
  if (hasEmotionalPotential) signals.push('emotional_potential');

  const hasActivityPotential =
    text.includes('cooking') || text.includes('tasting') || text.includes('workshop') ||
    text.includes('sailing') || text.includes('diving') || text.includes('hiking') ||
    text.includes('golf') || text.includes('tennis') || text.includes('spa');
  if (hasActivityPotential) signals.push('activity_potential');

  const hasThemeAlignment =
    text.includes('coastal') || text.includes('mediterranean') || text.includes('island') ||
    text.includes('cultural') || text.includes('wellness') || text.includes('culinary') ||
    text.includes('adventure') || text.includes('heritage') || text.includes('artisan');
  if (hasThemeAlignment) signals.push('theme_alignment');

  // POI is valuable if it has at least 2 signals (not just 1 coincidental keyword)
  return { hasValue: signals.length >= 2, signals };
}

/**
 * Check if a POI is relevant for experience scripts (RAG-ready)
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

  // Rule 3: Check if category is experience-relevant
  const category = inferCategoryFromEntity(entity);
  const categoryAllowed = category !== 'other' && ALLOWED_CATEGORIES.has(category);

  // Rule 4: Check if POI has experience value (can contribute to scripts)
  const valueCheck = hasExperienceValue(entity, text);

  // Accept if EITHER:
  // - Category is allowed AND has some experience value (2+ signals)
  // - OR has strong experience value (3+ signals) even if category unclear
  if (categoryAllowed && valueCheck.hasValue) {
    return { relevant: true, reason: `experience_value:${valueCheck.signals.join(',')}` };
  }

  if (valueCheck.signals.length >= 3) {
    return { relevant: true, reason: `high_experience_value:${valueCheck.signals.join(',')}` };
  }

  // Reject: either wrong category or insufficient experience value
  return { 
    relevant: false, 
    reason: categoryAllowed 
      ? `low_experience_value:${valueCheck.signals.length}_signals` 
      : `category_not_allowed:${category}` 
  };
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
