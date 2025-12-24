import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/client';
import { getSession } from '@/lib/neo4j/client';
import { geocodeAddress, isQuotaError, placesDetails, placesSearchText, type PriceLevel } from '../_google';
import {
  bumpProgressCounters,
  getJob,
  markCompleted,
  markFailed,
  markPausedBudget,
  updateJob,
  type CollectorProgress,
  type CollectorQueueItem,
} from '../_shared';

export const runtime = 'nodejs';

type TickRequest = {
  job_id: string;
  max_requests?: number; // how many Google API calls to spend in this tick
  max_queue_items?: number; // how many destinations/regions to process in this tick
};

const CATEGORY_QUERIES: Record<string, string[]> = {
  wellness: ['luxury spa', 'wellness resort', 'massage spa'],
  dining: ['Michelin restaurant', 'fine dining', 'tasting menu restaurant'],
  nightlife: ['exclusive nightclub', 'cocktail bar', 'beach club'],
  culture: ['art gallery', 'museum', 'opera house'],
  shopping: ['luxury shopping', 'designer boutique', 'jewelry store'],
  beach: ['beach club', 'private beach'],
  experiences: ['yacht charter', 'helicopter tour', 'private tour'],
};

function displayName(place: any) {
  const dn = place?.displayName;
  if (dn && typeof dn === 'object') return dn.text || null;
  if (typeof dn === 'string') return dn;
  return null;
}

function toLatLon(place: any) {
  const loc = place?.location || {};
  const lat = loc.latitude;
  const lon = loc.longitude;
  if (typeof lat === 'number' && typeof lon === 'number') return { lat, lon };
  return { lat: null, lon: null };
}

function isLuxuryPrice(priceLevel?: PriceLevel | null) {
  if (!priceLevel) return true; // unknown => allow (we'll rely on rating/reviews)
  return priceLevel === 'PRICE_LEVEL_EXPENSIVE' || priceLevel === 'PRICE_LEVEL_VERY_EXPENSIVE';
}

function qualifies(category: string, place: any): boolean {
  const rating = typeof place?.rating === 'number' ? place.rating : null;
  const count = typeof place?.userRatingCount === 'number' ? place.userRatingCount : null;
  const priceLevel = (place?.priceLevel as PriceLevel | undefined) || undefined;

  const minRating = category === 'dining' ? 4.2 : 4.0;
  const minCount = 50;
  if (rating !== null && rating < minRating) return false;
  if (count !== null && count < minCount) return false;
  if (!isLuxuryPrice(priceLevel)) return false;
  return true;
}

async function upsertSupabase(jobId: string, placeId: string, place: any) {
  const name = displayName(place) || placeId;
  const { lat, lon } = toLatLon(place);

  // Upsert normalized place
  const { error: e1 } = await supabaseAdmin.from('google_places_places').upsert({
    place_id: placeId,
    display_name: name,
    formatted_address: place.formattedAddress || null,
    lat,
    lon,
    types: place.types || [],
    rating: place.rating ?? null,
    user_rating_count: place.userRatingCount ?? null,
    website_uri: place.websiteUri ?? null,
    international_phone_number: place.internationalPhoneNumber ?? null,
    regular_opening_hours: place.regularOpeningHours ?? {},
    raw: place,
    last_fetched_at: new Date().toISOString(),
  });
  if (e1) throw new Error(e1.message);

  // Join row
  const { error: e2 } = await supabaseAdmin.from('places_job_places').upsert({
    job_id: jobId,
    place_id: placeId,
  });
  if (e2) throw new Error(e2.message);
}

async function upsertNeo4j(destination: string, placeId: string, place: any, categories: string[]) {
  const session = getSession();
  try {
    const name = displayName(place) || destination || placeId;
    const { lat, lon } = toLatLon(place);
    const types: string[] = place.types || [];
    const primaryType = types[0] || null;

    await session.run(
      `
      MERGE (p:poi {poi_uid: $poi_uid})
      ON CREATE SET p.source = 'google_places', p.created_at = datetime()
      SET p.google_place_id = $place_id,
          p.name = coalesce(p.name, $name),
          p.type = coalesce(p.type, $type),
          p.destination_name = coalesce(p.destination_name, $destination),
          p.lat = coalesce(p.lat, $lat),
          p.lon = coalesce(p.lon, $lon),
          p.google_rating = $rating,
          p.google_user_rating_count = $user_rating_count,
          p.google_price_level = $price_level,
          p.website = $website,
          p.phone = $phone,
          p.formatted_address = $formatted_address,
          p.enriched_at = datetime(),
          p.enriched_source = 'google_places_collector',
          p.lexa_primary_category = coalesce(p.lexa_primary_category, $primary_category),
          p.lexa_categories =
            CASE
              WHEN p.lexa_categories IS NULL THEN $categories
              ELSE
                CASE
                  WHEN size([c IN $categories WHERE c IN p.lexa_categories]) = size($categories)
                    THEN p.lexa_categories
                  ELSE p.lexa_categories + [c IN $categories WHERE NOT c IN p.lexa_categories]
                END
            END,
          p.updated_at = datetime()
      `,
      {
        poi_uid: `gplaces:${placeId}`,
        place_id: placeId,
        name,
        type: primaryType,
        destination,
        lat,
        lon,
        rating: place.rating ?? null,
        user_rating_count: place.userRatingCount ?? null,
        price_level: place.priceLevel ?? null,
        website: place.websiteUri ?? null,
        phone: place.internationalPhoneNumber ?? null,
        formatted_address: place.formattedAddress ?? null,
        primary_category: categories[0] || null,
        categories,
      }
    );

    await session.run(
      `
      MATCH (p:poi {poi_uid: $poi_uid})
      MERGE (d:destination {name: $destination})
      MERGE (p)-[:LOCATED_IN]->(d)
      `,
      { poi_uid: `gplaces:${placeId}`, destination }
    );
  } finally {
    await session.close();
  }
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as TickRequest | null;
  if (!body?.job_id) return NextResponse.json({ error: 'Missing job_id' }, { status: 400 });

  const maxRequests = Math.max(5, Math.min(500, body.max_requests || 80));
  const maxQueueItems = Math.max(1, Math.min(25, body.max_queue_items || 1));

  try {
    const job = await getJob(body.job_id);
    const params = job.params || {};
    const progress = (job.progress || {}) as CollectorProgress;

    if (params.job_type !== 'collector' || progress.job_type !== 'collector') {
      return NextResponse.json({ error: 'Not a collector job' }, { status: 400 });
    }

    // IMPORTANT: use a snapshot variable so TypeScript doesn't permanently narrow `progress.state`.
    // `markPausedBudget(progress, ...)` mutates `progress.state` later in this function.
    const initialState = progress.state;
    if (initialState === 'paused_manual' || initialState === 'paused_budget' || initialState === 'completed' || initialState === 'failed') {
      return NextResponse.json({ ok: true, job_id: body.job_id, progress });
    }

    const categories: string[] = Array.isArray(params.categories) ? params.categories : [];
    const maxPlacesPerDestination = Math.max(10, Math.min(1000, params.max_places_per_destination || 200));
    const languageCode: string = params.language_code || 'en';

    let requestsThisTick = 0;
    let queueItemsProcessed = 0;

    while (
      requestsThisTick < maxRequests &&
      queueItemsProcessed < maxQueueItems &&
      progress.current_index < progress.queue.length
    ) {
      const item = progress.queue[progress.current_index] as CollectorQueueItem;
      if (!item || item.status === 'done' || item.status === 'failed' || item.status === 'skipped') {
        progress.current_index += 1;
        continue;
      }

      item.status = 'running';
      item.stats = item.stats || {};

      const destination = item.name;
      const radius_m = Math.round(item.radius_km * 1000);

      // 1) Geocode
      let center: { lat: number; lon: number } | null = null;
      try {
        const geo = await geocodeAddress(destination);
        center = geo.center;
        requestsThisTick += 1;
        progress.requests_used_total += 1;
      } catch (e: any) {
        const msg = e?.message || String(e);
        if (isQuotaError(msg)) {
          markPausedBudget(progress, msg);
          break;
        }
        item.status = 'failed';
        item.error = msg;
        progress.current_index += 1;
        queueItemsProcessed += 1;
        continue;
      }

      if (!center) {
        item.status = 'failed';
        item.error = 'Geocode returned no center';
        progress.current_index += 1;
        queueItemsProcessed += 1;
        continue;
      }

      // 2) Discover (searchText)
      const perCategoryLimit = Math.max(10, Math.ceil(maxPlacesPerDestination / Math.max(1, categories.length)));
      const placeCategoryMap = new Map<string, Set<string>>();

      for (const category of categories) {
        if (requestsThisTick >= maxRequests) break;
        const templates = CATEGORY_QUERIES[category] || [category];
        const idsForCategory = new Set<string>();

        for (const t of templates) {
          if (requestsThisTick >= maxRequests) break;
          if (idsForCategory.size >= perCategoryLimit) break;

          const query = `${t} in ${destination}`;
          try {
            const res = await placesSearchText({
              textQuery: query,
              center,
              radius_m,
              languageCode,
              maxResultCount: 20,
            });
            requestsThisTick += 1;
            progress.requests_used_total += 1;

            for (const p of res.places) {
              if (!p?.id) continue;
              if (idsForCategory.size >= perCategoryLimit) break;
              idsForCategory.add(p.id);
              if (!placeCategoryMap.has(p.id)) placeCategoryMap.set(p.id, new Set());
              placeCategoryMap.get(p.id)!.add(category);
            }
          } catch (e: any) {
            const msg = e?.message || String(e);
            if (isQuotaError(msg)) {
              markPausedBudget(progress, msg);
              break;
            }
            // non-fatal: continue next template/category
          }
        }

        const discovered = idsForCategory.size;
        item.stats![category] = item.stats![category] || { discovered: 0, details_fetched: 0, upserted: 0 };
        item.stats![category].discovered += discovered;
        bumpProgressCounters(progress, category, { discovered });
      }

      if (progress.state === 'paused_budget') break;

      // 3) Details + upsert
      const placeIds = Array.from(placeCategoryMap.keys()).slice(0, maxPlacesPerDestination);
      for (const pid of placeIds) {
        if (requestsThisTick >= maxRequests) break;

        let place: any;
        try {
          const details = await placesDetails(pid);
          place = details.place;
          requestsThisTick += 1;
          progress.requests_used_total += 1;
        } catch (e: any) {
          const msg = e?.message || String(e);
          if (isQuotaError(msg)) {
            markPausedBudget(progress, msg);
            break;
          }
          continue;
        }

        const cats = Array.from(placeCategoryMap.get(pid) || []);
        const primaryCat = cats[0] || 'unknown';

        // Count details fetched per category (even if we later drop it)
        for (const c of cats) {
          item.stats![c] = item.stats![c] || { discovered: 0, details_fetched: 0, upserted: 0 };
          item.stats![c].details_fetched += 1;
          bumpProgressCounters(progress, c, { details_fetched: 1 });
        }

        if (!qualifies(primaryCat, place)) continue;

        try {
          await upsertSupabase(body.job_id, pid, place);
          await upsertNeo4j(destination, pid, place, cats.length > 0 ? cats : [primaryCat]);
          for (const c of cats.length > 0 ? cats : [primaryCat]) {
            item.stats![c] = item.stats![c] || { discovered: 0, details_fetched: 0, upserted: 0 };
            item.stats![c].upserted += 1;
            bumpProgressCounters(progress, c, { upserted: 1 });
          }
        } catch (e: any) {
          const msg = e?.message || String(e);
          if (isQuotaError(msg)) {
            markPausedBudget(progress, msg);
            break;
          }
          // ignore and continue
        }
      }

      if (progress.state === 'paused_budget') break;

      item.status = 'done';
      progress.current_index += 1;
      queueItemsProcessed += 1;
    }

    // Finish conditions
    if (progress.state !== 'paused_budget' && progress.current_index >= progress.queue.length) {
      markCompleted(progress);
    } else {
      progress.updated_at = new Date().toISOString();
    }

    // Persist update
    try {
      await updateJob(body.job_id, { progress, status: progress.state === 'completed' ? 'completed' : 'running' });
    } catch (e: any) {
      // If we cannot persist, that's a failure state
      markFailed(progress, e?.message || String(e));
      await updateJob(body.job_id, { progress, status: 'failed', error: progress.reason || 'Failed to persist progress' });
    }

    return NextResponse.json({
      ok: true,
      job_id: body.job_id,
      progress,
      tick: {
        requests_used: requestsThisTick,
        queue_items_processed: queueItemsProcessed,
      },
    });
  } catch (e: any) {
    // Best effort: mark job failed
    try {
      const job = await getJob(body.job_id);
      const progress = (job.progress || {}) as CollectorProgress;
      markFailed(progress, e?.message || String(e));
      await supabaseAdmin
        .from('places_enrichment_jobs')
        .update({ status: 'failed', error: progress.reason, progress, updated_at: new Date().toISOString() })
        .eq('id', body.job_id);
    } catch {
      // ignore
    }
    return NextResponse.json({ error: 'Collector tick failed', details: e?.message || String(e) }, { status: 500 });
  }
}


