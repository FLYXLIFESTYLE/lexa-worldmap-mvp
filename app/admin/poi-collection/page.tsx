'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import AdminNav from '@/components/admin/admin-nav';
import LuxuryBackground from '@/components/luxury-background';

type CollectorBatch = {
  batch_id: string;
  started_at: string;
  discovered_by_category: Record<string, number>;
  details_fetched_by_category: Record<string, number>;
  upserted_by_category: Record<string, number>;
};

type CollectorQueueItem = {
  name: string;
  kind: 'destination' | 'region';
  radius_km: number;
  status: string;
};

type CollectorProgress = {
  job_type: 'collector';
  state: string;
  reason?: string;
  started_at: string;
  updated_at: string;
  requests_used_total: number;
  current_index: number;
  queue: CollectorQueueItem[];
  batch: CollectorBatch;
};

type CollectorJob = {
  id: string;
  status: string;
  params: {
    categories?: string[];
    max_places_per_destination?: number;
  };
  progress: CollectorProgress;
  error?: string | null;
  created_at?: string;
  updated_at?: string;
};

type CollectorStatsResponse = {
  ok: true;
  job_id: string;
  state: string;
  batch: CollectorBatch;
  totals_by_category: Record<string, { total: number; enriched: number }>;
};

const ALL_CATEGORIES = [
  'wellness',
  'dining',
  'nightlife',
  'culture',
  'shopping',
  'beach',
  'experiences',
];

export default function PoiCollectionPage() {
  const [jobId, setJobId] = useState<string>('');
  const [job, setJob] = useState<CollectorJob | null>(null);
  const [stats, setStats] = useState<CollectorStatsResponse | null>(null);

  const [selectedCategories, setSelectedCategories] = useState<string[]>(['wellness', 'dining', 'nightlife']);
  const [maxRequestsPerTick, setMaxRequestsPerTick] = useState<number>(80);
  const [maxQueueItemsPerTick, setMaxQueueItemsPerTick] = useState<number>(1);
  const [maxPlacesPerDestination, setMaxPlacesPerDestination] = useState<number>(200);
  const [radiusKmCity, setRadiusKmCity] = useState<number>(25);
  const [radiusKmRegion, setRadiusKmRegion] = useState<number>(25);

  const [autoRun, setAutoRun] = useState<boolean>(true);
  const [pollMs, setPollMs] = useState<number>(2500);
  const runningRef = useRef(false);

  function errMsg(e: unknown) {
    return e instanceof Error ? e.message : String(e);
  }

  const state = job?.progress?.state as string | undefined;
  const queue = (job?.progress?.queue || []) as CollectorQueueItem[];
  const currentIndex = (job?.progress?.current_index || 0) as number;
  const currentItem = queue[currentIndex] || null;
  const currentDestinationLabel = currentItem ? `${currentItem.name} (${currentItem.kind}, ${currentItem.radius_km}km)` : '—';

  const batch: CollectorBatch | null = stats?.batch || job?.progress?.batch || null;
  const batchRows = useMemo(() => {
    const cats = ALL_CATEGORIES.filter(c => selectedCategories.includes(c));
    const out = cats.map(cat => ({
      category: cat,
      discovered: batch?.discovered_by_category?.[cat] || 0,
      details: batch?.details_fetched_by_category?.[cat] || 0,
      upserted: batch?.upserted_by_category?.[cat] || 0,
      total: stats?.totals_by_category?.[cat]?.total || 0,
      enriched: stats?.totals_by_category?.[cat]?.enriched || 0,
    }));
    return out;
  }, [batch, selectedCategories, stats]);

  async function startJob() {
    const res = await fetch('/api/admin/places/collector/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        categories: selectedCategories,
        max_places_per_destination: maxPlacesPerDestination,
        radius_km_city: radiusKmCity,
        radius_km_region: radiusKmRegion,
      }),
    });
    const data = (await res.json()) as { job_id?: string; job?: CollectorJob; error?: string; details?: string };
    if (!res.ok) throw new Error(data?.details || data?.error || 'Failed to start');
    setJobId(data.job_id || '');
    setJob(data.job || null);
  }

  async function loadJob(id: string) {
    const res = await fetch(`/api/admin/places/collector/status?job_id=${encodeURIComponent(id)}`);
    const data = (await res.json()) as { job?: CollectorJob; error?: string; details?: string };
    if (!res.ok) throw new Error(data?.details || data?.error || 'Failed to load job');
    setJob(data.job || null);
  }

  async function loadStats(id: string) {
    const res = await fetch(`/api/admin/places/collector/stats?job_id=${encodeURIComponent(id)}`);
    const data = (await res.json()) as CollectorStatsResponse & { error?: string; details?: string };
    if (!res.ok) throw new Error(data?.details || data?.error || 'Failed to load stats');
    setStats(data);
  }

  async function tick(id: string) {
    const res = await fetch('/api/admin/places/collector/tick', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        job_id: id,
        max_requests: maxRequestsPerTick,
        max_queue_items: maxQueueItemsPerTick,
      }),
    });
    const data = (await res.json()) as { error?: string; details?: string };
    if (!res.ok) throw new Error(data?.details || data?.error || 'Tick failed');
    await loadJob(id);
    await loadStats(id);
  }

  async function pause(id: string) {
    const res = await fetch('/api/admin/places/collector/pause', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ job_id: id }),
    });
    const data = (await res.json()) as { error?: string; details?: string };
    if (!res.ok) throw new Error(data?.details || data?.error || 'Pause failed');
    await loadJob(id);
  }

  async function resume(id: string) {
    const res = await fetch('/api/admin/places/collector/resume', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ job_id: id }),
    });
    const data = (await res.json()) as { error?: string; details?: string };
    if (!res.ok) throw new Error(data?.details || data?.error || 'Resume failed');
    await loadJob(id);
  }

  // Keep job/status fresh
  useEffect(() => {
    if (!jobId) return;
    let cancelled = false;
    const run = async () => {
      try {
        await loadJob(jobId);
        await loadStats(jobId);
      } catch {
        // ignore
      }
      if (cancelled) return;
      setTimeout(run, Math.max(1000, Math.min(10000, pollMs)));
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [jobId, pollMs]);

  // Auto-run loop (tick until paused/quota/completed)
  useEffect(() => {
    if (!jobId) return;
    runningRef.current = false;

    const loop = async () => {
      if (!autoRun) return;
      if (runningRef.current) return;
      if (!job?.progress) return;

      const s = job.progress.state;
      if (s !== 'running') return;

      runningRef.current = true;
      try {
        await tick(jobId);
      } catch (e: unknown) {
        // Stop auto loop on hard errors; user can resume
        // eslint-disable-next-line no-console
        console.warn('Auto tick failed:', errMsg(e));
      } finally {
        runningRef.current = false;
        setTimeout(loop, 1000);
      }
    };

    loop();
  }, [autoRun, jobId, job, maxQueueItemsPerTick, maxRequestsPerTick]);

  function toggleCategory(cat: string) {
    setSelectedCategories(prev => (prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]));
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white relative">
      <LuxuryBackground />
      <div className="relative z-10">
        <AdminNav />

        <div className="max-w-7xl mx-auto px-6 py-12 space-y-8">
          <div>
            <h1 className="text-4xl font-bold text-lexa-gold mb-2">📍 POI Collection (Google Places)</h1>
            <p className="text-zinc-400">
              This runs in safe “ticks” so you can start, pause, resume, and it will automatically stop when Google quota/budget is exhausted.
            </p>
          </div>

          {/* Current destination field (prominent) */}
          <div className="bg-zinc-900/60 backdrop-blur-sm border border-zinc-800 rounded-xl p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <div className="text-xs uppercase tracking-wider text-zinc-400">Currently scanning</div>
              <div className="text-2xl font-semibold text-white">{currentDestinationLabel}</div>
            </div>
            <div className="text-sm text-zinc-300">
              <span className="text-zinc-500">State:</span> <span className="font-semibold">{state || job?.status || '—'}</span>
              {job?.progress?.reason ? <span className="text-zinc-400"> — {job.progress.reason}</span> : null}
            </div>
          </div>

          {/* Setup */}
          <div className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800 rounded-xl p-6">
            <h2 className="text-xl font-semibold text-lexa-gold mb-4">Setup</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <div className="text-sm font-semibold text-white mb-2">Categories</div>
                <div className="flex flex-wrap gap-2">
                  {ALL_CATEGORIES.map(cat => {
                    const active = selectedCategories.includes(cat);
                    return (
                      <button
                        key={cat}
                        onClick={() => toggleCategory(cat)}
                        className={`px-3 py-2 rounded-lg text-sm border transition-colors ${
                          active
                            ? 'bg-lexa-gold text-zinc-900 border-lexa-gold'
                            : 'bg-zinc-950 text-white border-zinc-700 hover:border-lexa-gold'
                        }`}
                      >
                        {cat}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <label className="block">
                  <div className="text-sm text-zinc-300 mb-1">Max requests / tick</div>
                  <input
                    type="number"
                    value={maxRequestsPerTick}
                    onChange={e => setMaxRequestsPerTick(Number(e.target.value))}
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2"
                  />
                </label>
                <label className="block">
                  <div className="text-sm text-zinc-300 mb-1">Queue items / tick</div>
                  <input
                    type="number"
                    value={maxQueueItemsPerTick}
                    onChange={e => setMaxQueueItemsPerTick(Number(e.target.value))}
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2"
                  />
                </label>
                <label className="block">
                  <div className="text-sm text-zinc-300 mb-1">City radius (km)</div>
                  <input
                    type="number"
                    value={radiusKmCity}
                    onChange={e => setRadiusKmCity(Number(e.target.value))}
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2"
                  />
                </label>
                <label className="block">
                  <div className="text-sm text-zinc-300 mb-1">Region seed radius (km)</div>
                  <input
                    type="number"
                    value={radiusKmRegion}
                    onChange={e => setRadiusKmRegion(Number(e.target.value))}
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2"
                  />
                </label>
                <label className="block col-span-2">
                  <div className="text-sm text-zinc-300 mb-1">Max places per destination</div>
                  <input
                    type="number"
                    value={maxPlacesPerDestination}
                    onChange={e => setMaxPlacesPerDestination(Number(e.target.value))}
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2"
                  />
                </label>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 mt-6">
              <button
                onClick={async () => {
                  try {
                    await startJob();
                    alert('✅ Collector started');
                  } catch (e: unknown) {
                    alert(`❌ ${errMsg(e)}`);
                  }
                }}
                className="px-5 py-3 rounded-xl bg-lexa-gold text-zinc-900 font-semibold hover:opacity-90"
              >
                ▶ Start new collector job
              </button>

              <button
                onClick={async () => {
                  if (!jobId) return;
                  try {
                    await tick(jobId);
                  } catch (e: unknown) {
                    alert(`❌ ${errMsg(e)}`);
                  }
                }}
                disabled={!jobId}
                className="px-5 py-3 rounded-xl bg-zinc-800 text-white font-semibold hover:bg-zinc-700 disabled:opacity-50"
              >
                ⏩ Tick once
              </button>

              <button
                onClick={async () => {
                  if (!jobId) return;
                  try {
                    await pause(jobId);
                  } catch (e: unknown) {
                    alert(`❌ ${errMsg(e)}`);
                  }
                }}
                disabled={!jobId}
                className="px-5 py-3 rounded-xl bg-zinc-800 text-white font-semibold hover:bg-zinc-700 disabled:opacity-50"
              >
                ⏸ Pause
              </button>

              <button
                onClick={async () => {
                  if (!jobId) return;
                  try {
                    await resume(jobId);
                  } catch (e: unknown) {
                    alert(`❌ ${errMsg(e)}`);
                  }
                }}
                disabled={!jobId}
                className="px-5 py-3 rounded-xl bg-zinc-800 text-white font-semibold hover:bg-zinc-700 disabled:opacity-50"
              >
                ▶ Resume
              </button>

              <label className="flex items-center gap-2 px-4 py-3 rounded-xl bg-zinc-900/60 border border-zinc-800">
                <input type="checkbox" checked={autoRun} onChange={e => setAutoRun(e.target.checked)} />
                <span className="text-sm text-zinc-200">Auto-run (tick loop)</span>
              </label>

              <label className="flex items-center gap-2 px-4 py-3 rounded-xl bg-zinc-900/60 border border-zinc-800">
                <span className="text-sm text-zinc-300">Poll ms</span>
                <input
                  type="number"
                  value={pollMs}
                  onChange={e => setPollMs(Number(e.target.value))}
                  className="w-24 bg-zinc-950 border border-zinc-700 rounded-lg px-2 py-1"
                />
              </label>
            </div>
          </div>

          {/* Status */}
          <div className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800 rounded-xl p-6">
            <h2 className="text-xl font-semibold text-lexa-gold mb-4">Status</h2>
            {!jobId ? (
              <p className="text-zinc-400">Start a job to see status.</p>
            ) : (
              <div className="space-y-2 text-sm">
                <div className="text-zinc-300">
                  <span className="text-zinc-500">Job ID:</span> <span className="font-mono">{jobId}</span>
                </div>
                <div className="text-zinc-300">
                  <span className="text-zinc-500">State:</span> <span className="font-semibold">{state || job?.status}</span>
                  {job?.progress?.reason ? <span className="text-zinc-400"> — {job.progress.reason}</span> : null}
                </div>
                <div className="text-zinc-300">
                  <span className="text-zinc-500">Progress:</span> {currentIndex}/{queue.length}
                </div>
                <div className="text-zinc-300">
                  <span className="text-zinc-500">Requests used:</span> {job?.progress?.requests_used_total ?? 0}
                </div>
                {currentItem ? (
                  <div className="text-zinc-300">
                    <span className="text-zinc-500">Currently:</span> {currentItem.name}{' '}
                    <span className="text-zinc-500">({currentItem.kind}, {currentItem.radius_km}km)</span>
                  </div>
                ) : null}
                {job?.error ? <div className="text-red-300">Error: {job.error}</div> : null}
              </div>
            )}
          </div>

          {/* Stats */}
          <div className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800 rounded-xl p-6">
            <h2 className="text-xl font-semibold text-lexa-gold mb-4">Statistics</h2>

            <div className="overflow-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-zinc-400 border-b border-zinc-800">
                    <th className="py-2 pr-4">Category</th>
                    <th className="py-2 pr-4">Batch discovered</th>
                    <th className="py-2 pr-4">Batch details</th>
                    <th className="py-2 pr-4">Batch upserted</th>
                    <th className="py-2 pr-4">Total (Neo4j)</th>
                    <th className="py-2 pr-4">Enriched (Neo4j)</th>
                  </tr>
                </thead>
                <tbody>
                  {batchRows.map(r => (
                    <tr key={r.category} className="border-b border-zinc-900">
                      <td className="py-2 pr-4 font-semibold text-white">{r.category}</td>
                      <td className="py-2 pr-4 text-zinc-200">{r.discovered}</td>
                      <td className="py-2 pr-4 text-zinc-200">{r.details}</td>
                      <td className="py-2 pr-4 text-lexa-gold font-semibold">{r.upserted}</td>
                      <td className="py-2 pr-4 text-zinc-200">{r.total}</td>
                      <td className="py-2 pr-4 text-zinc-200">{r.enriched}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="text-xs text-zinc-500 mt-4">
              “Batch” = since this collector job started. “Total” = all Google Places POIs stored in Neo4j for that category.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}


