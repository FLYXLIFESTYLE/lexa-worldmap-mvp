/**
 * API Route: Get and Update POI Details
 * 
 * GET: Fetch full POI details including relationships
 * PATCH: Update POI properties (luxury score, confidence, comments, etc.)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getNeo4jDriver } from '@/lib/neo4j/client';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

interface POIDetail {
  poi_uid: string;
  name: string;
  type: string | null;
  destination_name: string | null;
  lat: number;
  lon: number;
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
        
        OPTIONAL MATCH (p)-[:located_in]->(d:destination)
        OPTIONAL MATCH (p)-[:has_theme]->(t:theme)
        OPTIONAL MATCH (p)-[:supports_activity]->(a:activity_type)
        OPTIONAL MATCH (p)-[:evokes]->(e:Emotion)
        
        RETURN p,
               collect(DISTINCT d.name) as destinations,
               collect(DISTINCT t.name) as themes,
               collect(DISTINCT a.name) as activities,
               collect(DISTINCT e.name) as emotions
        `,
        { id }
      );

      if (result.records.length === 0) {
        return NextResponse.json({ error: 'POI not found' }, { status: 404 });
      }

      const record = result.records[0];
      const poi = record.get('p').properties;

      const poiDetail: POIDetail = {
        poi_uid: poi.poi_uid,
        name: poi.name,
        type: poi.type || null,
        destination_name: poi.destination_name || null,
        lat: poi.lat,
        lon: poi.lon,
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
          emotions: record.get('emotions').filter((e: string) => e),
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
      'luxury_score',
      'luxury_confidence',
      'luxury_evidence',
      'captain_comments',
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

    // One-click verification: if verified=true, force confidence to 1.0 and stamp verifier.
    if (updates.verified === true) {
      updateFields.verified = true;
      updateFields.luxury_confidence = 1.0;
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

