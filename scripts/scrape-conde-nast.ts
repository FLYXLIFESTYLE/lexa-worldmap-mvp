/**
 * Condé Nast Traveler Scraper
 * 
 * Scrapes Condé Nast Traveler award winners (Gold List, Hot List, Readers' Choice)
 * Target: ~3,000 curated luxury properties
 * Cost: FREE (web scraping)
 * 
 * Run: npx ts-node scripts/scrape-conde-nast.ts
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

// Condé Nast Traveler award lists
const CONDE_NAST_LISTS = [
  {
    url: 'https://www.cntraveler.com/gold-list',
    award: 'Gold List',
    luxuryScore: 9
  },
  {
    url: 'https://www.cntraveler.com/hot-list',
    award: 'Hot List',
    luxuryScore: 9
  },
  {
    url: 'https://www.cntraveler.com/the-bests/best-hotels-in-the-world',
    award: 'Best Hotels',
    luxuryScore: 8
  },
  {
    url: 'https://www.cntraveler.com/the-bests/best-restaurants-in-the-world',
    award: 'Best Restaurants',
    luxuryScore: 8
  }
];

interface CondeNastPOI {
  name: string;
  location: string;
  type: string;
  description?: string;
  url?: string;
}

async function scrapeCondeNastList(listUrl: string, award: string): Promise<CondeNastPOI[]> {
  console.log(`\n🔍 Scraping Condé Nast: ${award}`);
  
  try {
    // Fetch the page
    const response = await fetch(listUrl, {
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
    console.log('🤖 Using Claude AI to extract properties...');
    
    const extraction = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      messages: [{
        role: 'user',
        content: `Extract all properties from this Condé Nast Traveler ${award} HTML page.

For each property, extract:
- name: Property name
- location: City, Country
- type: hotel, restaurant, resort, spa, etc.
- description: Brief description if available
- url: Property page URL if available

Return ONLY a valid JSON array, nothing else:
[{
  "name": "Property Name",
  "location": "City, Country",
  "type": "hotel",
  "description": "Brief description",
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
    
    // Extract JSON from response
    let jsonText = content.text.trim();
    if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    }
    
    const pois: CondeNastPOI[] = JSON.parse(jsonText);
    
    console.log(`✅ Extracted ${pois.length} properties`);
    
    return pois;
    
  } catch (error) {
    console.error(`❌ Error scraping ${award}:`, error);
    return [];
  }
}

async function storeCondeNastPOI(session: neo4j.Session, poi: CondeNastPOI, award: string, luxuryScore: number) {
  const { name, location, type, description, url } = poi;
  
  const [cityName, countryName] = location.split(',').map(s => s.trim());
  
  try {
    await session.run(`
      MERGE (p:poi {
        source: 'conde_nast',
        name: $name
      })
      SET p.type = $type,
          p.luxury_score = $luxuryScore,
          p.luxury_confidence = 0.92,
          p.luxury_evidence = $evidence,
          p.conde_nast_award = $award,
          p.description = $description,
          p.website = $url,
          p.city = $city,
          p.country = $country,
          p.location_string = $location,
          p.scored_at = datetime(),
          p.enrichment_source = 'conde_nast_scrape',
          p.updated_at = datetime()
      RETURN p.poi_uid as poi_uid
    `, {
      name,
      type,
      luxuryScore: neo4j.int(luxuryScore),
      evidence: `Condé Nast Traveler ${award} winner - expert-curated luxury selection`,
      award,
      description: description || null,
      url: url || null,
      city: cityName,
      country: countryName || '',
      location
    });
    
    console.log(`  ✅ ${name} (${cityName})`);
    
  } catch (error) {
    console.error(`  ❌ Error storing ${name}:`, error);
  }
}

async function main() {
  console.log('✈️  Condé Nast Traveler Scraper');
  console.log('================================\n');
  
  const session = driver.session();
  
  let totalPOIs = 0;
  
  try {
    for (const { url, award, luxuryScore } of CONDE_NAST_LISTS) {
      const pois = await scrapeCondeNastList(url, award);
      
      console.log(`\n💾 Storing ${pois.length} properties in Neo4j...`);
      
      for (const poi of pois) {
        await storeCondeNastPOI(session, poi, award, luxuryScore);
        totalPOIs++;
      }
      
      // Rate limiting: Wait 3 seconds between lists
      console.log('⏳ Waiting 3 seconds before next list...');
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
    
    console.log('\n\n✅ Condé Nast Scraping Complete!');
    console.log(`📊 Total properties scraped: ${totalPOIs}`);
    console.log('\n💡 Next steps:');
    console.log('   1. Run: npx ts-node scripts/scrape-worlds-50-best.ts');
    console.log('   2. Geocode addresses to get coordinates');
    
  } catch (error) {
    console.error('❌ Fatal error:', error);
  } finally {
    await session.close();
    await driver.close();
  }
}

main();

