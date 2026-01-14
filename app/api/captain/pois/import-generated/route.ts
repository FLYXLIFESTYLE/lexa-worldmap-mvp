import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/client';
import { z } from 'zod';
import { isExperienceRelevant } from '@/lib/poi-quality-filters';

export const runtime = 'nodejs';

const BodySchema = z.object({
  destination: z.string().min(1),
  source: z.enum(['osm', 'wikidata', 'overture', 'any']).optional().default('any'),
  limit: z.number().int().min(1).max(5000).optional().default(500),
  // Allows importing the "next batch" deterministically.
  // Example: first run skip=0 limit=500, second run skip=500 limit=500.
  skip: z.number().int().min(0).max(500000).optional().default(0),
});

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function normalizeText(s: unknown): string {
  return typeof s === 'string' ? s.trim() : '';
}

function inferCategory(entity: any): string {
  const tags: string[] = Array.isArray(entity?.tags) ? entity.tags : [];
  const cat = JSON.stringify(entity?.categories || {}).toLowerCase();
  const text = `${tags.join(' ')} ${cat} ${(entity?.name || '')}`.toLowerCase();

  if (text.includes('hotel') || text.includes('resort')) return 'hotel';
  if (text.includes('restaurant') || text.includes('cafe') || text.includes('bar')) return 'restaurant';
  if (text.includes('marina') || text.includes('yacht') || text.includes('harbour') || text.includes('harbor')) return 'activity';
  if (text.includes('spa') || text.includes('wellness')) return 'experience';
  if (text.includes('museum') || text.includes('gallery') || text.includes('cathedral') || text.includes('monument')) return 'attraction';
  if (text.includes('beach') || text.includes('viewpoint') || text.includes('attraction')) return 'attraction';
  return 'attraction';
}

function sourceUrlFor(source: 'osm' | 'wikidata' | 'overture', sourceId: string): string | null {
  if (!sourceId) return null;
  if (source === 'wikidata') return `https://www.wikidata.org/wiki/${sourceId}`;
  if (source === 'osm') {
    // source_id is like "osm_node_123" or "osm_way_456"
    const m = sourceId.match(/^osm_(node|way|relation)_(\d+)$/i);
    if (!m) return null;
    const type = m[1].toLowerCase();
    const id = m[2];
    return `https://www.openstreetmap.org/${type}/${id}`;
  }
  return null;
}

async function requireCaptainOrAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, status: 401 as const, user: null };

  const { data: profile } = await supabase
    .from('captain_profiles')
    .select('role')
    .eq('user_id', user.id)
    .maybeSingle();
  const role = String(profile?.role || '').toLowerCase();
  if (!role) return { ok: false as const, status: 403 as const, user: null };

  return { ok: true as const, status: 200 as const, user };
}

export async function POST(req: Request) {
  try {
    const auth = await requireCaptainOrAdmin();
    if (!auth.ok) return NextResponse.json({ error: 'Unauthorized' }, { status: auth.status });

    const parsed = BodySchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid payload', details: parsed.error.flatten() }, { status: 400 });
    }

    const { destination, source, limit, skip } = parsed.data;
    const userId = auth.user!.id;

    // Load destination_geo row
    const { data: dest, error: destErr } = await supabaseAdmin
      .from('destinations_geo')
      .select('id,name')
      .eq('name', destination)
      .maybeSingle();
    if (destErr) return NextResponse.json({ error: 'Failed to load destination', details: destErr.message }, { status: 500 });
    if (!dest) return NextResponse.json({ error: 'Destination not found', details: destination }, { status: 404 });

    // Prefer the destination-source link table if it exists.
    // If not, fall back to joining sources->entities by entity.destination_id.
    let links: Array<{ entity_id: string; source: string; source_id: string }> = [];
    try {
      let q = supabaseAdmin
        .from('experience_entity_destination_sources')
        .select('entity_id,source,source_id')
        .eq('destination_id', dest.id);
      if (source !== 'any') q = q.eq('source', source);
      // Deterministic ordering so skip/limit always selects the same slice.
      q = q.order('source', { ascending: true }).order('source_id', { ascending: true });
      const { data, error } = await q.range(skip, skip + limit - 1);
      if (error) throw error;
      links = (data || []) as any;
    } catch {
      // fallback: (source rows) join (entities) by destination_id
      let q = supabaseAdmin
        .from('experience_entity_sources')
        .select('source,source_id, entity_id, experience_entities!inner(destination_id)')
        .eq('experience_entities.destination_id', dest.id);
      if (source !== 'any') q = q.eq('source', source);
      q = q.order('source', { ascending: true }).order('source_id', { ascending: true });
      const { data } = await q.range(skip, skip + limit - 1);
      links = (data || [])
        .map((r: any) => ({ entity_id: r.entity_id, source: r.source, source_id: r.source_id }))
        .filter((r: any) => !!r.entity_id && !!r.source && !!r.source_id);
    }

    const entityIds = Array.from(new Set(links.map((l) => String(l.entity_id)).filter(Boolean)));
    if (!entityIds.length) {
      return NextResponse.json({ success: true, created: 0, requested: 0, destination: dest.name });
    }

    // Load entities in chunks
    const entitiesById = new Map<string, any>();
    for (const ids of chunk(entityIds, 200)) {
      const { data, error } = await supabaseAdmin
        .from('experience_entities')
        .select('id,name,lat,lon,address,website,phone,categories,tags,source_hints')
        .in('id', ids);
      if (error) return NextResponse.json({ error: 'Failed to load entities', details: error.message }, { status: 500 });
      for (const e of data || []) entitiesById.set(String((e as any).id), e);
    }

    const nowIso = new Date().toISOString();

    const rows = links
      .map((l) => {
        const e = entitiesById.get(String(l.entity_id));
        if (!e) return null;

        // Quality gate: only import experience-relevant POIs
        const relevanceCheck = isExperienceRelevant(e);
        if (!relevanceCheck.relevant) return null;

        const src = String(l.source) as 'osm' | 'wikidata' | 'overture' | string;
        const srcId = String(l.source_id);
        const name = normalizeText(e.name);
        if (!name) return null;

        const lat = typeof e.lat === 'number' ? e.lat : e.lat ? Number(e.lat) : null;
        const lon = typeof e.lon === 'number' ? e.lon : e.lon ? Number(e.lon) : null;
        const category = inferCategory(e);
        const srcUrl =
          src === 'osm' || src === 'wikidata' || src === 'overture' ? sourceUrlFor(src as any, srcId) : null;

        const source_refs = [
          {
            source_type: src,
            source_id: srcId,
            source_url: srcUrl,
            captured_at: nowIso,
          },
        ];

        return {
          created_by: userId,
          name,
          destination: dest.name,
          category,
          description: null,
          address: e.address ?? null,
          latitude: lat,
          longitude: lon,
          confidence_score: 60,
          verified: false,
          enhanced: false,
          promoted_to_main: false,
          // brain hardening fields
          source_refs,
          citations: [],
          enrichment: {},
          updated_at: nowIso,
          // idempotency fields
          generated_source: src,
          generated_source_id: srcId,
          generated_entity_id: e.id,
          generated_destination_id: dest.id,
        };
      })
      .filter(Boolean) as any[];

    if (!rows.length) {
      return NextResponse.json({ success: true, upserted: 0, created_new: 0, requested: links.length, destination: dest.name });
    }

    // Count existing rows for this destination+source (so we can report "new" vs "already had")
    let beforeCount = 0;
    try {
      if (source !== 'any') {
        const { count } = await supabaseAdmin
          .from('extracted_pois')
          .select('id', { head: true, count: 'exact' })
          .eq('destination', dest.name)
          .eq('generated_source', source)
          .eq('created_by', userId);
        beforeCount = Number(count || 0);
      }
    } catch {
      // best-effort only
    }

    // Upsert by generated source key (requires migration 024)
    const { data: inserted, error: upsertErr } = await supabaseAdmin
      .from('extracted_pois')
      .upsert(rows, { onConflict: 'generated_source,generated_source_id' })
      .select('id');

    if (upsertErr) {
      return NextResponse.json({ error: 'Import failed', details: upsertErr.message }, { status: 500 });
    }

    let afterCount = beforeCount;
    try {
      if (source !== 'any') {
        const { count } = await supabaseAdmin
          .from('extracted_pois')
          .select('id', { head: true, count: 'exact' })
          .eq('destination', dest.name)
          .eq('generated_source', source)
          .eq('created_by', userId);
        afterCount = Number(count || 0);
      }
    } catch {
      // best-effort only
    }

    const createdNew = Math.max(0, afterCount - beforeCount);

    return NextResponse.json({
      success: true,
      // NOTE: Supabase upsert returns rows that were inserted OR updated.
      // So this is "upserted", not necessarily "newly created".
      upserted: inserted?.length ?? 0,
      created_new: createdNew,
      requested: rows.length,
      destination: dest.name,
      skip,
      limit,
      source,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

