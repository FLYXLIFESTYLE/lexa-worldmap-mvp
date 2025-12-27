/**
 * World's 50 Best Scraper
 * 
 * Scrapes World's 50 Best Restaurants, Bars, and Hotels
 * Target: ~500 elite properties
 * Cost: FREE (web scraping)
 * 
 * Luxury Score: 10 (all are top-tier globally)
 * 
 * Run: npx ts-node scripts/scrape-worlds-50-best.ts
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

// World's 50 Best lists
const WORLDS_50_BEST_LISTS = [
  {
    url: 'https://www.theworlds50best.com/list/1-50',
    type: 'restaurant',
    award: "World's 50 Best Restaurants"
  },
  {
    url: 'https://www.theworlds50best.com/bars/list/1-50',
    type: 'bar',
    award: "World's 50 Best Bars"
  },
  {
    url: 'https://www.theworlds50best.com/hotels/list/1-50',
    type: 'hotel',
    award: "World's 50 Best Hotels"
  }
];

interface Worlds50BestPOI {
  name: string;
  location: string;
  rank: number;
  chef?: string;
  description?: string;
  url?: string;
}

async function scrapeWorlds50BestList(listUrl: string, type: string, award: string): Promise<Worlds50BestPOI[]> {
  console.log(`\n🔍 Scraping: ${award}`);
  
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
    console.log('🤖 Using Claude AI to extract top 50...');
    
    const extraction = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      messages: [{
        role: 'user',
        content: `Extract all entries from this ${award} HTML page.

For each entry, extract:
- name: Name of the ${type}
- location: City, Country
- rank: Ranking number (1-50 or higher)
- chef: Chef name if applicable (for restaurants)
- description: Brief description if available
- url: Property page URL if available

Return ONLY a valid JSON array, nothing else:
[{
  "name": "Name",
  "location": "City, Country",
  "rank": 1,
  "chef": "Chef Name",
  "description": "Brief description",
  "url": "https://..."
}]

If you can't find any entries, return an empty array: []

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
    
    const pois: Worlds50BestPOI[] = JSON.parse(jsonText);
    
    console.log(`✅ Extracted ${pois.length} entries`);
    
    return pois;
    
  } catch (error) {
    console.error(`❌ Error scraping ${award}:`, error);
    return [];
  }
}

async function storeWorlds50BestPOI(session: neo4j.Session, poi: Worlds50BestPOI, type: string, award: string) {
  const { name, location, rank, chef, description, url } = poi;
  
  const [cityName, countryName] = location.split(',').map(s => s.trim());
  
  try {
    await session.run(`
      MERGE (p:poi {
        source: 'worlds_50_best',
        name: $name
      })
      SET p.type = $type,
          p.luxury_score_base = 10,
          p.confidence_score = 0.99,
          p.score_evidence = $evidence_json,
          p.worlds_50_best_rank = $rank,
          p.worlds_50_best_award = $award,
          p.chef = $chef,
          p.description = $description,
          p.website = $url,
          p.city = $city,
          p.country = $country,
          p.location_string = $location,
          p.scored_at = datetime(),
          p.enrichment_source = 'worlds_50_best_scrape',
          p.updated_at = datetime()
      RETURN p.poi_uid as poi_uid
    `, {
      name,
      type,
      evidence_json: JSON.stringify({
        source: 'worlds_50_best_scrape',
        legacy_text: `${award} #${rank} - globally recognized excellence`,
        rank,
        award,
      }),
      rank: neo4j.int(rank),
      award,
      chef: chef || null,
      description: description || null,
      url: url || null,
      city: cityName,
      country: countryName || '',
      location
    });
    
    console.log(`  ✅ #${rank} ${name} (${cityName})`);
    
  } catch (error) {
    console.error(`  ❌ Error storing ${name}:`, error);
  }
}

async function main() {
  console.log('🏆 World\'s 50 Best Scraper');
  console.log('==========================\n');
  
  const session = driver.session();
  
  let totalPOIs = 0;
  
  try {
    for (const { url, type, award } of WORLDS_50_BEST_LISTS) {
      const pois = await scrapeWorlds50BestList(url, type, award);
      
      console.log(`\n💾 Storing ${pois.length} entries in Neo4j...`);
      
      for (const poi of pois) {
        await storeWorlds50BestPOI(session, poi, type, award);
        totalPOIs++;
      }
      
      // Rate limiting: Wait 3 seconds between lists
      console.log('⏳ Waiting 3 seconds before next list...');
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
    
    console.log('\n\n✅ World\'s 50 Best Scraping Complete!');
    console.log(`📊 Total entries scraped: ${totalPOIs}`);
    console.log('\n💡 Next steps:');
    console.log('   1. Run: npx ts-node scripts/scrape-relais-chateaux.ts');
    console.log('   2. Geocode addresses to get coordinates');
    
  } catch (error) {
    console.error('❌ Fatal error:', error);
  } finally {
    await session.close();
    await driver.close();
  }
}

main();

