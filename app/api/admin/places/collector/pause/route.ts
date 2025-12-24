import { NextRequest, NextResponse } from 'next/server';
import { getJob, updateJob, type CollectorProgress } from '../_shared';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as { job_id?: string; reason?: string } | null;
  if (!body?.job_id) return NextResponse.json({ error: 'Missing job_id' }, { status: 400 });

  try {
    const job = await getJob(body.job_id);
    const progress = (job.progress || {}) as CollectorProgress;
    if (progress?.job_type !== 'collector') return NextResponse.json({ error: 'Not a collector job' }, { status: 400 });

    progress.state = 'paused_manual';
    progress.reason = body.reason || 'Paused by user';
    progress.updated_at = new Date().toISOString();

    await updateJob(body.job_id, { progress });
    return NextResponse.json({ ok: true, job_id: body.job_id, progress });
  } catch (e: any) {
    return NextResponse.json({ error: 'Failed to pause job', details: e?.message || String(e) }, { status: 500 });
  }
}


