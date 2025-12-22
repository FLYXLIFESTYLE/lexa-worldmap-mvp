/**
 * API Route: Clean up NULL theme categories
 * POST /api/admin/cleanup-null-themes
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/neo4j/client';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const session = getSession();

  try {
    // Step 1: Count NULL theme categories and their relationships
    const countResult = await session.run(`
      MATCH (p:poi)-[r:HAS_THEME]->(t:theme_category)
      WHERE t.name IS NULL OR t.name = '' OR t.name = 'null'
      RETURN count(DISTINCT t) as null_categories,
             count(DISTINCT p) as affected_pois,
             count(r) as null_relationships
    `);

    const nullCategories = countResult.records[0]?.get('null_categories')?.toNumber() || 0;
    const affectedPOIs = countResult.records[0]?.get('affected_pois')?.toNumber() || 0;
    const nullRelationships = countResult.records[0]?.get('null_relationships')?.toNumber() || 0;

    if (nullCategories === 0) {
      return NextResponse.json({
        success: true,
        message: 'No NULL theme categories found - database is clean!',
        null_categories: 0,
        affected_pois: 0,
        relationships_deleted: 0
      });
    }

    // Step 2: Delete relationships to NULL theme categories
    const deleteRelsResult = await session.run(`
      MATCH (p:poi)-[r:HAS_THEME]->(t:theme_category)
      WHERE t.name IS NULL OR t.name = '' OR t.name = 'null'
      DELETE r
      RETURN count(r) as deleted
    `);

    const relsDeleted = deleteRelsResult.records[0]?.get('deleted')?.toNumber() || 0;

    // Step 3: Delete NULL theme category nodes
    const deleteNodesResult = await session.run(`
      MATCH (t:theme_category)
      WHERE t.name IS NULL OR t.name = '' OR t.name = 'null'
      DELETE t
      RETURN count(t) as deleted
    `);

    const nodesDeleted = deleteNodesResult.records[0]?.get('deleted')?.toNumber() || 0;

    // Step 4: Verify cleanup
    const verifyResult = await session.run(`
      MATCH (t:theme_category)
      WHERE t.name IS NULL OR t.name = '' OR t.name = 'null'
      RETURN count(t) as remaining
    `);

    const remaining = verifyResult.records[0]?.get('remaining')?.toNumber() || 0;

    // Step 5: Get final valid theme category count
    const finalCountResult = await session.run(`
      MATCH (t:theme_category)
      WHERE t.name IS NOT NULL AND t.name <> '' AND t.name <> 'null'
      RETURN count(t) as total
    `);

    const finalCount = finalCountResult.records[0]?.get('total')?.toNumber() || 0;

    return NextResponse.json({
      success: true,
      message: `✅ Cleaned up ${nodesDeleted} NULL theme categories`,
      null_categories_deleted: nodesDeleted,
      affected_pois: affectedPOIs,
      relationships_deleted: relsDeleted,
      remaining_null_categories: remaining,
      final_valid_theme_count: finalCount,
      warning: affectedPOIs > 0 ? `${affectedPOIs} POIs lost their invalid theme links - they can be re-enriched` : undefined
    });

  } catch (error: any) {
    console.error('Error cleaning up NULL theme categories:', error);
    return NextResponse.json(
      { 
        error: 'Failed to clean up NULL theme categories',
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
    // Get info about NULL theme categories
    const result = await session.run(`
      MATCH (t:theme_category)
      WHERE t.name IS NULL OR t.name = '' OR t.name = 'null'
      WITH t
      OPTIONAL MATCH (t)<-[r:HAS_THEME]-(p:poi)
      RETURN count(DISTINCT t) as null_categories,
             count(DISTINCT p) as affected_pois,
             count(r) as null_relationships
    `);

    const nullCategories = result.records[0]?.get('null_categories')?.toNumber() || 0;
    const affectedPOIs = result.records[0]?.get('affected_pois')?.toNumber() || 0;
    const nullRelationships = result.records[0]?.get('null_relationships')?.toNumber() || 0;

    return NextResponse.json({
      success: true,
      has_null_categories: nullCategories > 0,
      null_categories: nullCategories,
      affected_pois: affectedPOIs,
      null_relationships: nullRelationships,
      recommendation: nullCategories > 0 
        ? 'Run POST to clean up these invalid theme categories'
        : 'Database is clean - no NULL theme categories found'
    });

  } catch (error: any) {
    console.error('Error checking NULL theme categories:', error);
    return NextResponse.json(
      { 
        error: 'Failed to check NULL theme categories',
        details: error.message 
      },
      { status: 500 }
    );
  } finally {
    await session.close();
  }
}

