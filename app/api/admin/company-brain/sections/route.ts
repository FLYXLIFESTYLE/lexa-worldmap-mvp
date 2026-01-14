/**
 * Get all sections from a specific upload or all uploads
 *
 * Query params:
 * - upload_id: UUID (optional, filter by specific upload)
 * - status: needs_review | approved | rejected (optional)
 * - type: script_example | client_insight | etc. (optional)
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/client';

export const runtime = 'nodejs';

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, status: 401 as const };

  const { data: profile } = await supabase.from('captain_profiles').select('role').eq('user_id', user.id).maybeSingle();
  if (profile?.role !== 'admin') return { ok: false as const, status: 403 as const };

  return { ok: true as const, status: 200 as const };
}

export async function GET(req: Request) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) return NextResponse.json({ error: 'Unauthorized' }, { status: auth.status });

    const url = new URL(req.url);
    const uploadId = url.searchParams.get('upload_id');
    const status = url.searchParams.get('status');
    const type = url.searchParams.get('type');

    let query = supabaseAdmin
      .from('company_brain_sections')
      .select(`
        *,
        upload:company_brain_uploads(filename, created_at)
      `)
      .order('created_at', { ascending: false });

    if (uploadId) query = query.eq('upload_id', uploadId);
    if (status) query = query.eq('status', status);
    if (type) query = query.eq('section_type', type);

    const { data: sections, error } = await query.limit(500);

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch sections', details: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      sections: sections || [],
      total: sections?.length || 0,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch sections', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
