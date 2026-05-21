/**
 * Reject a company brain section (outdated/irrelevant)
 */

import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/server-auth';
import { supabaseAdmin } from '@/lib/supabase/client';
import { z } from 'zod';

export const runtime = 'nodejs';

const BodySchema = z.object({
  notes: z.string().optional(),
});

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
    const { error } = await supabaseAdmin.rpc('reject_company_brain_section', {
      p_section_id: id,
      p_user_id: auth.userId,
      p_notes: notes || null,
    });

    if (error) {
      return NextResponse.json({ error: 'Failed to reject section', details: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, action: 'rejected' });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to reject section', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
