/**
 * Google Places API Client
 * Enriches POI data from Google Places
 */

import { Client } from '@googlemaps/google-maps-services-js';

const client = new Client({});

interface PlaceDetails {
  name?: string;
  rating?: number;
  user_ratings_total?: number;
  price_level?: number;
  website?: string;
  formatted_phone_number?: string;
  opening_hours?: {
    weekday_text?: string[];
  };
  photos?: Array<{
    photo_reference: string;
  }>;
  reviews?: Array<{
    rating: number;
    text: string;
    author_name: string;
  }>;
  types?: string[];
}

export interface GooglePlacesEnrichment {
  rating?: number;
  user_ratings_total?: number;
  price_level?: number;
  website?: string;
  phone?: string;
  opening_hours?: string[];
  photos?: string[];
  reviews?: Array<{
    rating: number;
    text: string;
    author: string;
  }>;
  types?: string[];
  source: 'google';
  enriched_at: Date;
}

/**
 * Search for a place by name and coordinates
 */
export async function searchPlace(
  name: string,
  lat: number,
  lon: number
): Promise<string | null> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  
  if (!apiKey) {
    console.error('[Google Places] API key not configured');
    return null;
  }

  try {
    const response = await client.placesNearby({
      params: {
        location: { lat, lng: lon },
        radius: 100, // 100 meters
        keyword: name,
        key: apiKey,
      },
    });

    if (response.data.results && response.data.results.length > 0) {
      return response.data.results[0].place_id || null;
    }

    return null;
  } catch (error) {
    console.error('[Google Places] Search error:', error);
    return null;
  }
}

/**
 * Get detailed place information
 */
export async function getPlaceDetails(placeId: string): Promise<GooglePlacesEnrichment | null> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  
  if (!apiKey) {
    console.error('[Google Places] API key not configured');
    return null;
  }

  try {
    const response = await client.placeDetails({
      params: {
        place_id: placeId,
        fields: [
          'name',
          'rating',
          'user_ratings_total',
          'price_level',
          'website',
          'formatted_phone_number',
          'opening_hours',
          'photos',
          'reviews',
          'types',
        ],
        key: apiKey,
      },
    });

    const result = response.data.result;
    if (!result) return null;

    return {
      rating: result.rating,
      user_ratings_total: result.user_ratings_total,
      price_level: result.price_level,
      website: result.website,
      phone: result.formatted_phone_number,
      opening_hours: result.opening_hours?.weekday_text,
      photos: result.photos?.map(p => p.photo_reference).slice(0, 5),
      reviews: result.reviews?.slice(0, 3).map(r => ({
        rating: r.rating,
        text: r.text,
        author: r.author_name,
      })),
      types: result.types,
      source: 'google',
      enriched_at: new Date(),
    };
  } catch (error) {
    console.error('[Google Places] Details error:', error);
    return null;
  }
}

/**
 * Enrich a POI with Google Places data
 */
export async function enrichPOI(
  name: string,
  lat: number,
  lon: number
): Promise<GooglePlacesEnrichment | null> {
  try {
    // Search for the place
    const placeId = await searchPlace(name, lat, lon);
    if (!placeId) {
      return null;
    }

    // Get detailed information
    const details = await getPlaceDetails(placeId);
    return details;
  } catch (error) {
    console.error('[Google Places] Enrichment error:', error);
    return null;
  }
}

/**
 * Calculate estimated API cost for enrichment
 */
export function calculateCost(requestCount: number): number {
  // Place Details: $17 per 1,000 requests
  const costPerRequest = 0.017;
  return requestCount * costPerRequest;
}

