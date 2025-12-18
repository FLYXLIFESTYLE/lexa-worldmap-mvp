/**
 * Manual POI List Importer
 * 
 * Imports POI lists from manually downloaded sources:
 * - Forbes Travel Guide reports (CSV/Excel)
 * - Government tourism authority lists
 * - Michelin Guide exports
 * - Any other manual data sources
 * 
 * After import, automatically runs through Master Enrichment Pipeline:
 * 1. Import CSV/JSON
 * 2. Validate data
 * 3. Check duplicates
 * 4. Run Master Pipeline (Google Places, website scraping, emotions, etc.)
 * 5. Create all relationships
 * 
 * Run: npx ts-node scripts/import-manual-poi-list.ts path/to/file.csv
 * 
 * Example CSV format:
 * name,type,city,country,address,website,description,source
 * "Ritz Paris","hotel","Paris","France","15 Place Vendôme","https://ritzparis.com","5-star luxury hotel","forbes_2024"
 */

import * as dotenv from 'dotenv';
import * as neo4j from 'neo4j-driver';
import * as fs from 'fs';
import * as path from 'path';
import { processPOI } from './master-data-intake-pipeline.js';

// Load environment variables
dotenv.config({ path: '.env.local' });
dotenv.config();

const driver = neo4j.driver(
  process.env.NEO4J_URI || '',
  neo4j.auth.basic(
    process.env.NEO4J_USER || 'neo4j',
    process.env.NEO4J_PASSWORD || ''
  )
);

interface ManualPOI {
  name: string;
  type?: string;
  city?: string;
  country?: string;
  address?: string;
  website?: string;
  phone?: string;
  description?: string;
  source: string; // e.g., 'forbes_2024', 'france_tourism', 'michelin_2024'
  award?: string; // e.g., '5-star', '3-michelin-stars'
  lat?: number;
  lon?: number;
}

/**
 * Parse CSV file
 */
function parseCSV(filePath: string): ManualPOI[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n').filter(line => line.trim());
  
  if (lines.length === 0) {
    throw new Error('Empty CSV file');
  }
  
  // Parse header
  const header = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
  
  // Parse rows
  const pois: ManualPOI[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const row = lines[i];
    
    // Handle quoted values with commas
    const values: string[] = [];
    let currentValue = '';
    let insideQuotes = false;
    
    for (let j = 0; j < row.length; j++) {
      const char = row[j];
      
      if (char === '"') {
        insideQuotes = !insideQuotes;
      } else if (char === ',' && !insideQuotes) {
        values.push(currentValue.trim().replace(/^"|"$/g, ''));
        currentValue = '';
      } else {
        currentValue += char;
      }
    }
    values.push(currentValue.trim().replace(/^"|"$/g, ''));
    
    // Create POI object
    const poi: any = {};
    for (let j = 0; j < header.length; j++) {
      const key = header[j];
      const value = values[j] || '';
      
      if (value) {
        // Convert lat/lon to numbers
        if (key === 'lat' || key === 'lon' || key === 'latitude' || key === 'longitude') {
          poi[key === 'latitude' ? 'lat' : key === 'longitude' ? 'lon' : key] = parseFloat(value);
        } else {
          poi[key] = value;
        }
      }
    }
    
    // Validate required fields
    if (poi.name && poi.source) {
      pois.push(poi as ManualPOI);
    } else {
      console.warn(`⚠️  Skipping row ${i + 1}: missing name or source`);
    }
  }
  
  return pois;
}

/**
 * Parse JSON file
 */
function parseJSON(filePath: string): ManualPOI[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const data = JSON.parse(content);
  
  // Handle both array and object with array property
  const pois = Array.isArray(data) ? data : data.pois || data.properties || data.venues || [];
  
  // Validate and normalize
  return pois.filter((poi: any) => poi.name && poi.source);
}

/**
 * Geocode address to get coordinates
 */
async function geocodeAddress(address: string, city: string, country: string): Promise<{ lat: number; lon: number } | null> {
  const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY || '';
  
  if (!GOOGLE_PLACES_API_KEY) {
    return null;
  }
  
  try {
    const query = `${address}, ${city}, ${country}`;
    const searchUrl = 'https://places.googleapis.com/v1/places:searchText';
    
    const response = await fetch(searchUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': GOOGLE_PLACES_API_KEY,
        'X-Goog-FieldMask': 'places.location'
      },
      body: JSON.stringify({
        textQuery: query
      })
    });
    
    if (!response.ok) return null;
    
    const data = await response.json();
    
    if (data.places && data.places.length > 0) {
      const location = data.places[0].location;
      return {
        lat: location.latitude,
        lon: location.longitude
      };
    }
    
    return null;
  } catch (error) {
    console.error(`  ❌ Geocoding failed:`, error);
    return null;
  }
}

/**
 * Import and enrich POIs
 */
async function importAndEnrich(filePath: string) {
  console.log('📥 Manual POI List Importer');
  console.log('===========================\n');
  console.log(`File: ${filePath}\n`);
  
  // Determine file type
  const ext = path.extname(filePath).toLowerCase();
  let pois: ManualPOI[];
  
  try {
    if (ext === '.csv') {
      console.log('📊 Parsing CSV file...');
      pois = parseCSV(filePath);
    } else if (ext === '.json') {
      console.log('📊 Parsing JSON file...');
      pois = parseJSON(filePath);
    } else {
      throw new Error(`Unsupported file type: ${ext}. Use .csv or .json`);
    }
    
    console.log(`✅ Found ${pois.length} POIs\n`);
    
    if (pois.length === 0) {
      console.log('No POIs to import. Exiting.');
      return;
    }
    
    // Show sample
    console.log('📋 Sample POI:');
    console.log(JSON.stringify(pois[0], null, 2));
    console.log('');
    
    // Process each POI
    let successCount = 0;
    let failureCount = 0;
    let skippedCount = 0;
    const startTime = Date.now();
    
    for (let i = 0; i < pois.length; i++) {
      const poi = pois[i];
      console.log(`\n[${i + 1}/${pois.length}] ${poi.name} (${poi.city || 'Unknown'}, ${poi.country || 'Unknown'})`);
      
      try {
        // Geocode if no coordinates
        if (!poi.lat || !poi.lon) {
          if (poi.address && poi.city && poi.country) {
            console.log(`  📍 Geocoding address...`);
            const coords = await geocodeAddress(poi.address, poi.city, poi.country);
            
            if (coords) {
              poi.lat = coords.lat;
              poi.lon = coords.lon;
              console.log(`  ✅ Coordinates: ${coords.lat.toFixed(6)}, ${coords.lon.toFixed(6)}`);
            } else {
              console.log(`  ⚠️  Geocoding failed, will try name-based search in enrichment`);
            }
          } else {
            console.log(`  ⚠️  No coordinates or address, will try name-based search in enrichment`);
          }
        }
        
        // Run through Master Pipeline
        console.log(`  🔄 Running Master Enrichment Pipeline...`);
        const enriched = await processPOI({
          name: poi.name,
          type: poi.type,
          lat: poi.lat,
          lon: poi.lon,
          city: poi.city,
          country: poi.country,
          website: poi.website,
          source: poi.source
        });
        
        if (enriched) {
          // Add manual data to Neo4j
          if (poi.award || poi.description || poi.phone) {
            const session = driver.session();
            try {
              await session.run(`
                MATCH (p:poi {poi_uid: $poi_uid})
                SET p.manual_award = $award,
                    p.manual_description = $description,
                    p.manual_phone = $phone,
                    p.manual_import_source = $source
              `, {
                poi_uid: enriched.poi_uid,
                award: poi.award || null,
                description: poi.description || null,
                phone: poi.phone || null,
                source: poi.source
              });
            } finally {
              await session.close();
            }
          }
          
          console.log(`  ✅ Successfully imported and enriched!`);
          console.log(`     Luxury Score: ${enriched.luxury_score}/10`);
          successCount++;
        } else {
          console.log(`  ❌ Enrichment failed`);
          failureCount++;
        }
        
      } catch (error) {
        console.error(`  ❌ Error:`, error);
        failureCount++;
      }
      
      // Progress update every 10 POIs
      if ((i + 1) % 10 === 0) {
        const elapsed = Math.round((Date.now() - startTime) / 1000 / 60);
        console.log(`\n📊 Progress: ${i + 1}/${pois.length} (${Math.round((i + 1) / pois.length * 100)}%)`);
        console.log(`   ✅ Success: ${successCount}`);
        console.log(`   ❌ Failed: ${failureCount}`);
        console.log(`   ⏱️  Time: ${elapsed} minutes\n`);
      }
      
      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Summary
    const totalTime = Math.round((Date.now() - startTime) / 1000 / 60);
    
    console.log('\n\n' + '='.repeat(60));
    console.log('✅ IMPORT COMPLETE!');
    console.log('='.repeat(60));
    console.log(`\n📊 Results:`);
    console.log(`   ✅ Successfully imported: ${successCount}`);
    console.log(`   ❌ Failed: ${failureCount}`);
    console.log(`   ⏱️  Total time: ${totalTime} minutes`);
    console.log(`   💰 Estimated cost: $${(successCount * 0.025).toFixed(2)}`);
    
    console.log(`\n💡 Next steps:`);
    console.log(`   1. Check results in Neo4j`);
    console.log(`   2. Run ChatNeo4j to query new POIs`);
    console.log(`   3. Import more lists!`);
    
  } catch (error) {
    console.error('\n❌ Fatal error:', error);
  } finally {
    await driver.close();
  }
}

// Main
const args = process.argv.slice(2);

if (args.length === 0) {
  console.log('📥 Manual POI List Importer\n');
  console.log('Usage: npx ts-node scripts/import-manual-poi-list.ts <file_path>\n');
  console.log('Supported formats:');
  console.log('  - CSV (.csv)');
  console.log('  - JSON (.json)\n');
  console.log('Example:');
  console.log('  npx ts-node scripts/import-manual-poi-list.ts data/forbes_2024.csv\n');
  console.log('Required CSV columns:');
  console.log('  - name (required)');
  console.log('  - source (required, e.g., "forbes_2024")');
  console.log('  - type (optional, e.g., "hotel", "restaurant")');
  console.log('  - city (optional but recommended)');
  console.log('  - country (optional but recommended)');
  console.log('  - address (optional, for geocoding)');
  console.log('  - website (optional)');
  console.log('  - phone (optional)');
  console.log('  - description (optional)');
  console.log('  - award (optional, e.g., "5-star", "3-michelin-stars")');
  console.log('  - lat (optional, will geocode if missing)');
  console.log('  - lon (optional, will geocode if missing)\n');
  process.exit(1);
}

const filePath = args[0];

if (!fs.existsSync(filePath)) {
  console.error(`❌ File not found: ${filePath}`);
  process.exit(1);
}

importAndEnrich(filePath);

