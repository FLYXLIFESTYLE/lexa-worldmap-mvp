import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/client';

export const runtime = 'nodejs';

const QuerySchema = z.object({
  skip: z.coerce.number().int().min(0).optional().default(0),
  limit: z.coerce.number().int().min(1).max(1000).optional().default(50),
  destination: z.string().min(1).optional(),
  category: z.string().min(1).optional(),
  verified: z.coerce.boolean().optional(),
  enhanced: z.coerce.boolean().optional(),
  promoted: z.coerce.boolean().optional(),
  search: z.string().min(1).optional(),
});

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
    });
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid query', details: parsed.error.flatten() }, { status: 400 });
    }

    const { skip, limit, destination, category, verified, enhanced, promoted, search } = parsed.data;
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

    // Order + pagination
    q = q.order('created_at', { ascending: false }).range(skip, skip + limit - 1);

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

