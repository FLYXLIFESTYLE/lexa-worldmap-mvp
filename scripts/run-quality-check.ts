/**
 * Manual Data Quality Check Script
 * Run the data quality agent on demand
 */

// Load environment variables
import { config } from 'dotenv';
import { resolve } from 'path';

// Load .env.local first (takes precedence), then .env
config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });

import { runFullCheck } from '../lib/neo4j/data-quality-agent';

console.log('🔍 Starting data quality check...\n');

runFullCheck()
  .then(results => {
    console.log('\n✅ Quality check completed successfully!\n');
    
    console.log('📊 Results Summary:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    console.log('\n🔄 Duplicates:');
    console.log(`  Found: ${results.duplicates.duplicatesFound}`);
    console.log(`  Merged: ${results.duplicates.poisMerged}`);
    console.log(`  Deleted: ${results.duplicates.poisDeleted}`);
    console.log(`  Properties merged: ${results.duplicates.propertiesMerged}`);
    console.log(`  Relationships merged: ${results.duplicates.relationshipsMerged}`);
    
    console.log('\n🗑️  Unnamed POIs:');
    console.log(`  Deleted: ${results.unnamedPOIs.deleted}`);
    
    console.log('\n🔗 Relations:');
    console.log(`  Total created: ${results.relations.created}`);
    console.log(`  LOCATED_IN: ${results.relations.byType.LOCATED_IN}`);
    console.log(`  SUPPORTS_ACTIVITY: ${results.relations.byType.SUPPORTS_ACTIVITY}`);
    console.log(`  HAS_THEME: ${results.relations.byType.HAS_THEME}`);
    
    console.log('\n📊 Scoring:');
    console.log(`  POIs checked: ${results.scoring.checked}`);
    console.log(`  Luxury scores added: ${results.scoring.byField.luxury_score}`);
    console.log(`  Confidence scores added: ${results.scoring.byField.confidence}`);
    
    console.log('\n💎 Enrichment:');
    console.log(`  POIs queued: ${results.enrichment.queued}`);
    console.log(`  POIs enriched: ${results.enrichment.enriched}`);
    console.log(`  Failed: ${results.enrichment.failed}`);
    
    if (results.errors.length > 0) {
      console.log('\n⚠️  Errors encountered:');
      results.errors.forEach(err => console.log(`  - ${err}`));
    }
    
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`⏱️  Duration: ${Math.round((results.duration || 0) / 1000)}s`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Quality check failed:');
    console.error(error);
    process.exit(1);
  });

