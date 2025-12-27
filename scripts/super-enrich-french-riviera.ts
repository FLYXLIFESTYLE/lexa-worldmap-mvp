/**
 * Super Enrichment Script for French Riviera
 * 
 * Complete 3-phase enrichment pipeline:
 * Phase 1: Google Places enrichment
 * Phase 2: Website scraping (if website found)
 * Phase 3: Emotional relationship inference
 * 
 * This script touches each POI only ONCE for maximum efficiency
 */

import * as dotenv from 'dotenv';
import * as neo4j from 'neo4j-driver';
import Anthropic from '@anthropic-ai/sdk';

// Load from .env.local first, then .env
dotenv.config({ path: '.env.local' });
dotenv.config();

const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY || '';
const NEO4J_URI = process.env.NEO4J_URI || '';
const NEO4J_USER = process.env.NEO4J_USER || '';
const NEO4J_PASSWORD = process.env.NEO4J_PASSWORD || '';
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || '';

const BATCH_SIZE = 100; // Increased from 50 for better throughput
const DELAY_MS = 200; // 200ms delay between requests (5 req/sec)

// French Riviera destinations
const FRENCH_RIVIERA_DESTINATIONS = [
  'St. Tropez', 'Saint Tropez', 'Monaco', 'Monte Carlo', 'Monte-Carlo',
  'Cannes', 'Nice', 'Antibes', 'Juan-les-Pins', 'Saint-Jean-Cap-Ferrat',
  'Cap Ferrat', 'Villefranche-sur-Mer', 'Villefranche', 'Menton',
  'Beaulieu-sur-Mer', 'Èze', 'Eze', 'Cap d Ail', 'Roquebrune-Cap-Martin',
  'French Riviera', 'Cote d Azur'
];

interface POI {
  poi_uid: string;
  name: string;
  lat: number;
  lon: number;
  destination_name: string | null;
  type: string | null;
}

interface GooglePlaceData {
  place_id: string;
  name: string;
  rating?: number;
  user_ratings_total?: number;
  price_level?: number;
  types?: string[];
  formatted_address?: string;
  website?: string;
  formatted_phone_number?: string;
  business_status?: string;
}

interface LuxuryScoring {
  luxury_score: number;
  confidence_score: number;
  score_evidence: string; // JSON string
}

interface EmotionalRelationships {
  evokes: Array<{ emotion: string; confidence: number; reason: string }>;
  amplifies_desire: Array<{ desire: string; confidence: number; reason: string }>;
  mitigates_fear: Array<{ fear: string; confidence: number; reason: string }>;
}

interface WebsiteData {
  description?: string;
  highlights?: string[];
  menu_items?: string[];
  ambiance_tags?: string[];
}

// Initialize Claude client
const anthropic = new Anthropic({
  apiKey: ANTHROPIC_API_KEY,
});

/**
 * PHASE 1: Google Places Enrichment
 */
async function fetchGooglePlace(lat: number, lon: number, name: string): Promise<GooglePlaceData | null> {
  try {
    // Try with name first
    let searchUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lon}&radius=100&keyword=${encodeURIComponent(name)}&key=${GOOGLE_PLACES_API_KEY}`;
    
    let searchResponse = await fetch(searchUrl);
    let searchData = await searchResponse.json();

    // If not found with name, try without name (for unnamed POIs)
    if (searchData.status !== 'OK' || !searchData.results?.[0]) {
      console.log(`    🔄 Trying reverse lookup without name...`);
      searchUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lon}&radius=50&key=${GOOGLE_PLACES_API_KEY}`;
      searchResponse = await fetch(searchUrl);
      searchData = await searchResponse.json();
    }

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
    console.error(`    ⚠️  Google Places error:`, error);
    return null;
  }
}

function calculateLuxuryScore(googleData: GooglePlaceData): LuxuryScoring {
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
    score += googleData.price_level;
    evidence.push(`Price level: ${'$'.repeat(googleData.price_level)}`);
  }

  // Review volume component (0-1 point)
  if (googleData.user_ratings_total && googleData.user_ratings_total >= 500) {
    score += 1;
    evidence.push(`Popular venue: ${googleData.user_ratings_total} reviews`);
  }

  // Type-based scoring (0-2 points)
  const luxuryTypes = ['spa', 'resort', 'luxury_hotel', 'fine_dining', 'beach_club', 'yacht', 'casino', 'golf'];
  const types = googleData.types || [];
  const hasLuxuryType = types.some(t => luxuryTypes.some(lt => t.toLowerCase().includes(lt)));
  if (hasLuxuryType) {
    score += 2;
    evidence.push('Luxury category');
  }

  const normalizedScore = Math.min(10, (score / 10) * 10);
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

/**
 * PHASE 2: Website Scraping
 */
async function scrapeWebsite(url: string): Promise<WebsiteData | null> {
  try {
    console.log(`    🌐 Scraping website: ${url}`);
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'LEXA-Bot/1.0 (Travel Intelligence Platform)'
      },
      signal: AbortSignal.timeout(10000) // 10 second timeout
    });

    if (!response.ok) {
      console.log(`    ⚠️  Website returned ${response.status}`);
      return null;
    }

    const html = await response.text();
    
    // Use Claude to extract structured data from HTML
    const extraction = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      messages: [{
        role: 'user',
        content: `Extract key information from this luxury venue website HTML. Return ONLY a JSON object with these fields:
- description (1-2 sentences)
- highlights (array of 3-5 key features)
- ambiance_tags (array of 3-5 mood/atmosphere words)

HTML snippet (first 5000 chars):
${html.substring(0, 5000)}

Return only valid JSON, no markdown.`
      }]
    });

    const content = extraction.content[0];
    if (content.type === 'text') {
      const jsonMatch = content.text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const data = JSON.parse(jsonMatch[0]);
        console.log(`    ✅ Extracted: ${data.highlights?.length || 0} highlights`);
        return data;
      }
    }

    return null;
  } catch (error) {
    console.log(`    ⚠️  Website scraping failed:`, error instanceof Error ? error.message : 'Unknown error');
    return null;
  }
}

/**
 * PHASE 3: Emotional Relationship Inference
 */
async function inferEmotionalRelationships(
  poi: POI,
  googleData: GooglePlaceData,
  luxuryScore: number,
  websiteData: WebsiteData | null
): Promise<EmotionalRelationships> {
  try {
    console.log(`    🧠 Inferring emotional relationships...`);
    
    const prompt = `Analyze this luxury travel venue and identify emotional relationships:

POI: ${googleData.name || poi.name}
Type: ${googleData.types?.join(', ') || poi.type || 'unknown'}
Location: ${googleData.formatted_address || poi.destination_name}
Luxury Score: ${luxuryScore}/10
Rating: ${googleData.rating || 'N/A'}★
Price: ${'$'.repeat(googleData.price_level || 0) || 'N/A'}
${websiteData?.description ? `Description: ${websiteData.description}` : ''}
${websiteData?.highlights ? `Highlights: ${websiteData.highlights.join(', ')}` : ''}

Identify emotional relationships this venue creates:

1. EVOKES - What emotions does this venue evoke? (e.g., joy, excitement, tranquility, romance)
2. AMPLIFIES_DESIRE - What desires does it amplify? (e.g., adventure, luxury, social_status, freedom)
3. MITIGATES_FEAR - What fears does it reduce? (e.g., missing_out, mediocrity, boredom)

Return ONLY a JSON object:
{
  "evokes": [{"emotion": "joy", "confidence": 0.9, "reason": "beachfront setting"}],
  "amplifies_desire": [{"desire": "luxury", "confidence": 0.8, "reason": "exclusive venue"}],
  "mitigates_fear": [{"fear": "mediocrity", "confidence": 0.7, "reason": "high ratings"}]
}

Include 2-4 items per category with confidence scores 0.6-1.0. Return only valid JSON.`;

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 800,
      messages: [{ role: 'user', content: prompt }]
    });

    const content = response.content[0];
    if (content.type === 'text') {
      const jsonMatch = content.text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const relationships = JSON.parse(jsonMatch[0]);
        console.log(`    ✅ Found: ${relationships.evokes?.length || 0} emotions, ${relationships.amplifies_desire?.length || 0} desires`);
        return relationships;
      }
    }

    return { evokes: [], amplifies_desire: [], mitigates_fear: [] };
  } catch (error) {
    console.log(`    ⚠️  Emotional inference failed:`, error instanceof Error ? error.message : 'Unknown error');
    return { evokes: [], amplifies_desire: [], mitigates_fear: [] };
  }
}

/**
 * Create emotional relationship nodes and edges in Neo4j
 */
async function createEmotionalRelationships(
  driver: neo4j.Driver,
  poiUid: string,
  relationships: EmotionalRelationships
) {
  const session = driver.session();
  
  try {
    // Create EVOKES relationships
    for (const item of relationships.evokes) {
      await session.run(
        `
        MATCH (p:poi {poi_uid: $poi_uid})
        MERGE (e:Emotion {name: $emotion})
        MERGE (p)-[r:EVOKES]->(e)
        SET r.confidence = $confidence,
            r.reason = $reason,
            r.inferred_at = datetime(),
            r.source = 'ai_inference'
        `,
        {
          poi_uid: poiUid,
          emotion: item.emotion,
          confidence: item.confidence,
          reason: item.reason
        }
      );
    }

    // Create AMPLIFIES_DESIRE relationships
    for (const item of relationships.amplifies_desire) {
      await session.run(
        `
        MATCH (p:poi {poi_uid: $poi_uid})
        MERGE (d:Desire {name: $desire})
        MERGE (p)-[r:AMPLIFIES_DESIRE]->(d)
        SET r.confidence = $confidence,
            r.reason = $reason,
            r.inferred_at = datetime(),
            r.source = 'ai_inference'
        `,
        {
          poi_uid: poiUid,
          desire: item.desire,
          confidence: item.confidence,
          reason: item.reason
        }
      );
    }

    // Create MITIGATES_FEAR relationships
    for (const item of relationships.mitigates_fear) {
      await session.run(
        `
        MATCH (p:poi {poi_uid: $poi_uid})
        MERGE (f:Fear {name: $fear})
        MERGE (p)-[r:MITIGATES_FEAR]->(f)
        SET r.confidence = $confidence,
            r.reason = $reason,
            r.inferred_at = datetime(),
            r.source = 'ai_inference'
        `,
        {
          poi_uid: poiUid,
          fear: item.fear,
          confidence: item.confidence,
          reason: item.reason
        }
      );
    }
  } finally {
    await session.close();
  }
}

/**
 * Main enrichment function
 */
async function superEnrichFrenchRiviera() {
  console.log('🇫🇷 Super Enrichment: French Riviera\n');
  console.log('📦 3-Phase Pipeline:');
  console.log('  Phase 1: Google Places enrichment');
  console.log('  Phase 2: Website scraping (if available)');
  console.log('  Phase 3: Emotional relationship inference\n');

  if (!GOOGLE_PLACES_API_KEY || !ANTHROPIC_API_KEY) {
    console.error('❌ Missing API keys');
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
        AND (coalesce(p.luxury_score_verified, p.luxury_score_base, p.luxury_score, p.luxuryScore) IS NULL
             OR coalesce(p.luxury_score_verified, p.luxury_score_base, p.luxury_score, p.luxuryScore) = 0)
        AND p.lat IS NOT NULL
        AND p.lon IS NOT NULL
        AND (p.enrichment_attempted IS NULL OR p.enrichment_attempted = false)
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

    console.log(`📊 Found ${pois.length} POIs to super-enrich\n`);

    let enriched = 0;
    let withWebsites = 0;
    let withEmotions = 0;
    let notFound = 0;

    for (let i = 0; i < pois.length; i++) {
      const poi = pois[i];
      const displayName = poi.name || 'Unnamed POI';
      console.log(`[${i + 1}/${pois.length}] ${displayName} (${poi.destination_name || 'Unknown'})`);

      try {
        // PHASE 1: Google Places
        console.log(`  📍 Phase 1: Google Places...`);
        const googleData = await fetchGooglePlace(poi.lat, poi.lon, poi.name);

        if (!googleData) {
          console.log(`  ❌ Not found in Google Places`);
          
          // Mark as attempted so we don't retry
          const markSession = driver.session();
          await markSession.run(
            `
            MATCH (p:poi {poi_uid: $poi_uid})
            SET p.enrichment_attempted = true,
                p.enrichment_status = 'not_found',
                p.enrichment_attempted_at = datetime()
            `,
            { poi_uid: poi.poi_uid }
          );
          await markSession.close();
          console.log(`  ℹ️  Marked as attempted (will not retry)\n`);
          
          notFound++;
          continue;
        }

        const scoring = calculateLuxuryScore(googleData);
        console.log(`  ✅ Score: ${scoring.luxury_score}/10 | ${googleData.rating}★ | ${googleData.price_level ? '$'.repeat(googleData.price_level) : 'N/A'}`);

        // Update POI with Google data
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
              p.enriched_source = 'super_enrichment',
              p.enrichment_attempted = true,
              p.enrichment_status = 'success',
              p.enrichment_attempted_at = datetime()
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

        // PHASE 2: Website Scraping
        let websiteData: WebsiteData | null = null;
        if (googleData.website && scoring.luxury_score >= 7) {
          console.log(`  🌐 Phase 2: Website scraping...`);
          websiteData = await scrapeWebsite(googleData.website);
          
          if (websiteData) {
            const wsSession = driver.session();
            
            // Save description and ambiance to POI
            await wsSession.run(
              `
              MATCH (p:poi {poi_uid: $poi_uid})
              SET p.website_description = $description,
                  p.website_ambiance = $ambiance,
                  p.website_scraped_at = datetime()
              `,
              {
                poi_uid: poi.poi_uid,
                description: websiteData.description || null,
                ambiance: websiteData.ambiance_tags || []
              }
            );
            
            // Create Experience nodes for highlights
            if (websiteData.highlights && websiteData.highlights.length > 0) {
              for (const highlight of websiteData.highlights) {
                const experienceId = `exp_${poi.poi_uid}_${Buffer.from(highlight).toString('base64').substring(0, 16)}`;
                
                // Create Experience node
                await wsSession.run(`
                  MERGE (e:Experience {experience_id: $exp_id})
                  SET e.title = $title,
                      e.description = $highlight,
                      e.source = 'website_scraping',
                      e.created_at = datetime()
                `, {
                  exp_id: experienceId,
                  title: highlight.substring(0, 100),
                  highlight: highlight
                });

                // Link Experience to POI
                await wsSession.run(`
                  MATCH (e:Experience {experience_id: $exp_id})
                  MATCH (p:poi {poi_uid: $poi_uid})
                  MERGE (p)-[:OFFERS_EXPERIENCE {
                    confidence: 0.9,
                    source: 'website'
                  }]->(e)
                `, { exp_id: experienceId, poi_uid: poi.poi_uid });

                // Link Experience to Destination
                await wsSession.run(`
                  MATCH (e:Experience {experience_id: $exp_id})
                  MATCH (d:destination)
                  WHERE toLower(d.name) CONTAINS toLower($destination)
                  MERGE (e)-[:LOCATED_IN]->(d)
                `, { exp_id: experienceId, destination: poi.destination_name });
              }
              
              console.log(`    ✅ Created ${websiteData.highlights.length} Experience nodes`);
            }
            
            await wsSession.close();
            withWebsites++;
          }
        }

        // PHASE 3: Emotional Relationships
        if (scoring.luxury_score >= 6) {
          console.log(`  🧠 Phase 3: Emotional inference...`);
          const emotions = await inferEmotionalRelationships(poi, googleData, scoring.luxury_score, websiteData);
          
          if (emotions.evokes.length > 0 || emotions.amplifies_desire.length > 0 || emotions.mitigates_fear.length > 0) {
            await createEmotionalRelationships(driver, poi.poi_uid, emotions);
            withEmotions++;
          }
        }

        enriched++;
        console.log(`  ✅ Complete!\n`);

      } catch (error) {
        console.error(`  ⚠️  Error:`, error);
        console.log('');
      }

      if (i < pois.length - 1) {
        await new Promise(resolve => setTimeout(resolve, DELAY_MS));
      }
    }

    console.log('\n🎉 Super Enrichment Complete!');
    console.log(`✅ Enriched: ${enriched}`);
    console.log(`🌐 With websites: ${withWebsites}`);
    console.log(`🧠 With emotions: ${withEmotions}`);
    console.log(`❌ Not found: ${notFound}`);
    console.log(`💰 Cost: ~$${((enriched * 0.017) + (withWebsites * 0.002) + (withEmotions * 0.01)).toFixed(2)}`);
    console.log('\n💡 Run again to process next batch');

  } finally {
    await driver.close();
  }
}

superEnrichFrenchRiviera().catch(console.error);

