/**
 * French Riviera POI Enrichment Script
 * 
 * Enriches existing POIs in French Riviera destinations with Google Places data
 * Focuses on: St. Tropez, Monaco, Cannes, Nice, Antibes, Saint-Jean-Cap-Ferrat, Villefranche-sur-Mer
 */

import dotenv from 'dotenv';
import neo4j from 'neo4j-driver';

dotenv.config({ path: '.env.local' });

const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY || '';
const NEO4J_URI = process.env.NEO4J_URI || '';
const NEO4J_USER = process.env.NEO4J_USER || '';
const NEO4J_PASSWORD = process.env.NEO4J_PASSWORD || '';

// French Riviera destinations
const FRENCH_RIVIERA_DESTINATIONS = [
  'St. Tropez',
  'Saint Tropez',
  'Monaco',
  'Monte Carlo',
  'Monte-Carlo',
  'Cannes',
  'Nice',
  'Antibes',
  'Juan-les-Pins',
  'Saint-Jean-Cap-Ferrat',
  'Cap Ferrat',
  'Villefranche-sur-Mer',
  'Villefranche',
  'Menton',
  'Beaulieu-sur-Mer',
  'Èze',
  'Eze',
  'Cap d\'Ail',
  'Roquebrune-Cap-Martin',
  'French Riviera',
  'Côte d\'Azur',
  'Cote d\'Azur',
];

const BATCH_SIZE = 50; // Smaller batches for focused enrichment
const DELAY_MS = 1000;

interface POI {
  poi_uid: string;
  name: string;
  lat: number;
  lon: number;
  destination_name: string;
}

// Luxury scoring from Google Places data
function calculateLuxuryScore(place: any): {
  luxury_score: number;
  luxury_confidence: number;
  luxury_evidence: string;
} {
  let score = 5.0;
  let confidence = 0.5;
  const evidence: string[] = [];

  if (place.price_level !== undefined) {
    if (place.price_level === 4) {
      score += 3.5;
      evidence.push('Highest price level ($$$$)');
      confidence += 0.25;
    } else if (place.price_level === 3) {
      score += 2.0;
      evidence.push('High price level ($$$)');
      confidence += 0.2;
    } else if (place.price_level <= 1) {
      score -= 2.0;
      evidence.push('Low price level');
    }
  }

  if (place.rating !== undefined) {
    if (place.rating >= 4.5) {
      score += 2.0;
      evidence.push(`Excellent: ${place.rating}★ (${place.user_ratings_total} reviews)`);
      confidence += 0.2;
    } else if (place.rating >= 4.0) {
      score += 1.0;
      evidence.push(`Good: ${place.rating}★`);
      confidence += 0.15;
    } else if (place.rating < 3.5) {
      score -= 1.5;
      evidence.push(`Below average: ${place.rating}★`);
    }
  }

  if (place.user_ratings_total > 1000) {
    score += 0.5;
    evidence.push('Very popular');
    confidence += 0.1;
  }

  // French Riviera bonus (it's inherently more luxurious)
  score += 0.5;
  evidence.push('French Riviera location');

  score = Math.min(10, Math.max(0, score));
  confidence = Math.min(1.0, confidence);

  return {
    luxury_score: Math.round(score * 10) / 10,
    luxury_confidence: Math.round(confidence * 100) / 100,
    luxury_evidence: evidence.join('; '),
  };
}

async function fetchGooglePlace(lat: number, lon: number, name: string) {
  try {
    const searchUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lon}&radius=100&keyword=${encodeURIComponent(name)}&key=${GOOGLE_PLACES_API_KEY}`;
    
    const searchResponse = await fetch(searchUrl);
    const searchData = await searchResponse.json();

    if (searchData.status !== 'OK' || !searchData.results?.[0]) {
      return null;
    }

    const place_id = searchData.results[0].place_id;
    const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place_id}&fields=name,rating,user_ratings_total,price_level,types,formatted_address,website,formatted_phone_number&key=${GOOGLE_PLACES_API_KEY}`;
    
    const detailsResponse = await fetch(detailsUrl);
    const detailsData = await detailsResponse.json();

    if (detailsData.status === 'OK' && detailsData.result) {
      return detailsData.result;
    }

    return null;
  } catch (error) {
    console.error(`Error fetching ${name}:`, error);
    return null;
  }
}

async function enrichFrenchRiviera() {
  console.log('🇫🇷 French Riviera POI Enrichment\n');

  if (!GOOGLE_PLACES_API_KEY) {
    console.error('❌ Missing GOOGLE_PLACES_API_KEY in .env.local');
    process.exit(1);
  }

  const driver = neo4j.driver(NEO4J_URI, neo4j.auth.basic(NEO4J_USER, NEO4J_PASSWORD));

  try {
    await driver.verifyConnectivity();
    console.log('✅ Connected to Neo4j\n');

    // Get French Riviera POIs needing enrichment
    const session = driver.session();
    const destinationFilter = FRENCH_RIVIERA_DESTINATIONS.map(d => `toLower(p.destination_name) CONTAINS toLower('${d}')`).join(' OR ');
    
    const result = await session.run(
      `
      MATCH (p:poi)
      WHERE (${destinationFilter})
        AND p.luxury_score IS NULL
        AND p.name IS NOT NULL
        AND p.lat IS NOT NULL
        AND p.lon IS NOT NULL
      RETURN p.poi_uid as poi_uid,
             p.name as name,
             p.lat as lat,
             p.lon as lon,
             p.destination_name as destination_name
      ORDER BY p.destination_name
      LIMIT $limit
      `,
      { limit: neo4j.int(BATCH_SIZE) }
    );
    await session.close();

    const pois: POI[] = result.records.map(r => ({
      poi_uid: r.get('poi_uid'),
      name: r.get('name'),
      lat: r.get('lat'),
      lon: r.get('lon'),
      destination_name: r.get('destination_name'),
    }));

    console.log(`📊 Found ${pois.length} French Riviera POIs to enrich\n`);

    if (pois.length === 0) {
      console.log('✅ All French Riviera POIs are already enriched!');
      return;
    }

    let enriched = 0;
    let notFound = 0;

    for (let i = 0; i < pois.length; i++) {
      const poi = pois[i];
      console.log(`[${i + 1}/${pois.length}] ${poi.name} (${poi.destination_name})`);

      const googleData = await fetchGooglePlace(poi.lat, poi.lon, poi.name);

      if (googleData) {
        const scoring = calculateLuxuryScore(googleData);
        
        const updateSession = driver.session();
        await updateSession.run(
          `
          MATCH (p:poi {poi_uid: $poi_uid})
          SET p.google_place_id = $place_id,
              p.google_rating = $rating,
              p.google_reviews_count = $reviews_count,
              p.google_price_level = $price_level,
              p.luxury_score = $luxury_score,
              p.luxury_confidence = $luxury_confidence,
              p.luxury_evidence = $luxury_evidence,
              p.google_website = $website,
              p.google_phone = $phone,
              p.enriched_at = datetime(),
              p.enriched_source = 'google_places'
          `,
          {
            poi_uid: poi.poi_uid,
            place_id: googleData.place_id,
            rating: googleData.rating || null,
            reviews_count: googleData.user_ratings_total || null,
            price_level: googleData.price_level || null,
            luxury_score: scoring.luxury_score,
            luxury_confidence: scoring.luxury_confidence,
            luxury_evidence: scoring.luxury_evidence,
            website: googleData.website || null,
            phone: googleData.formatted_phone_number || null,
          }
        );
        await updateSession.close();

        console.log(`  ✅ Score: ${scoring.luxury_score}/10 | ${googleData.rating}★ | ${googleData.price_level ? '$'.repeat(googleData.price_level) : 'N/A'}`);
        enriched++;
      } else {
        console.log(`  ❌ Not found in Google Places`);
        notFound++;
      }

      if (i < pois.length - 1) {
        await new Promise(resolve => setTimeout(resolve, DELAY_MS));
      }
    }

    console.log('\n🎉 French Riviera Enrichment Complete!');
    console.log(`✅ Enriched: ${enriched}`);
    console.log(`❌ Not found: ${notFound}`);
    console.log(`💰 Cost: $${(enriched * 0.017).toFixed(2)}`);
    console.log('\n💡 Run again to process next batch of 50 POIs');

  } finally {
    await driver.close();
  }
}

enrichFrenchRiviera().catch(console.error);

