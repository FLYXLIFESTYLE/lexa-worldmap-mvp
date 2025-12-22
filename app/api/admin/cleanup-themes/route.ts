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
      deleted: [] as string[],
      updated: [] as string[],
      kept: [] as string[],
      errors: [] as string[]
    };

    // Step 1: Delete redundant theme categories
    const redundantThemes = [
      "Culture & Culinary",
      "Water & Wildlife Adventure",
      "Raw Nature & Vibes",
      "Sports & Adrenaline",
      "Art & Fashion",
      "Beauty & Longevity"
    ];

    for (const themeName of redundantThemes) {
      try {
        const result = await session.run(
          `MATCH (t:theme_category {name: $name})
           DETACH DELETE t
           RETURN $name as deleted`,
          { name: themeName }
        );
        
        if (result.records.length > 0) {
          results.deleted.push(themeName);
        }
      } catch (error: any) {
        results.errors.push(`Failed to delete ${themeName}: ${error.message}`);
      }
    }

    // Step 2: Update and enhance unique existing categories
    
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
      if (!error.message.includes('no changes')) {
        results.errors.push(`Failed to update Mental Health & Legacy: ${error.message}`);
      }
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
      if (!error.message.includes('no changes')) {
        results.errors.push(`Failed to update Business & Performance: ${error.message}`);
      }
    }

    // Step 3: Get final count
    const countResult = await session.run(`
      MATCH (t:theme_category)
      RETURN count(t) as total
    `);
    
    const totalThemes = countResult.records[0].get('total').toNumber();

    // Step 4: Get all remaining themes
    const themesResult = await session.run(`
      MATCH (t:theme_category)
      RETURN t.name as name, t.icon as icon
      ORDER BY t.luxuryScore DESC, t.name
    `);

    results.kept = themesResult.records.map(record => 
      `${record.get('icon')} ${record.get('name')}`
    );

    return NextResponse.json({
      success: true,
      message: `Cleanup complete! Consolidated from 26 to ${totalThemes} theme categories`,
      total_themes: totalThemes,
      deleted_count: results.deleted.length,
      updated_count: results.updated.length,
      deleted: results.deleted,
      updated: results.updated,
      remaining_themes: results.kept,
      errors: results.errors.length > 0 ? results.errors : undefined
    });

  } catch (error: any) {
    console.error('Error cleaning up theme categories:', error);
    return NextResponse.json(
      { 
        error: 'Failed to clean up theme categories',
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

