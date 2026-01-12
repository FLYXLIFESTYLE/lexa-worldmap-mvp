import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/client';

export const runtime = 'nodejs';

const PatchSchema = z
  .object({
    name: z.string().min(1).optional(),
    destination: z.string().min(1).optional(),
    city: z.string().min(1).optional(),
    category: z.string().min(1).optional(),
    description: z.string().optional(),
    confidence_score: z.coerce.number().int().min(0).max(100).optional(),
    luxury_score: z.coerce.number().int().min(0).max(10).optional(),
    keywords: z.array(z.string().min(1)).optional(),
    themes: z.array(z.string().min(1)).optional(),
    enhanced: z.coerce.boolean().optional(),
    verified: z.coerce.boolean().optional(),
  })
  .strict();

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

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireCaptainOrAdmin();
    if (!auth.ok) return NextResponse.json({ error: 'Unauthorized' }, { status: auth.status });

    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const parsed = PatchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid payload', details: parsed.error.flatten() }, { status: 400 });
    }

    const userId = auth.user!.id;
    const nowIso = new Date().toISOString();

    const patch = parsed.data;
    const updates: Record<string, any> = {
      ...patch,
      updated_at: nowIso,
    };

    // When verified is set, also stamp metadata.
    if (patch.verified === true) {
      updates.verified_at = nowIso;
      updates.verified_by = userId;
    }
    if (patch.verified === false) {
      updates.verified_at = null;
      updates.verified_by = null;
    }

    // Non-admins can only update their own POIs
    let q = supabaseAdmin.from('extracted_pois').update(updates).eq('id', id);
    if (!auth.isAdmin) q = q.eq('created_by', userId);

    let { data, error } = await q.select('*').maybeSingle();
    // Back-compat: if `city` column doesn't exist yet in prod, retry without it.
    if (error && String(error.message || '').toLowerCase().includes('column') && String(error.message || '').toLowerCase().includes('city')) {
      const { city: _city, ...withoutCity } = updates;
      let q2 = supabaseAdmin.from('extracted_pois').update(withoutCity).eq('id', id);
      if (!auth.isAdmin) q2 = q2.eq('created_by', userId);
      const res2 = await q2.select('*').maybeSingle();
      data = res2.data;
      error = res2.error;
    }
    if (error) {
      return NextResponse.json({ error: 'Failed to update POI', details: error.message }, { status: 500 });
    }
    if (!data) {
      return NextResponse.json({ error: 'POI not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, poi: data });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

