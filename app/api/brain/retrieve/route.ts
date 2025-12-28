/**
 * Brain v1 retrieval primitive:
 * destination (by name) + optional theme -> ranked POIs with explainable evidence.
 *
 * Ranking (all 0..1):
 *   score = theme_fit * luxury_score_base * confidence_score
 * If no theme is provided, we rank by luxury_score_base * confidence_score.
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getNeo4jDriver } from '@/lib/neo4j/client';

export const runtime = 'nodejs';

const BodySchema = z.object({
  destination: z.string().min(1),
  theme: z.string().min(1).optional(),
  limit: z.number().int().min(1).max(50).default(20),
});

export async function POST(req: Request) {
  try {
    const json = await req.json().catch(() => null);
    const parsed = BodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: 'Invalid payload', details: parsed.error.flatten() }, { status: 400 });
    }

    const { destination, theme, limit } = parsed.data;

    const driver = getNeo4jDriver();
    const session = driver.session();

    try {
      const query = theme
        ? `
          MATCH (d:destination {name: $destination})
          MATCH (p:poi)-[:LOCATED_IN]->(d)
          MATCH (p)-[r:FEATURED_IN]->(t:theme_category {name: $theme})
          WITH p, r,
               coalesce(p.luxury_score_base, 0.0) AS luxury,
               coalesce(p.confidence_score, 0.0) AS confidence,
               coalesce(r.theme_fit, 0.0) AS theme_fit
          WITH p, r, luxury, confidence, theme_fit,
               (luxury * confidence * theme_fit) AS score
          RETURN
            p.canonical_id AS canonical_id,
            p.name AS name,
            p.lat AS lat,
            p.lon AS lon,
            luxury,
            confidence,
            theme_fit,
            score,
            r.evidence AS theme_evidence
          ORDER BY score DESC
          LIMIT $limit
        `
        : `
          MATCH (d:destination {name: $destination})
          MATCH (p:poi)-[:LOCATED_IN]->(d)
          WITH p,
               coalesce(p.luxury_score_base, 0.0) AS luxury,
               coalesce(p.confidence_score, 0.0) AS confidence
          WITH p, luxury, confidence,
               (luxury * confidence) AS score
          RETURN
            p.canonical_id AS canonical_id,
            p.name AS name,
            p.lat AS lat,
            p.lon AS lon,
            luxury,
            confidence,
            score
          ORDER BY score DESC
          LIMIT $limit
        `;

      const result = await session.run(query, { destination, theme, limit });
      const pois = result.records.map((rec) => ({
        canonical_id: rec.get('canonical_id'),
        name: rec.get('name'),
        lat: rec.get('lat'),
        lon: rec.get('lon'),
        luxury_score_base: Number(rec.get('luxury')),
        confidence_score: Number(rec.get('confidence')),
        ...(theme
          ? { theme_fit: Number(rec.get('theme_fit')), theme_evidence: rec.get('theme_evidence') ?? null }
          : {}),
        score: Number(rec.get('score')),
      }));

      return NextResponse.json({ ok: true, destination, theme: theme ?? null, count: pois.length, pois });
    } finally {
      await session.close();
    }
  } catch (err) {
    console.error('brain/retrieve error', err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}


