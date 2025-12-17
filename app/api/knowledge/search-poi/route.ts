/**
 * API Route: Search POIs in Neo4j
 * 
 * Allows captains to search for existing POIs to view and edit
 */

import { NextRequest, NextResponse } from 'next/server';
import { getNeo4jDriver } from '@/lib/neo4j/client';
import { createClient } from '@/lib/supabase/server';

interface SearchResult {
  poi_uid: string;
  name: string;
  type: string | null;
  destination_name: string | null;
  lat: number;
  lon: number;
  luxury_score: number | null;
  luxury_confidence: number | null;
  source: string;
  last_updated: string | null;
}

export async function GET(req: NextRequest) {
  try {
    // Check authentication
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get search query from URL params
    const searchParams = req.nextUrl.searchParams;
    const query = searchParams.get('q') || '';
    const limit = parseInt(searchParams.get('limit') || '20');
    const destination = searchParams.get('destination');

    if (!query || query.length < 2) {
      return NextResponse.json({
        results: [],
        message: 'Please enter at least 2 characters to search'
      });
    }

    const driver = getNeo4jDriver();
    const session = driver.session();

    try {
      // Build Cypher query with optional destination filter
      let cypherQuery = `
        MATCH (p:poi)
        WHERE (
          toLower(p.name) CONTAINS toLower($query)
          OR toLower(p.destination_name) CONTAINS toLower($query)
          OR toLower(p.type) CONTAINS toLower($query)
        )
      `;

      const params: any = { query, limit };

      if (destination) {
        cypherQuery += ` AND toLower(p.destination_name) = toLower($destination)`;
        params.destination = destination;
      }

      cypherQuery += `
        RETURN p.poi_uid as poi_uid,
               p.name as name,
               p.type as type,
               p.destination_name as destination_name,
               p.lat as lat,
               p.lon as lon,
               p.luxury_score as luxury_score,
               p.luxury_confidence as luxury_confidence,
               p.source as source,
               p.updated_at as last_updated
        ORDER BY p.luxury_score DESC NULLS LAST, p.name ASC
        LIMIT $limit
      `;

      const result = await session.run(cypherQuery, params);

      const pois: SearchResult[] = result.records.map(record => ({
        poi_uid: record.get('poi_uid'),
        name: record.get('name'),
        type: record.get('type'),
        destination_name: record.get('destination_name'),
        lat: record.get('lat'),
        lon: record.get('lon'),
        luxury_score: record.get('luxury_score'),
        luxury_confidence: record.get('luxury_confidence'),
        source: record.get('source'),
        last_updated: record.get('last_updated'),
      }));

      return NextResponse.json({
        results: pois,
        count: pois.length,
        query,
      });

    } finally {
      await session.close();
    }

  } catch (error) {
    console.error('POI search error:', error);
    return NextResponse.json(
      { error: 'Failed to search POIs', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

