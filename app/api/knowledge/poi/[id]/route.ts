/**
 * API Route: Get and Update POI Details
 * 
 * GET: Fetch full POI details including relationships
 * PATCH: Update POI properties (luxury score, confidence, comments, etc.)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getNeo4jDriver } from '@/lib/neo4j/client';
import { createClient } from '@/lib/supabase/server';
import {
  CITY_TO_MVP_DESTINATION,
  destinationKindForName,
  resolveCanonicalDestination,
  slugifyDestination,
} from '@/lib/neo4j/destination-resolver';

export const runtime = 'nodejs';

interface POIDetail {
  poi_uid: string;
  name: string;
  type: string | null;
  destination_name: string | null;
  lat: number;
  lon: number;
  website_url?: string | null;
  address?: string | null;
  location_scope?: string | null;
  coordinate_mode?: string | null;
  photo_urls?: string[];
  attachment_urls?: string[];
  extra_text?: string | null;
  description?: string | null;
  // Canonical scoring fields (preferred)
  luxury_score_base: number | null;
  luxury_score_verified: number | null;
  confidence_score: number | null;
  score_evidence: string | null; // JSON string

  // Legacy fields (deprecated; kept for backward compatibility)
  luxury_score: number | null;
  luxury_confidence: number | null;
  luxury_evidence: string | null;
  source: string;
  source_id: string;
  updated_at: string | null;
  scored_at: string | null;
  captain_comments: string | null;
  last_edited_by: string | null;
  last_edited_at: string | null;
  relationships: {
    destinations: string[];
    themes: string[];
    activities: string[];
    emotions: string[];
  };
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const driver = getNeo4jDriver();
    const session = driver.session();

    try {
      // Get POI details with relationships
      const result = await session.run(
        `
        MATCH (p:poi {poi_uid: $id})
        
        OPTIONAL MATCH (p)-[:LOCATED_IN]->(d:destination)
        OPTIONAL MATCH (d)-[:IN_DESTINATION]->(mvp:destination {kind: 'mvp_destination'})
        OPTIONAL MATCH (p)-[:HAS_THEME]->(t:theme_category)
        OPTIONAL MATCH (p)-[:SUPPORTS_ACTIVITY]->(a:activity_type)
        OPTIONAL MATCH (p)-[:EVOKES]->(et:EmotionalTag)
        OPTIONAL MATCH (p)-[:EVOKES_EMOTION]->(e:Emotion)
        
        RETURN p,
               collect(DISTINCT coalesce(mvp.name, d.name)) as destinations,
               collect(DISTINCT t.name) as themes,
               collect(DISTINCT a.name) as activities,
               collect(DISTINCT et.name) as emotional_tags,
               collect(DISTINCT e.code) as emotions
        `,
        { id }
      );

      if (result.records.length === 0) {
        return NextResponse.json({ error: 'POI not found' }, { status: 404 });
      }

      const record = result.records[0];
      const poi = record.get('p').properties;

      const luxuryScoreBase =
        (poi.luxury_score_base ?? poi.luxury_score ?? poi.luxuryScore ?? null) as number | null;
      const confidenceScore =
        (poi.confidence_score ?? poi.luxury_confidence ?? null) as number | null;
      const luxuryScoreVerified =
        (poi.luxury_score_verified ?? (confidenceScore !== null && confidenceScore >= 0.99 ? luxuryScoreBase : null) ?? null) as
          | number
          | null;
      const scoreEvidence =
        (poi.score_evidence ?? (poi.luxury_evidence ? JSON.stringify({ legacy_text: poi.luxury_evidence }) : null) ?? null) as
          | string
          | null;

      const poiDetail: POIDetail = {
        poi_uid: poi.poi_uid,
        name: poi.name,
        type: poi.type || null,
        destination_name: poi.destination_name || null,
        lat: poi.lat,
        lon: poi.lon,
        website_url: poi.website_url || null,
        address: poi.address || null,
        location_scope: poi.location_scope || null,
        coordinate_mode: poi.coordinate_mode || null,
        photo_urls: (poi.photo_urls || []) as string[],
        attachment_urls: (poi.attachment_urls || []) as string[],
        extra_text: poi.extra_text || null,
        description: poi.description || null,
        luxury_score_base: luxuryScoreBase,
        luxury_score_verified: luxuryScoreVerified,
        confidence_score: confidenceScore,
        score_evidence: scoreEvidence,
        luxury_score: poi.luxury_score || null,
        luxury_confidence: poi.luxury_confidence || null,
        luxury_evidence: poi.luxury_evidence || null,
        source: poi.source,
        source_id: poi.source_id,
        updated_at: poi.updated_at || null,
        scored_at: poi.scored_at || null,
        captain_comments: poi.captain_comments || null,
        last_edited_by: poi.last_edited_by || null,
        last_edited_at: poi.last_edited_at || null,
        relationships: {
          destinations: record.get('destinations').filter((d: string) => d),
          themes: record.get('themes').filter((t: string) => t),
          activities: record.get('activities').filter((a: string) => a),
          emotions: [
            ...record.get('emotional_tags').filter((x: string) => x),
            ...record.get('emotions').filter((x: string) => x),
          ],
        },
      };

      return NextResponse.json({ poi: poiDetail });

    } finally {
      await session.close();
    }

  } catch (error) {
    console.error('POI detail fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch POI details', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get captain profile for attribution
    const { data: profile } = await supabase
      .from('captain_profiles')
      .select('full_name, email')
      .eq('user_id', user.id)
      .single();

    const { id } = await params;
    const updates = (await req.json()) as Record<string, unknown>;

    // Validate updates
    const allowedFields = [
      // Canonical fields
      'luxury_score_base',
      'luxury_score_verified',
      'confidence_score',
      'score_evidence',

      // Legacy fields (accepted but mapped)
      'luxury_score',
      'luxury_confidence',
      'luxury_evidence',
      'luxuryScore',

      // Other editable fields
      'captain_comments',
      'description',
      'destination_name',
      'lat',
      'lon',
      'website_url',
      'address',
      'location_scope',
      'coordinate_mode',
      'photo_urls',
      'attachment_urls',
      'extra_text',
      'type',
      'name',
      'verified',
      'verified_by',
      'verified_at',
    ];

    const updateFields: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        updateFields[field] = updates[field];
      }
    }

    // Map legacy field names to canonical
    if (updateFields.luxury_score_base === undefined) {
      if (updateFields.luxury_score !== undefined) updateFields.luxury_score_base = updateFields.luxury_score;
      if (updateFields.luxuryScore !== undefined) updateFields.luxury_score_base = updateFields.luxuryScore;
    }
    if (updateFields.confidence_score === undefined && updateFields.luxury_confidence !== undefined) {
      updateFields.confidence_score = updateFields.luxury_confidence;
    }
    if (updateFields.score_evidence === undefined && updateFields.luxury_evidence !== undefined) {
      // Store as JSON string (Neo4j property types are primitives/arrays only)
      const le = updateFields.luxury_evidence;
      updateFields.score_evidence = le ? JSON.stringify({ legacy_text: le }) : null;
    }

    // Stop writing legacy fields going forward (canonical fields only).
    delete updateFields.luxury_score;
    delete updateFields.luxury_confidence;
    delete updateFields.luxury_evidence;
    delete updateFields.luxuryScore;

    // One-click verification: if verified=true, force confidence to 1.0 and stamp verifier.
    if (updates.verified === true) {
      updateFields.verified = true;
      updateFields.confidence_score = 1.0;
      updateFields.verified_by = profile?.full_name || user.email;
      updateFields.verified_at = new Date().toISOString();
    }

    if (Object.keys(updateFields).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    // Add metadata
    updateFields.last_edited_by = profile?.full_name || user.email;
    updateFields.last_edited_at = new Date().toISOString();
    updateFields.updated_at = new Date().toISOString();

    const driver = getNeo4jDriver();
    const session = driver.session();

    try {
      // Build SET clause dynamically
      const setClause = Object.keys(updateFields)
        .map(key => `p.${key} = $${key}`)
        .join(', ');

      const result = await session.run(
        `
        MATCH (p:poi {poi_uid: $id})
        SET ${setClause}
        RETURN p
        `,
        { id, ...updateFields }
      );

      if (result.records.length === 0) {
        return NextResponse.json({ error: 'POI not found' }, { status: 404 });
      }

      const updatedPoi = result.records[0].get('p').properties;

      // If destination_name was updated, keep located_in relationship consistent (best effort)
      if (updateFields.destination_name) {
        const destName = String(updateFields.destination_name);
        const kind = destinationKindForName(destName);
        const canonicalId = slugifyDestination(destName);
        const parentDestination = CITY_TO_MVP_DESTINATION[destName] ?? null;
        const resolved = resolveCanonicalDestination(destName);
        try {
          await session.run(
            `
            MATCH (p:poi {poi_uid: $id})
            OPTIONAL MATCH (p)-[r:LOCATED_IN]->(:destination)
            DELETE r
            WITH p
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
              id,
              destination_name: destName,
              kind,
              canonical_id: canonicalId,
              parent_destination: parentDestination,
              parent_canonical_id: parentDestination ? slugifyDestination(parentDestination) : null,
              canonical_destination: resolved.canonical || null,
              now: new Date().toISOString(),
            }
          );
        } catch {
          // ignore
        }
      }

      // If verified=true, set luxury_score_verified to the current base score in a second step.
      // (Keeps the dynamic SET clause simple and works even if the request didn't include base score explicitly.)
      if (updates.verified === true) {
        await session.run(
          `
          MATCH (p:poi {poi_uid: $id})
          SET p.luxury_score_verified = coalesce(p.luxury_score_verified, p.luxury_score_base, p.luxury_score, p.luxuryScore)
          RETURN p
          `,
          { id }
        );
      }

      return NextResponse.json({
        success: true,
        poi: updatedPoi,
        message: 'POI updated successfully',
      });

    } finally {
      await session.close();
    }

  } catch (error) {
    console.error('POI update error:', error);
    return NextResponse.json(
      { error: 'Failed to update POI', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

