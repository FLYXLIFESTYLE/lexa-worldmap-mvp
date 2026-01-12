import { NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase/client';

export const runtime = 'nodejs';

const QuerySchema = z.object({
  // If omitted, this cron will auto-import across MVP destinations in small batches.
  destination: z.string().min(1).optional(),
  source: z.enum(['osm', 'wikidata', 'overture', 'any']).optional().default('any'),
  limit: z.coerce.number().int().min(1).max(5000).optional().default(500),
  // Only used when destination is omitted (cron "sweep" mode)
  maxDestinations: z.coerce.number().int().min(1).max(20).optional().default(3),
});

function isVercelCron(req: Request): boolean {
  // Vercel Cron SHOULD send `x-vercel-cron`, but in some environments we observed it missing.
  // As a safe MVP fallback, also allow the official Vercel cron user-agent.
  const h = req.headers.get('x-vercel-cron');
  if (h) return true;

  const ua = String(req.headers.get('user-agent') || '').toLowerCase();
  if (ua.includes('vercel-cron')) return true;

  // Optional: allow manual triggering with a secret token (if you set CRON_SECRET in Vercel)
  try {
    const secret = process.env.CRON_SECRET || '';
    if (secret) {
      const url = new URL(req.url);
      const token = url.searchParams.get('token') || '';
      if (token && token === secret) return true;
    }
  } catch {
    // ignore
  }

  return false;
}

const CRON_DEFAULTS = {
  limit: 250,
  maxDestinations: 3,
  source: 'any' as const,
};

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
    const m = sourceId.match(/^osm_(node|way|relation)_(\d+)$/i);
    if (!m) return null;
    const type = m[1].toLowerCase();
    const id = m[2];
    return `https://www.openstreetmap.org/${type}/${id}`;
  }
  return null;
}

async function importForDestination(args: {
  destinationName: string;
  source: 'osm' | 'wikidata' | 'overture' | 'any';
  limit: number;
  ownerId: string;
}) {
  const { destinationName, source, limit, ownerId } = args;
  const nowIso = new Date().toISOString();

  const { data: dest, error: destErr } = await supabaseAdmin
    .from('destinations_geo')
    .select('id,name')
    .eq('name', destinationName)
    .maybeSingle();
  if (destErr) throw new Error(destErr.message);
  if (!dest) throw new Error(`Destination not found: ${destinationName}`);

  // Prefer destination-source link table if present.
  let links: Array<{ entity_id: string; source: string; source_id: string }> = [];
  try {
    let q = supabaseAdmin
      .from('experience_entity_destination_sources')
      .select('entity_id,source,source_id')
      .eq('destination_id', dest.id)
      .order('entity_id', { ascending: true });
    if (source !== 'any') q = q.eq('source', source);
    const { data, error } = await q.limit(limit);
    if (error) throw error;
    links = (data || []) as any;
  } catch {
    // fallback: (source rows) join (entities) by destination_id
    let q = supabaseAdmin
      .from('experience_entity_sources')
      .select('source,source_id, entity_id, experience_entities!inner(destination_id)')
      .eq('experience_entities.destination_id', dest.id);
    if (source !== 'any') q = q.eq('source', source);
    const { data } = await q.limit(limit);
    links = (data || [])
      .map((r: any) => ({ entity_id: r.entity_id, source: r.source, source_id: r.source_id }))
      .filter((r: any) => !!r.entity_id && !!r.source && !!r.source_id);
  }

  const entityIds = Array.from(new Set(links.map((l) => String(l.entity_id)).filter(Boolean)));
  if (!entityIds.length) return { destination: dest.name, created: 0, requested: 0 };

  // Load entities in chunks
  const entitiesById = new Map<string, any>();
  for (const ids of chunk(entityIds, 200)) {
    const { data, error } = await supabaseAdmin
      .from('experience_entities')
      .select('id,name,lat,lon,address,website,phone,categories,tags,source_hints')
      .in('id', ids);
    if (error) throw new Error(error.message);
    for (const e of data || []) entitiesById.set(String((e as any).id), e);
  }

  const rows = links
    .map((l) => {
      const e = entitiesById.get(String(l.entity_id));
      if (!e) return null;

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
        created_by: ownerId,
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
        source_refs,
        citations: [],
        enrichment: {},
        updated_at: nowIso,
        generated_source: src,
        generated_source_id: srcId,
        generated_entity_id: e.id,
        generated_destination_id: dest.id,
      };
    })
    .filter(Boolean) as any[];

  if (!rows.length) return { destination: dest.name, created: 0, requested: links.length };

  const { data: inserted, error: upsertErr } = await supabaseAdmin
    .from('extracted_pois')
    .upsert(rows, { onConflict: 'generated_source,generated_source_id' })
    .select('id');

  if (upsertErr) throw new Error(upsertErr.message);

  return {
    destination: dest.name,
    created: inserted?.length ?? 0,
    requested: rows.length,
  };
}

export async function GET(req: Request) {
  try {
    if (!isVercelCron(req)) {
      return NextResponse.json({ error: 'Forbidden (cron only)' }, { status: 403 });
    }

    const url = new URL(req.url);
    const parsed = QuerySchema.safeParse({
      destination: url.searchParams.get('destination') ?? undefined,
      source: url.searchParams.get('source') ?? CRON_DEFAULTS.source,
      limit: url.searchParams.get('limit') ?? CRON_DEFAULTS.limit,
      maxDestinations: url.searchParams.get('maxDestinations') ?? CRON_DEFAULTS.maxDestinations,
    });
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid query', details: JSON.stringify(parsed.error.flatten()) }, { status: 400 });
    }

    // Accept either env var name (beginner-friendly / avoids brittle config):
    // - CRON_POI_USER_ID (what you set in Vercel)
    // - CRON_POI_OWNER_ID (older name used in docs)
    const ownerId = process.env.CRON_POI_USER_ID || process.env.CRON_POI_OWNER_ID || '';
    if (!ownerId) {
      return NextResponse.json(
        { error: 'Server not configured', details: 'Set CRON_POI_USER_ID (your Supabase user UUID)' },
        { status: 500 }
      );
    }

    const { destination, source, limit, maxDestinations } = parsed.data;

    // If destination is provided, do a single-destination import (manual/debug or targeted cron).
    if (destination) {
      const res = await importForDestination({ destinationName: destination, source, limit, ownerId });
      return NextResponse.json({
        success: true,
        mode: 'single',
        ...res,
        note: 'Idempotent upsert into extracted_pois.',
      });
    }

    // Cron sweep mode: import across MVP destinations in small batches (no query params needed).
    // IMPORTANT: rotate through destinations so we don't always import only the first N.
    const { data: destsAll, error: destsErr } = await supabaseAdmin
      .from('destinations_geo')
      .select('name')
      .eq('kind', 'mvp_destination')
      .order('name', { ascending: true });
    if (destsErr) return NextResponse.json({ error: 'Failed to load destinations', details: destsErr.message }, { status: 500 });

    const names = (destsAll || []).map((d: any) => String(d?.name || '').trim()).filter(Boolean);
    if (!names.length) {
      return NextResponse.json({ success: true, mode: 'sweep', destinations_processed: 0, total_created: 0, total_requested: 0 });
    }

    // 30-minute slot index (matches our cron cadence). This creates a deterministic rotation.
    const slot = Math.floor(Date.now() / (30 * 60 * 1000));
    const start = slot % names.length;
    const selected: string[] = [];
    for (let i = 0; i < Math.min(maxDestinations, names.length); i++) {
      selected.push(names[(start + i) % names.length]);
    }

    const results: Array<{ destination: string; created: number; requested: number; error?: string }> = [];
    let totalCreated = 0;
    let totalRequested = 0;

    for (const name of selected) {
      try {
        const r = await importForDestination({ destinationName: name, source, limit, ownerId });
        results.push(r);
        totalCreated += r.created;
        totalRequested += r.requested;
      } catch (e: any) {
        results.push({ destination: name, created: 0, requested: 0, error: String(e?.message || e) });
      }
    }

    return NextResponse.json({
      success: true,
      mode: 'sweep',
      source,
      limit_per_destination: limit,
      destinations_processed: results.length,
      total_created: totalCreated,
      total_requested: totalRequested,
      results,
      note: 'Cron sweep mode: idempotent upsert into extracted_pois across MVP destinations.',
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

