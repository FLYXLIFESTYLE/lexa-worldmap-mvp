/**
 * Global POI Enrichment Script
 * 
 * Enriches ALL unscored POIs worldwide with Google Places data
 * Processes in larger batches for efficiency
 */

import dotenv from 'dotenv';
import * as neo4j from 'neo4j-driver';

// Load from .env.local first, then .env
dotenv.config({ path: '.env.local' });
dotenv.config();

const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY || '';
const NEO4J_URI = process.env.NEO4J_URI || '';
const NEO4J_USER = process.env.NEO4J_USER || '';
const NEO4J_PASSWORD = process.env.NEO4J_PASSWORD || '';

const BATCH_SIZE = 100; // Process 100 POIs per run
const DELAY_MS = 100; // 100ms delay between requests (10 req/sec)

interface POI {
  poi_uid: string;
  name: string;
  lat: number;
  lon: number;
  destination_name: string | null;
  type: string | null;
}

function calculateLuxuryScore(googleData: any): {
  luxury_score: number;
  confidence_score: number;
  score_evidence: string; // JSON string
} {
  let score = 0;
  let evidence: string[] = [];

  // Rating component (0-3 points)
  if (googleData.rating) {
    if (googleData.rating >= 4.5) {
      score += 3;
      evidence.push(`Excellent rating: ${googleData.rating}★`);
    } else if (googleData.rating >= 4.0) {
      score += 2;
      evidence.push(`Good rating: ${googleData.rating}★`);
    } else if (googleData.rating >= 3.5) {
      score += 1;
      evidence.push(`Average rating: ${googleData.rating}★`);
    }
  }

  // Price level component (0-4 points)
  if (googleData.price_level) {
    const pricePoints = googleData.price_level;
    score += pricePoints;
    evidence.push(`Price level: ${'$'.repeat(pricePoints)}`);
  }

  // Review volume component (0-1 point)
  if (googleData.user_ratings_total) {
    if (googleData.user_ratings_total >= 500) {
      score += 1;
      evidence.push(`Popular venue: ${googleData.user_ratings_total} reviews`);
    }
  }

  // Type-based scoring (0-2 points)
  const luxuryTypes = [
    'spa', 'resort', 'luxury_hotel', 'fine_dining', 'michelin',
    'beach_club', 'yacht', 'casino', 'golf', 'wine'
  ];
  const types = googleData.types || [];
  const hasLuxuryType = types.some((t: string) => 
    luxuryTypes.some(lt => t.toLowerCase().includes(lt))
  );
  if (hasLuxuryType) {
    score += 2;
    evidence.push('Luxury category');
  }

  // Normalize to 0-10 scale
  const normalizedScore = Math.min(10, (score / 10) * 10);
  
  // Confidence based on data completeness
  let confidence = 0.5;
  if (googleData.rating) confidence += 0.2;
  if (googleData.price_level) confidence += 0.2;
  if (googleData.user_ratings_total) confidence += 0.1;

  return {
    luxury_score: Math.round(normalizedScore * 10) / 10,
    confidence_score: Math.round(confidence * 10) / 10,
    score_evidence: JSON.stringify({
      source: 'google_places',
      rules: evidence,
      inputs: {
        rating: googleData.rating ?? null,
        user_ratings_total: googleData.user_ratings_total ?? null,
        price_level: googleData.price_level ?? null,
        types: googleData.types ?? null,
      },
    })
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
    const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place_id}&fields=place_id,name,rating,user_ratings_total,price_level,types,formatted_address,website,formatted_phone_number,opening_hours,business_status&key=${GOOGLE_PLACES_API_KEY}`;
    
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

async function enrichAllPOIs() {
  console.log('🌍 Global POI Enrichment\n');

  if (!GOOGLE_PLACES_API_KEY) {
    console.error('❌ Missing GOOGLE_PLACES_API_KEY in .env');
    process.exit(1);
  }

  const driver = neo4j.driver(NEO4J_URI, neo4j.auth.basic(NEO4J_USER, NEO4J_PASSWORD));

  try {
    await driver.verifyConnectivity();
    console.log('✅ Connected to Neo4j\n');

    // Get unscored POIs (canonical fields)
    const session = driver.session();
    const result = await session.run(
      `
      MATCH (p:poi)
      WHERE (coalesce(p.luxury_score_verified, p.luxury_score_base, p.luxury_score, p.luxuryScore) IS NULL OR coalesce(p.luxury_score_verified, p.luxury_score_base, p.luxury_score, p.luxuryScore) = 0)
        AND p.name IS NOT NULL
        AND p.name <> ''
        AND NOT p.name STARTS WITH 'Unnamed'
        AND p.lat IS NOT NULL
        AND p.lon IS NOT NULL
      RETURN p.poi_uid as poi_uid, 
             p.name as name, 
             p.lat as lat, 
             p.lon as lon,
             p.destination_name as destination_name,
             p.type as type
      LIMIT $batch_size
      `,
      { batch_size: neo4j.int(BATCH_SIZE) }
    );
    await session.close();

    const pois: POI[] = result.records.map(r => ({
      poi_uid: r.get('poi_uid'),
      name: r.get('name'),
      lat: r.get('lat'),
      lon: r.get('lon'),
      destination_name: r.get('destination_name'),
      type: r.get('type')
    }));

    console.log(`📊 Found ${pois.length} POIs to enrich\n`);

    if (pois.length === 0) {
      console.log('✅ All POIs are already enriched!');
      return;
    }

    let enriched = 0;
    let notFound = 0;
    let errors = 0;

    for (let i = 0; i < pois.length; i++) {
      const poi = pois[i];
      console.log(`[${i + 1}/${pois.length}] ${poi.name} (${poi.destination_name || 'Unknown'})`);

      try {
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
                p.luxury_score_base = $luxury_score_base,
                p.confidence_score = $confidence_score,
                p.score_evidence = $score_evidence,
                p.google_website = $website,
                p.google_phone = $phone,
                p.google_address = $address,
                p.google_business_status = $business_status,
                p.enriched_at = datetime(),
                p.enriched_source = 'google_places'
            `,
            {
              poi_uid: poi.poi_uid,
              place_id: googleData.place_id,
              rating: googleData.rating || null,
              reviews_count: googleData.user_ratings_total || null,
              price_level: googleData.price_level || null,
              luxury_score_base: scoring.luxury_score,
              confidence_score: scoring.confidence_score,
              score_evidence: scoring.score_evidence,
              website: googleData.website || null,
              phone: googleData.formatted_phone_number || null,
              address: googleData.formatted_address || null,
              business_status: googleData.business_status || null,
            }
          );
          await updateSession.close();

          console.log(`  ✅ Score: ${scoring.luxury_score}/10 | ${googleData.rating}★ | ${googleData.price_level ? '$'.repeat(googleData.price_level) : 'N/A'}`);
          enriched++;
        } else {
          console.log(`  ❌ Not found in Google Places`);
          notFound++;
        }
      } catch (error) {
        console.error(`  ⚠️  Error:`, error);
        errors++;
      }

      if (i < pois.length - 1) {
        await new Promise(resolve => setTimeout(resolve, DELAY_MS));
      }
    }

    console.log('\n🎉 Enrichment Complete!');
    console.log(`✅ Enriched: ${enriched}`);
    console.log(`❌ Not found: ${notFound}`);
    console.log(`⚠️  Errors: ${errors}`);
    console.log(`💰 Cost: $${(enriched * 0.017).toFixed(2)}`);
    console.log('\n💡 Run again to process next batch');

  } finally {
    await driver.close();
  }
}

enrichAllPOIs().catch(console.error);

