/**
 * API Route: List recent manually created POIs (admin view)
 *
 * Manual POIs are created via /api/knowledge/poi/create with p.source = 'manual'
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getNeo4jDriver } from '@/lib/neo4j/client';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: profile } = await supabase
      .from('captain_profiles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Admins only' }, { status: 403 });
    }

    const limit = Math.max(1, Math.min(200, parseInt(req.nextUrl.searchParams.get('limit') || '50', 10)));

    let driver;
    try {
      driver = getNeo4jDriver();
    } catch (e: any) {
      // If Neo4j env vars are missing in Vercel, don't hard-fail the whole page.
      return NextResponse.json({
        success: true,
        pois: [],
        warning: 'Neo4j connection not configured for this deployment.',
        details: e?.message || String(e),
      });
    }

    const session = driver.session();

    try {
      const result = await session.run(
        `
        MATCH (p:poi)
        WHERE p.source = 'manual'
        RETURN
          p.poi_uid as poi_uid,
          p.name as name,
          p.type as type,
          p.destination_name as destination_name,
          coalesce(p.confidence_score, null) as confidence_score,
          p.website_url as website_url,
          p.created_at as created_at,
          p.updated_at as updated_at,
          p.last_edited_by as last_edited_by,
          p.last_edited_at as last_edited_at
        ORDER BY coalesce(p.last_edited_at, p.updated_at, p.created_at) DESC
        LIMIT $limit
        `,
        { limit }
      );

      const toNum = (v: any): number | null => {
        if (typeof v === 'number') return v;
        // neo4j Integer
        if (v && typeof v === 'object' && typeof v.toNumber === 'function') return v.toNumber();
        return null;
      };
      const toStr = (v: any): string | null => {
        if (typeof v === 'string') return v;
        if (v && typeof v === 'object' && typeof v.toString === 'function') return v.toString();
        return v == null ? null : String(v);
      };

      const rows = result.records.map((r) => ({
        poi_uid: toStr(r.get('poi_uid')),
        name: toStr(r.get('name')),
        type: toStr(r.get('type')),
        destination_name: toStr(r.get('destination_name')),
        confidence_score: toNum(r.get('confidence_score')),
        website_url: toStr(r.get('website_url')),
        created_at: toStr(r.get('created_at')),
        updated_at: toStr(r.get('updated_at')),
        last_edited_by: toStr(r.get('last_edited_by')),
        last_edited_at: toStr(r.get('last_edited_at')),
      }));

      return NextResponse.json({ success: true, pois: rows });
    } finally {
      await session.close();
    }
  } catch (error) {
    console.error('Manual POI list error:', error);
    // Don't throw a 500 to the browser UI — return an empty list with diagnostics instead.
    return NextResponse.json({
      success: true,
      pois: [],
      warning: 'Failed to list manual POIs (Neo4j query error).',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

