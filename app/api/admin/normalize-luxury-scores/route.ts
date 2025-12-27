/**
 * Admin API Route: Normalize POI luxury scoring fields in Neo4j
 *
 * Canonical fields (new):
 * - luxury_score_base (number, 0-10)
 * - luxury_score_verified (number, 0-10)
 * - confidence_score (number, 0-1)
 * - score_evidence (JSON string)
 *
 * Backfills from legacy fields:
 * - luxury_score, luxuryScore
 * - luxury_confidence
 * - luxury_evidence
 *
 * POST /api/admin/normalize-luxury-scores
 */

import { NextResponse } from 'next/server';
import { getSession } from '@/lib/neo4j/client';

export const runtime = 'nodejs';

function jsonEscape(s: string): string {
  return (s || '').replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');
}

export async function POST() {
  const session = getSession();
  try {
    // Backfill canonical fields. Idempotent: safe to run multiple times.
    // NOTE: Neo4j does not support nested JSON as a property; we store JSON as a string.
    const result = await session.run(`
      MATCH (p:poi)
      WITH p,
           coalesce(p.luxury_score_base, p.luxury_score, p.luxuryScore) AS base_score,
           coalesce(p.confidence_score, p.luxury_confidence) AS conf,
           p.score_evidence AS existing_evidence,
           coalesce(p.luxury_score_verified, p.luxury_score_verified) AS verified_existing
      SET p.luxury_score_base = base_score,
          p.confidence_score = conf,
          p.luxury_score_verified =
            coalesce(
              verified_existing,
              CASE
                WHEN coalesce(conf, 0) >= 0.99 THEN base_score
                ELSE NULL
              END
            )
      RETURN
        count(p) AS total,
        count(CASE WHEN base_score IS NOT NULL THEN 1 END) AS with_base,
        count(CASE WHEN coalesce(conf, 0) >= 0.99 THEN 1 END) AS verified_like,
        count(CASE WHEN p.luxury_evidence IS NOT NULL AND existing_evidence IS NULL THEN 1 END) AS evidence_needs_backfill
    `);

    // Second pass: fill `score_evidence` JSON string from `luxury_evidence` (escape safely).
    // This is more verbose but safe across Neo4j versions.
    const rows = await session.run(`
      MATCH (p:poi)
      WHERE p.score_evidence IS NULL AND p.luxury_evidence IS NOT NULL
      RETURN p.poi_uid AS poi_uid, p.luxury_evidence AS luxury_evidence
      LIMIT 5000
    `);

    let patched = 0;
    for (const r of rows.records) {
      const poi_uid = r.get('poi_uid');
      const luxury_evidence = r.get('luxury_evidence');
      const evidenceJson = `{"legacy_text":"${jsonEscape(String(luxury_evidence || ''))}"}`;
      await session.run(
        `
        MATCH (p:poi {poi_uid: $poi_uid})
        SET p.score_evidence = $evidence
        `,
        { poi_uid, evidence: evidenceJson }
      );
      patched += 1;
    }

    const rec = result.records[0];
    return NextResponse.json({
      success: true,
      message: 'Normalized POI luxury scoring fields',
      stats: {
        total: rec.get('total').toNumber(),
        with_base: rec.get('with_base').toNumber(),
        verified_like: rec.get('verified_like').toNumber(),
        evidence_needs_backfill: rec.get('evidence_needs_backfill').toNumber(),
        evidence_patched_rows: patched,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to normalize luxury scoring fields', details: error?.message || String(error) },
      { status: 500 }
    );
  } finally {
    await session.close();
  }
}


