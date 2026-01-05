import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { getNeo4jDriver } from '@/lib/neo4j/client';

export const runtime = 'nodejs';

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

    if (!poi.verified) {
      return NextResponse.json(
        { error: 'POI must be verified before promotion' },
        { status: 400 }
      );
    }

    // Create/Upsert into Neo4j as canonical POI
    const poi_uid = `extracted:${poi.id}`;
    const now = new Date().toISOString();
    const contributorName =
      (profile?.display_name || profile?.full_name || user.email || '').toString();

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
        await session.run(
          `
          MATCH (p:poi {poi_uid: $poi_uid})
          MERGE (d:destination {name: $destination_name})
          MERGE (p)-[:located_in]->(d)
          `,
          { poi_uid, destination_name: poi.destination }
        );
      }

      // Optional: store keywords/themes as arrays (easy search later)
      const keywords = Array.isArray(poi.keywords) ? poi.keywords : [];
      const themes = Array.isArray(poi.themes) ? poi.themes : [];
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

