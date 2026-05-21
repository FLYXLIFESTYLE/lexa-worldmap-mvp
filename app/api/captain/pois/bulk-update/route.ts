import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireCaptainOrAdmin } from '@/lib/auth/server-auth';
import { supabaseAdmin } from '@/lib/supabase/client';

export const runtime = 'nodejs';

const PatchSchema = z
  .object({
    enhanced: z.coerce.boolean().optional(),
    verified: z.coerce.boolean().optional(),
    confidence_score: z.coerce.number().int().min(0).max(100).optional(),
    category: z.string().min(1).optional(),
  })
  .strict();

const BodySchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(5000),
  patch: PatchSchema,
});

export async function POST(req: Request) {
  try {
    const auth = await requireCaptainOrAdmin();
    if (!auth.ok) return NextResponse.json({ error: 'Unauthorized' }, { status: auth.status });

    const parsed = BodySchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid payload', details: parsed.error.flatten() }, { status: 400 });
    }

    const userId = auth.user!.id;
    const nowIso = new Date().toISOString();
    const { ids, patch } = parsed.data;

    const updates: Record<string, any> = {
      ...patch,
      updated_at: nowIso,
    };

    if (patch.verified === true) {
      updates.verified_at = nowIso;
      updates.verified_by = userId;
    }
    if (patch.verified === false) {
      updates.verified_at = null;
      updates.verified_by = null;
    }

    let q = supabaseAdmin.from('extracted_pois').update(updates).in('id', ids);
    if (!auth.isAdmin) q = q.eq('created_by', userId);

    const { data, error } = await q.select('id');
    if (error) return NextResponse.json({ error: 'Bulk update failed', details: error.message }, { status: 500 });

    return NextResponse.json({ success: true, requested: ids.length, updated: data?.length || 0 });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

