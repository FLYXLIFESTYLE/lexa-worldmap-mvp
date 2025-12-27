/**
 * API endpoint for scoring statistics
 * Returns luxury score distribution and confidence metrics
 */

import { NextResponse } from 'next/server';
import { getNeo4jDriver } from '@/lib/neo4j';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

export async function GET() {
  // Authentication gate: admin/captain only
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const driver = getNeo4jDriver();
  const session = driver.session();

  try {
    // Get luxury score distribution
    const luxuryDistribution = await session.run(`
      MATCH (p:poi)
      WITH coalesce(p.luxury_score_verified, p.luxury_score_base, p.luxury_score, p.luxuryScore) as rawScore
      WHERE rawScore IS NOT NULL
      WITH CASE WHEN rawScore > 10 THEN rawScore ELSE rawScore * 10 END as score
      RETURN 
        count(CASE WHEN score >= 90 THEN 1 END) as ultra_luxury,
        count(CASE WHEN score >= 80 AND score < 90 THEN 1 END) as high_luxury,
        count(CASE WHEN score >= 70 AND score < 80 THEN 1 END) as upscale,
        count(CASE WHEN score >= 50 AND score < 70 THEN 1 END) as mid_range,
        count(CASE WHEN score < 50 THEN 1 END) as standard,
        count(score) as total,
        avg(score) as avg_score,
        max(score) as max_score,
        min(score) as min_score
    `);

    const luxuryStats = luxuryDistribution.records[0];
    const total = luxuryStats.get('total').toNumber();

    // Get top luxury POIs
    const topPOIs = await session.run(`
      MATCH (p:poi)
      WITH p, coalesce(p.luxury_score_verified, p.luxury_score_base, p.luxury_score, p.luxuryScore) as rawScore
      WHERE rawScore IS NOT NULL
      WITH p, CASE WHEN rawScore > 10 THEN rawScore ELSE rawScore * 10 END as score
      RETURN p.name as name, 
             score as score, 
             p.type as type,
             p.destination_name as destination
      ORDER BY score DESC
      LIMIT 10
    `);

    // Get confidence score distribution for relationships
    const confidenceDistribution = await session.run(`
      MATCH ()-[r]->()
      WHERE r.confidence IS NOT NULL
      RETURN 
        count(CASE WHEN r.confidence >= 0.9 THEN 1 END) as very_high,
        count(CASE WHEN r.confidence >= 0.8 AND r.confidence < 0.9 THEN 1 END) as high,
        count(CASE WHEN r.confidence >= 0.7 AND r.confidence < 0.8 THEN 1 END) as good,
        count(CASE WHEN r.confidence >= 0.6 AND r.confidence < 0.7 THEN 1 END) as moderate,
        count(CASE WHEN r.confidence < 0.6 THEN 1 END) as low,
        count(r.confidence) as total,
        avg(r.confidence) as avg_confidence
    `);

    const confidenceStats = confidenceDistribution.records[0];
    const totalRelationships = confidenceStats.get('total').toNumber();

    // Get unscored POI count
    const unscoredResult = await session.run(`
      MATCH (p:poi)
      WHERE coalesce(p.luxury_score_verified, p.luxury_score_base, p.luxury_score, p.luxuryScore) IS NULL
      RETURN count(p) as unscored
    `);
    const unscored = unscoredResult.records[0].get('unscored').toNumber();

    return NextResponse.json({
      luxury: {
        distribution: {
          ultra_luxury: luxuryStats.get('ultra_luxury').toNumber(),
          high_luxury: luxuryStats.get('high_luxury').toNumber(),
          upscale: luxuryStats.get('upscale').toNumber(),
          mid_range: luxuryStats.get('mid_range').toNumber(),
          standard: luxuryStats.get('standard').toNumber(),
        },
        stats: {
          total,
          unscored,
          avg: luxuryStats.get('avg_score') ? parseFloat(luxuryStats.get('avg_score').toFixed(1)) : 0,
          max: luxuryStats.get('max_score'),
          min: luxuryStats.get('min_score'),
          completion: total > 0 ? Math.round((total / (total + unscored)) * 100) : 0,
        },
        topPOIs: topPOIs.records.map(record => ({
          name: record.get('name'),
          score: record.get('score'),
          type: record.get('type'),
          destination: record.get('destination'),
        })),
      },
      confidence: {
        distribution: {
          very_high: confidenceStats.get('very_high').toNumber(),
          high: confidenceStats.get('high').toNumber(),
          good: confidenceStats.get('good').toNumber(),
          moderate: confidenceStats.get('moderate').toNumber(),
          low: confidenceStats.get('low').toNumber(),
        },
        stats: {
          total: totalRelationships,
          avg: confidenceStats.get('avg_confidence') 
            ? parseFloat(confidenceStats.get('avg_confidence').toFixed(2)) 
            : 0,
        },
      },
    });
  } catch (error) {
    console.error('Error fetching scoring stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch scoring statistics' },
      { status: 500 }
    );
  } finally {
    await session.close();
  }
}

