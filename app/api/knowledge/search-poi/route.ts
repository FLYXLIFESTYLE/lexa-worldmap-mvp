/**
 * API Route: Search POIs in Neo4j
 * 
 * Allows captains to search for existing POIs to view and edit
 */

import { NextRequest, NextResponse } from 'next/server';
import { getNeo4jDriver } from '@/lib/neo4j/client';
import { createClient } from '@/lib/supabase/server';
import levenshtein from 'fast-levenshtein';

export const runtime = 'nodejs';

interface SearchResult {
  poi_uid: string;
  name: string;
  type: string | null;
  destination_name: string | null;
  lat: number;
  lon: number;
  luxury_score_base: number | null;
  luxury_score_verified: number | null;
  confidence_score: number | null;
  source: string;
  last_updated: string | null;
}

function normalizeQuery(s: string): string {
  return (s || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, ''); // removes spaces, punctuation, etc.
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
    const qNorm = normalizeQuery(query);

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
      // We pull more candidates than requested, then rank in JS (typo tolerant).
      const candidateLimit = Math.min(200, Math.max(limit * 10, 50));
      let cypherQuery = `
        MATCH (p:poi)
        OPTIONAL MATCH (p)-[:LOCATED_IN]->(d:destination)
        OPTIONAL MATCH (d)-[:IN_DESTINATION]->(mvp:destination {kind: 'mvp_destination'})
        WITH p, coalesce(mvp.name, d.name, p.destination_name) AS dest_name
        WHERE (
          toLower(p.name) CONTAINS toLower($query)
          OR replace(replace(replace(replace(toLower(p.name),' ',''),'-',''),'.',''),'\'','') CONTAINS $q_norm
          OR toLower(coalesce(dest_name,'')) CONTAINS toLower($query)
          OR toLower(coalesce(p.type, p.category, '')) CONTAINS toLower($query)
        )
      `;

      const params: {
        query: string;
        q_norm: string;
        limit: number;
        destination?: string;
      } = { query, q_norm: qNorm, limit: candidateLimit };

      if (destination) {
        cypherQuery += ` AND toLower(coalesce(dest_name,'')) = toLower($destination)`;
        params.destination = destination;
      }

      cypherQuery += `
        RETURN p.poi_uid as poi_uid,
               p.name as name,
               p.type as type,
               dest_name as destination_name,
               p.lat as lat,
               p.lon as lon,
               coalesce(p.luxury_score_verified, null) as luxury_score_verified,
               coalesce(p.luxury_score_base, p.luxury_score, p.luxuryScore) as luxury_score_base,
               coalesce(p.confidence_score, p.luxury_confidence) as confidence_score,
               p.source as source,
               p.updated_at as last_updated
        LIMIT $limit
      `;

      const result = await session.run(cypherQuery, params);

      const candidates: SearchResult[] = result.records.map(record => ({
        poi_uid: record.get('poi_uid'),
        name: record.get('name'),
        type: record.get('type'),
        destination_name: record.get('destination_name'),
        lat: record.get('lat'),
        lon: record.get('lon'),
        luxury_score_base: record.get('luxury_score_base'),
        luxury_score_verified: record.get('luxury_score_verified'),
        confidence_score: record.get('confidence_score'),
        source: record.get('source'),
        last_updated: record.get('last_updated'),
      }));

      const normalizeScore0to10 = (v: unknown): number | null => {
        if (typeof v !== 'number' || !Number.isFinite(v)) return null;
        // If legacy 0-100 slipped in, normalize down to 0-10.
        return v > 10 ? Math.round((v / 10) * 10) / 10 : Math.round(v * 10) / 10;
      };

      const ranked = candidates
        .map((p) => {
          const nameNorm = normalizeQuery(p.name || '');
          const destNorm = normalizeQuery(p.destination_name || '');
          const typeNorm = normalizeQuery(p.type || '');

          let score = 1000;

          if (qNorm && nameNorm === qNorm) score = 0;
          else if (qNorm && nameNorm.includes(qNorm)) score = 1 + Math.min(5, Math.max(0, nameNorm.length - qNorm.length)) / 100;
          else if (qNorm && destNorm.includes(qNorm)) score = 3;
          else if (qNorm && typeNorm.includes(qNorm)) score = 4;
          else if (qNorm && nameNorm) score = 10 + levenshtein.get(nameNorm, qNorm);

          return {
            p: {
              ...p,
              luxury_score_base: normalizeScore0to10(p.luxury_score_base),
              luxury_score_verified: normalizeScore0to10(p.luxury_score_verified),
              confidence_score: typeof p.confidence_score === 'number' ? p.confidence_score : null,
            },
            score,
          };
        })
        .sort((a, b) => {
          if (a.score !== b.score) return a.score - b.score;
          const as = a.p.luxury_score_verified ?? a.p.luxury_score_base ?? -1;
          const bs = b.p.luxury_score_verified ?? b.p.luxury_score_base ?? -1;
          if (as !== bs) return bs - as;
          return (a.p.name || '').localeCompare(b.p.name || '');
        })
        .slice(0, Math.max(1, Math.min(limit, 50)))
        .map((x) => x.p);

      return NextResponse.json({
        results: ranked,
        count: ranked.length,
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

