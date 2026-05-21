import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireCaptainOrAdmin } from '@/lib/auth/server-auth';
import { supabaseAdmin } from '@/lib/supabase/client';

export const runtime = 'nodejs';

const BodySchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(5000),
  verified: z.coerce.boolean(),
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
    const { ids, verified } = parsed.data;

    const updates: Record<string, any> = {
      verified,
      updated_at: nowIso,
      verified_at: verified ? nowIso : null,
      verified_by: verified ? userId : null,
    };

    let q = supabaseAdmin.from('extracted_pois').update(updates).in('id', ids);
    if (!auth.isAdmin) q = q.eq('created_by', userId);

    const { data, error } = await q.select('id');
    if (error) return NextResponse.json({ error: 'Bulk verify failed', details: error.message }, { status: 500 });

    return NextResponse.json({ success: true, requested: ids.length, updated: data?.length || 0 });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

