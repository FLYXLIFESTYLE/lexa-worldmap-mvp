/**
 * Admin Dashboard Statistics API
 * Provides real-time KPIs from Neo4j database
 */

import { NextResponse } from 'next/server';
import { getNeo4jDriver } from '@/lib/neo4j/client';

export async function GET() {
  const driver = getNeo4jDriver();
  const session = driver.session();

  try {
    // Run all queries in parallel for better performance
    const [
      totalPOIsResult,
      luxuryPOIsResult,
      totalRelationsResult,
      totalClientsResult
    ] = await Promise.all([
      // 1. Total POIs
      session.run(`
        MATCH (p:poi)
        RETURN count(p) as count
      `),
      
      // 2. Luxury POIs (score >= 6)
      session.run(`
        MATCH (p:poi)
        WHERE p.luxury_score >= 6
        RETURN count(p) as count
      `),
      
      // 3. Total Relations (all relationship types)
      session.run(`
        MATCH ()-[r]->()
        RETURN count(r) as count
      `),
      
      // 4. Total Clients (from captain_profiles via Supabase)
      // Note: This will be 0 until we sync clients to Neo4j
      // For now, we'll return from Neo4j if client nodes exist
      session.run(`
        MATCH (c:client)
        RETURN count(c) as count
      `)
    ]);

    // Extract counts
    const totalPOIs = totalPOIsResult.records[0]?.get('count').toNumber() || 0;
    const luxuryPOIs = luxuryPOIsResult.records[0]?.get('count').toNumber() || 0;
    const totalRelations = totalRelationsResult.records[0]?.get('count').toNumber() || 0;
    const totalClients = totalClientsResult.records[0]?.get('count').toNumber() || 0;

    // Format numbers for display
    const formatNumber = (num: number): string => {
      if (num >= 1000000) {
        return `${(num / 1000000).toFixed(1)}M`;
      } else if (num >= 1000) {
        return `${(num / 1000).toFixed(0)}K`;
      }
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
  } finally {
    await session.close();
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

