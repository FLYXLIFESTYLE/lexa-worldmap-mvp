/**
 * Relais & Châteaux Scraper
 * 
 * Scrapes Relais & Châteaux member properties
 * Target: ~600 luxury hotels and restaurants
 * Cost: FREE (web scraping)
 * 
 * Luxury Score: 9 (verified luxury membership)
 * 
 * Run: npx ts-node scripts/scrape-relais-chateaux.ts
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

// Relais & Châteaux regions
const RELAIS_CHATEAUX_REGIONS = [
  { name: 'Europe', url: 'https://www.relaischateaux.com/us/search-result?regions=europe' },
  { name: 'North America', url: 'https://www.relaischateaux.com/us/search-result?regions=north-america' },
  { name: 'Caribbean', url: 'https://www.relaischateaux.com/us/search-result?regions=caribbean' },
  { name: 'Asia Pacific', url: 'https://www.relaischateaux.com/us/search-result?regions=asia-pacific' },
  { name: 'Africa & Middle East', url: 'https://www.relaischateaux.com/us/search-result?regions=africa-indian-ocean-middle-east' },
  { name: 'South America', url: 'https://www.relaischateaux.com/us/search-result?regions=south-america' }
];

interface RelaisChateauxPOI {
  name: string;
  location: string;
  type: string;
  description?: string;
  url?: string;
}

async function scrapeRelaisChateauxRegion(regionUrl: string, regionName: string): Promise<RelaisChateauxPOI[]> {
  console.log(`\n🔍 Scraping Relais & Châteaux: ${regionName}`);
  
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
    console.log('🤖 Using Claude AI to extract properties...');
    
    const extraction = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      messages: [{
        role: 'user',
        content: `Extract all Relais & Châteaux properties from this HTML page for ${regionName}.

For each property, extract:
- name: Property name
- location: City, Country
- type: hotel, restaurant, or resort
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
    
    const pois: RelaisChateauxPOI[] = JSON.parse(jsonText);
    
    console.log(`✅ Extracted ${pois.length} properties`);
    
    return pois;
    
  } catch (error) {
    console.error(`❌ Error scraping ${regionName}:`, error);
    return [];
  }
}

async function storeRelaisChateauxPOI(session: neo4j.Session, poi: RelaisChateauxPOI) {
  const { name, location, type, description, url } = poi;
  
  const [cityName, countryName] = location.split(',').map(s => s.trim());
  
  try {
    await session.run(`
      MERGE (p:poi {
        source: 'relais_chateaux',
        name: $name
      })
      SET p.type = $type,
          p.luxury_score = 9,
          p.luxury_confidence = 0.95,
          p.luxury_evidence = 'Relais & Châteaux member - verified luxury hospitality',
          p.relais_chateaux_member = true,
          p.description = $description,
          p.website = $url,
          p.city = $city,
          p.country = $country,
          p.location_string = $location,
          p.scored_at = datetime(),
          p.enrichment_source = 'relais_chateaux_scrape',
          p.updated_at = datetime()
      RETURN p.poi_uid as poi_uid
    `, {
      name,
      type,
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
  console.log('🏰 Relais & Châteaux Scraper');
  console.log('=============================\n');
  
  const session = driver.session();
  
  let totalPOIs = 0;
  
  try {
    for (const region of RELAIS_CHATEAUX_REGIONS) {
      const pois = await scrapeRelaisChateauxRegion(region.url, region.name);
      
      console.log(`\n💾 Storing ${pois.length} properties in Neo4j...`);
      
      for (const poi of pois) {
        await storeRelaisChateauxPOI(session, poi);
        totalPOIs++;
      }
      
      // Rate limiting: Wait 3 seconds between regions
      console.log('⏳ Waiting 3 seconds before next region...');
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
    
    console.log('\n\n✅ Relais & Châteaux Scraping Complete!');
    console.log(`📊 Total properties scraped: ${totalPOIs}`);
    console.log('\n💡 Next steps:');
    console.log('   1. Run geocoding to add coordinates');
    console.log('   2. Create emotional relationships');
    console.log('   3. Link to activities');
    
  } catch (error) {
    console.error('❌ Fatal error:', error);
  } finally {
    await session.close();
    await driver.close();
  }
}

main();

