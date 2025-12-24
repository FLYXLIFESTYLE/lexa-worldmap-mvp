import { supabaseAdmin } from '@/lib/supabase/client';
import { getSession } from '@/lib/neo4j/client';

export type CollectorQueueItemKind = 'destination' | 'region';

export type CollectorQueueItem = {
  name: string;
  kind: CollectorQueueItemKind;
  radius_km: number;
  status: 'pending' | 'running' | 'done' | 'failed' | 'skipped';
  error?: string;
  stats?: Record<string, { discovered: number; details_fetched: number; upserted: number }>;
};

export type CollectorProgress = {
  job_type: 'collector';
  state: 'running' | 'paused_manual' | 'paused_budget' | 'completed' | 'failed';
  reason?: string;
  started_at: string;
  updated_at: string;
  requests_used_total: number;
  current_index: number;
  queue: CollectorQueueItem[];
  batch: {
    batch_id: string;
    started_at: string;
    discovered_by_category: Record<string, number>;
    details_fetched_by_category: Record<string, number>;
    upserted_by_category: Record<string, number>;
  };
};

function _isoNow() {
  return new Date().toISOString();
}

export async function getJob(jobId: string) {
  const { data, error } = await supabaseAdmin
    .from('places_enrichment_jobs')
    .select('*')
    .eq('id', jobId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new Error('Job not found');
  return data as any;
}

export async function updateJob(jobId: string, update: { status?: string; progress?: any; params?: any; error?: string }) {
  const payload: any = { ...update, updated_at: _isoNow() };
  const { error } = await supabaseAdmin.from('places_enrichment_jobs').update(payload).eq('id', jobId);
  if (error) throw new Error(error.message);
}

export async function insertJob(row: any) {
  const { data, error } = await supabaseAdmin.from('places_enrichment_jobs').insert(row).select('*').single();
  if (error) throw new Error(error.message);
  return data as any;
}

export async function fetchYachtDestinations(): Promise<string[]> {
  const session = getSession();
  try {
    const result = await session.run(`
      MATCH (d:destination)
      WHERE d.yacht_port = true OR d.yacht_destination = true OR d.luxury_destination = true
      RETURN DISTINCT d.name as name
      ORDER BY name
    `);
    return result.records.map(r => r.get('name'));
  } finally {
    await session.close();
  }
}

export async function fetchFallbackRegions(preferredNames: string[]): Promise<string[]> {
  const session = getSession();
  try {
    const result = await session.run(
      `
      MATCH (r:region)
      WHERE r.name IN $names
      RETURN DISTINCT r.name as name
      ORDER BY name
      `,
      { names: preferredNames }
    );
    return result.records.map(r => r.get('name'));
  } finally {
    await session.close();
  }
}

export function newProgress(queue: CollectorQueueItem[], batchId: string): CollectorProgress {
  const now = _isoNow();
  return {
    job_type: 'collector',
    state: 'running',
    started_at: now,
    updated_at: now,
    requests_used_total: 0,
    current_index: 0,
    queue,
    batch: {
      batch_id: batchId,
      started_at: now,
      discovered_by_category: {},
      details_fetched_by_category: {},
      upserted_by_category: {},
    },
  };
}

export function bumpProgressCounters(
  progress: CollectorProgress,
  category: string,
  delta: { discovered?: number; details_fetched?: number; upserted?: number }
) {
  const { discovered_by_category, details_fetched_by_category, upserted_by_category } = progress.batch;
  if (delta.discovered) discovered_by_category[category] = (discovered_by_category[category] || 0) + delta.discovered;
  if (delta.details_fetched) details_fetched_by_category[category] = (details_fetched_by_category[category] || 0) + delta.details_fetched;
  if (delta.upserted) upserted_by_category[category] = (upserted_by_category[category] || 0) + delta.upserted;
}

export function markPausedBudget(progress: CollectorProgress, reason: string) {
  progress.state = 'paused_budget';
  progress.reason = reason;
  progress.updated_at = _isoNow();
}

export function markFailed(progress: CollectorProgress, reason: string) {
  progress.state = 'failed';
  progress.reason = reason;
  progress.updated_at = _isoNow();
}

export function markCompleted(progress: CollectorProgress) {
  progress.state = 'completed';
  progress.updated_at = _isoNow();
}


