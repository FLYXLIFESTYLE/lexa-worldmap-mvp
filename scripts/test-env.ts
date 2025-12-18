import dotenv from 'dotenv';
import path from 'path';

console.log('Working directory:', process.cwd());
console.log('Looking for .env.local at:', path.join(process.cwd(), '.env.local'));

// Try multiple loading strategies
const result1 = dotenv.config({ path: '.env.local' });
console.log('\nLoad .env.local result:', result1.error ? result1.error.message : 'success');

const result2 = dotenv.config({ path: path.join(process.cwd(), '.env.local') });
console.log('Load with absolute path:', result2.error ? result2.error.message : 'success');

const result3 = dotenv.config(); // Try default .env
console.log('Load .env:', result3.error ? result3.error.message : 'success');

console.log('\nTesting environment variables:');
console.log('GOOGLE_PLACES_API_KEY:', process.env.GOOGLE_PLACES_API_KEY ? '✅ FOUND (length: ' + process.env.GOOGLE_PLACES_API_KEY.length + ')' : '❌ NOT FOUND');
console.log('\nAll env vars starting with GOOGLE:');
Object.keys(process.env).filter(key => key.includes('GOOGLE')).forEach(key => {
  console.log(`  ${key}: ${process.env[key]?.substring(0, 20)}...`);
});

