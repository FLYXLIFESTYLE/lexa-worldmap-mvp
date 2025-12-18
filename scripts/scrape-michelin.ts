/**
 * Michelin Guide Scraper
 * 
 * Scrapes Michelin Guide starred restaurants
 * Target: ~3,000 Michelin-starred restaurants
 * Cost: FREE (web scraping)
 * 
 * Luxury Scoring:
 * - 3 stars = 10 (exceptional cuisine, worth a special journey)
 * - 2 stars = 9 (excellent cooking, worth a detour)
 * - 1 star = 8 (high quality cooking, worth a stop)
 * - Bib Gourmand = 6 (good quality, good value)
 * 
 * Run: npx ts-node scripts/scrape-michelin.ts
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

// Michelin Guide regions to scrape
const MICHELIN_REGIONS = [
  { name: 'France', url: 'https://guide.michelin.com/en/fr/restaurants' },
  { name: 'Italy', url: 'https://guide.michelin.com/en/it/restaurants' },
  { name: 'Spain', url: 'https://guide.michelin.com/en/es/restaurants' },
  { name: 'Germany', url: 'https://guide.michelin.com/en/de/restaurants' },
  { name: 'UK', url: 'https://guide.michelin.com/en/gb/restaurants' },
  { name: 'Switzerland', url: 'https://guide.michelin.com/en/ch/restaurants' },
  { name: 'Monaco', url: 'https://guide.michelin.com/en/mc/restaurants' },
  { name: 'USA', url: 'https://guide.michelin.com/en/us/restaurants' },
  { name: 'Japan', url: 'https://guide.michelin.com/en/jp/restaurants' },
  { name: 'Hong Kong', url: 'https://guide.michelin.com/en/hk/restaurants' },
  { name: 'Singapore', url: 'https://guide.michelin.com/en/sg/restaurants' },
];

interface MichelinPOI {
  name: string;
  location: string;
  city?: string;
  country?: string;
  stars: number;
  bibGourmand: boolean;
  cuisine?: string;
  url?: string;
}

function getLuxuryScore(stars: number, bibGourmand: boolean): number {
  if (stars === 3) return 10;
  if (stars === 2) return 9;
  if (stars === 1) return 8;
  if (bibGourmand) return 6;
  return 7; // Default for Michelin-listed restaurants
}

async function scrapeMichelinRegion(regionUrl: string, regionName: string): Promise<MichelinPOI[]> {
  console.log(`\n🔍 Scraping Michelin Guide: ${regionName}`);
  
  try {
    // Fetch the page
    const response = await fetch(regionUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    if (!response.ok) {
      console.error(`❌ Failed to fetch: ${response.status}`);
      return [];
    }
    
    const html = await response.text();
    
    // Use Claude to extract structured data
    console.log('🤖 Using Claude AI to extract restaurants...');
    
    const extraction = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      messages: [{
        role: 'user',
        content: `Extract all Michelin-starred restaurants from this Michelin Guide HTML page for ${regionName}.

For each restaurant, extract:
- name: Restaurant name
- location: City and specific area if available
- stars: Number of Michelin stars (1, 2, or 3). Use 0 if no stars but has Bib Gourmand.
- bibGourmand: true if it has Bib Gourmand designation, false otherwise
- cuisine: Type of cuisine
- url: Restaurant page URL if available

Return ONLY a valid JSON array, nothing else:
[{
  "name": "Restaurant Name",
  "location": "City, Area",
  "stars": 1,
  "bibGourmand": false,
  "cuisine": "French",
  "url": "https://..."
}]

If you can't find any restaurants, return an empty array: []

Focus on restaurants with stars or Bib Gourmand designation.

HTML (first 15000 chars):
${html.substring(0, 15000)}`
      }]
    });
    
    // Parse Claude's response
    const content = extraction.content[0];
    if (content.type !== 'text') {
      console.error('❌ Unexpected response type from Claude');
      return [];
    }
    
    // Extract JSON from response
    let jsonText = content.text.trim();
    if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    }
    
    const restaurants: MichelinPOI[] = JSON.parse(jsonText);
    
    console.log(`✅ Extracted ${restaurants.length} restaurants`);
    
    // Add country to each restaurant
    return restaurants.map(r => ({
      ...r,
      country: regionName
    }));
    
  } catch (error) {
    console.error(`❌ Error scraping ${regionName}:`, error);
    return [];
  }
}

async function storeMichelinPOI(session: neo4j.Session, poi: MichelinPOI) {
  const { name, location, city, country, stars, bibGourmand, cuisine, url } = poi;
  
  const luxuryScore = getLuxuryScore(stars, bibGourmand);
  
  let evidence = '';
  if (stars === 3) evidence = 'Michelin 3-star: Exceptional cuisine, worth a special journey';
  else if (stars === 2) evidence = 'Michelin 2-star: Excellent cooking, worth a detour';
  else if (stars === 1) evidence = 'Michelin 1-star: High quality cooking, worth a stop';
  else if (bibGourmand) evidence = 'Michelin Bib Gourmand: Good quality, good value';
  else evidence = 'Listed in Michelin Guide';
  
  try {
    await session.run(`
      MERGE (p:poi {
        source: 'michelin',
        name: $name
      })
      SET p.type = 'restaurant',
          p.luxury_score = $luxuryScore,
          p.luxury_confidence = 0.98,
          p.luxury_evidence = $evidence,
          p.michelin_stars = $stars,
          p.michelin_bib_gourmand = $bibGourmand,
          p.cuisine = $cuisine,
          p.website = $url,
          p.city = $city,
          p.country = $country,
          p.location_string = $location,
          p.scored_at = datetime(),
          p.enrichment_source = 'michelin_scrape',
          p.updated_at = datetime()
      
      // Create relationship to activity
      MERGE (a:activity_type {name: 'Fine Dining'})
      MERGE (p)-[:SUPPORTS_ACTIVITY {confidence: 0.95}]->(a)
      
      RETURN p.poi_uid as poi_uid
    `, {
      name,
      luxuryScore: neo4j.int(luxuryScore),
      evidence,
      stars: neo4j.int(stars),
      bibGourmand,
      cuisine: cuisine || null,
      url: url || null,
      city: location.split(',')[0].trim(),
      country,
      location
    });
    
    const starDisplay = stars > 0 ? `${'⭐'.repeat(stars)}` : (bibGourmand ? '🍽️ Bib' : '');
    console.log(`  ✅ ${starDisplay} ${name} (${location})`);
    
  } catch (error) {
    console.error(`  ❌ Error storing ${name}:`, error);
  }
}

async function main() {
  console.log('⭐ Michelin Guide Scraper');
  console.log('=========================\n');
  
  const session = driver.session();
  
  let totalPOIs = 0;
  
  try {
    for (const region of MICHELIN_REGIONS) {
      const restaurants = await scrapeMichelinRegion(region.url, region.name);
      
      console.log(`\n💾 Storing ${restaurants.length} restaurants in Neo4j...`);
      
      for (const restaurant of restaurants) {
        await storeMichelinPOI(session, restaurant);
        totalPOIs++;
      }
      
      // Rate limiting: Wait 3 seconds between regions
      console.log('⏳ Waiting 3 seconds before next region...');
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
    
    console.log('\n\n✅ Michelin Scraping Complete!');
    console.log(`📊 Total restaurants scraped: ${totalPOIs}`);
    console.log('\n💡 Next steps:');
    console.log('   1. Run: npx ts-node scripts/scrape-conde-nast.ts');
    console.log('   2. Geocode addresses to get coordinates');
    
  } catch (error) {
    console.error('❌ Fatal error:', error);
  } finally {
    await session.close();
    await driver.close();
  }
}

main();

