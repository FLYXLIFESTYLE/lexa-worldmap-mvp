/**
 * Admin Dashboard Statistics API
 * Provides real-time KPIs from Neo4j database
 */

import { NextResponse } from 'next/server';
import { getNeo4jDriver } from '@/lib/neo4j/client';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

export async function GET() {
  try {
    // Authentication (keeps stats private to logged-in admins/captains)
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const driver = getNeo4jDriver();
    const session = driver.session();

    try {
      /**
       * IMPORTANT:
       * A Neo4j session should not run multiple queries concurrently.
       * We use a single query to fetch all KPIs to avoid runtime errors.
       */
      const result = await session.run(`
        CALL { MATCH (p:poi) RETURN count(p) AS totalPOIs }
        CALL { MATCH (p:poi) WHERE p.luxury_score >= 6 RETURN count(p) AS luxuryPOIs }
        CALL { MATCH ()-[r]->() RETURN count(r) AS totalRelations }
        CALL { MATCH (c:client) RETURN count(c) AS totalClients }
        RETURN totalPOIs, luxuryPOIs, totalRelations, totalClients
      `);

      const record = result.records[0];
      const totalPOIs = record?.get('totalPOIs')?.toNumber?.() ?? 0;
      const luxuryPOIs = record?.get('luxuryPOIs')?.toNumber?.() ?? 0;
      const totalRelations = record?.get('totalRelations')?.toNumber?.() ?? 0;
      const totalClients = record?.get('totalClients')?.toNumber?.() ?? 0;

      // Format numbers for display
      const formatNumber = (num: number): string => {
        if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
        if (num >= 1000) return `${(num / 1000).toFixed(0)}K`;
        return num.toString();
      };

      return NextResponse.json({
        success: true,
        stats: {
          totalPOIs: {
            value: totalPOIs,
            formatted: formatNumber(totalPOIs),
            label: 'Total POIs'
          },
          luxuryPOIs: {
            value: luxuryPOIs,
            formatted: formatNumber(luxuryPOIs),
            label: 'Luxury POIs',
            percentage: totalPOIs > 0 ? Math.round((luxuryPOIs / totalPOIs) * 100) : 0
          },
          totalRelations: {
            value: totalRelations,
            formatted: formatNumber(totalRelations),
            label: 'Total Relations'
          },
          totalClients: {
            value: totalClients,
            formatted: formatNumber(totalClients),
            label: 'Total Clients'
          }
        },
        timestamp: new Date().toISOString()
      });
    } finally {
      await session.close();
    }

  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch statistics',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * Get historical stats for day-over-day comparison
 * This will be used in the future to show changes
 */
export async function POST(req: Request) {
  try {
    const { date } = await req.json();
    
    // TODO: Implement historical stats retrieval
    // This would query a stats_history table or calculate from logs
    
    return NextResponse.json({
      success: true,
      message: 'Historical stats coming soon',
      date
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Not implemented yet' },
      { status: 501 }
    );
  }
}

