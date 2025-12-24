import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { fetchFallbackRegions, fetchYachtDestinations, insertJob, newProgress } from '../_shared';

export const runtime = 'nodejs';

type StartRequest = {
  requested_by_user_id?: string;
  categories?: string[];
  max_places_per_destination?: number; // limit per destination (across categories)
  radius_km_city?: number;
  radius_km_region?: number;
};

const DEFAULT_CATEGORIES = ['wellness', 'dining', 'nightlife', 'culture', 'shopping', 'beach', 'experiences'];

const FALLBACK_REGION_NAMES = [
  'Adriatic',
  'Ionian Sea',
  'Balearics',
  'Caribbean',
  'Bahamas',
  'BVI',
  'French Antilles',
  'Dutch Antilles',
];

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as StartRequest;

    const requestedBy = body.requested_by_user_id || '00000000-0000-0000-0000-000000000000';
    const categories = (body.categories && body.categories.length > 0 ? body.categories : DEFAULT_CATEGORIES).map(c =>
      String(c).trim().toLowerCase()
    );
    const maxPlacesPerDestination = Math.max(10, Math.min(1000, body.max_places_per_destination || 200));
    const radiusKmCity = Math.max(1, Math.min(50, body.radius_km_city || 10));
    const radiusKmRegion = Math.max(1, Math.min(100, body.radius_km_region || 25));

    // Queue: yacht destinations first
    const yachtNames = await fetchYachtDestinations();
    const queue = yachtNames.map(name => ({
      name,
      kind: 'destination' as const,
      radius_km: radiusKmCity,
      status: 'pending' as const,
    }));

    // Fallback: known OSM regions
    const regions = await fetchFallbackRegions(FALLBACK_REGION_NAMES);
    for (const r of regions) {
      queue.push({
        name: r,
        kind: 'region' as const,
        radius_km: radiusKmRegion,
        status: 'pending' as const,
      });
    }

    if (queue.length === 0) {
      return NextResponse.json(
        { error: 'No destinations or regions found to queue. Upload yacht destinations first.' },
        { status: 400 }
      );
    }

    const batchId = randomUUID();
    const progress = newProgress(queue as any, batchId);

    const jobRow = await insertJob({
      requested_by_user_id: requestedBy,
      status: 'running',
      params: {
        job_type: 'collector',
        categories,
        max_places_per_destination: maxPlacesPerDestination,
        radius_km_city: radiusKmCity,
        radius_km_region: radiusKmRegion,
      },
      progress,
    });

    return NextResponse.json({
      ok: true,
      job_id: jobRow.id,
      job: {
        id: jobRow.id,
        status: jobRow.status,
        params: jobRow.params,
        progress: jobRow.progress,
        error: jobRow.error,
        created_at: jobRow.created_at,
        updated_at: jobRow.updated_at,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: 'Failed to start collector', details: e?.message || String(e) }, { status: 500 });
  }
}


