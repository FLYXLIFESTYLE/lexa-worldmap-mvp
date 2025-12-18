/**
 * Create Occasion Categories
 * 
 * Creates occasion_type nodes and relationships for filtering/discovery
 * Based on competitor analysis (GetYourGuide-style categories)
 * 
 * These are the middle layer between themes and activities:
 * theme_category → occasion_type → activity_type → poi
 * 
 * Run: npx ts-node scripts/create-occasion-categories.ts
 */

import * as dotenv from 'dotenv';
import * as neo4j from 'neo4j-driver';

dotenv.config({ path: '.env.local' });
dotenv.config();

const driver = neo4j.driver(
  process.env.NEO4J_URI || '',
  neo4j.auth.basic(
    process.env.NEO4J_USER || 'neo4j',
    process.env.NEO4J_PASSWORD || ''
  )
);

interface Occasion {
  name: string;
  slug: string;
  description: string;
  icon: string;
  color: string;
  display_order: number;
  source: 'competitor' | 'lexa';
}

// Occasion categories from competitor + LEXA-specific
const occasions: Occasion[] = [
  // From competitor (GetYourGuide)
  {
    name: 'High Gastronomy',
    slug: 'high-gastronomy',
    description: 'Fine dining and culinary excellence',
    icon: '🍽️',
    color: '#4ECDC4',
    display_order: 1,
    source: 'competitor'
  },
  {
    name: 'Art and Culture',
    slug: 'art-culture',
    description: 'Museums, galleries, cultural experiences',
    icon: '🎨',
    color: '#9B59B6',
    display_order: 2,
    source: 'competitor'
  },
  {
    name: 'Adventure',
    slug: 'adventure',
    description: 'Thrilling outdoor activities and adrenaline',
    icon: '🏔️',
    color: '#E74C3C',
    display_order: 3,
    source: 'competitor'
  },
  {
    name: 'Family-friendly',
    slug: 'family-friendly',
    description: 'Perfect for families with children',
    icon: '👨‍👩‍👧‍👦',
    color: '#FF6B6B',
    display_order: 4,
    source: 'competitor'
  },
  {
    name: 'Romance',
    slug: 'romance',
    description: 'Intimate experiences for couples',
    icon: '💕',
    color: '#FF69B4',
    display_order: 5,
    source: 'competitor'
  },
  {
    name: 'Wellness',
    slug: 'wellness',
    description: 'Spa, yoga, meditation, and rejuvenation',
    icon: '🧘',
    color: '#2ECC71',
    display_order: 6,
    source: 'competitor'
  },
  {
    name: 'Sports',
    slug: 'sports',
    description: 'Sporting activities and events',
    icon: '⚽',
    color: '#3498DB',
    display_order: 7,
    source: 'competitor'
  },
  {
    name: 'Performers',
    slug: 'performers',
    description: 'Shows, concerts, and live performances',
    icon: '🎭',
    color: '#9B59B6',
    display_order: 8,
    source: 'competitor'
  },
  {
    name: 'Fashion',
    slug: 'fashion',
    description: 'Fashion events, shopping, and style',
    icon: '👗',
    color: '#E91E63',
    display_order: 9,
    source: 'competitor'
  },
  {
    name: 'History',
    slug: 'history',
    description: 'Historical sites and educational tours',
    icon: '🏛️',
    color: '#795548',
    display_order: 10,
    source: 'competitor'
  },
  {
    name: 'Celebrations',
    slug: 'celebrations',
    description: 'Special events and milestone celebrations',
    icon: '🎉',
    color: '#FF9800',
    display_order: 11,
    source: 'competitor'
  },
  {
    name: 'Pre / Post Charter',
    slug: 'charter',
    description: 'Before or after yacht charter experiences',
    icon: '⛵',
    color: '#00BCD4',
    display_order: 12,
    source: 'competitor'
  },
  {
    name: 'Ticketed Events',
    slug: 'ticketed-events',
    description: 'Concerts, shows, sports events with tickets',
    icon: '🎫',
    color: '#673AB7',
    display_order: 13,
    source: 'competitor'
  },
  {
    name: 'Fully Curated',
    slug: 'fully-curated',
    description: 'Complete itineraries with concierge service',
    icon: '✨',
    color: '#FFD700',
    display_order: 14,
    source: 'competitor'
  },
  {
    name: 'Local Food Experiences',
    slug: 'local-food',
    description: 'Authentic local dining and food tours',
    icon: '🍜',
    color: '#FF5722',
    display_order: 15,
    source: 'competitor'
  },
  {
    name: 'Vineyards & Wine Tasting',
    slug: 'wine',
    description: 'Wine experiences and vineyard tours',
    icon: '🍷',
    color: '#8E24AA',
    display_order: 16,
    source: 'competitor'
  },
  
  // LEXA-specific luxury occasions
  {
    name: 'Ultra-Luxury',
    slug: 'ultra-luxury',
    description: 'Top-tier exclusive VIP experiences',
    icon: '💎',
    color: '#FFD700',
    display_order: 17,
    source: 'lexa'
  },
  {
    name: 'Intimate & Private',
    slug: 'intimate',
    description: 'Private tours and exclusive access',
    icon: '🔒',
    color: '#424242',
    display_order: 18,
    source: 'lexa'
  },
  {
    name: 'Once-in-a-Lifetime',
    slug: 'once-lifetime',
    description: 'Bucket list and rare experiences',
    icon: '🌟',
    color: '#FFC107',
    display_order: 19,
    source: 'lexa'
  },
  {
    name: 'Water-Based',
    slug: 'water-based',
    description: 'Beach, yacht, sailing, and diving',
    icon: '🌊',
    color: '#03A9F4',
    display_order: 20,
    source: 'lexa'
  },
  {
    name: 'Outdoor & Nature',
    slug: 'outdoor',
    description: 'Hiking, nature, and outdoor activities',
    icon: '🌲',
    color: '#4CAF50',
    display_order: 21,
    source: 'lexa'
  },
  {
    name: 'Photography-Worthy',
    slug: 'photography',
    description: 'Instagram-worthy locations and experiences',
    icon: '📸',
    color: '#E1306C',
    display_order: 22,
    source: 'lexa'
  },
  {
    name: 'Accessible',
    slug: 'accessible',
    description: 'Wheelchair-friendly and inclusive experiences',
    icon: '♿',
    color: '#2196F3',
    display_order: 23,
    source: 'lexa'
  }
];

// Activity → Occasion mapping
const activityOccasionMapping: Record<string, string[]> = {
  'Fine Dining': ['high-gastronomy', 'romance', 'celebrations'],
  'Beach Lounging': ['family-friendly', 'water-based', 'wellness'],
  'Snorkeling': ['adventure', 'family-friendly', 'water-based'],
  'Spa': ['wellness', 'romance', 'ultra-luxury'],
  'Yacht Charter': ['ultra-luxury', 'romance', 'charter', 'water-based'],
  'Wine Tasting': ['wine', 'high-gastronomy', 'romance'],
  'Museum Visit': ['art-culture', 'history', 'family-friendly'],
  'Hiking': ['adventure', 'outdoor', 'wellness'],
  'Shopping': ['fashion', 'family-friendly'],
  'Nightclub': ['celebrations', 'performers'],
  'Golf': ['sports', 'ultra-luxury'],
  'Tennis': ['sports', 'wellness'],
  'Sailing': ['water-based', 'adventure', 'ultra-luxury'],
  'Diving': ['adventure', 'water-based'],
  'Cooking Class': ['local-food', 'art-culture', 'family-friendly'],
  'Private Tour': ['intimate', 'fully-curated', 'ultra-luxury'],
  'Concert': ['ticketed-events', 'performers', 'celebrations'],
  'Photography Tour': ['photography', 'art-culture'],
  'Helicopter Tour': ['adventure', 'ultra-luxury', 'once-lifetime'],
  'Meditation': ['wellness', 'intimate'],
  'Yoga': ['wellness', 'outdoor']
};

async function createOccasionCategories() {
  const session = driver.session();
  
  try {
    let createdCount = 0;
    
    for (const occasion of occasions) {
      await session.run(`
        MERGE (o:occasion_type {slug: $slug})
        SET o.name = $name,
            o.description = $description,
            o.icon = $icon,
            o.color = $color,
            o.display_order = $display_order,
            o.source = $source,
            o.is_active = true,
            o.created_at = CASE WHEN o.created_at IS NULL THEN datetime() ELSE o.created_at END,
            o.updated_at = datetime()
      `, {
        slug: occasion.slug,
        name: occasion.name,
        description: occasion.description,
        icon: occasion.icon,
        color: occasion.color,
        display_order: neo4j.int(occasion.display_order),
        source: occasion.source
      });
      
      console.log(`  ✅ ${occasion.icon} ${occasion.name}`);
      createdCount++;
    }
    
    return createdCount;
    
  } finally {
    await session.close();
  }
}

async function linkActivitiesToOccasions() {
  const session = driver.session();
  
  try {
    let linkedCount = 0;
    
    for (const [activityName, occasionSlugs] of Object.entries(activityOccasionMapping)) {
      for (const slug of occasionSlugs) {
        const result = await session.run(`
          MATCH (a:activity_type)
          WHERE a.name = $activityName OR toLower(a.name) = toLower($activityName)
          MATCH (o:occasion_type {slug: $slug})
          MERGE (a)-[r:FITS_OCCASION]->(o)
          SET r.confidence = 0.90,
              r.typical = true,
              r.created_at = CASE WHEN r.created_at IS NULL THEN datetime() ELSE r.created_at END
          RETURN count(*) as count
        `, {
          activityName,
          slug
        });
        
        const count = result.records[0].get('count').toNumber();
        if (count > 0) {
          console.log(`  ✅ ${activityName} → ${slug}`);
          linkedCount++;
        }
      }
    }
    
    return linkedCount;
    
  } finally {
    await session.close();
  }
}

async function inferPOIOccasions() {
  const session = driver.session();
  
  try {
    // Process in batches to avoid timeout
    const BATCH_SIZE = 5000;
    let totalCreated = 0;
    let hasMore = true;
    
    console.log('Processing in batches of', BATCH_SIZE, '...\n');
    
    while (hasMore) {
      const result = await session.run(`
        MATCH (p:poi)-[:SUPPORTS_ACTIVITY]->(a:activity_type)-[:FITS_OCCASION]->(o:occasion_type)
        WHERE NOT (p)-[:SUITS_OCCASION]->(o)
        WITH p, o, a
        LIMIT $batchSize
        MERGE (p)-[r:SUITS_OCCASION]->(o)
        SET r.confidence = 0.75,
            r.why = 'Inherited from activity: ' + a.name,
            r.inferred = true,
            r.created_at = datetime()
        RETURN count(*) as count
      `, { batchSize: neo4j.int(BATCH_SIZE) });
      
      const batchCount = result.records[0].get('count').toNumber();
      totalCreated += batchCount;
      
      console.log(`  Processed batch: ${batchCount} relationships created (total: ${totalCreated})`);
      
      // If we processed less than batch size, we're done
      if (batchCount < BATCH_SIZE) {
        hasMore = false;
      }
    }
    
    return totalCreated;
    
  } finally {
    await session.close();
  }
}

async function getStatistics() {
  const session = driver.session();
  
  try {
    const result = await session.run(`
      MATCH (o:occasion_type)
      OPTIONAL MATCH (a:activity_type)-[:FITS_OCCASION]->(o)
      OPTIONAL MATCH (p:poi)-[:SUITS_OCCASION]->(o)
      RETURN count(DISTINCT o) as total_occasions,
             count(DISTINCT a) as activities_linked,
             count(DISTINCT p) as pois_linked
    `);
    
    const record = result.records[0];
    return {
      totalOccasions: record.get('total_occasions').toNumber(),
      activitiesLinked: record.get('activities_linked').toNumber(),
      poisLinked: record.get('pois_linked').toNumber()
    };
    
  } finally {
    await session.close();
  }
}

async function main() {
  console.log('🎯 Creating Occasion Categories');
  console.log('================================\n');
  console.log('These are the middle layer between themes and activities:');
  console.log('theme_category → occasion_type → activity_type → poi\n');
  
  try {
    // Step 1: Create occasion nodes
    console.log('📋 Step 1: Creating occasion_type nodes...\n');
    const occasionsCreated = await createOccasionCategories();
    console.log(`\n✅ Created/updated ${occasionsCreated} occasion categories\n`);
    
    // Step 2: Link activities to occasions
    console.log('🔗 Step 2: Linking activities to occasions...\n');
    const linksCreated = await linkActivitiesToOccasions();
    console.log(`\n✅ Created ${linksCreated} activity→occasion relationships\n`);
    
    // Step 3: Infer POI occasions from activities
    console.log('🔍 Step 3: Inferring POI occasions from activities...\n');
    const poisLinked = await inferPOIOccasions();
    console.log(`✅ Created ${poisLinked} POI→occasion relationships\n`);
    
    // Statistics
    console.log('📊 Final Statistics:\n');
    const stats = await getStatistics();
    console.log(`   Occasion Categories: ${stats.totalOccasions}`);
    console.log(`   Activities Linked: ${stats.activitiesLinked}`);
    console.log(`   POIs Linked: ${stats.poisLinked}\n`);
    
    console.log('='.repeat(60));
    console.log('✅ OCCASION CATEGORIES CREATED!');
    console.log('='.repeat(60));
    console.log('\n💡 Next steps:');
    console.log('   1. View in Neo4j: MATCH (o:occasion_type) RETURN o ORDER BY o.display_order');
    console.log('   2. Test filtering: MATCH (p:poi)-[:SUITS_OCCASION]->(o:occasion_type {slug: "family-friendly"}) RETURN p LIMIT 10');
    console.log('   3. Add to UI: Browse by occasion categories');
    console.log('   4. Update LEXA prompts to use occasions');
    
  } catch (error) {
    console.error('\n❌ Fatal error:', error);
  } finally {
    await driver.close();
  }
}

main();

