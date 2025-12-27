/**
 * Forbes Travel Guide Scraper
 * 
 * Scrapes Forbes Travel Guide award winners (5-star, 4-star)
 * Target: ~5,000 ultra-luxury properties
 * Cost: FREE (web scraping)
 * 
 * Run: npx ts-node scripts/scrape-forbes.ts
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

// Forbes Travel Guide URLs
// Note: Forbes changed their URL structure. These URLs need to be manually verified.
// Alternative approach: Use their main awards page and extract all categories
const FORBES_URLS = [
  {
    url: 'https://www.forbestravelguide.com/star-awards',
    type: 'mixed',
    rating: 'all',
    luxuryScore: 9
  },
  // Backup: Try their destinations pages
  {
    url: 'https://www.forbestravelguide.com/destinations',
    type: 'mixed',
    rating: 'all',
    luxuryScore: 9
  }
];

interface ForbesPOI {
  name: string;
  location: string;
  city?: string;
  country?: string;
  rating: string;
  url?: string;
  type: string;
  luxuryScore: number;
}

async function scrapeForbesPage(pageUrl: string, type: string, rating: string): Promise<ForbesPOI[]> {
  console.log(`\n🔍 Scraping: ${pageUrl}`);
  
  try {
    // Fetch the page
    const response = await fetch(pageUrl, {
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
    console.log('🤖 Using Claude AI to extract POIs...');
    
    const extraction = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      messages: [{
        role: 'user',
        content: `Extract all ${type} properties from this Forbes Travel Guide HTML page.

For each property, extract:
- name: Full property name
- location: City and Country (format: "City, Country")
- url: Property page URL if available (full URL starting with https://)

Return ONLY a valid JSON array, nothing else:
[{
  "name": "Property Name",
  "location": "City, Country",
  "url": "https://..."
}]

If you can't find any properties, return an empty array: []

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
    
    // Extract JSON from response (handle markdown code blocks)
    let jsonText = content.text.trim();
    if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    }
    
    const pois: ForbesPOI[] = JSON.parse(jsonText);
    
    console.log(`✅ Extracted ${pois.length} POIs`);
    
    return pois.map(poi => ({
      ...poi,
      rating,
      type
    }));
    
  } catch (error) {
    console.error(`❌ Error scraping ${pageUrl}:`, error);
    return [];
  }
}

async function storeForbesPOI(session: neo4j.Session, poi: ForbesPOI, luxuryScore: number) {
  const { name, location, city, country, rating, url, type } = poi;
  
  // Parse location
  const [cityName, countryName] = location.split(',').map(s => s.trim());
  
  try {
    await session.run(`
      MERGE (p:poi {
        source: 'forbes',
        name: $name
      })
      SET p.type = $type,
          p.luxury_score_base = $luxuryScore,
          p.confidence_score = 0.95,
          p.score_evidence = $evidence_json,
          p.forbes_rating = $rating,
          p.website = $url,
          p.city = $city,
          p.country = $country,
          p.location_string = $location,
          p.scored_at = datetime(),
          p.enrichment_source = 'forbes_scrape',
          p.updated_at = datetime()
      RETURN p.poi_uid as poi_uid
    `, {
      name,
      type,
      luxuryScore: neo4j.int(luxuryScore),
      evidence_json: JSON.stringify({
        source: 'forbes_scrape',
        legacy_text: `Forbes Travel Guide ${rating} award winner - verified ultra-luxury`,
      }),
      rating,
      url: url || null,
      city: cityName,
      country: countryName,
      location
    });
    
    console.log(`  ✅ Stored: ${name} (${cityName}, ${countryName})`);
    
  } catch (error) {
    console.error(`  ❌ Error storing ${name}:`, error);
  }
}

async function main() {
  console.log('🌟 Forbes Travel Guide Scraper');
  console.log('================================\n');
  
  const session = driver.session();
  
  let totalPOIs = 0;
  
  try {
    for (const { url, type, rating, luxuryScore } of FORBES_URLS) {
      const pois = await scrapeForbesPage(url, type, rating);
      
      console.log(`\n💾 Storing ${pois.length} POIs in Neo4j...`);
      
      for (const poi of pois) {
        await storeForbesPOI(session, poi, luxuryScore);
        totalPOIs++;
      }
      
      // Rate limiting: Wait 2 seconds between requests
      console.log('⏳ Waiting 2 seconds before next request...');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    console.log('\n\n✅ Forbes Scraping Complete!');
    console.log(`📊 Total POIs scraped: ${totalPOIs}`);
    console.log('\n💡 Next steps:');
    console.log('   1. Run: npx ts-node scripts/scrape-michelin.ts');
    console.log('   2. Run: npx ts-node scripts/scrape-conde-nast.ts');
    console.log('   3. Geocode addresses to get coordinates');
    
  } catch (error) {
    console.error('❌ Fatal error:', error);
  } finally {
    await session.close();
    await driver.close();
  }
}

main();

