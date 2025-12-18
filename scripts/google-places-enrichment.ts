/**
 * Google Places API Integration for Luxury POI Enrichment
 * 
 * This script enriches existing POIs with data from Google Places:
 * - Ratings, reviews, price levels
 * - Photos, opening hours
 * - Enhanced descriptions
 * - Luxury scoring based on Google data
 * 
 * Cost: ~$0.017 per POI (Places Details API)
 * Budget: $500 = ~29,000 POI enrichments
 */

import dotenv from 'dotenv';
import neo4j from 'neo4j-driver';

// Load from .env.local first, then .env
dotenv.config({ path: '.env.local' });
dotenv.config(); // Loads .env without overriding existing vars

// Configuration
const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY || '';
const NEO4J_URI = process.env.NEO4J_URI || '';
const NEO4J_USER = process.env.NEO4J_USER || '';
const NEO4J_PASSWORD = process.env.NEO4J_PASSWORD || '';

const BATCH_SIZE = 100; // Process 100 POIs at a time
const DELAY_MS = 1000; // 1 second delay between batches (stay under rate limits)

interface POI {
  poi_uid: string;
  name: string;
  lat: number;
  lon: number;
  type: string | null;
  destination_name: string | null;
}

interface GooglePlaceDetails {
  place_id: string;
  name: string;
  rating?: number;
  user_ratings_total?: number;
  price_level?: number; // 0-4
  types?: string[];
  vicinity?: string;
  formatted_address?: string;
  opening_hours?: any;
  photos?: any[];
  reviews?: any[];
}

// Luxury scoring logic based on Google data
function calculateLuxuryScore(place: GooglePlaceDetails): {
  luxury_score: number;
  luxury_confidence: number;
  luxury_evidence: string;
} {
  let score = 5.0; // Base score
  let confidence = 0.5;
  const evidence: string[] = [];

  // Price level (0-4, where 4 = most expensive)
  if (place.price_level !== undefined) {
    if (place.price_level === 4) {
      score += 3.0;
      evidence.push('Highest price level ($$$$)');
      confidence += 0.2;
    } else if (place.price_level === 3) {
      score += 2.0;
      evidence.push('High price level ($$$)');
      confidence += 0.15;
    } else if (place.price_level === 2) {
      score += 0.5;
      evidence.push('Medium price level ($$)');
    } else {
      score -= 2.0;
      evidence.push('Low price level');
      confidence += 0.1;
    }
  }

  // Rating (0-5 stars)
  if (place.rating !== undefined) {
    if (place.rating >= 4.5) {
      score += 2.0;
      evidence.push(`Excellent rating: ${place.rating}/5`);
      confidence += 0.15;
    } else if (place.rating >= 4.0) {
      score += 1.0;
      evidence.push(`Good rating: ${place.rating}/5`);
      confidence += 0.1;
    } else if (place.rating < 3.5) {
      score -= 1.0;
      evidence.push(`Below average rating: ${place.rating}/5`);
    }
  }

  // Number of reviews (popularity indicator)
  if (place.user_ratings_total !== undefined) {
    if (place.user_ratings_total > 1000) {
      score += 0.5;
      evidence.push(`Popular: ${place.user_ratings_total} reviews`);
      confidence += 0.1;
    } else if (place.user_ratings_total > 500) {
      evidence.push(`${place.user_ratings_total} reviews`);
      confidence += 0.05;
    }
  }

  // Type indicators for luxury
  const luxuryTypes = [
    'spa', 'resort', 'luxury_hotel', 'fine_dining_restaurant',
    'night_club', 'casino', 'yacht_club', 'golf_course'
  ];
  
  if (place.types) {
    const hasLuxuryType = place.types.some(t => luxuryTypes.includes(t));
    if (hasLuxuryType) {
      score += 0.5;
      evidence.push('Luxury category type');
      confidence += 0.1;
    }
  }

  // Cap score at 10
  score = Math.min(10, Math.max(0, score));
  
  // Cap confidence at 1.0
  confidence = Math.min(1.0, confidence);

  return {
    luxury_score: Math.round(score * 10) / 10,
    luxury_confidence: Math.round(confidence * 100) / 100,
    luxury_evidence: evidence.join('; '),
  };
}

// Fetch place details from Google Places API
async function fetchPlaceDetails(lat: number, lon: number, name: string): Promise<GooglePlaceDetails | null> {
  try {
    // First, find the place using Nearby Search
    const searchUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lon}&radius=100&keyword=${encodeURIComponent(name)}&key=${GOOGLE_PLACES_API_KEY}`;
    
    const searchResponse = await fetch(searchUrl);
    const searchData = await searchResponse.json();

    if (searchData.status !== 'OK' || !searchData.results || searchData.results.length === 0) {
      console.log(`  ❌ Not found in Google Places: ${name}`);
      return null;
    }

    const place_id = searchData.results[0].place_id;

    // Get detailed information
    const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place_id}&fields=name,rating,user_ratings_total,price_level,types,vicinity,formatted_address,opening_hours,photos,reviews&key=${GOOGLE_PLACES_API_KEY}`;
    
    const detailsResponse = await fetch(detailsUrl);
    const detailsData = await detailsResponse.json();

    if (detailsData.status !== 'OK' || !detailsData.result) {
      return null;
    }

    return detailsData.result as GooglePlaceDetails;

  } catch (error) {
    console.error(`  Error fetching Google Places data for ${name}:`, error);
    return null;
  }
}

// Update POI in Neo4j with enriched data
async function updatePOIWithGoogleData(
  driver: neo4j.Driver,
  poi_uid: string,
  googleData: GooglePlaceDetails,
  scoringData: ReturnType<typeof calculateLuxuryScore>
) {
  const session = driver.session();
  
  try {
    await session.run(
      `
      MATCH (p:poi {poi_uid: $poi_uid})
      SET p.google_place_id = $place_id,
          p.google_rating = $rating,
          p.google_reviews_count = $reviews_count,
          p.google_price_level = $price_level,
          p.luxury_score = $luxury_score,
          p.luxury_confidence = $luxury_confidence,
          p.luxury_evidence = $luxury_evidence,
          p.enriched_at = datetime(),
          p.enriched_source = 'google_places'
      RETURN p
      `,
      {
        poi_uid,
        place_id: googleData.place_id,
        rating: googleData.rating || null,
        reviews_count: googleData.user_ratings_total || null,
        price_level: googleData.price_level || null,
        luxury_score: scoringData.luxury_score,
        luxury_confidence: scoringData.luxury_confidence,
        luxury_evidence: scoringData.luxury_evidence,
      }
    );
  } finally {
    await session.close();
  }
}

// Main enrichment function
async function enrichPOIs() {
  console.log('🚀 Starting Google Places Enrichment...\n');

  // Validation
  if (!GOOGLE_PLACES_API_KEY) {
    console.error('❌ GOOGLE_PLACES_API_KEY not found in environment variables!');
    console.log('💡 Add to .env.local: GOOGLE_PLACES_API_KEY=your_key_here');
    process.exit(1);
  }

  if (!NEO4J_URI || !NEO4J_USER || !NEO4J_PASSWORD) {
    console.error('❌ Neo4j credentials missing!');
    process.exit(1);
  }

  const driver = neo4j.driver(
    NEO4J_URI,
    neo4j.auth.basic(NEO4J_USER, NEO4J_PASSWORD)
  );

  try {
    // Test connection
    await driver.verifyConnectivity();
    console.log('✅ Connected to Neo4j\n');

    // Get POIs that need enrichment (no luxury_score or google_place_id)
    const session = driver.session();
    const result = await session.run(
      `
      MATCH (p:poi)
      WHERE (p.luxury_score IS NULL OR p.google_place_id IS NULL)
        AND p.name IS NOT NULL
        AND p.lat IS NOT NULL
        AND p.lon IS NOT NULL
        AND p.destination_name IS NOT NULL
      RETURN p.poi_uid as poi_uid,
             p.name as name,
             p.lat as lat,
             p.lon as lon,
             p.type as type,
             p.destination_name as destination_name
      ORDER BY p.destination_name
      LIMIT $limit
      `,
      { limit: neo4j.int(BATCH_SIZE) }
    );
    await session.close();

    const pois: POI[] = result.records.map(record => ({
      poi_uid: record.get('poi_uid'),
      name: record.get('name'),
      lat: record.get('lat'),
      lon: record.get('lon'),
      type: record.get('type'),
      destination_name: record.get('destination_name'),
    }));

    console.log(`📊 Found ${pois.length} POIs to enrich\n`);

    let enriched = 0;
    let notFound = 0;
    let errors = 0;

    for (let i = 0; i < pois.length; i++) {
      const poi = pois[i];
      console.log(`[${i + 1}/${pois.length}] Processing: ${poi.name} (${poi.destination_name})`);

      try {
        const googleData = await fetchPlaceDetails(poi.lat, poi.lon, poi.name);

        if (googleData) {
          const scoringData = calculateLuxuryScore(googleData);
          await updatePOIWithGoogleData(driver, poi.poi_uid, googleData, scoringData);
          
          console.log(`  ✅ Enriched! Score: ${scoringData.luxury_score}/10 | Confidence: ${scoringData.luxury_confidence}`);
          enriched++;
        } else {
          notFound++;
        }

        // Delay to respect rate limits
        if (i < pois.length - 1) {
          await new Promise(resolve => setTimeout(resolve, DELAY_MS));
        }

      } catch (error) {
        console.error(`  ❌ Error:`, error);
        errors++;
      }
    }

    console.log('\n📈 Enrichment Complete!');
    console.log(`✅ Enriched: ${enriched}`);
    console.log(`❌ Not found: ${notFound}`);
    console.log(`⚠️  Errors: ${errors}`);
    console.log(`💰 Estimated cost: $${(enriched * 0.017).toFixed(2)}`);

  } catch (error) {
    console.error('Fatal error:', error);
  } finally {
    await driver.close();
  }
}

// Run if called directly
if (require.main === module) {
  enrichPOIs().catch(console.error);
}

export { enrichPOIs, calculateLuxuryScore };

