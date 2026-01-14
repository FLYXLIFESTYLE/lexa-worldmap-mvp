/**
 * Cleanup Junk POIs - One-Time Script
 *
 * Purpose: Delete junk POIs (embassies, utilities, etc.) imported before quality filter
 *
 * Usage: npm run cleanup:junk
 */

import './_env';
import { createSupabaseAdmin } from './_supabaseAdmin';

const JUNK_KEYWORDS = [
  // Government/Diplomatic
  'embassy',
  'consulate',
  'ministry',
  'government',
  'municipality',
  'police',
  'fire station',
  'post office',
  'court',
  
  // Commercial Services
  'technical services',
  'technical service',
  'envida',
  'ac service',
  'ac services',
  'hvac',
  'plumbing',
  'electrical service',
  
  // Airlines/Travel Services (office locations, not experiences)
  'air india',
  'airlines office',
  'airline office',
  'ticket office',
  
  // Infrastructure
  'parking lot',
  'parking garage',
  'atm',
  'bank branch',
  'bus stop',
  'bus station',
  'gas station',
  'petrol station',
  
  // Industrial
  'warehouse',
  'factory',
  'office building',
  'business center',
];

async function main() {
  const supabaseAdmin = createSupabaseAdmin();

  console.log('🧹 Cleanup Junk POIs');
  console.log('===================\n');

  // Fetch all unverified POIs
  const { data: allPois, error: fetchErr } = await supabaseAdmin
    .from('extracted_pois')
    .select('id,name,destination,category,verified')
    .eq('verified', false)
    .limit(5000);

  if (fetchErr) throw new Error(`Failed to fetch POIs: ${fetchErr.message}`);

  console.log(`Total unverified POIs: ${allPois?.length || 0}`);

  // Filter by junk keywords
  const junkPois = (allPois || []).filter((poi) => {
    const text = `${poi.name || ''} ${poi.category || ''}`.toLowerCase();
    return JUNK_KEYWORDS.some((keyword) => text.includes(keyword.toLowerCase()));
  });

  console.log(`Junk POIs found: ${junkPois.length}`);

  if (!junkPois.length) {
    console.log('✅ No junk POIs to delete!');
    return;
  }

  // Show sample
  console.log('\nSample junk POIs to delete:');
  junkPois.slice(0, 20).forEach((p) => {
    console.log(`  - ${p.name} (${p.destination})`);
  });

  console.log('\n⚠️  Deleting in 5 seconds... (Ctrl+C to cancel)');
  await new Promise((r) => setTimeout(r, 5000));

  // Delete in batches
  const idsToDelete = junkPois.map((p) => p.id);
  const batchSize = 500;
  let totalDeleted = 0;

  for (let i = 0; i < idsToDelete.length; i += batchSize) {
    const batch = idsToDelete.slice(i, i + batchSize);
    const { error: deleteErr } = await supabaseAdmin.from('extracted_pois').delete().in('id', batch);
    if (deleteErr) {
      console.error(`❌ Failed to delete batch ${i / batchSize + 1}:`, deleteErr.message);
      continue;
    }
    totalDeleted += batch.length;
    console.log(`✅ Deleted batch ${i / batchSize + 1} (${batch.length} POIs)`);
  }

  console.log(`\n✅ Cleanup complete! Deleted ${totalDeleted} junk POIs.`);
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
