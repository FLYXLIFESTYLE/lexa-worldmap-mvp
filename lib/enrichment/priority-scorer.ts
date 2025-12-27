/**
 * Enrichment Priority Scorer
 * Calculates priority score for POIs to determine enrichment order
 */

interface POI {
  luxury_score_base?: number;
  luxury_score_verified?: number;
  description?: string;
  website?: string;
  rating?: number;
  photos?: string[];
  destination_name?: string;
  enriched_at?: string;
}

const POPULAR_DESTINATIONS = [
  'French Riviera',
  'Amalfi Coast',
  'Cyclades',
  'Adriatic',
  'Bahamas',
];

/**
 * Calculate enrichment priority for a POI
 * Higher score = higher priority
 */
export function calculateEnrichmentPriority(poi: POI): number {
  let priority = 0;

  // High luxury score = high priority (0-100 points)
  const score = poi.luxury_score_verified ?? poi.luxury_score_base ?? 0;
  priority += score;

  // Missing critical fields = higher priority
  if (!poi.description) priority += 50;
  if (!poi.website) priority += 30;
  if (!poi.rating) priority += 40;
  if (!poi.photos || poi.photos.length === 0) priority += 20;

  // Popular destinations = higher priority
  const isPopularDest = POPULAR_DESTINATIONS.some(
    dest => poi.destination_name?.includes(dest)
  );
  if (isPopularDest) priority += 30;

  // Recently enriched = lower priority (already has data)
  if (poi.enriched_at) {
    const daysSinceEnrichment = 
      (Date.now() - new Date(poi.enriched_at).getTime()) / (1000 * 60 * 60 * 24);
    
    // If enriched within last 30 days, reduce priority significantly
    if (daysSinceEnrichment < 30) {
      priority -= 100;
    }
  }

  return Math.max(priority, 0);
}

/**
 * Sort POIs by enrichment priority
 */
export function sortByPriority(pois: POI[]): POI[] {
  return pois
    .map(poi => ({
      poi,
      priority: calculateEnrichmentPriority(poi),
    }))
    .sort((a, b) => b.priority - a.priority)
    .map(item => item.poi);
}

/**
 * Filter POIs that need enrichment
 */
export function filterNeedsEnrichment(
  pois: POI[],
  minPriority: number = 50
): POI[] {
  return pois.filter(poi => {
    const priority = calculateEnrichmentPriority(poi);
    return priority >= minPriority;
  });
}

/**
 * Get top N POIs for enrichment
 */
export function getTopPriority(pois: POI[], count: number): POI[] {
  const sorted = sortByPriority(pois);
  return sorted.slice(0, count);
}

