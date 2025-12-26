/**
 * API Route: Clean up redundant theme categories in Neo4j
 * POST /api/admin/cleanup-themes
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/neo4j/client';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const session = getSession();

  try {
    const results = {
      migrated: [] as { from: string; to: string; count: number }[],
      deleted: [] as string[],
      updated: [] as string[],
      errors: [] as string[]
    };

    // STEP 1: Migrate relationships from old/duplicate to canonical theme categories
    // NOTE: We merge by case-insensitive match to catch "culture", "Culture", etc.
    const migrations = [
      // Canonical split: keep TWO themes, never combined
      { from: 'Culture & Culinary', to: 'Culinary Excellence' },
      { from: 'Culture and Culinary', to: 'Culinary Excellence' },
      { from: 'Culinary & Culture', to: 'Culinary Excellence' },
      { from: 'Culinary and Culture', to: 'Culinary Excellence' },
      { from: 'Culture+Culinary', to: 'Culinary Excellence' },
      { from: 'Culture/Culinary', to: 'Culinary Excellence' },
      { from: 'culture&culinary', to: 'Culinary Excellence' },
      { from: 'culture & culinary', to: 'Culinary Excellence' },
      { from: 'culinary', to: 'Culinary Excellence' },
      { from: 'Culinary', to: 'Culinary Excellence' },
      { from: 'food', to: 'Culinary Excellence' },
      { from: 'Food', to: 'Culinary Excellence' },

      { from: 'culture', to: 'Cultural Immersion' },
      { from: 'Culture', to: 'Cultural Immersion' },
      { from: 'cultural', to: 'Cultural Immersion' },
      { from: 'Cultural', to: 'Cultural Immersion' },
      { from: 'Cultural & Immersion', to: 'Cultural Immersion' },
      { from: 'Cultural Immersion & Culture', to: 'Cultural Immersion' },

      // Other legacy merges
      { from: 'Raw Nature & Vibes', to: 'Nature & Wildlife' },
      { from: 'Sports & Adrenaline', to: 'Adventure & Exploration' },
      { from: 'Art & Fashion', to: 'Art & Architecture' },
      { from: 'Beauty & Longevity', to: 'Wellness & Transformation' }
    ];

    for (const migration of migrations) {
      try {
        const migrateResult = await session.run(
          `
          MATCH (p:poi)-[old_rel:HAS_THEME]->(old:theme_category)
          WHERE toLower(trim(old.name)) = toLower(trim($oldName))
          MATCH (new:theme_category {name: $newName})
          MERGE (p)-[new_rel:HAS_THEME]->(new)
          SET new_rel.confidence = old_rel.confidence,
              new_rel.evidence = old_rel.evidence,
              new_rel.migrated_from = old.name,
              new_rel.migrated_at = datetime()
          WITH old_rel
          DELETE old_rel
          RETURN count(*) as migrated
          `,
          { oldName: migration.from, newName: migration.to }
        );

        const count = migrateResult.records[0]?.get('migrated')?.toNumber() || 0;
        results.migrated.push({ from: migration.from, to: migration.to, count });
      } catch (error: any) {
        results.errors.push(`Failed to migrate ${migration.from}: ${error.message}`);
      }
    }

    // STEP 2: Special handling for Water & Wildlife Adventure (split into two)
    try {
      // Create relationships to Water Sports & Marine
      const waterResult = await session.run(
        `MATCH (p:poi)-[old_rel:HAS_THEME]->(old:theme_category {name: 'Water & Wildlife Adventure'})
         MATCH (new_water:theme_category {name: 'Water Sports & Marine'})
         MERGE (p)-[new_rel_water:HAS_THEME]->(new_water)
         SET new_rel_water.confidence = old_rel.confidence * 0.8,
             new_rel_water.evidence = old_rel.evidence,
             new_rel_water.migrated_from = 'Water & Wildlife Adventure',
             new_rel_water.migrated_at = datetime()
         RETURN count(*) as created`
      );

      // Create relationships to Nature & Wildlife
      const natureResult = await session.run(
        `MATCH (p:poi)-[old_rel:HAS_THEME]->(old:theme_category {name: 'Water & Wildlife Adventure'})
         MATCH (new_nature:theme_category {name: 'Nature & Wildlife'})
         MERGE (p)-[new_rel_nature:HAS_THEME]->(new_nature)
         SET new_rel_nature.confidence = old_rel.confidence * 0.8,
             new_rel_nature.evidence = old_rel.evidence,
             new_rel_nature.migrated_from = 'Water & Wildlife Adventure',
             new_rel_nature.migrated_at = datetime()
         RETURN count(*) as created`
      );

      // Delete old relationships
      await session.run(
        `MATCH (p:poi)-[old_rel:HAS_THEME]->(old:theme_category {name: 'Water & Wildlife Adventure'})
         DELETE old_rel`
      );

      const waterCount = waterResult.records[0]?.get('created')?.toNumber() || 0;
      const natureCount = natureResult.records[0]?.get('created')?.toNumber() || 0;
      
      results.migrated.push({
        from: 'Water & Wildlife Adventure',
        to: 'Water Sports & Marine + Nature & Wildlife',
        count: waterCount
      });
    } catch (error: any) {
      results.errors.push(`Failed to split Water & Wildlife Adventure: ${error.message}`);
    }

    // STEP 3: Verify no POIs still linked to old categories
    const verifyResult = await session.run(`
      MATCH (p:poi)-[r:HAS_THEME]->(old:theme_category)
      WHERE toLower(trim(old.name)) IN [
        'culture & culinary',
        'culture and culinary',
        'culinary & culture',
        'culinary and culture',
        'culture+culinary',
        'culture/culinary',
        'culture&culinary',
        'culinary',
        'food',
        'culture',
        'cultural',
        'raw nature & vibes',
        'sports & adrenaline',
        'art & fashion',
        'beauty & longevity',
        'water & wildlife adventure'
      ]
      RETURN count(p) as remaining
    `);

    const remainingPOIs = verifyResult.records[0]?.get('remaining')?.toNumber() || 0;
    
    if (remainingPOIs > 0) {
      results.errors.push(`WARNING: ${remainingPOIs} POIs still linked to old categories!`);
    }

    // STEP 4: Now safe to delete old theme category nodes (case-insensitive)
    const redundantThemeKeys = [
      'culture & culinary',
      'culture and culinary',
      'culinary & culture',
      'culinary and culture',
      'culture+culinary',
      'culture/culinary',
      'culture&culinary',
      'culinary',
      'food',
      'culture',
      'cultural',
      'raw nature & vibes',
      'sports & adrenaline',
      'art & fashion',
      'beauty & longevity',
      'water & wildlife adventure',
    ];

    for (const themeKey of redundantThemeKeys) {
      try {
        const del = await session.run(
          `
          MATCH (t:theme_category)
          WHERE toLower(trim(t.name)) = toLower(trim($key))
            AND t.name <> 'Culinary Excellence'
            AND t.name <> 'Cultural Immersion'
          WITH t LIMIT 50
          DETACH DELETE t
          RETURN count(*) as deleted
          `,
          { key: themeKey }
        );
        const deletedCount = del.records[0]?.get('deleted')?.toNumber?.() || 0;
        if (deletedCount > 0) results.deleted.push(`${themeKey} (${deletedCount})`);
      } catch (error: any) {
        results.errors.push(`Failed to delete theme '${themeKey}': ${error.message}`);
      }
    }

    // Optional hardening: ensure theme names are unique going forward (will fail if duplicates still exist)
    try {
      await session.run(`
        CREATE CONSTRAINT theme_category_name_unique IF NOT EXISTS
        FOR (t:theme_category) REQUIRE t.name IS UNIQUE
      `);
    } catch (error: any) {
      results.errors.push(`Could not create unique constraint on theme_category.name: ${error.message}`);
    }

    // STEP 5: Update and enhance unique existing categories
    
    // Update: Mental Health & Legacy → Personal Growth & Legacy
    try {
      await session.run(
        `MATCH (t:theme_category {name: "Mental Health & Legacy"})
         SET t.name = "Personal Growth & Legacy",
             t.description = "Deep transformation, self-discovery, and lasting impact",
             t.icon = "🌟",
             t.luxuryScore = 8.5,
             t.short_description = "Mindset coaching, purpose retreats, legacy planning",
             t.personality_types = ["Knowledge", "Self-improvement", "Legacy builders"],
             t.evoked_feelings = ["Clarity", "purpose", "transformation", "meaning", "growth"],
             t.image_url = "https://images.unsplash.com/photo-1499209974431-9dddcece7f88?q=80&w=2400"
         RETURN t.name as updated`
      );
      results.updated.push("Mental Health & Legacy → Personal Growth & Legacy");
    } catch (error: any) {
      // Might not exist, that's okay
    }

    // Update: Business & Performance → Business & Executive Travel
    try {
      await session.run(
        `MATCH (t:theme_category {name: "Business & Performance"})
         SET t.name = "Business & Executive Travel",
             t.description = "Where productivity meets luxury",
             t.icon = "💼",
             t.luxuryScore = 8.2,
             t.short_description = "Executive retreats, networking events, workation destinations",
             t.personality_types = ["Action", "Achievers", "Leaders"],
             t.evoked_feelings = ["Focus", "achievement", "networking", "efficiency", "success"],
             t.image_url = "https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=2400"
         RETURN t.name as updated`
      );
      results.updated.push("Business & Performance → Business & Executive Travel");
    } catch (error: any) {
      // Might not exist, that's okay
    }

    // STEP 6: Get final counts
    const countResult = await session.run(`
      MATCH (t:theme_category)
      RETURN count(t) as total
    `);
    
    const totalThemes = countResult.records[0].get('total').toNumber();

    // Get relationship count
    const relCountResult = await session.run(`
      MATCH ()-[r:HAS_THEME]->(:theme_category)
      RETURN count(r) as total_relationships
    `);
    
    const totalRelationships = relCountResult.records[0].get('total_relationships').toNumber();

    // Get all remaining themes
    const themesResult = await session.run(`
      MATCH (t:theme_category)
      RETURN t.name as name, t.icon as icon
      ORDER BY t.luxuryScore DESC, t.name
    `);

    const remainingThemes = themesResult.records.map(record => 
      `${record.get('icon')} ${record.get('name')}`
    );

    // Calculate total migrated
    const totalMigrated = results.migrated.reduce((sum, m) => sum + m.count, 0);

    return NextResponse.json({
      success: true,
      message: `✅ Safe migration complete! Migrated ${totalMigrated} POI relationships from ${results.deleted.length} old categories`,
      total_themes: totalThemes,
      total_relationships: totalRelationships,
      relationships_migrated: totalMigrated,
      migration_details: results.migrated,
      deleted_count: results.deleted.length,
      updated_count: results.updated.length,
      deleted: results.deleted,
      updated: results.updated,
      remaining_themes: remainingThemes,
      warnings: remainingPOIs > 0 ? [`${remainingPOIs} POIs still linked to old categories`] : undefined,
      errors: results.errors.length > 0 ? results.errors : undefined
    });

  } catch (error: any) {
    console.error('Error during safe theme migration:', error);
    return NextResponse.json(
      { 
        error: 'Failed to migrate theme categories',
        details: error.message 
      },
      { status: 500 }
    );
  } finally {
    await session.close();
  }
}

export async function GET(request: NextRequest) {
  const session = getSession();

  try {
    // Get all theme categories grouped by presence of image_url
    const result = await session.run(`
      MATCH (t:theme_category)
      RETURN t.name as name,
             t.icon as icon,
             t.luxuryScore as luxuryScore,
             t.image_url as image_url,
             CASE WHEN t.image_url IS NOT NULL THEN 'has_image' ELSE 'no_image' END as status
      ORDER BY status DESC, t.luxuryScore DESC, t.name
    `);

    const themes = result.records.map(record => ({
      name: record.get('name'),
      icon: record.get('icon'),
      luxuryScore: record.get('luxuryScore'),
      has_image: record.get('image_url') !== null,
      image_url: record.get('image_url')
    }));

    const withImages = themes.filter(t => t.has_image);
    const withoutImages = themes.filter(t => !t.has_image);

    return NextResponse.json({
      success: true,
      total: themes.length,
      with_images: withImages.length,
      without_images: withoutImages.length,
      themes_with_images: withImages,
      themes_without_images: withoutImages,
      duplicates_detected: {
        culinary: themes.filter(t => 
          t.name.includes('Culinary') || t.name.includes('Culture')
        ).map(t => t.name),
        nature: themes.filter(t => 
          t.name.includes('Nature') || t.name.includes('Wildlife')
        ).map(t => t.name),
        adventure: themes.filter(t => 
          t.name.includes('Adventure') || t.name.includes('Sports')
        ).map(t => t.name)
      }
    });

  } catch (error: any) {
    console.error('Error fetching theme categories:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch theme categories',
        details: error.message 
      },
      { status: 500 }
    );
  } finally {
    await session.close();
  }
}

