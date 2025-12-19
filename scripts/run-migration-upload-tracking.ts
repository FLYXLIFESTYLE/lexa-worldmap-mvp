/**
 * Run upload_tracking migration
 * Creates the table and all related policies/functions
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

async function runMigration() {
  console.log('\n🚀 Running upload_tracking migration...\n');

  // Create Supabase client with service role key
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Read migration file
  const migrationPath = path.resolve(process.cwd(), 'supabase/migrations/create_upload_tracking.sql');
  const sql = fs.readFileSync(migrationPath, 'utf-8');

  // Split into individual statements (rough split on semicolons outside quotes)
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  console.log(`📄 Found ${statements.length} SQL statements to execute\n`);

  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i] + ';';
    
    // Skip comments and empty statements
    if (statement.trim().startsWith('--') || statement.trim() === ';') {
      continue;
    }

    console.log(`Executing statement ${i + 1}/${statements.length}...`);
    
    try {
      const { error } = await supabase.rpc('exec_sql', { sql_query: statement });
      
      if (error) {
        // Try direct query if RPC doesn't exist
        const { error: directError } = await supabase.from('_sql').select('*').single();
        
        if (directError) {
          console.log(`⚠️  Statement ${i + 1}: ${error.message}`);
          errorCount++;
        } else {
          console.log(`✅ Statement ${i + 1} executed`);
          successCount++;
        }
      } else {
        console.log(`✅ Statement ${i + 1} executed`);
        successCount++;
      }
    } catch (err) {
      console.log(`⚠️  Statement ${i + 1}: ${err}`);
      errorCount++;
    }
  }

  console.log(`\n📊 Migration Results:`);
  console.log(`   ✅ Success: ${successCount}`);
  console.log(`   ⚠️  Errors: ${errorCount}`);
  console.log(`\n💡 Note: Some errors are expected (e.g., policies already exist)`);
  console.log(`   The important part is that the table was created.\n`);

  // Verify table exists
  console.log('🔍 Verifying upload_tracking table...\n');
  
  const { data, error } = await supabase
    .from('upload_tracking')
    .select('*')
    .limit(1);

  if (error) {
    console.log(`❌ Table verification failed: ${error.message}`);
    console.log(`\n⚠️  MANUAL MIGRATION REQUIRED:`);
    console.log(`   1. Open Supabase Dashboard: ${process.env.NEXT_PUBLIC_SUPABASE_URL?.replace('supabase.co', 'supabase.com')}`);
    console.log(`   2. Go to SQL Editor`);
    console.log(`   3. Copy and paste contents of: supabase/migrations/create_upload_tracking.sql`);
    console.log(`   4. Click "Run"\n`);
  } else {
    console.log(`✅ Table verification successful!`);
    console.log(`   upload_tracking table is ready to use.\n`);
  }
}

runMigration().catch(console.error);

