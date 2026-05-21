import { requireStaff } from '@/lib/auth/server-auth';
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/client';
import { z } from 'zod';

const DestinationUpsertSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1),
  kind: z.enum(['city', 'region', 'country', 'route', 'other']).default('city'),
  bbox: z
    .object({
      minLon: z.number(),
      minLat: z.number(),
      maxLon: z.number(),
      maxLat: z.number(),
    })
    .optional(),
  polygon: z.any().optional(),
  centroid_lat: z.number().optional(),
  centroid_lon: z.number().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

export async function GET() {
  const auth = await requireStaff();
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: auth.status });
  }

  const { data, error } = await supabaseAdmin
    .from('destinations_geo')
    .select('*')
    .order('name', { ascending: true });

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, destinations: data ?? [] });
}

export async function POST(req: Request) {
  const auth = await requireStaff();
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: auth.status });
  }

  const body = await req.json().catch(() => null);
  const parsed = DestinationUpsertSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: 'Invalid payload', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const payload = parsed.data;

  // Avoid duplicates: if no id provided, try to find existing by (name, kind)
  let existingId: string | undefined = payload.id;
  if (!existingId) {
    const { data: existing, error: existingErr } = await supabaseAdmin
      .from('destinations_geo')
      .select('id')
      .eq('name', payload.name)
      .eq('kind', payload.kind)
      .maybeSingle();
    if (!existingErr && existing?.id) {
      existingId = existing.id;
    }
  }

  const insertRow: Record<string, unknown> = {
    ...(existingId ? { id: existingId } : {}),
    name: payload.name,
    kind: payload.kind,
    bbox: payload.bbox ?? null,
    polygon: payload.polygon ?? null,
    centroid_lat: payload.centroid_lat ?? null,
    centroid_lon: payload.centroid_lon ?? null,
    metadata: payload.metadata ?? {},
  };

  const { data, error } = await supabaseAdmin
    .from('destinations_geo')
    .upsert(insertRow, { onConflict: 'id' })
    .select('*')
    .single();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, destination: data });
}
