/**
 * API Route: Create New POI Manually
 * 
 * Allows Captains to add POIs that are missing from the database
 * (e.g., Club 55, exclusive venues, hidden gems)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getNeo4jDriver } from '@/lib/neo4j/client';
import { createClient } from '@/lib/supabase/server';
import { v4 as uuidv4 } from 'uuid';

export const runtime = 'nodejs';

interface CreatePOIRequest {
  name: string;
  type: string;
  destination_name: string;
  lat: number;
  lon: number;
  website_url?: string;
  address?: string;
  location_scope?: 'city' | 'country' | 'region' | 'area';
  coordinate_mode?: 'land' | 'sea';
  photo_urls?: string[];
  attachment_urls?: string[];
  extra_text?: string;
  // Canonical
  luxury_score_base?: number;
  luxury_score_verified?: number;
  confidence_score?: number;
  score_evidence?: string; // JSON string

  // Legacy (accepted but mapped)
  luxury_score?: number;
  luxury_confidence?: number;
  luxury_evidence?: string;
  captain_comments?: string;
  description?: string;
  themes?: string[];
  activities?: string[];
}

export async function POST(req: NextRequest) {
  try {
    // Authentication
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get captain profile
    const { data: profile } = await supabase
      .from('captain_profiles')
      .select('full_name, email')
      .eq('user_id', user.id)
      .single();

    const poiData: CreatePOIRequest = await req.json();

    // Validation
    if (!poiData.name || !poiData.type || !poiData.destination_name) {
      return NextResponse.json({
        error: 'Missing required fields',
        message: 'name, type, and destination_name are required'
      }, { status: 400 });
    }

    const lat = Number(poiData.lat);
    const lon = Number(poiData.lon);

    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      return NextResponse.json({
        error: 'Invalid coordinates',
        message: 'lat and lon must be valid numbers'
      }, { status: 400 });
    }

    if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      return NextResponse.json({
        error: 'Coordinates out of range',
        message: 'lat must be between -90 and 90, lon between -180 and 180'
      }, { status: 400 });
    }

    // Generate unique POI ID
    const poi_uid = `manual:${uuidv4()}`;
    const now = new Date().toISOString();

    const luxuryScoreBase =
      poiData.luxury_score_base ?? poiData.luxury_score ?? null;
    const confidenceScore =
      poiData.confidence_score ?? poiData.luxury_confidence ?? null;
    const scoreEvidence =
      poiData.score_evidence ?? (poiData.luxury_evidence ? JSON.stringify({ legacy_text: poiData.luxury_evidence }) : null);
    const luxuryScoreVerified =
      poiData.luxury_score_verified ?? (confidenceScore !== null && confidenceScore >= 0.99 ? luxuryScoreBase : null);

    const driver = getNeo4jDriver();
    const session = driver.session();

    try {
      // Create POI node
      await session.run(
        `
        CREATE (p:poi {
          poi_uid: $poi_uid,
          name: $name,
          type: $type,
          destination_name: $destination_name,
          lat: $lat,
          lon: $lon,
          website_url: $website_url,
          address: $address,
          location_scope: $location_scope,
          coordinate_mode: $coordinate_mode,
          photo_urls: $photo_urls,
          attachment_urls: $attachment_urls,
          extra_text: $extra_text,
          luxury_score_base: $luxury_score_base,
          luxury_score_verified: $luxury_score_verified,
          confidence_score: $confidence_score,
          score_evidence: $score_evidence,
          captain_comments: $captain_comments,
          description: $description,
          source: 'manual',
          source_id: $poi_uid,
          created_at: $created_at,
          created_by: $created_by,
          updated_at: $updated_at,
          last_edited_by: $last_edited_by,
          last_edited_at: $last_edited_at
        })
        RETURN p
        `,
        {
          poi_uid,
          name: poiData.name,
          type: poiData.type,
          destination_name: poiData.destination_name,
          lat: poiData.lat,
          lon: poiData.lon,
          website_url: poiData.website_url || null,
          address: poiData.address || null,
          location_scope: poiData.location_scope || null,
          coordinate_mode: poiData.coordinate_mode || null,
          photo_urls: poiData.photo_urls || [],
          attachment_urls: poiData.attachment_urls || [],
          extra_text: poiData.extra_text || null,
          luxury_score_base: luxuryScoreBase,
          luxury_score_verified: luxuryScoreVerified,
          confidence_score: confidenceScore,
          score_evidence: scoreEvidence,
          captain_comments: poiData.captain_comments || null,
          description: poiData.description || null,
          created_at: now,
          created_by: profile?.full_name || user.email,
          updated_at: now,
          last_edited_by: profile?.full_name || user.email,
          last_edited_at: now,
        }
      );

      // Create relationship to destination (create destination if doesn't exist)
      await session.run(
        `
        MATCH (p:poi {poi_uid: $poi_uid})
        MERGE (d:destination {name: $destination_name})
        MERGE (p)-[:located_in]->(d)
        `,
        {
          poi_uid,
          destination_name: poiData.destination_name,
        }
      );

      // Create theme relationships if provided
      if (poiData.themes && poiData.themes.length > 0) {
        for (const themeName of poiData.themes) {
          await session.run(
            `
            MATCH (p:poi {poi_uid: $poi_uid})
            MERGE (t:theme {name: $themeName})
            MERGE (p)-[:has_theme]->(t)
            `,
            { poi_uid, themeName }
          );
        }
      }

      // Create activity relationships if provided
      if (poiData.activities && poiData.activities.length > 0) {
        for (const activityName of poiData.activities) {
          await session.run(
            `
            MATCH (p:poi {poi_uid: $poi_uid})
            MERGE (a:activity_type {name: $activityName})
            MERGE (p)-[:supports_activity]->(a)
            `,
            { poi_uid, activityName }
          );
        }
      }

      return NextResponse.json({
        success: true,
        message: 'POI created successfully',
        poi: {
          poi_uid,
          name: poiData.name,
          destination_name: poiData.destination_name,
        },
      });

    } finally {
      await session.close();
    }

  } catch (error) {
    console.error('POI creation error:', error);
    return NextResponse.json(
      {
        error: 'Failed to create POI',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

