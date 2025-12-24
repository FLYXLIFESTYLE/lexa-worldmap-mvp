import { NextRequest, NextResponse } from 'next/server';
import { getJob, updateJob, type CollectorProgress } from '../_shared';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as { job_id?: string } | null;
  if (!body?.job_id) return NextResponse.json({ error: 'Missing job_id' }, { status: 400 });

  try {
    const job = await getJob(body.job_id);
    const progress = (job.progress || {}) as CollectorProgress;
    if (progress?.job_type !== 'collector') return NextResponse.json({ error: 'Not a collector job' }, { status: 400 });

    progress.state = 'running';
    progress.reason = undefined;
    progress.updated_at = new Date().toISOString();

    // Clear any previous error (Supabase column can be NULL, but our TS helper uses string | undefined)
    await updateJob(body.job_id, { progress, status: 'running', error: undefined });
    return NextResponse.json({ ok: true, job_id: body.job_id, progress });
  } catch (e: any) {
    return NextResponse.json({ error: 'Failed to resume job', details: e?.message || String(e) }, { status: 500 });
  }
}


