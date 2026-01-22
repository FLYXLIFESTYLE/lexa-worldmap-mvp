import { NextResponse } from 'next/server';
import { z } from 'zod';
import { randomUUID } from 'crypto';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/client';

export const runtime = 'nodejs';

const QuerySchema = z.object({
  skip: z.coerce.number().int().min(0).optional().default(0),
  // NOTE: The Captain Browse UI needs to see more than 1000 when bulk imports happen.
  // We'll still cap to 5000 to avoid pulling "everything" accidentally.
  limit: z.coerce.number().int().min(1).max(5000).optional().default(1000),
  destination: z.string().min(1).optional(),
  category: z.string().min(1).optional(),
  verified: z.coerce.boolean().optional(),
  enhanced: z.coerce.boolean().optional(),
  promoted: z.coerce.boolean().optional(),
  search: z.string().min(1).optional(),
  source_kind: z.string().min(1).optional(),
});

const CreateSchema = z.object({
  name: z.string().min(1),
  destination: z.string().min(1),
  category: z.string().min(1),
  description: z.string().min(1).optional(),
  address: z.string().optional(),
  latitude: z.coerce.number().optional(),
  longitude: z.coerce.number().optional(),
  confidence_score: z.coerce.number().optional(),
  luxury_score: z.coerce.number().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

function normalizeConfidence(value?: number): number {
  if (value == null || Number.isNaN(value)) return 80;
  const n = Number(value);
  if (Number.isNaN(n)) return 80;
  if (n <= 1) return Math.max(0, Math.min(100, Math.round(n * 100)));
  return Math.max(0, Math.min(100, Math.round(n)));
}

function normalizeLuxury(value?: number): number | null {
  if (value == null || Number.isNaN(value)) return null;
  const n = Number(value);
  if (Number.isNaN(n)) return null;
  if (n <= 1) return Math.max(0, Math.min(10, Math.round(n * 10)));
  return Math.max(0, Math.min(10, Math.round(n)));
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

  const isAdmin = role === 'admin';
  return { ok: true as const, status: 200 as const, user, isAdmin };
}

export async function GET(req: Request) {
  try {
    const auth = await requireCaptainOrAdmin();
    if (!auth.ok) return NextResponse.json({ error: 'Unauthorized' }, { status: auth.status });

    const url = new URL(req.url);
    const parsed = QuerySchema.safeParse({
      skip: url.searchParams.get('skip') ?? undefined,
      limit: url.searchParams.get('limit') ?? undefined,
      destination: url.searchParams.get('destination') ?? undefined,
      category: url.searchParams.get('category') ?? undefined,
      verified: url.searchParams.get('verified') ?? undefined,
      enhanced: url.searchParams.get('enhanced') ?? undefined,
      promoted: url.searchParams.get('promoted') ?? undefined,
      search: url.searchParams.get('search') ?? undefined,
      source_kind: url.searchParams.get('source_kind') ?? undefined,
    });
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid query', details: parsed.error.flatten() }, { status: 400 });
    }

    const { skip, limit, destination, category, verified, enhanced, promoted, search, source_kind } = parsed.data;
    const userId = auth.user!.id;

    // Base query + count
    let q = supabaseAdmin.from('extracted_pois').select('*', { count: 'exact' });

    // Non-admins see only their own extracted POIs
    if (!auth.isAdmin) q = q.eq('created_by', userId);

    // Filters
    if (destination) q = q.ilike('destination', `%${destination}%`);
    if (category) q = q.eq('category', category);
    if (verified !== undefined) q = q.eq('verified', verified);
    if (enhanced !== undefined) q = q.eq('enhanced', enhanced);
    if (promoted !== undefined) q = q.eq('promoted_to_main', promoted);
    if (search) {
      const s = search.replace(/,/g, ' '); // avoid breaking the OR expression
      q = q.or(`name.ilike.%${s}%,description.ilike.%${s}%,destination.ilike.%${s}%`);
    }
    if (source_kind) {
      q = q.filter('metadata->>source_kind', 'eq', source_kind);
    }

    // Order + pagination
    // IMPORTANT: Use updated_at first so "just enriched/edited" POIs appear immediately in the UI.
    // Secondary ordering keeps the sort stable.
    q = q
      .order('updated_at', { ascending: false })
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .range(skip, skip + limit - 1);

    const { data, error, count } = await q;
    if (error) {
      return NextResponse.json({ error: 'Error fetching POIs', details: error.message }, { status: 500 });
    }

    return NextResponse.json({
      pois: data || [],
      total: count || 0,
      skip,
      limit,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const auth = await requireCaptainOrAdmin();
    if (!auth.ok) return NextResponse.json({ error: 'Unauthorized' }, { status: auth.status });

    const body = await req.json().catch(() => ({}));
    const parsed = CreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid payload', details: parsed.error.flatten() }, { status: 400 });
    }

    const userId = auth.user!.id;
    const now = new Date().toISOString();
    const payload = parsed.data;

    const id = randomUUID();
    const metadata = {
      ...(payload.metadata || {}),
      source_kind: payload.metadata?.source_kind || 'manual_entry',
    };

    const record = {
      id,
      created_by: userId,
      name: payload.name.trim(),
      destination: payload.destination.trim(),
      category: payload.category.trim(),
      description: payload.description?.trim() || null,
      address: payload.address?.trim() || null,
      latitude: payload.latitude ?? null,
      longitude: payload.longitude ?? null,
      confidence_score: normalizeConfidence(payload.confidence_score),
      luxury_score: normalizeLuxury(payload.luxury_score),
      source_file: 'manual_entry',
      source_refs: [
        {
          source_type: 'manual',
          source_id: id,
          source_url: null,
          captured_at: now,
          external_ids: {},
          license: null,
        },
      ],
      metadata,
      verified: false,
      enhanced: false,
      promoted_to_main: false,
      created_at: now,
      updated_at: now,
    };

    const { data, error } = await supabaseAdmin
      .from('extracted_pois')
      .insert(record)
      .select('*')
      .maybeSingle();

    if (error || !data) {
      return NextResponse.json({ error: 'Failed to create POI draft', details: error?.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, poi: data });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

