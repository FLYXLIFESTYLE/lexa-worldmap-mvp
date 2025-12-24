export type LatLng = { lat: number; lon: number };

const GEOCODE_URL = 'https://maps.googleapis.com/maps/api/geocode/json';
const PLACES_SEARCH_TEXT_URL = 'https://places.googleapis.com/v1/places:searchText';
const PLACES_DETAILS_BASE = 'https://places.googleapis.com/v1/places/';

export type PriceLevel =
  | 'PRICE_LEVEL_UNSPECIFIED'
  | 'PRICE_LEVEL_FREE'
  | 'PRICE_LEVEL_INEXPENSIVE'
  | 'PRICE_LEVEL_MODERATE'
  | 'PRICE_LEVEL_EXPENSIVE'
  | 'PRICE_LEVEL_VERY_EXPENSIVE';

export type PlacesSearchHit = {
  id?: string;
  displayName?: { text?: string };
  location?: { latitude?: number; longitude?: number };
  types?: string[];
  rating?: number;
  userRatingCount?: number;
  priceLevel?: PriceLevel;
};

export type PlacesDetails = {
  id?: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  location?: { latitude?: number; longitude?: number };
  types?: string[];
  rating?: number;
  userRatingCount?: number;
  priceLevel?: PriceLevel;
  websiteUri?: string;
  internationalPhoneNumber?: string;
  regularOpeningHours?: any;
};

function apiKey() {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key) throw new Error('Missing GOOGLE_PLACES_API_KEY');
  return key;
}

async function parseJsonOrThrow(resp: Response) {
  const text = await resp.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Non-JSON response (${resp.status}): ${text.slice(0, 200)}`);
  }
}

export async function geocodeAddress(address: string): Promise<{ center: LatLng; raw: any }> {
  const url = `${GEOCODE_URL}?address=${encodeURIComponent(address)}&key=${encodeURIComponent(apiKey())}`;
  const resp = await fetch(url, { method: 'GET' });
  const data = await parseJsonOrThrow(resp);

  if (!resp.ok) {
    const message = data?.error_message || data?.error?.message || resp.statusText;
    throw new Error(`Geocode failed (${resp.status}): ${message}`);
  }
  if (data.status !== 'OK' || !data.results?.[0]?.geometry?.location) {
    throw new Error(`Geocode not OK: ${data.status || 'unknown'}`);
  }

  const loc = data.results[0].geometry.location;
  return { center: { lat: loc.lat, lon: loc.lng }, raw: data };
}

export async function placesSearchText(input: {
  textQuery: string;
  center: LatLng;
  radius_m: number;
  languageCode?: string;
  maxResultCount?: number;
}): Promise<{ places: PlacesSearchHit[]; raw: any }> {
  const searchFieldMask = [
    'places.id',
    'places.displayName',
    'places.location',
    'places.types',
    'places.rating',
    'places.userRatingCount',
    'places.priceLevel',
  ].join(',');

  const body: any = {
    textQuery: input.textQuery,
    maxResultCount: Math.max(1, Math.min(20, input.maxResultCount || 20)),
    languageCode: input.languageCode || 'en',
    // Use restriction (not bias) so we stay *inside* the circle.
    locationRestriction: {
      circle: {
        center: { latitude: input.center.lat, longitude: input.center.lon },
        radius: Math.max(100, Math.min(50000, input.radius_m)),
      },
    },
  };

  const resp = await fetch(PLACES_SEARCH_TEXT_URL, {
    method: 'POST',
    headers: {
      'X-Goog-Api-Key': apiKey(),
      'X-Goog-FieldMask': searchFieldMask,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const data = await parseJsonOrThrow(resp);
  if (!resp.ok) {
    const message = data?.error?.message || resp.statusText;
    throw new Error(`Places searchText failed (${resp.status}): ${message}`);
  }

  return { places: (data.places || []) as PlacesSearchHit[], raw: data };
}

export async function placesDetails(placeId: string): Promise<{ place: PlacesDetails; raw: any }> {
  const detailsFieldMask = [
    'id',
    'displayName',
    'formattedAddress',
    'location',
    'types',
    'rating',
    'userRatingCount',
    'priceLevel',
    'websiteUri',
    'internationalPhoneNumber',
    'regularOpeningHours',
  ].join(',');

  const resp = await fetch(`${PLACES_DETAILS_BASE}${encodeURIComponent(placeId)}`, {
    method: 'GET',
    headers: {
      'X-Goog-Api-Key': apiKey(),
      'X-Goog-FieldMask': detailsFieldMask,
    },
  });

  const data = await parseJsonOrThrow(resp);
  if (!resp.ok) {
    const message = data?.error?.message || resp.statusText;
    throw new Error(`Places details failed (${resp.status}): ${message}`);
  }

  return { place: data as PlacesDetails, raw: data };
}

export function isQuotaError(message: string) {
  const m = message.toLowerCase();
  return (
    m.includes('quota') ||
    m.includes('resource_exhausted') ||
    m.includes('billing') ||
    m.includes('rate limit') ||
    m.includes('too many requests') ||
    m.includes('(429)') ||
    m.includes(' 429 ')
  );
}


