/**
 * Run All Premium Scrapers
 * 
 * Master script to run all premium source scrapers in sequence
 * 
 * Order:
 * 1. Forbes Travel Guide (~5,000 POIs)
 * 2. Michelin Guide (~3,000 POIs)
 * 3. Condé Nast Traveler (~3,000 POIs)
 * 4. World's 50 Best (~500 POIs)
 * 5. Relais & Châteaux (~600 POIs)
 * 
 * Total Expected: ~12,000 premium luxury POIs
 * Cost: ~$30 in Claude API calls for HTML parsing
 * Time: ~2-3 hours
 * 
 * Run: npx ts-node scripts/run-all-scrapers.ts
 */

import { execSync } from 'child_process';

const SCRAPERS = [
  { name: 'Forbes Travel Guide', script: 'scripts/scrape-forbes.ts' },
  { name: 'Michelin Guide', script: 'scripts/scrape-michelin.ts' },
  { name: 'Condé Nast Traveler', script: 'scripts/scrape-conde-nast.ts' },
  { name: "World's 50 Best", script: 'scripts/scrape-worlds-50-best.ts' },
  { name: 'Relais & Châteaux', script: 'scripts/scrape-relais-chateaux.ts' }
];

async function runScraper(name: string, script: string) {
  console.log(`\n\n${'='.repeat(60)}`);
  console.log(`🚀 Starting: ${name}`);
  console.log(`${'='.repeat(60)}\n`);
  
  try {
    execSync(`npx ts-node ${script}`, {
      stdio: 'inherit',
      cwd: process.cwd()
    });
    
    console.log(`\n✅ ${name} completed successfully!`);
    
  } catch (error) {
    console.error(`\n❌ ${name} failed:`, error);
    console.log('Continuing with next scraper...');
  }
  
  // Wait 5 seconds between scrapers
  console.log('\n⏳ Waiting 5 seconds before next scraper...');
  await new Promise(resolve => setTimeout(resolve, 5000));
}

async function main() {
  console.log('🌟 LEXA Premium Sources Scraper');
  console.log('================================\n');
  console.log('This will scrape all premium luxury sources:');
  SCRAPERS.forEach((s, i) => console.log(`${i + 1}. ${s.name}`));
  console.log('\nEstimated time: 2-3 hours');
  console.log('Estimated cost: ~$30 in Claude API calls\n');
  
  const startTime = Date.now();
  
  for (const scraper of SCRAPERS) {
    await runScraper(scraper.name, scraper.script);
  }
  
  const endTime = Date.now();
  const duration = Math.round((endTime - startTime) / 1000 / 60);
  
  console.log('\n\n' + '='.repeat(60));
  console.log('✅ ALL SCRAPERS COMPLETED!');
  console.log('='.repeat(60));
  console.log(`⏱️  Total time: ${duration} minutes`);
  console.log('\n📊 Expected results:');
  console.log('   - Forbes: ~5,000 POIs');
  console.log('   - Michelin: ~3,000 POIs');
  console.log('   - Condé Nast: ~3,000 POIs');
  console.log('   - World\'s 50 Best: ~500 POIs');
  console.log('   - Relais & Châteaux: ~600 POIs');
  console.log('   - TOTAL: ~12,000 premium POIs');
  console.log('\n💡 Next steps:');
  console.log('   1. Run: npx ts-node scripts/geocode-scraped-pois.ts');
  console.log('   2. Verify POI count in Neo4j');
  console.log('   3. Create emotional relationships');
}

main();

