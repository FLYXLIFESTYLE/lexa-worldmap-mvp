/**
 * Discover & Add New Luxury POIs from Google Places
 * 
 * Searches Google Places for luxury establishments that don't exist in your database yet
 * Focuses on: Michelin restaurants, 5-star hotels, beach clubs, luxury spas, etc.
 */

import dotenv from 'dotenv';
import neo4j from 'neo4j-driver';
import { v4 as uuidv4 } from 'uuid';

dotenv.config({ path: '.env.local' });

const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY || '';
const NEO4J_URI = process.env.NEO4J_URI || '';
const NEO4J_USER = process.env.NEO4J_USER || '';
const NEO4J_PASSWORD = process.env.NEO4J_PASSWORD || '';

// Target destinations for discovery
const TARGET_DESTINATIONS = [
  { name: 'St. Tropez', lat: 43.2677, lon: 6.6407, radius: 5000 },
  { name: 'Monaco', lat: 43.7384, lon: 7.4246, radius: 3000 },
  { name: 'Cannes', lat: 43.5528, lon: 7.0174, radius: 5000 },
  { name: 'Nice', lat: 43.7102, lon: 7.2620, radius: 8000 },
];

// Luxury establishment types to search for
const LUXURY_TYPES = [
  'restaurant',           // Includes fine dining
  'bar',                  // Luxury bars and lounges
  'night_club',          // High-end nightlife
  'spa',                 // Luxury spas
  'lodging',             // Hotels and resorts
  'beach_club',          // Beach clubs (if supported)
  'casino',              // Casinos
  'tourist_attraction',  // Luxury attractions
];

// Keywords for luxury search
const LUXURY_KEYWORDS = [
  'luxury',
  'five star',
  '5 star',
  'michelin',
  'fine dining',
  'beach club',
  'yacht club',
  'exclusive',
  'premium',
  'gourmet',
];

const DELAY_MS = 2000; // 2 second delay between searches

interface DiscoveredPlace {
  place_id: string;
  name: string;
  lat: number;
  lon: number;
  rating?: number;
  user_ratings_total?: number;
  price_level?: number;
  types?: string[];
  vicinity?: string;
  formatted_address?: string;
  website?: string;
  formatted_phone_number?: string;
}

function determinePOIType(types: string[]): string {
  const typeMapping: { [key: string]: string } = {
    'restaurant': 'restaurant',
    'bar': 'bar',
    'night_club': 'nightclub',
    'spa': 'spa',
    'lodging': 'hotel',
    'casino': 'casino',
    'tourist_attraction': 'attraction',
    'beach': 'beach',
  };

  for (const type of types) {
    if (typeMapping[type]) {
      return typeMapping[type];
    }
  }

  return 'other';
}

function calculateLuxuryScore(place: DiscoveredPlace): {
  luxury_score: number;
  luxury_confidence: number;
  luxury_evidence: string;
} {
  let score = 5.0;
  let confidence = 0.4; // Lower confidence for discovered POIs (needs captain verification)
  const evidence: string[] = ['Discovered from Google Places'];

  if (place.price_level === 4) {
    score += 3.5;
    evidence.push('Highest price level ($$$$)');
    confidence += 0.3;
  } else if (place.price_level === 3) {
    score += 2.0;
    evidence.push('High price level ($$$)');
    confidence += 0.2;
  } else if (place.price_level && place.price_level <= 1) {
    score -= 2.0;
    evidence.push('Low price level - may not be luxury');
    confidence += 0.1;
  }

  if (place.rating) {
    if (place.rating >= 4.5) {
      score += 2.0;
      evidence.push(`Excellent: ${place.rating}★`);
      confidence += 0.15;
    } else if (place.rating >= 4.0) {
      score += 1.0;
      evidence.push(`Good: ${place.rating}★`);
      confidence += 0.1;
    } else if (place.rating < 3.5) {
      score -= 1.5;
    }
  }

  if (place.user_ratings_total && place.user_ratings_total > 500) {
    score += 0.5;
    evidence.push(`Popular: ${place.user_ratings_total} reviews`);
    confidence += 0.05;
  }

  score = Math.min(10, Math.max(0, score));
  confidence = Math.min(1.0, confidence);

  return {
    luxury_score: Math.round(score * 10) / 10,
    luxury_confidence: Math.round(confidence * 100) / 100,
    luxury_evidence: evidence.join('; '),
  };
}

async function searchLuxuryPlaces(destination: typeof TARGET_DESTINATIONS[0], type: string, keyword?: string): Promise<DiscoveredPlace[]> {
  try {
    const keywordParam = keyword ? `&keyword=${encodeURIComponent(keyword)}` : '';
    const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${destination.lat},${destination.lon}&radius=${destination.radius}&type=${type}${keywordParam}&key=${GOOGLE_PLACES_API_KEY}`;
    
    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== 'OK' || !data.results) {
      return [];
    }

    // Get detailed info for each place
    const places: DiscoveredPlace[] = [];
    
    for (const result of data.results.slice(0, 10)) { // Limit to 10 per search
      const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${result.place_id}&fields=name,rating,user_ratings_total,price_level,types,formatted_address,geometry,website,formatted_phone_number&key=${GOOGLE_PLACES_API_KEY}`;
      
      const detailsResponse = await fetch(detailsUrl);
      const detailsData = await detailsResponse.json();

      if (detailsData.status === 'OK' && detailsData.result) {
        const place = detailsData.result;
        places.push({
          place_id: result.place_id,
          name: place.name,
          lat: place.geometry.location.lat,
          lon: place.geometry.location.lng,
          rating: place.rating,
          user_ratings_total: place.user_ratings_total,
          price_level: place.price_level,
          types: place.types,
          vicinity: result.vicinity,
          formatted_address: place.formatted_address,
          website: place.website,
          formatted_phone_number: place.formatted_phone_number,
        });
      }

      // Small delay between details requests
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    return places;

  } catch (error) {
    console.error(`Error searching ${type} in ${destination.name}:`, error);
    return [];
  }
}

async function checkPOIExists(driver: neo4j.Driver, name: string, lat: number, lon: number): Promise<boolean> {
  const session = driver.session();
  try {
    // Check if POI exists within 100m radius and same name
    const result = await session.run(
      `
      MATCH (p:poi)
      WHERE p.name = $name
        AND abs(p.lat - $lat) < 0.001
        AND abs(p.lon - $lon) < 0.001
      RETURN count(p) as count
      `,
      { name, lat, lon }
    );

    const count = result.records[0].get('count').toNumber();
    return count > 0;

  } finally {
    await session.close();
  }
}

async function addPOIToDatabase(driver: neo4j.Driver, place: DiscoveredPlace, destination: string) {
  const session = driver.session();
  
  try {
    const poi_uid = `google:${place.place_id}`;
    const poi_type = determinePOIType(place.types || []);
    const scoring = calculateLuxuryScore(place);

    await session.run(
      `
      CREATE (p:poi {
        poi_uid: $poi_uid,
        name: $name,
        type: $type,
        destination_name: $destination_name,
        lat: $lat,
        lon: $lon,
        luxury_score: $luxury_score,
        luxury_confidence: $luxury_confidence,
        luxury_evidence: $luxury_evidence,
        google_place_id: $place_id,
        google_rating: $rating,
        google_reviews_count: $reviews_count,
        google_price_level: $price_level,
        google_website: $website,
        google_phone: $phone,
        google_address: $address,
        source: 'google_places',
        source_id: $place_id,
        created_at: datetime(),
        enriched_at: datetime(),
        enriched_source: 'google_places_discovery'
      })
      
      // Create destination relationship
      MERGE (d:destination {name: $destination_name})
      MERGE (p)-[:located_in]->(d)
      
      RETURN p
      `,
      {
        poi_uid,
        name: place.name,
        type: poi_type,
        destination_name: destination,
        lat: place.lat,
        lon: place.lon,
        luxury_score: scoring.luxury_score,
        luxury_confidence: scoring.luxury_confidence,
        luxury_evidence: scoring.luxury_evidence,
        place_id: place.place_id,
        rating: place.rating || null,
        reviews_count: place.user_ratings_total || null,
        price_level: place.price_level || null,
        website: place.website || null,
        phone: place.formatted_phone_number || null,
        address: place.formatted_address || null,
      }
    );

  } finally {
    await session.close();
  }
}

async function discoverLuxuryPOIs() {
  console.log('🔍 Discovering New Luxury POIs from Google Places\n');

  if (!GOOGLE_PLACES_API_KEY) {
    console.error('❌ Missing GOOGLE_PLACES_API_KEY');
    process.exit(1);
  }

  const driver = neo4j.driver(NEO4J_URI, neo4j.auth.basic(NEO4J_USER, NEO4J_PASSWORD));

  try {
    await driver.verifyConnectivity();
    console.log('✅ Connected to Neo4j\n');

    let totalDiscovered = 0;
    let totalAdded = 0;
    let totalSkipped = 0;
    let totalCost = 0;

    for (const destination of TARGET_DESTINATIONS) {
      console.log(`\n📍 Searching ${destination.name}...`);

      for (const type of LUXURY_TYPES) {
        console.log(`  🔎 Type: ${type}`);

        // Search with and without luxury keywords
        const places = await searchLuxuryPlaces(destination, type, 'luxury');
        totalCost += 0.032 * (1 + places.length); // Nearby Search + Details calls

        console.log(`    Found ${places.length} places`);

        for (const place of places) {
          const exists = await checkPOIExists(driver, place.name, place.lat, place.lon);

          if (!exists) {
            await addPOIToDatabase(driver, place, destination.name);
            const scoring = calculateLuxuryScore(place);
            console.log(`      ✅ ADDED: ${place.name} | Score: ${scoring.luxury_score}/10 | ${place.rating}★`);
            totalAdded++;
          } else {
            console.log(`      ⏭️  EXISTS: ${place.name}`);
            totalSkipped++;
          }

          totalDiscovered++;
        }

        // Delay between searches
        await new Promise(resolve => setTimeout(resolve, DELAY_MS));
      }
    }

    console.log('\n🎉 Discovery Complete!');
    console.log(`🔍 Total discovered: ${totalDiscovered}`);
    console.log(`✅ New POIs added: ${totalAdded}`);
    console.log(`⏭️  Already existed: ${totalSkipped}`);
    console.log(`💰 Estimated cost: $${totalCost.toFixed(2)}`);
    console.log('\n💡 Tip: Run ChatNeo4j to query the new POIs!');

  } finally {
    await driver.close();
  }
}

discoverLuxuryPOIs().catch(console.error);

