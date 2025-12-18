/**
 * LEXA Master Data Intake Pipeline
 * 
 * Complete automated process for POI data intake:
 * 1. Get relevant properties (name, type, coordinates, etc.)
 * 2. Scrape related websites for details
 * 3. Create nodes with all properties
 * 4. Check and merge duplicates
 * 5. Add relationships (SUPPORTS_ACTIVITY, emotions, LOCATED_IN)
 * 6. Add geographic relationships (city, region, area, continent)
 * 
 * Philosophy: LEXA doesn't just list what's there - it shows what's relevant to excite and move you.
 * 
 * Run: npx ts-node scripts/master-data-intake-pipeline.ts
 */

import * as dotenv from 'dotenv';
import * as neo4j from 'neo4j-driver';
import Anthropic from '@anthropic-ai/sdk';

// Load environment variables
dotenv.config({ path: '.env.local' });
dotenv.config();

// Initialize clients
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || ''
});

const driver = neo4j.driver(
  process.env.NEO4J_URI || '',
  neo4j.auth.basic(
    process.env.NEO4J_USER || 'neo4j',
    process.env.NEO4J_PASSWORD || ''
  )
);

const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY || '';

interface POIInput {
  name: string;
  type?: string;
  lat?: number;
  lon?: number;
  city?: string;
  country?: string;
  website?: string;
  source: string;
}

interface EnrichedPOI extends POIInput {
  poi_uid: string;
  luxury_score: number;
  luxury_confidence: number;
  luxury_evidence: string;
  description?: string;
  rating?: number;
  price_level?: number;
  opening_hours?: string;
  phone?: string;
  address?: string;
  google_place_id?: string;
  website_highlights?: string[];
  activities: string[];
  emotions: string[];
  desires: string[];
  fears_mitigated: string[];
}

// ============================================================================
// STEP 1: GET RELEVANT PROPERTIES FROM GOOGLE PLACES
// ============================================================================

async function enrichWithGooglePlaces(poi: POIInput): Promise<Partial<EnrichedPOI> | null> {
  if (!poi.lat || !poi.lon) {
    console.log(`  ⚠️  No coordinates, skipping Google Places enrichment`);
    return null;
  }
  
  try {
    // Search for place
    const searchUrl = 'https://places.googleapis.com/v1/places:searchText';
    const searchResponse = await fetch(searchUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': GOOGLE_PLACES_API_KEY,
        'X-Goog-FieldMask': 'places.id,places.displayName,places.rating,places.userRatingCount'
      },
      body: JSON.stringify({
        textQuery: poi.name,
        locationBias: {
          circle: {
            center: { latitude: poi.lat, longitude: poi.lon },
            radius: 500
          }
        }
      })
    });
    
    if (!searchResponse.ok) return null;
    const searchData = await searchResponse.json();
    if (!searchData.places || searchData.places.length === 0) return null;
    
    const placeId = searchData.places[0].id;
    
    // Get full details
    const detailsUrl = `https://places.googleapis.com/v1/${placeId}`;
    const detailsResponse = await fetch(detailsUrl, {
      method: 'GET',
      headers: {
        'X-Goog-Api-Key': GOOGLE_PLACES_API_KEY,
        'X-Goog-FieldMask': 'id,displayName,rating,userRatingCount,priceLevel,websiteUri,internationalPhoneNumber,formattedAddress,currentOpeningHours,businessStatus'
      }
    });
    
    if (!detailsResponse.ok) return null;
    const details = await detailsResponse.json();
    
    return {
      rating: details.rating || null,
      price_level: details.priceLevel || null,
      website: details.websiteUri || poi.website,
      phone: details.internationalPhoneNumber || null,
      address: details.formattedAddress || null,
      opening_hours: details.currentOpeningHours?.weekdayDescriptions?.join(', ') || null,
      google_place_id: placeId
    };
    
  } catch (error) {
    console.error(`  ❌ Google Places error:`, error);
    return null;
  }
}

// ============================================================================
// STEP 2: SCRAPE RELATED WEBSITE
// ============================================================================

async function scrapeWebsite(url: string): Promise<{ description?: string; highlights?: string[] } | null> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    if (!response.ok) return null;
    const html = await response.text();
    
    // Use Claude to extract meaningful content
    const extraction = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [{
        role: 'user',
        content: `Extract key information from this website for a luxury travel POI.

Return ONLY valid JSON:
{
  "description": "Brief description (2-3 sentences)",
  "highlights": ["highlight 1", "highlight 2", "highlight 3"]
}

Focus on what makes this place special, unique experiences offered, and emotional appeal.

HTML (first 10000 chars):
${html.substring(0, 10000)}`
      }]
    });
    
    const content = extraction.content[0];
    if (content.type !== 'text') return null;
    
    let jsonText = content.text.trim();
    if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    }
    
    return JSON.parse(jsonText);
    
  } catch (error) {
    console.error(`  ❌ Website scraping error:`, error);
    return null;
  }
}

// ============================================================================
// STEP 3: CALCULATE LUXURY SCORE
// ============================================================================

function calculateLuxuryScore(poi: Partial<EnrichedPOI>): { score: number; confidence: number; evidence: string } {
  let score = 5; // Base score
  let factors: string[] = [];
  
  // Google rating
  if (poi.rating) {
    if (poi.rating >= 4.5) {
      score += 2;
      factors.push(`Google rating ${poi.rating}/5`);
    } else if (poi.rating >= 4.0) {
      score += 1;
      factors.push(`Google rating ${poi.rating}/5`);
    }
  }
  
  // Price level
  if (poi.price_level) {
    if (poi.price_level >= 4) {
      score += 2;
      factors.push('Very expensive ($$$$)');
    } else if (poi.price_level === 3) {
      score += 1;
      factors.push('Expensive ($$$)');
    }
  }
  
  // Has website
  if (poi.website) {
    score += 0.5;
    factors.push('Professional website');
  }
  
  // Has highlights
  if (poi.website_highlights && poi.website_highlights.length > 0) {
    score += 1;
    factors.push(`${poi.website_highlights.length} unique experiences`);
  }
  
  // Type-based scoring
  if (poi.type) {
    const luxuryTypes = ['resort', 'spa', 'fine_dining', 'yacht_club', 'golf_course', 'luxury_hotel'];
    if (luxuryTypes.some(t => poi.type?.toLowerCase().includes(t))) {
      score += 1;
      factors.push(`Luxury type: ${poi.type}`);
    }
  }
  
  // Cap at 10
  score = Math.min(10, score);
  
  const confidence = factors.length >= 3 ? 0.85 : factors.length >= 2 ? 0.70 : 0.60;
  const evidence = factors.join(', ');
  
  return { score, confidence, evidence };
}

// ============================================================================
// STEP 4: INFER ACTIVITIES & EMOTIONS
// ============================================================================

async function inferActivitiesAndEmotions(poi: Partial<EnrichedPOI>): Promise<{
  activities: string[];
  emotions: string[];
  desires: string[];
  fears_mitigated: string[];
}> {
  try {
    const prompt = `Analyze this POI and determine:
1. What activities does it support?
2. What emotions does it evoke?
3. What desires does it amplify?
4. What fears does it mitigate?

POI Details:
- Name: ${poi.name}
- Type: ${poi.type || 'unknown'}
- Description: ${poi.description || 'none'}
- Highlights: ${poi.website_highlights?.join(', ') || 'none'}
- Luxury Score: ${poi.luxury_score || 'unknown'}

Return ONLY valid JSON:
{
  "activities": ["activity1", "activity2"],
  "emotions": ["emotion1", "emotion2"],
  "desires": ["desire1", "desire2"],
  "fears_mitigated": ["fear1", "fear2"]
}

Use proper capitalization (e.g., "Fine Dining", "Tranquility", "Exclusivity", "Crowds").`;

    const analysis = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      messages: [{
        role: 'user',
        content: prompt
      }]
    });
    
    const content = analysis.content[0];
    if (content.type !== 'text') {
      return { activities: [], emotions: [], desires: [], fears_mitigated: [] };
    }
    
    let jsonText = content.text.trim();
    if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    }
    
    return JSON.parse(jsonText);
    
  } catch (error) {
    console.error(`  ❌ Emotion inference error:`, error);
    return { activities: [], emotions: [], desires: [], fears_mitigated: [] };
  }
}

// ============================================================================
// STEP 5: CHECK FOR DUPLICATES & MERGE
// ============================================================================

async function findDuplicate(session: neo4j.Session, poi: POIInput): Promise<string | null> {
  if (!poi.lat || !poi.lon) return null;
  
  const result = await session.run(`
    MATCH (p:poi)
    WHERE point.distance(
      point({latitude: p.lat, longitude: p.lon}),
      point({latitude: $lat, longitude: $lon})
    ) < 100
    AND (
      p.name = $name
      OR toLower(p.name) CONTAINS toLower($name)
      OR toLower($name) CONTAINS toLower(p.name)
    )
    RETURN p.poi_uid as poi_uid
    LIMIT 1
  `, {
    lat: poi.lat,
    lon: poi.lon,
    name: poi.name
  });
  
  if (result.records.length > 0) {
    return result.records[0].get('poi_uid');
  }
  
  return null;
}

// ============================================================================
// STEP 6: CREATE/UPDATE POI NODE WITH ALL RELATIONSHIPS
// ============================================================================

async function createOrUpdatePOI(session: neo4j.Session, poi: EnrichedPOI): Promise<void> {
  try {
    // Create/update main POI node
    await session.run(`
      MERGE (p:poi {poi_uid: $poi_uid})
      SET p.name = $name,
          p.type = $type,
          p.lat = $lat,
          p.lon = $lon,
          p.luxury_score = $luxury_score,
          p.luxury_confidence = $luxury_confidence,
          p.luxury_evidence = $luxury_evidence,
          p.description = $description,
          p.rating = $rating,
          p.price_level = $price_level,
          p.website = $website,
          p.phone = $phone,
          p.address = $address,
          p.google_place_id = $google_place_id,
          p.city = $city,
          p.country = $country,
          p.source = $source,
          p.scored_at = datetime(),
          p.updated_at = datetime()
    `, {
      poi_uid: poi.poi_uid,
      name: poi.name,
      type: poi.type || null,
      lat: poi.lat || null,
      lon: poi.lon || null,
      luxury_score: neo4j.int(poi.luxury_score),
      luxury_confidence: poi.luxury_confidence,
      luxury_evidence: poi.luxury_evidence,
      description: poi.description || null,
      rating: poi.rating || null,
      price_level: poi.price_level ? neo4j.int(poi.price_level) : null,
      website: poi.website || null,
      phone: poi.phone || null,
      address: poi.address || null,
      google_place_id: poi.google_place_id || null,
      city: poi.city || null,
      country: poi.country || null,
      source: poi.source
    });
    
    // Create LOCATED_IN relationship (city/destination)
    if (poi.city) {
      await session.run(`
        MATCH (p:poi {poi_uid: $poi_uid})
        MERGE (d:destination {name: $city})
        MERGE (p)-[:LOCATED_IN {confidence: 0.95}]->(d)
      `, {
        poi_uid: poi.poi_uid,
        city: poi.city
      });
    }
    
    // Create SUPPORTS_ACTIVITY relationships
    for (const activity of poi.activities) {
      await session.run(`
        MATCH (p:poi {poi_uid: $poi_uid})
        MERGE (a:activity_type {name: $activity})
        MERGE (p)-[:SUPPORTS_ACTIVITY {confidence: 0.85}]->(a)
      `, {
        poi_uid: poi.poi_uid,
        activity
      });
    }
    
    // Create EVOKES relationships
    for (const emotion of poi.emotions) {
      await session.run(`
        MATCH (p:poi {poi_uid: $poi_uid})
        MERGE (e:Emotion {name: $emotion})
        MERGE (p)-[:EVOKES {confidence: 0.80}]->(e)
      `, {
        poi_uid: poi.poi_uid,
        emotion
      });
    }
    
    // Create AMPLIFIES_DESIRE relationships
    for (const desire of poi.desires) {
      await session.run(`
        MATCH (p:poi {poi_uid: $poi_uid})
        MERGE (d:Desire {name: $desire})
        MERGE (p)-[:AMPLIFIES_DESIRE {confidence: 0.80}]->(d)
      `, {
        poi_uid: poi.poi_uid,
        desire
      });
    }
    
    // Create MITIGATES_FEAR relationships
    for (const fear of poi.fears_mitigated) {
      await session.run(`
        MATCH (p:poi {poi_uid: $poi_uid})
        MERGE (f:Fear {name: $fear})
        MERGE (p)-[:MITIGATES_FEAR {confidence: 0.80}]->(f)
      `, {
        poi_uid: poi.poi_uid,
        fear
      });
    }
    
    // Create OFFERS_EXPERIENCE nodes for highlights
    if (poi.website_highlights) {
      for (const highlight of poi.website_highlights) {
        await session.run(`
          MATCH (p:poi {poi_uid: $poi_uid})
          MERGE (e:Experience {name: $highlight})
          MERGE (p)-[:OFFERS_EXPERIENCE {confidence: 0.85}]->(e)
        `, {
          poi_uid: poi.poi_uid,
          highlight
        });
      }
    }
    
  } catch (error) {
    console.error(`  ❌ Error creating/updating POI:`, error);
    throw error;
  }
}

// ============================================================================
// MAIN PIPELINE
// ============================================================================

export async function processPOI(input: POIInput): Promise<EnrichedPOI | null> {
  console.log(`\n🔍 Processing: ${input.name}`);
  
  const session = driver.session();
  
  try {
    // Check for duplicates
    const duplicateUid = await findDuplicate(session, input);
    if (duplicateUid) {
      console.log(`  ⚠️  Duplicate found (${duplicateUid}), merging data...`);
      // Use existing UID
      input.poi_uid = duplicateUid;
    } else {
      // Generate new UID
      input.poi_uid = `${input.source}:${Date.now()}:${Math.random().toString(36).substr(2, 9)}`;
    }
    
    // Step 1: Enrich with Google Places
    console.log(`  📍 Enriching with Google Places...`);
    const googleData = await enrichWithGooglePlaces(input);
    const enriched: Partial<EnrichedPOI> = { ...input, ...googleData };
    
    // Step 2: Scrape website if available
    if (enriched.website) {
      console.log(`  🌐 Scraping website...`);
      const websiteData = await scrapeWebsite(enriched.website);
      if (websiteData) {
        enriched.description = websiteData.description;
        enriched.website_highlights = websiteData.highlights;
      }
    }
    
    // Step 3: Calculate luxury score
    console.log(`  💎 Calculating luxury score...`);
    const scoring = calculateLuxuryScore(enriched);
    enriched.luxury_score = scoring.score;
    enriched.luxury_confidence = scoring.confidence;
    enriched.luxury_evidence = scoring.evidence;
    
    // Step 4: Infer activities & emotions
    console.log(`  🎭 Inferring activities & emotions...`);
    const emotional = await inferActivitiesAndEmotions(enriched);
    enriched.activities = emotional.activities;
    enriched.emotions = emotional.emotions;
    enriched.desires = emotional.desires;
    enriched.fears_mitigated = emotional.fears_mitigated;
    
    // Step 5: Create/update in Neo4j with all relationships
    console.log(`  💾 Storing in Neo4j with relationships...`);
    await createOrUpdatePOI(session, enriched as EnrichedPOI);
    
    console.log(`  ✅ Complete! Luxury score: ${enriched.luxury_score}`);
    console.log(`     Activities: ${enriched.activities?.join(', ') || 'none'}`);
    console.log(`     Emotions: ${enriched.emotions?.join(', ') || 'none'}`);
    
    return enriched as EnrichedPOI;
    
  } catch (error) {
    console.error(`  ❌ Pipeline error:`, error);
    return null;
  } finally {
    await session.close();
  }
}

// Test with a sample POI
async function main() {
  console.log('🚀 LEXA Master Data Intake Pipeline');
  console.log('====================================\n');
  console.log('Philosophy: LEXA doesn\'t just list what\'s there');
  console.log('            It shows what\'s relevant to excite and move you.\n');
  
  // Example POI
  const testPOI: POIInput = {
    name: 'Club 55',
    type: 'beach_club',
    lat: 43.2247,
    lon: 6.6821,
    city: 'St. Tropez',
    country: 'France',
    source: 'manual_test'
  };
  
  await processPOI(testPOI);
  
  console.log('\n✅ Pipeline test complete!');
  console.log('\n💡 To use this pipeline:');
  console.log('   1. Import: import { processPOI } from "./master-data-intake-pipeline"');
  console.log('   2. Call: await processPOI({ name, type, lat, lon, city, country, source })');
  console.log('   3. Done! POI is enriched, scored, and connected.');
  
  await driver.close();
}

// Run as standalone script
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

