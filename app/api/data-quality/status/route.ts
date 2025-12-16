/**
 * API Route: Get Data Quality Agent Status
 * GET /api/data-quality/status
 * Returns the current status and last run results
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isAgentRunning, getLastRunResults } from '@/lib/neo4j/data-quality-agent';

export async function GET(request: Request) {
  try {
    // Check authentication
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const status = {
      isRunning: isAgentRunning(),
      lastRun: getLastRunResults(),
    };

    return NextResponse.json(status);

  } catch (error) {
    console.error('[API] Error getting data quality status:', error);
    return NextResponse.json(
      {
        error: 'Failed to get status',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

