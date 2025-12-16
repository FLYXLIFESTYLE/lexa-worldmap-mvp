/**
 * Data Merger
 * Merges enrichment data from multiple sources with conflict resolution
 */

import type { GooglePlacesEnrichment } from './google-places-client';
import type { WikipediaEnrichment } from './wikipedia-client';
import type { OSMEnrichment } from './osm-client';

export interface MergedEnrichment {
  description?: string;
  rating?: number;
  user_ratings_total?: number;
  price_level?: number;
  website?: string;
  phone?: string;
  opening_hours?: string | string[];
  photos?: string[];
  reviews?: Array<{
    rating: number;
    text: string;
    author: string;
  }>;
  types?: string[];
  cuisine?: string[];
  amenities?: string[];
  diet_options?: string[];
  outdoor_seating?: boolean;
  wheelchair?: string;
  categories?: string[];
  url?: string;
  payment_methods?: string[];
  capacity?: number;
  sources: string[];
  confidence: number;
  enriched_at: Date;
}

/**
 * Merge data from multiple enrichment sources
 */
export function mergeEnrichmentData(
  google?: GooglePlacesEnrichment | null,
  wikipedia?: WikipediaEnrichment | null,
  osm?: OSMEnrichment | null
): MergedEnrichment {
  const merged: MergedEnrichment = {
    sources: [],
    confidence: 0,
    enriched_at: new Date(),
  };

  const sourceCount = [google, wikipedia, osm].filter(Boolean).length;

  // Track which sources were used
  if (google) merged.sources.push('google');
  if (wikipedia) merged.sources.push('wikipedia');
  if (osm) merged.sources.push('osm');

  // Merge description (prioritize Wikipedia for detailed descriptions)
  if (wikipedia?.description) {
    merged.description = wikipedia.description;
  } else if (google && 'editorial_summary' in google) {
    merged.description = (google as any).editorial_summary;
  }

  // Merge rating (weighted average)
  if (google?.rating) {
    const googleWeight = 0.5;
    const googleTotalRatings = google.user_ratings_total || 1;
    
    // Weight by number of ratings (more ratings = more reliable)
    const normalizedWeight = Math.min(googleTotalRatings / 100, 1) * googleWeight;
    merged.rating = google.rating * normalizedWeight;
    merged.user_ratings_total = google.user_ratings_total;
  }

  // Price level (take from Google)
  if (google?.price_level !== undefined) {
    merged.price_level = google.price_level;
  }

  // Website (priority: Google > OSM > Wikipedia)
  merged.website = 
    google?.website || 
    osm?.contact?.website || 
    wikipedia?.url;

  // Phone (priority: Google > OSM)
  merged.phone = 
    google?.phone || 
    osm?.contact?.phone;

  // Opening hours (priority: Google > OSM)
  merged.opening_hours = 
    google?.opening_hours || 
    osm?.opening_hours;

  // Photos (from Google and Wikipedia)
  const photos: string[] = [];
  if (google?.photos) photos.push(...google.photos);
  if (wikipedia?.images) photos.push(...wikipedia.images);
  if (photos.length > 0) {
    merged.photos = photos;
  }

  // Reviews (from Google)
  if (google?.reviews) {
    merged.reviews = google.reviews;
  }

  // Types/Categories (merge all unique)
  const allTypes: string[] = [];
  if (google?.types) allTypes.push(...google.types);
  if (wikipedia?.categories) allTypes.push(...wikipedia.categories);
  if (allTypes.length > 0) {
    merged.types = [...new Set(allTypes)];
    merged.categories = [...new Set(allTypes)];
  }

  // Cuisine (from OSM)
  if (osm?.cuisine) {
    merged.cuisine = osm.cuisine;
  }

  // Amenities (from OSM)
  const amenities: string[] = [];
  if (osm?.amenity) amenities.push(osm.amenity);
  if (amenities.length > 0) {
    merged.amenities = amenities;
  }

  // Diet options (from OSM)
  if (osm?.diet_options) {
    merged.diet_options = osm.diet_options;
  }

  // Outdoor seating (from OSM)
  if (osm?.outdoor_seating !== undefined) {
    merged.outdoor_seating = osm.outdoor_seating;
  }

  // Wheelchair accessibility (from OSM)
  if (osm?.wheelchair) {
    merged.wheelchair = osm.wheelchair;
  }

  // Payment methods (from OSM)
  if (osm?.payment_methods) {
    merged.payment_methods = osm.payment_methods;
  }

  // Capacity (from OSM)
  if (osm?.capacity) {
    merged.capacity = osm.capacity;
  }

  // Wikipedia URL
  if (wikipedia?.url) {
    merged.url = wikipedia.url;
  }

  // Calculate confidence score (0-1)
  merged.confidence = calculateConfidence(merged, sourceCount);

  return merged;
}

/**
 * Calculate confidence score for merged data
 */
function calculateConfidence(data: MergedEnrichment, sourceCount: number): number {
  let score = 0;
  const maxScore = 10;

  // More sources = higher confidence
  score += sourceCount * 2; // Max 6 points for 3 sources

  // Key fields present
  if (data.description) score += 1;
  if (data.rating) score += 1;
  if (data.website) score += 0.5;
  if (data.phone) score += 0.5;
  if (data.photos && data.photos.length > 0) score += 0.5;
  if (data.opening_hours) score += 0.5;

  return Math.min(score / maxScore, 1);
}

/**
 * Validate merged data
 */
export function validateMergedData(data: MergedEnrichment): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Validate rating
  if (data.rating !== undefined) {
    if (data.rating < 0 || data.rating > 5) {
      errors.push('Rating must be between 0 and 5');
    }
  }

  // Validate price level
  if (data.price_level !== undefined) {
    if (data.price_level < 0 || data.price_level > 4) {
      errors.push('Price level must be between 0 and 4');
    }
  }

  // Validate website URL
  if (data.website) {
    try {
      new URL(data.website);
    } catch {
      errors.push('Invalid website URL');
    }
  }

  // Validate confidence
  if (data.confidence < 0 || data.confidence > 1) {
    errors.push('Confidence must be between 0 and 1');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Check if URL is reachable
 */
export async function validateURL(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, {
      method: 'HEAD',
      signal: AbortSignal.timeout(5000), // 5 second timeout
    });
    return response.ok;
  } catch {
    return false;
  }
}

