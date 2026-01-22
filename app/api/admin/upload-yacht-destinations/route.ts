/**
 * API Route: Upload Yacht Destinations
 * POST /api/admin/upload-yacht-destinations
 */

import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/client';

export const runtime = 'nodejs';

interface Destination {
  name: string;
  type: 'city' | 'country' | 'route';
  ports?: string[];
  exists?: boolean;
}

interface MediaItem {
  url: string;
  description?: string;
  kind?: 'yacht' | 'route' | 'destination' | 'other';
  filename?: string;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('captain_profiles')
      .select('role')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!profile || !['admin', 'captain'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const {
      destinations,
      source_mode,
      media,
      ocr_text,
    } = body as {
      destinations: Destination[];
      source_mode?: 'text' | 'screenshot';
      media?: MediaItem[];
      ocr_text?: string;
    };

    if (!destinations || !Array.isArray(destinations) || destinations.length === 0) {
      return NextResponse.json(
        { error: 'No destinations provided' },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();
    const batchId = randomUUID();
    const mediaList = Array.isArray(media) ? media.filter((m) => !!m?.url) : [];
    const normalizedSourceMode = source_mode === 'screenshot' ? 'screenshot' : 'text';

    const cleaned = destinations
      .map((dest) => ({
        ...dest,
        name: String(dest.name || '').trim(),
      }))
      .filter((dest) => dest.name.length > 0);

    if (!cleaned.length) {
      return NextResponse.json({ error: 'No valid destinations provided' }, { status: 400 });
    }

    const records = cleaned.map((dest) => {
      const category =
        dest.type === 'route' ? 'yacht_route' : dest.type === 'country' ? 'yacht_country' : 'yacht_city';
      const yachtMeta = {
        type: dest.type,
        ports: dest.type === 'route' ? (dest.ports || []).filter(Boolean) : [],
      };
      const description =
        dest.type === 'route' && dest.ports?.length
          ? `Route ports: ${dest.ports.join(', ')}`
          : null;

      return {
        id: randomUUID(),
        created_by: user.id,
        name: dest.name,
        destination: dest.name,
        category,
        description,
        address: null,
        latitude: null,
        longitude: null,
        confidence_score: 80,
        luxury_score: null,
        source_file: 'yacht_destination',
        source_refs: [
          {
            source_type: 'yacht_destination',
            source_id: batchId,
            source_url: null,
            captured_at: now,
            external_ids: {},
            license: null,
          },
        ],
        metadata: {
          source_kind: 'yacht_destination',
          batch_id: batchId,
          source_mode: normalizedSourceMode,
          ocr_text: ocr_text || null,
          yacht: yachtMeta,
          media: mediaList,
        },
        verified: false,
        enhanced: false,
        promoted_to_main: false,
        created_at: now,
        updated_at: now,
      };
    });

    const { data, error } = await supabaseAdmin
      .from('extracted_pois')
      .insert(records)
      .select('id');

    if (error) {
      return NextResponse.json(
        { error: 'Failed to store destinations', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Created ${records.length} yacht destination drafts`,
      summary: {
        total: records.length,
        created: data?.length || 0,
        batch_id: batchId,
      },
      ids: (data || []).map((row: any) => row.id),
    });

  } catch (error: any) {
    console.error('Error uploading yacht destinations:', error);
    return NextResponse.json(
      { 
        error: 'Failed to upload yacht destinations',
        details: error.message 
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('captain_profiles')
      .select('role')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!profile || !['admin', 'captain'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const url = new URL(request.url);
    const limit = Math.min(Number(url.searchParams.get('limit') || '200'), 500);

    const { data, error } = await supabaseAdmin
      .from('extracted_pois')
      .select('*')
      .filter('metadata->>source_kind', 'eq', 'yacht_destination')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch yacht destinations', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      destinations: data || [],
      total_destinations: data?.length || 0,
    });
  } catch (error: any) {
    console.error('Error fetching yacht destinations:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch yacht destinations',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

