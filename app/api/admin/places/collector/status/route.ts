import { NextRequest, NextResponse } from 'next/server';
import { getJob } from '../_shared';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const jobId = new URL(req.url).searchParams.get('job_id');
  if (!jobId) return NextResponse.json({ error: 'Missing job_id' }, { status: 400 });

  try {
    const job = await getJob(jobId);
    return NextResponse.json({
      ok: true,
      job: {
        id: job.id,
        status: job.status,
        params: job.params,
        progress: job.progress,
        error: job.error,
        created_at: job.created_at,
        updated_at: job.updated_at,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: 'Failed to load job', details: e?.message || String(e) }, { status: 500 });
  }
}


