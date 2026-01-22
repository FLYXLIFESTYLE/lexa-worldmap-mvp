import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { getNeo4jDriver } from '@/lib/neo4j/client';
import { looksLikeBadPoiName } from '@/lib/brain/poi-contract';

export const runtime = 'nodejs';

function asStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter((x): x is string => typeof x === 'string')
    .map((s) => s.trim())
    .filter(Boolean);
}

function safeJsonParse<T>(v: unknown): T | null {
  if (typeof v !== 'string') return null;
  try {
    return JSON.parse(v) as T;
  } catch {
    return null;
  }
}

function asJsonArray(v: unknown): any[] {
  if (Array.isArray(v)) return v;
  const parsed = safeJsonParse<any[]>(v);
  return Array.isArray(parsed) ? parsed : [];
}

function asJsonObject(v: unknown): Record<string, any> | null {
  if (v && typeof v === 'object' && !Array.isArray(v)) return v as Record<string, any>;
  const parsed = safeJsonParse<Record<string, any>>(v);
  return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null;
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function normalizeDimensionName(name: string): string {
  const raw = name.trim();
  const key = raw.toLowerCase();
  const map: Record<string, string> = {
    exclusivity: 'Exclusivity',
    prestige: 'Prestige',
    discovery: 'Discovery',
    indulgence: 'Indulgence',
    romance: 'Romance',
    adventure: 'Adventure',
    legacy: 'Legacy',
    freedom: 'Freedom',
    transformation: 'Transformation',
  };
  return map[key] || raw;
}

const MVP_DESTINATIONS = new Set([
  'French Riviera',
  'Amalfi Coast',
  'Balearics',
  'Cyclades',
  'Adriatic North',
  'Adriatic Central',
  'Adriatic South',
  'Ionian Sea',
  'Bahamas',
  'BVI',
  'USVI',
  'French Antilles',
]);

const CITY_TO_MVP_DESTINATION: Record<string, string> = {
  Monaco: 'French Riviera',
  'St. Tropez': 'French Riviera',
  Cannes: 'French Riviera',
  Nice: 'French Riviera',
};

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Auth via cookies (same as rest of Next.js API)
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Role check (must have a captain profile)
    const { data: profile } = await supabase
      .from('captain_profiles')
      .select('role, display_name, full_name')
      .eq('user_id', user.id)
      .maybeSingle();

    const role = (profile?.role || '').toLowerCase();
    if (!role) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    // Service-role client to bypass RLS and update source table safely
    const serviceKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!serviceKey || !supabaseUrl) {
      return NextResponse.json(
        { error: 'Server not configured (missing Supabase service key)' },
        { status: 500 }
      );
    }
    const admin = createAdminClient(supabaseUrl, serviceKey);

    // Fetch extracted POI
    const { data: poi, error: fetchError } = await admin
      .from('extracted_pois')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (fetchError || !poi) {
      return NextResponse.json({ error: 'POI not found' }, { status: 404 });
    }

    // Hard gate: prevent promoting obvious junk names (paragraph fragments).
    if (looksLikeBadPoiName(String(poi.name || ''))) {
      return NextResponse.json(
        {
          error: 'POI name looks invalid',
          details:
            'This POI name looks like a sentence/paragraph fragment. Please edit it to the real place name before verifying/promoting.',
        },
        { status: 400 }
      );
    }

    // Hard gate: promotion requires provenance (investor-grade traceability)
    const sourceRefs = Array.isArray((poi as any).source_refs) ? (poi as any).source_refs : [];
    if (!sourceRefs.length) {
      return NextResponse.json(
        {
          error: 'Missing provenance',
          details:
            'This POI has no source_refs yet. Add at least one source (or run Enrich) before promoting to Neo4j.',
        },
        { status: 400 }
      );
    }

    if (!poi.verified) {
      return NextResponse.json(
        { error: 'POI must be verified before promotion' },
        { status: 400 }
      );
    }

    const meta = asJsonObject((poi as any).metadata) || {};
    const sourceKind = String(meta?.source_kind || '').toLowerCase();

    if (sourceKind === 'yacht_destination') {
      const name = String(poi.name || '').trim();
      if (!name) {
        return NextResponse.json({ error: 'Missing destination name' }, { status: 400 });
      }

      const category = String(poi.category || '').toLowerCase();
      const yachtMeta = asJsonObject(meta?.yacht) || {};
      const yachtTypeRaw = String(yachtMeta?.type || meta?.yacht_type || '').toLowerCase();
      const yachtType =
        yachtTypeRaw || (category.includes('route') ? 'route' : category.includes('country') ? 'country' : 'city');
      const ports = asStringArray(yachtMeta?.ports || (meta as any)?.ports || []);

      const driver = getNeo4jDriver();
      const session = driver.session();
      const now = new Date().toISOString();
      const contributorName =
        (profile?.display_name || profile?.full_name || user.email || '').toString();
      let neo4jRef = '';

      try {
        if (yachtType === 'route') {
          if (!ports.length) {
            return NextResponse.json(
              { error: 'Route requires ports before promotion' },
              { status: 400 }
            );
          }

          await session.run(
            `
            MERGE (r:yacht_route {name: $name})
            SET
              r.source = 'yacht_destination',
              r.source_id = $source_id,
              r.port_count = $port_count,
              r.updated_at = datetime($now),
              r.created_at = coalesce(r.created_at, datetime($now)),
              r.created_by = coalesce(r.created_by, $created_by)
            `,
            {
              name,
              source_id: poi.id,
              port_count: ports.length,
              now,
              created_by: contributorName || null,
            }
          );

          for (let i = 0; i < ports.length; i += 1) {
            const portName = ports[i];
            await session.run(
              `
              MERGE (p:destination {name: $port_name, type: 'city'})
              ON CREATE SET
                p.created_at = datetime($now),
                p.source = 'yacht_destination',
                p.source_id = $source_id,
                p.yacht_port = true,
                p.luxury_destination = true
              ON MATCH SET
                p.yacht_port = true

              WITH p
              MATCH (r:yacht_route {name: $route_name})
              MERGE (r)-[rel:INCLUDES_PORT {order: $order}]->(p)
              ON CREATE SET rel.created_at = datetime($now)
              `,
              {
                port_name: portName,
                route_name: name,
                order: i + 1,
                now,
                source_id: poi.id,
              }
            );
          }

          neo4jRef = `yacht_route:${name}`;
        } else {
          const destType = yachtType === 'country' ? 'country' : 'city';
          await session.run(
            `
            MERGE (d:destination {name: $name, type: $type})
            SET
              d.source = 'yacht_destination',
              d.source_id = $source_id,
              d.updated_at = datetime($now),
              d.created_at = coalesce(d.created_at, datetime($now)),
              d.yacht_port = $is_port,
              d.yacht_destination = $is_destination,
              d.luxury_destination = true
            `,
            {
              name,
              type: destType,
              source_id: poi.id,
              now,
              is_port: destType === 'city',
              is_destination: destType === 'country',
            }
          );
          neo4jRef = `destination:${destType}:${name}`;
        }
      } finally {
        await session.close();
      }

      const currentMeta =
        poi.metadata && typeof poi.metadata === 'object' ? poi.metadata : {};
      const nextMeta = {
        ...currentMeta,
        promoted_to_neo4j: true,
        neo4j_ref: neo4jRef,
        promoted_at: now,
        promoted_by: user.id,
        promoted_by_email: (user.email || '').toLowerCase(),
      };

      const { error: updateError } = await admin
        .from('extracted_pois')
        .update({
          promoted_to_main: true,
          metadata: nextMeta,
          updated_at: now,
        })
        .eq('id', id);

      if (updateError) {
        return NextResponse.json(
          { error: 'Promoted in Neo4j, but failed to update Postgres', details: updateError.message },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        ref: neo4jRef,
        message: 'Yacht destination promoted to official knowledge (Neo4j).',
      });
    }

    // Create/Upsert into Neo4j as canonical POI
    const poi_uid = `extracted:${poi.id}`;
    const now = new Date().toISOString();
    const contributorName =
      (profile?.display_name || profile?.full_name || user.email || '').toString();
    const relConfidence =
      typeof poi.confidence_score === 'number' ? poi.confidence_score / 100.0 : 0.8;

    const driver = getNeo4jDriver();
    const session = driver.session();
    try {
      await session.run(
        `
        MERGE (p:poi { poi_uid: $poi_uid })
        SET
          p.name = $name,
          p.type = $type,
          p.destination_name = $destination_name,
          p.description = $description,
          p.address = $address,
          p.lat = $lat,
          p.lon = $lon,
          p.luxury_score_base = $luxury_score_base,
          p.confidence_score = $confidence_score,
          p.source = 'captain_extracted',
          p.source_id = $source_id,
          p.updated_at = $updated_at,
          p.last_edited_by = $last_edited_by,
          p.last_edited_at = $last_edited_at,
          p.created_at = coalesce(p.created_at, $created_at),
          p.created_by = coalesce(p.created_by, $created_by)
        RETURN p
        `,
        {
          poi_uid,
          name: poi.name,
          type: poi.category || 'poi',
          destination_name: poi.destination || null,
          description: poi.description || null,
          address: poi.address || null,
          lat: poi.latitude ?? null,
          lon: poi.longitude ?? null,
          luxury_score_base: poi.luxury_score ?? null,
          confidence_score:
            typeof poi.confidence_score === 'number'
              ? poi.confidence_score / 100.0
              : null,
          source_id: poi.id,
          created_at: now,
          created_by: contributorName || null,
          updated_at: now,
          last_edited_by: contributorName || null,
          last_edited_at: now,
        }
      );

      if (poi.destination) {
        const destName = String(poi.destination).trim();
        const isMvpDestination = MVP_DESTINATIONS.has(destName);
        const kind = isMvpDestination ? 'mvp_destination' : 'city';
        const canonicalId = slugify(destName);
        const parentDestination =
          !isMvpDestination && CITY_TO_MVP_DESTINATION[destName]
            ? CITY_TO_MVP_DESTINATION[destName]
            : null;

        await session.run(
          `
          MATCH (p:poi {poi_uid: $poi_uid})
          MERGE (d:destination {name: $destination_name})
          SET
            d.kind = CASE WHEN d.kind IS NULL OR d.kind <> $kind THEN $kind ELSE d.kind END,
            d.canonical_id = CASE
              WHEN d.canonical_id IS NULL OR trim(toString(d.canonical_id)) = '' THEN $canonical_id
              WHEN toString(d.canonical_id) =~ '(?i)^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN $canonical_id
              ELSE d.canonical_id
            END,
            d.updated_at = datetime($now)
          MERGE (p)-[:LOCATED_IN]->(d)

          WITH d
          CALL {
            WITH d
            WITH d WHERE $parent_destination IS NOT NULL
            MERGE (mvp:destination {name: $parent_destination})
            SET
              mvp.kind = CASE WHEN mvp.kind IS NULL OR mvp.kind <> 'mvp_destination' THEN 'mvp_destination' ELSE mvp.kind END,
              mvp.canonical_id = CASE
                WHEN mvp.canonical_id IS NULL OR trim(toString(mvp.canonical_id)) = '' THEN $parent_canonical_id
                WHEN toString(mvp.canonical_id) =~ '(?i)^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN $parent_canonical_id
                ELSE mvp.canonical_id
              END,
              mvp.updated_at = datetime($now)
            MERGE (d)-[:IN_DESTINATION]->(mvp)
            RETURN 1 AS linked
          }
          `,
          {
            poi_uid,
            destination_name: destName,
            kind,
            canonical_id: canonicalId,
            parent_destination: parentDestination,
            parent_canonical_id: parentDestination ? slugify(parentDestination) : null,
            now,
          }
        );
      }

      const keywords = Array.isArray(poi.keywords) ? poi.keywords : [];
      const themes = Array.isArray(poi.themes) ? poi.themes : [];

      // Write theme relationships (explainable retrieval)
      if (themes.length) {
        await session.run(
          `
          MATCH (p:poi {poi_uid: $poi_uid})
          UNWIND $themes AS tName
          WITH p, trim(toString(tName)) AS themeName
          WHERE themeName <> ''
          MERGE (t:theme_category {name: themeName})
          MERGE (p)-[r:HAS_THEME]->(t)
          ON CREATE SET
            r.confidence = $confidence,
            r.evidence = 'captain_promote:themes',
            r.source_id = $source_id,
            r.inferred_by = 'captain',
            r.created_at = datetime($now)
          ON MATCH SET
            r.confidence = CASE WHEN $confidence > coalesce(r.confidence, 0) THEN $confidence ELSE r.confidence END,
            r.updated_at = datetime($now)
          `,
          { poi_uid, themes, confidence: relConfidence, source_id: poi.id, now }
        );
      }

      // Emotional map → relationships (EmotionalTag + optional Emotion codes)
      const emotionalMap = asJsonArray(poi.emotional_map);
      const tagSignals: Array<{
        name: string;
        slug: string;
        intensity: number | null;
        confidence: number | null;
        evidence: string | null;
      }> = [];
      const emotionSignals: Array<{
        code: string;
        name: string | null;
        intensity: number | null;
        confidence: number | null;
        evidence: string | null;
      }> = [];

      for (const s of emotionalMap) {
        if (!s || typeof s !== 'object') continue;
        const kindRaw = (s as any).kind;
        const kind = typeof kindRaw === 'string' ? kindRaw : null;

        // Backward-compat: older shape uses { emotion, intensity, evidence }
        if (!kind && typeof (s as any).emotion === 'string') {
          const n = normalizeDimensionName((s as any).emotion);
          tagSignals.push({
            name: n,
            slug: slugify(n),
            intensity:
              typeof (s as any).intensity === 'number' ? (s as any).intensity : null,
            confidence:
              typeof (s as any).confidence_0_1 === 'number'
                ? (s as any).confidence_0_1
                : typeof (s as any).confidence === 'number'
                  ? (s as any).confidence
                  : null,
            evidence: typeof (s as any).evidence === 'string' ? (s as any).evidence : null,
          });
          continue;
        }

        if (kind === 'EmotionalTag') {
          const nameRaw = (s as any).name;
          if (typeof nameRaw !== 'string' || !nameRaw.trim()) continue;
          const n = normalizeDimensionName(nameRaw);
          tagSignals.push({
            name: n,
            slug: slugify(n),
            intensity:
              typeof (s as any).intensity_1_10 === 'number'
                ? (s as any).intensity_1_10
                : typeof (s as any).intensity === 'number'
                  ? (s as any).intensity
                  : null,
            confidence:
              typeof (s as any).confidence_0_1 === 'number'
                ? (s as any).confidence_0_1
                : typeof (s as any).confidence === 'number'
                  ? (s as any).confidence
                  : null,
            evidence: typeof (s as any).evidence === 'string' ? (s as any).evidence : null,
          });
        } else if (kind === 'Emotion') {
          const code = typeof (s as any).code === 'string' ? (s as any).code.trim() : '';
          if (!code) continue; // important: avoid creating name-only Emotion duplicates
          emotionSignals.push({
            code,
            name: typeof (s as any).name === 'string' ? (s as any).name : null,
            intensity:
              typeof (s as any).intensity_1_10 === 'number'
                ? (s as any).intensity_1_10
                : typeof (s as any).intensity === 'number'
                  ? (s as any).intensity
                  : null,
            confidence:
              typeof (s as any).confidence_0_1 === 'number'
                ? (s as any).confidence_0_1
                : typeof (s as any).confidence === 'number'
                  ? (s as any).confidence
                  : null,
            evidence: typeof (s as any).evidence === 'string' ? (s as any).evidence : null,
          });
        }
      }

      if (tagSignals.length) {
        await session.run(
          `
          MATCH (p:poi {poi_uid: $poi_uid})
          UNWIND $tags AS tag
          MERGE (t:EmotionalTag {name: tag.name})
          SET t.slug = coalesce(t.slug, tag.slug)
          MERGE (p)-[r:EVOKES]->(t)
          ON CREATE SET
            r.confidence = coalesce(tag.confidence, $confidence),
            r.evidence = coalesce(tag.evidence, 'captain_promote:emotional_tag'),
            r.intensity_1_10 = tag.intensity,
            r.source_id = $source_id,
            r.inferred_by = 'captain',
            r.created_at = datetime($now)
          ON MATCH SET
            r.confidence = CASE
              WHEN coalesce(tag.confidence, $confidence) > coalesce(r.confidence, 0) THEN coalesce(tag.confidence, $confidence)
              ELSE r.confidence
            END,
            r.intensity_1_10 = coalesce(tag.intensity, r.intensity_1_10),
            r.updated_at = datetime($now)
          `,
          { poi_uid, tags: tagSignals, confidence: relConfidence, source_id: poi.id, now }
        );
      }

      if (emotionSignals.length) {
        await session.run(
          `
          MATCH (p:poi {poi_uid: $poi_uid})
          UNWIND $emotions AS em
          MERGE (e:Emotion {code: em.code})
          SET e.name = coalesce(e.name, em.name)
          MERGE (p)-[r:EVOKES_EMOTION]->(e)
          ON CREATE SET
            r.confidence = coalesce(em.confidence, $confidence),
            r.evidence = coalesce(em.evidence, 'captain_promote:emotion'),
            r.intensity_1_10 = em.intensity,
            r.source_id = $source_id,
            r.inferred_by = 'captain',
            r.created_at = datetime($now)
          ON MATCH SET
            r.confidence = CASE
              WHEN coalesce(em.confidence, $confidence) > coalesce(r.confidence, 0) THEN coalesce(em.confidence, $confidence)
              ELSE r.confidence
            END,
            r.intensity_1_10 = coalesce(em.intensity, r.intensity_1_10),
            r.updated_at = datetime($now)
          `,
          { poi_uid, emotions: emotionSignals, confidence: relConfidence, source_id: poi.id, now }
        );
      }

      // Occasions + activities from enrichment (if present)
      const enrichment = asJsonObject(poi.enrichment) || {};
      const occasionNames = asStringArray(enrichment.occasion_types || enrichment.occasionTypes);
      const activityNames = asStringArray(enrichment.activity_types || enrichment.activityTypes);

      if (occasionNames.length) {
        const occasions = occasionNames.map((name) => ({
          name: name.trim(),
          slug: slugify(name),
        }));
        await session.run(
          `
          MATCH (p:poi {poi_uid: $poi_uid})
          UNWIND $occasions AS oc
          MERGE (o:occasion_type {slug: oc.slug})
          SET o.name = coalesce(o.name, oc.name)
          MERGE (p)-[r:FITS_OCCASION]->(o)
          ON CREATE SET
            r.confidence = $confidence,
            r.evidence = 'captain_promote:occasion',
            r.source_id = $source_id,
            r.inferred_by = 'captain',
            r.created_at = datetime($now)
          ON MATCH SET
            r.confidence = CASE WHEN $confidence > coalesce(r.confidence, 0) THEN $confidence ELSE r.confidence END,
            r.updated_at = datetime($now)
          `,
          { poi_uid, occasions, confidence: relConfidence, source_id: poi.id, now }
        );
      }

      if (activityNames.length) {
        const activities = activityNames.map((name) => ({
          name: name.trim(),
        }));
        await session.run(
          `
          MATCH (p:poi {poi_uid: $poi_uid})
          UNWIND $activities AS ac
          MERGE (a:activity_type {name: ac.name})
          MERGE (p)-[r:SUPPORTS_ACTIVITY]->(a)
          ON CREATE SET
            r.confidence = $confidence,
            r.evidence = 'captain_promote:activity',
            r.source_id = $source_id,
            r.inferred_by = 'captain',
            r.created_at = datetime($now)
          ON MATCH SET
            r.confidence = CASE WHEN $confidence > coalesce(r.confidence, 0) THEN $confidence ELSE r.confidence END,
            r.updated_at = datetime($now)
          `,
          { poi_uid, activities, confidence: relConfidence, source_id: poi.id, now }
        );
      }

      // Client archetypes (if present)
      const clientArchetypes = asJsonArray(poi.client_archetypes);
      if (clientArchetypes.length) {
        const archetypes = clientArchetypes
          .map((a) => {
            if (!a || typeof a !== 'object') return null;
            const name =
              typeof (a as any).name === 'string'
                ? (a as any).name
                : typeof (a as any).archetype === 'string'
                  ? (a as any).archetype
                  : '';
            if (!name.trim()) return null;
            const matchScore =
              typeof (a as any).match_score_0_100 === 'number'
                ? (a as any).match_score_0_100
                : typeof (a as any).match_score === 'number'
                  ? (a as any).match_score
                  : null;
            return {
              name: name.trim(),
              match_score_0_100: matchScore,
              why: typeof (a as any).why === 'string' ? (a as any).why : null,
              confidence: typeof (a as any).confidence_0_1 === 'number' ? (a as any).confidence_0_1 : null,
            };
          })
          .filter(Boolean);

        if (archetypes.length) {
          await session.run(
            `
            MATCH (p:poi {poi_uid: $poi_uid})
            UNWIND $archetypes AS ar
            MERGE (c:ClientArchetype {name: ar.name})
            MERGE (p)-[r:IDEAL_FOR_ARCHETYPE]->(c)
            ON CREATE SET
              r.match_score_0_100 = ar.match_score_0_100,
              r.confidence = coalesce(ar.confidence, $confidence),
              r.evidence = coalesce(ar.why, 'captain_promote:archetype'),
              r.source_id = $source_id,
              r.inferred_by = 'captain',
              r.created_at = datetime($now)
            ON MATCH SET
              r.match_score_0_100 = coalesce(ar.match_score_0_100, r.match_score_0_100),
              r.confidence = CASE
                WHEN coalesce(ar.confidence, $confidence) > coalesce(r.confidence, 0) THEN coalesce(ar.confidence, $confidence)
                ELSE r.confidence
              END,
              r.updated_at = datetime($now)
            `,
            { poi_uid, archetypes, confidence: relConfidence, source_id: poi.id, now }
          );
        }
      }

      // Optional: store keywords/themes as arrays (easy search later)
      if (keywords.length || themes.length) {
        await session.run(
          `
          MATCH (p:poi {poi_uid: $poi_uid})
          SET p.keywords = $keywords, p.themes = $themes
          `,
          { poi_uid, keywords, themes }
        );
      }
    } finally {
      await session.close();
    }

    // Mark as promoted in Postgres (audit trail in metadata)
    const currentMeta =
      poi.metadata && typeof poi.metadata === 'object' ? poi.metadata : {};
    const nextMeta = {
      ...currentMeta,
      promoted_to_neo4j: true,
      neo4j_poi_uid: poi_uid,
      promoted_at: now,
      promoted_by: user.id,
      promoted_by_email: (user.email || '').toLowerCase(),
    };

    const { error: updateError } = await admin
      .from('extracted_pois')
      .update({
        promoted_to_main: true,
        metadata: nextMeta,
        updated_at: now,
      })
      .eq('id', id);

    if (updateError) {
      return NextResponse.json(
        { error: 'Promoted in Neo4j, but failed to update Postgres', details: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      poi_uid,
      message: 'POI promoted to official knowledge (Neo4j).',
    });
  } catch (error) {
    console.error('POI promote error:', error);
    return NextResponse.json(
      { error: 'Failed to promote POI', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

