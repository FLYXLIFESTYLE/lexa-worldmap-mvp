/**
 * API Route: Add/Remove POI Relationships
 *
 * Allows captains to edit POI relationships (destinations/themes/activities/emotions)
 * without having to run ingestion scripts.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getNeo4jDriver } from '@/lib/neo4j/client';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

type RelationKind = 'destination' | 'theme' | 'activity' | 'emotion';
type ActionKind = 'add' | 'remove';

interface Body {
  action: ActionKind;
  kind: RelationKind;
  value: string;
}

function mapKind(kind: RelationKind): { rel: string; label: string } {
  switch (kind) {
    case 'destination':
      return { rel: 'located_in', label: 'destination' };
    case 'theme':
      return { rel: 'has_theme', label: 'theme' };
    case 'activity':
      return { rel: 'supports_activity', label: 'activity_type' };
    case 'emotion':
      return { rel: 'evokes', label: 'Emotion' };
    default:
      return { rel: 'related_to', label: 'Entity' };
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Auth
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body: Body = await req.json();

    if (!body?.action || !body?.kind || !body?.value?.trim()) {
      return NextResponse.json({ error: 'Missing action/kind/value' }, { status: 400 });
    }

    const { rel, label } = mapKind(body.kind);
    const value = body.value.trim();

    const driver = getNeo4jDriver();
    const session = driver.session();

    try {
      if (body.action === 'add') {
        await session.run(
          `
          MATCH (p:poi {poi_uid: $id})
          MERGE (t:${label} {name: $value})
          MERGE (p)-[:${rel}]->(t)
          RETURN p
          `,
          { id, value }
        );
      } else {
        await session.run(
          `
          MATCH (p:poi {poi_uid: $id})-[r:${rel}]->(t:${label} {name: $value})
          DELETE r
          RETURN p
          `,
          { id, value }
        );
      }

      return NextResponse.json({ success: true });
    } finally {
      await session.close();
    }
  } catch (error) {
    console.error('POI relations update error:', error);
    return NextResponse.json(
      { error: 'Failed to update POI relationships', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}


