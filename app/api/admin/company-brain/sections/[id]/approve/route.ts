/**
 * Approve a company brain section (makes it available for Script Engine retrieval)
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/client';
import { z } from 'zod';

export const runtime = 'nodejs';

const BodySchema = z.object({
  notes: z.string().optional(),
});

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, status: 401 as const, user: null };

  const { data: profile } = await supabase.from('captain_profiles').select('role').eq('user_id', user.id).maybeSingle();
  if (profile?.role !== 'admin') return { ok: false as const, status: 403 as const, user: null };

  return { ok: true as const, status: 200 as const, user };
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const auth = await requireAdmin();
    if (!auth.ok) return NextResponse.json({ error: 'Unauthorized' }, { status: auth.status });

    const body = await req.json().catch(() => ({}));
    const parsed = BodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const { notes } = parsed.data;

    // Use helper function
    const { error } = await supabaseAdmin.rpc('approve_company_brain_section', {
      p_section_id: id,
      p_user_id: auth.user!.id,
      p_notes: notes || null,
    });

    if (error) {
      return NextResponse.json({ error: 'Failed to approve section', details: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, action: 'approved' });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to approve section', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
