'use client';

import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';

type Arc = {
  code: string;
  name: string;
  min_days: number;
  max_days: number;
  journey_types: string[];
};

type JourneyType = {
  code: string;
  name: string;
};

type JobResult = {
  job_id: string;
  combinations_count: number;
  completed_count: number;
  failed_count: number;
  status: string;
  results: {
    combination: { region: string; journey_type: string; arc_code: string; duration: number };
    status: string;
    script_id?: string;
    error?: string;
  }[];
};

const REGIONS = [
  'French Riviera',
  'Amalfi Coast',
  'Balearics',
  'Cyclades',
  'BVI',
  'USVI',
  'Bahamas',
  'Arabian Gulf',
  'Adriatic (Central)',
  'Ionian Sea',
];

const DURATIONS = [5, 7, 8, 10];

export default function BatchGenerator() {
  const [arcs, setArcs] = useState<Arc[]>([]);
  const [journeyTypes, setJourneyTypes] = useState<JourneyType[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  // Selections
  const [selectedRegions, setSelectedRegions] = useState<string[]>([]);
  const [selectedJourneyTypes, setSelectedJourneyTypes] = useState<string[]>([]);
  const [selectedArcs, setSelectedArcs] = useState<string[]>([]);
  const [selectedDurations, setSelectedDurations] = useState<number[]>([]);

  // Results
  const [jobResult, setJobResult] = useState<JobResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const [arcsRes, jtRes] = await Promise.all([
          fetch('/api/scripts/arcs'),
          fetch('/api/scripts/journey-types'),
        ]);
        const arcsData = await arcsRes.json();
        const jtData = await jtRes.json();
        if (arcsData.arcs) setArcs(arcsData.arcs);
        if (jtData.journey_types) setJourneyTypes(jtData.journey_types);
      } catch {
        setError('Failed to load data');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Count valid combinations
  const validCombinations = countValidCombinations();

  function countValidCombinations(): number {
    let count = 0;
    for (const region of selectedRegions) {
      for (const jt of selectedJourneyTypes) {
        for (const arcCode of selectedArcs) {
          const arc = arcs.find((a) => a.code === arcCode);
          if (!arc || !arc.journey_types.includes(jt)) continue;
          for (const dur of selectedDurations) {
            if (dur >= (arc?.min_days || 0) && dur <= (arc?.max_days || 99)) {
              count++;
            }
          }
        }
      }
    }
    return count;
  }

  function toggleItem<T>(list: T[], item: T, setter: (v: T[]) => void) {
    if (list.includes(item)) {
      setter(list.filter((i) => i !== item));
    } else {
      setter([...list, item]);
    }
  }

  async function handleGenerate() {
    if (validCombinations === 0) return;
    setGenerating(true);
    setError(null);
    setJobResult(null);

    try {
      const res = await fetch('/api/scripts/generate/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          regions: selectedRegions,
          journey_types: selectedJourneyTypes,
          arc_codes: selectedArcs,
          durations: selectedDurations,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Batch generation failed');
      setJobResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Batch generation failed');
    } finally {
      setGenerating(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-6 w-6 animate-spin text-lexa-gold" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Regions */}
      <div className="rounded-lg border border-zinc-200 bg-white p-6">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 mb-4">
          Regions
        </h3>
        <div className="flex flex-wrap gap-2">
          {REGIONS.map((r) => (
            <button
              key={r}
              onClick={() => toggleItem(selectedRegions, r, setSelectedRegions)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                selectedRegions.includes(r)
                  ? 'bg-lexa-navy text-white'
                  : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Journey Types */}
      <div className="rounded-lg border border-zinc-200 bg-white p-6">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 mb-4">
          Journey Types
        </h3>
        <div className="flex flex-wrap gap-2">
          {journeyTypes.map((jt) => (
            <button
              key={jt.code}
              onClick={() => toggleItem(selectedJourneyTypes, jt.code, setSelectedJourneyTypes)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                selectedJourneyTypes.includes(jt.code)
                  ? 'bg-lexa-navy text-white'
                  : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
              }`}
            >
              {jt.name}
            </button>
          ))}
        </div>
      </div>

      {/* Arcs */}
      <div className="rounded-lg border border-zinc-200 bg-white p-6">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 mb-4">
          Arcs
        </h3>
        <div className="flex flex-wrap gap-2">
          {arcs.map((arc) => (
            <button
              key={arc.code}
              onClick={() => toggleItem(selectedArcs, arc.code, setSelectedArcs)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                selectedArcs.includes(arc.code)
                  ? 'bg-lexa-navy text-white'
                  : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
              }`}
            >
              {arc.name}
            </button>
          ))}
        </div>
      </div>

      {/* Durations */}
      <div className="rounded-lg border border-zinc-200 bg-white p-6">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 mb-4">
          Durations
        </h3>
        <div className="flex flex-wrap gap-2">
          {DURATIONS.map((d) => (
            <button
              key={d}
              onClick={() => toggleItem(selectedDurations, d, setSelectedDurations)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                selectedDurations.includes(d)
                  ? 'bg-lexa-navy text-white'
                  : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
              }`}
            >
              {d} days
            </button>
          ))}
        </div>
      </div>

      {/* Summary + Generate */}
      <div className="rounded-lg border border-zinc-200 bg-white p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-zinc-600">
              Selected Combinations:{' '}
              <span className="font-bold text-zinc-900">{validCombinations}</span> experiences
            </p>
            <p className="text-xs text-zinc-400">
              Estimated time: ~{Math.ceil(validCombinations * 0.5)} minutes
            </p>
          </div>
          <button
            onClick={handleGenerate}
            disabled={generating || validCombinations === 0}
            className="flex items-center gap-2 rounded-md bg-lexa-gold px-6 py-3 text-sm font-medium text-white hover:bg-opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {generating && <Loader2 className="h-4 w-4 animate-spin" />}
            Generate All ({validCombinations})
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Results */}
      {jobResult && (
        <div className="rounded-lg border border-zinc-200 bg-white p-6">
          <h3 className="text-sm font-semibold text-zinc-900 mb-3">
            Batch Results
          </h3>
          <div className="flex gap-4 mb-4 text-xs">
            <span className="text-green-600 font-medium">
              Completed: {jobResult.completed_count}
            </span>
            <span className="text-red-600 font-medium">
              Failed: {jobResult.failed_count}
            </span>
            <span className="text-zinc-500">
              Status: {jobResult.status}
            </span>
          </div>
          <div className="max-h-64 overflow-y-auto space-y-1">
            {jobResult.results.map((r, i) => (
              <div
                key={i}
                className={`flex items-center justify-between px-3 py-1.5 rounded text-xs ${
                  r.status === 'completed' ? 'bg-green-50' : 'bg-red-50'
                }`}
              >
                <span>
                  {r.combination.region} / {r.combination.journey_type} / {r.combination.arc_code} / {r.combination.duration}d
                </span>
                <span className={r.status === 'completed' ? 'text-green-600' : 'text-red-600'}>
                  {r.status === 'completed' ? r.script_id?.slice(0, 8) : r.error}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

