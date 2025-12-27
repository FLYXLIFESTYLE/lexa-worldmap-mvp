/**
 * Check uploads by captain.paulbickley@gmail.com
 * Queries both Supabase Storage and Neo4j
 */

import { createClient } from '@supabase/supabase-js';
import * as neo4j from 'neo4j-driver';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const PAUL_EMAIL = 'captain.paulbickley@gmail.com';

async function checkSupabase() {
  console.log('\n🔍 Checking Supabase...\n');
  
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Find Paul's user ID
  const { data: users, error: userError } = await supabase.auth.admin.listUsers();
  
  if (userError) {
    console.error('Error fetching users:', userError);
    return null;
  }

  const paul = users.users.find(u => u.email === PAUL_EMAIL);
  
  if (!paul) {
    console.log(`❌ User ${PAUL_EMAIL} not found in Supabase`);
    return null;
  }

  console.log(`✅ Found Paul's account:`);
  console.log(`   ID: ${paul.id}`);
  console.log(`   Email: ${paul.email}`);
  console.log(`   Created: ${paul.created_at}`);
  console.log(`   Last Sign In: ${paul.last_sign_in_at}`);

  // Check for uploaded files in Storage
  const { data: files, error: filesError } = await supabase
    .storage
    .from('knowledge-uploads')
    .list(paul.id);

  if (filesError) {
    console.log(`\n⚠️  Storage bucket might not exist or no files: ${filesError.message}`);
  } else if (files && files.length > 0) {
    console.log(`\n📁 Found ${files.length} uploaded files:`);
    files.forEach((file, i) => {
      console.log(`   ${i + 1}. ${file.name}`);
      console.log(`      Size: ${(file.metadata?.size || 0 / 1024).toFixed(2)} KB`);
      console.log(`      Uploaded: ${file.created_at}`);
    });
  } else {
    console.log(`\n📭 No files found in storage for Paul`);
  }

  // Check upload_tracking table (if it exists)
  const { data: uploads, error: uploadsError } = await supabase
    .from('upload_tracking')
    .select('*')
    .eq('uploaded_by', paul.id)
    .order('uploaded_at', { ascending: false });

  if (uploadsError) {
    console.log(`\n⚠️  upload_tracking table might not exist: ${uploadsError.message}`);
  } else if (uploads && uploads.length > 0) {
    console.log(`\n📊 Found ${uploads.length} upload records:`);
    uploads.forEach((upload, i) => {
      console.log(`   ${i + 1}. ${upload.filename}`);
      console.log(`      Type: ${upload.file_type}`);
      console.log(`      Status: ${upload.processing_status}`);
      console.log(`      POIs: ${upload.pois_extracted}, Relations: ${upload.relationships_created}`);
      console.log(`      Uploaded: ${upload.uploaded_at}`);
    });
  } else {
    console.log(`\n📭 No upload records found`);
  }

  return paul.id;
}

async function checkNeo4j(paulUserId: string | null) {
  console.log('\n🔍 Checking Neo4j...\n');

  const driver = neo4j.driver(
    process.env.NEO4J_URI!,
    neo4j.auth.basic(process.env.NEO4J_USER!, process.env.NEO4J_PASSWORD!)
  );

  const session = driver.session();

  try {
    // Find knowledge contributed by Paul (by email)
    const knowledgeByEmail = await session.run(`
      MATCH (k:knowledge)
      WHERE k.contributorName CONTAINS 'paul' 
         OR k.contributorName CONTAINS 'bickley'
         OR k.author CONTAINS 'paul'
         OR k.created_by CONTAINS 'paul'
      RETURN k
      ORDER BY k.created_at DESC
      LIMIT 50
    `);

    if (knowledgeByEmail.records.length > 0) {
      console.log(`✅ Found ${knowledgeByEmail.records.length} knowledge nodes from Paul:`);
      knowledgeByEmail.records.slice(0, 10).forEach((record, i) => {
        const k = record.get('k').properties;
        console.log(`   ${i + 1}. ${k.title || 'Untitled'}`);
        console.log(`      Source: ${k.source || 'unknown'}`);
        console.log(`      Contributor: ${k.contributorName || k.author || 'unknown'}`);
        console.log(`      Created: ${k.created_at || 'unknown'}`);
        if (k.content) {
          console.log(`      Preview: ${k.content.substring(0, 100)}...`);
        }
        console.log('');
      });
      
      if (knowledgeByEmail.records.length > 10) {
        console.log(`   ... and ${knowledgeByEmail.records.length - 10} more\n`);
      }
    } else {
      console.log(`📭 No knowledge nodes found from Paul\n`);
    }

    // Find POIs contributed by Paul
    const poisByPaul = await session.run(`
      MATCH (p:poi)
      WHERE p.contributorName CONTAINS 'paul' 
         OR p.contributorName CONTAINS 'bickley'
         OR p.created_by CONTAINS 'paul'
         OR p.enriched_by CONTAINS 'paul'
      RETURN p
      LIMIT 50
    `);

    if (poisByPaul.records.length > 0) {
      console.log(`✅ Found ${poisByPaul.records.length} POIs contributed/enriched by Paul:`);
      poisByPaul.records.slice(0, 10).forEach((record, i) => {
        const p = record.get('p').properties;
        const score = p.luxury_score_verified ?? p.luxury_score_base ?? p.luxury_score ?? p.luxuryScore ?? null;
        console.log(`   ${i + 1}. ${p.name || 'Unnamed'}`);
        console.log(`      Type: ${p.type || 'unknown'}`);
        console.log(`      Destination: ${p.destination_name || 'unknown'}`);
        console.log(`      Luxury Score: ${score ?? 'N/A'}`);
        console.log('');
      });
      
      if (poisByPaul.records.length > 10) {
        console.log(`   ... and ${poisByPaul.records.length - 10} more\n`);
      }
    } else {
      console.log(`📭 No POIs found from Paul\n`);
    }

    // Count total contributions
    const totalCount = await session.run(`
      MATCH (n)
      WHERE n.contributorName CONTAINS 'paul' 
         OR n.contributorName CONTAINS 'bickley'
      RETURN count(n) as total
    `);

    const total = totalCount.records[0]?.get('total').toNumber() || 0;
    console.log(`📊 Total nodes from Paul: ${total}\n`);

  } finally {
    await session.close();
    await driver.close();
  }
}

async function main() {
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║     CHECK UPLOADS BY captain.paulbickley@gmail.com       ║');
  console.log('╚═══════════════════════════════════════════════════════════╝');

  try {
    const paulUserId = await checkSupabase();
    await checkNeo4j(paulUserId);

    console.log('\n✅ Check complete!\n');
    console.log('📋 Summary:');
    console.log('   - Check Supabase section for uploaded files');
    console.log('   - Check Neo4j section for extracted knowledge');
    console.log('   - If upload_tracking table doesn\'t exist, run migration first\n');

  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  }
}

main();

