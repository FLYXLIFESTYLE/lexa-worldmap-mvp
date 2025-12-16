/**
 * API Route: Run Data Quality Check
 * POST /api/data-quality/run
 * Manually triggers a data quality check
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { runFullCheck, isAgentRunning } from '@/lib/neo4j/data-quality-agent';

export async function POST(request: Request) {
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

    // Check if agent is already running
    if (isAgentRunning()) {
      return NextResponse.json(
        { error: 'Data quality check is already running' },
        { status: 409 }
      );
    }

    // Run the quality check
    console.log(`[API] Data quality check triggered by user: ${user.email}`);
    const results = await runFullCheck();

    return NextResponse.json({
      success: true,
      results,
      message: 'Data quality check completed successfully',
    });

  } catch (error) {
    console.error('[API] Error running data quality check:', error);
    return NextResponse.json(
      {
        error: 'Failed to run data quality check',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

