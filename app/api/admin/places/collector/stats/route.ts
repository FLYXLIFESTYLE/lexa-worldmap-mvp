import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/neo4j/client';
import { getJob, type CollectorProgress } from '../_shared';

export const runtime = 'nodejs';

async function totalByCategory(categories: string[]) {
  const session = getSession();
  try {
    const out: Record<string, { total: number; enriched: number }> = {};
    for (const cat of categories) {
      const res = await session.run(
        `
        MATCH (p:poi)
        WHERE p.source = 'google_places'
          AND $cat IN coalesce(p.lexa_categories, [])
        RETURN
          count(p) as total,
          sum(CASE WHEN p.enriched_source IS NOT NULL THEN 1 ELSE 0 END) as enriched
        `,
        { cat }
      );
      const r = res.records[0];
      out[cat] = {
        total: r?.get('total')?.toNumber?.() ?? 0,
        enriched: r?.get('enriched')?.toNumber?.() ?? 0,
      };
    }
    return out;
  } finally {
    await session.close();
  }
}

export async function GET(req: NextRequest) {
  const jobId = new URL(req.url).searchParams.get('job_id');
  if (!jobId) return NextResponse.json({ error: 'Missing job_id' }, { status: 400 });

  try {
    const job = await getJob(jobId);
    const progress = (job.progress || {}) as CollectorProgress;
    const categories: string[] = Array.isArray(job?.params?.categories) ? job.params.categories : [];

    const totals = await totalByCategory(categories);

    return NextResponse.json({
      ok: true,
      job_id: jobId,
      state: progress.state,
      batch: progress.batch,
      totals_by_category: totals,
    });
  } catch (e: any) {
    return NextResponse.json({ error: 'Failed to compute stats', details: e?.message || String(e) }, { status: 500 });
  }
}


