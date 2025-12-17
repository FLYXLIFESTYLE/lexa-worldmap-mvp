/**
 * API Route: Destination Browser
 * 
 * Get list of destinations with POI statistics
 * Allows exploration and quality assessment of database coverage
 */

import { NextRequest, NextResponse } from 'next/server';
import { getNeo4jDriver } from '@/lib/neo4j/client';
import { createClient } from '@/lib/supabase/server';

interface DestinationStats {
  destination: string;
  total_pois: number;
  luxury_pois: number; // luxury_score >= 7
  avg_luxury_score: number | null;
  poi_types: string[];
  has_captain_comments: number;
  top_types: Array<{ type: string; count: number }>;
}

export async function GET(req: NextRequest) {
  try {
    // Authentication
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = req.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '50');
    const sortBy = searchParams.get('sortBy') || 'total_pois'; // total_pois, luxury_pois, avg_luxury_score, destination
    const order = searchParams.get('order') || 'DESC';

    const driver = getNeo4jDriver();
    const session = driver.session();

    try {
      // Get destination statistics
      const result = await session.run(
        `
        MATCH (p:poi)
        WHERE p.destination_name IS NOT NULL
        WITH p.destination_name as destination,
             count(p) as total_pois,
             sum(CASE WHEN p.luxury_score >= 7 THEN 1 ELSE 0 END) as luxury_pois,
             avg(p.luxury_score) as avg_luxury_score,
             collect(DISTINCT p.type) as poi_types,
             sum(CASE WHEN p.captain_comments IS NOT NULL AND p.captain_comments <> '' THEN 1 ELSE 0 END) as has_captain_comments,
             collect({type: p.type, count: 1}) as type_list
        WITH destination, total_pois, luxury_pois, avg_luxury_score, poi_types, has_captain_comments, type_list
        UNWIND type_list as type_entry
        WITH destination, total_pois, luxury_pois, avg_luxury_score, poi_types, has_captain_comments, 
             type_entry.type as type_name, count(*) as type_count
        ORDER BY type_count DESC
        WITH destination, total_pois, luxury_pois, avg_luxury_score, poi_types, has_captain_comments,
             collect({type: type_name, count: type_count})[0..5] as top_types
        ORDER BY ${sortBy === 'destination' ? 'destination ASC' : sortBy + ' ' + order}
        LIMIT $limit
        RETURN destination, total_pois, luxury_pois, avg_luxury_score, poi_types, has_captain_comments, top_types
        `,
        { limit }
      );

      const destinations: DestinationStats[] = result.records.map(record => ({
        destination: record.get('destination'),
        total_pois: record.get('total_pois').toNumber ? record.get('total_pois').toNumber() : record.get('total_pois'),
        luxury_pois: record.get('luxury_pois').toNumber ? record.get('luxury_pois').toNumber() : record.get('luxury_pois'),
        avg_luxury_score: record.get('avg_luxury_score'),
        poi_types: record.get('poi_types'),
        has_captain_comments: record.get('has_captain_comments').toNumber ? record.get('has_captain_comments').toNumber() : record.get('has_captain_comments'),
        top_types: record.get('top_types'),
      }));

      // Get overall statistics
      const statsResult = await session.run(
        `
        MATCH (p:poi)
        RETURN count(p) as total_pois,
               count(DISTINCT p.destination_name) as total_destinations,
               sum(CASE WHEN p.luxury_score >= 7 THEN 1 ELSE 0 END) as luxury_pois,
               avg(p.luxury_score) as avg_luxury_score,
               sum(CASE WHEN p.luxury_score IS NULL THEN 1 ELSE 0 END) as unscored_pois
        `
      );

      const overallStats = {
        total_pois: statsResult.records[0].get('total_pois').toNumber(),
        total_destinations: statsResult.records[0].get('total_destinations').toNumber(),
        luxury_pois: statsResult.records[0].get('luxury_pois').toNumber(),
        avg_luxury_score: statsResult.records[0].get('avg_luxury_score'),
        unscored_pois: statsResult.records[0].get('unscored_pois').toNumber(),
      };

      return NextResponse.json({
        success: true,
        destinations,
        overallStats,
        count: destinations.length,
      });

    } finally {
      await session.close();
    }

  } catch (error) {
    console.error('Destination browser error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch destinations',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

