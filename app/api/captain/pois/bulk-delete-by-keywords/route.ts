/**
 * Bulk Delete POIs by Keywords (Quality Cleanup)
 *
 * Purpose: Remove junk POIs (embassies, AC companies, etc.) that slipped through before quality filters
 *
 * Usage:
 * POST /api/captain/pois/bulk-delete-by-keywords
 * {
 *   "keywords": ["embassy", "consulate", "AC service"],
 *   "destination": "Arabian Gulf (UAE)", // optional
 *   "dryRun": true // optional: preview what would be deleted
 * }
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/client';
import { z } from 'zod';

export const runtime = 'nodejs';

const BodySchema = z.object({
  keywords: z.array(z.string().min(1)).min(1).max(50),
  destination: z.string().optional(),
  dryRun: z.boolean().optional().default(false),
});

async function requireCaptainOrAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, status: 401 as const, user: null, isAdmin: false };

  const { data: profile } = await supabase
    .from('captain_profiles')
    .select('role')
    .eq('user_id', user.id)
    .maybeSingle();
  const role = String(profile?.role || '').toLowerCase();
  if (!role) return { ok: false as const, status: 403 as const, user: null, isAdmin: false };

  return { ok: true as const, status: 200 as const, user, isAdmin: role === 'admin' };
}

export async function POST(req: Request) {
  try {
    const auth = await requireCaptainOrAdmin();
    if (!auth.ok) return NextResponse.json({ error: 'Unauthorized' }, { status: auth.status });

    const parsed = BodySchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid payload', details: parsed.error.flatten() }, { status: 400 });
    }

    const { keywords, destination, dryRun } = parsed.data;
    const userId = auth.user!.id;
    const isAdmin = auth.isAdmin;

    // Build query to find matching POIs
    let q = supabaseAdmin.from('extracted_pois').select('id,name,destination,category,created_by');

    // Filter by destination if provided
    if (destination) q = q.eq('destination', destination);

    // Non-admin can only delete their own POIs
    if (!isAdmin) q = q.eq('created_by', userId);

    // Fetch all POIs (we'll filter in-memory by keywords)
    const { data: allPois, error: fetchErr } = await q.limit(10000);
    if (fetchErr) return NextResponse.json({ error: 'Failed to fetch POIs', details: fetchErr.message }, { status: 500 });

    // Filter by keywords (case-insensitive, any keyword matches)
    const matching = (allPois || []).filter((poi) => {
      const text = `${poi.name || ''} ${poi.category || ''}`.toLowerCase();
      return keywords.some((keyword) => text.includes(keyword.toLowerCase()));
    });

    if (dryRun) {
      return NextResponse.json({
        success: true,
        dry_run: true,
        would_delete: matching.length,
        sample: matching.slice(0, 20).map((p) => ({ id: p.id, name: p.name, destination: p.destination, category: p.category })),
        keywords_used: keywords,
      });
    }

    // Delete matching POIs
    const idsToDelete = matching.map((p) => p.id);
    if (!idsToDelete.length) {
      return NextResponse.json({
        success: true,
        deleted: 0,
        keywords_used: keywords,
        note: 'No matching POIs found',
      });
    }

    const { error: deleteErr } = await supabaseAdmin.from('extracted_pois').delete().in('id', idsToDelete);
    if (deleteErr) {
      return NextResponse.json({ error: 'Failed to delete POIs', details: deleteErr.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      deleted: idsToDelete.length,
      keywords_used: keywords,
      destination: destination || 'all',
    });
  } catch (error) {
    console.error('Bulk delete by keywords error:', error);
    return NextResponse.json(
      { error: 'Failed to delete POIs', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
