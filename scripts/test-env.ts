import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

console.log('Testing environment variables:');
console.log('GOOGLE_PLACES_API_KEY:', process.env.GOOGLE_PLACES_API_KEY ? '✅ FOUND (length: ' + process.env.GOOGLE_PLACES_API_KEY.length + ')' : '❌ NOT FOUND');
console.log('\nAll env vars starting with GOOGLE:');
Object.keys(process.env).filter(key => key.includes('GOOGLE')).forEach(key => {
  console.log(`  ${key}: ${process.env[key]?.substring(0, 20)}...`);
});

