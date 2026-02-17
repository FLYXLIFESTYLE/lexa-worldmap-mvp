'use client';

import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';

type Arc = {
  code: string;
  name: string;
  tagline: string;
  description: string;
  min_days: number;
  max_days: number;
  journey_types: string[];
  color_primary: string;
};

type JourneyType = {
  code: string;
  name: string;
  description: string;
};

type GenerationResult = {
  script_id: string;
  stage1: Record<string, unknown>;
  stage5: Record<string, unknown>;
  status: string;
};

const REGIONS = [
  'French Riviera',
  'Amalfi Coast',
  'Balearics',
  'Cyclades',
  'BVI',
  'USVI',
  'Bahamas',
  'Dutch Antilles',
  'French Antilles',
  'Arabian Gulf',
  'Adriatic (North)',
  'Adriatic (Central)',
  'Adriatic (South)',
  'Ionian Sea',
];

const DURATIONS = [5, 7, 8, 10, 12, 14];

export default function ExperienceForm({
  onGenerated,
}: {
  onGenerated?: (result: GenerationResult) => void;
}) {
  const [arcs, setArcs] = useState<Arc[]>([]);
  const [journeyTypes, setJourneyTypes] = useState<JourneyType[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [region, setRegion] = useState('French Riviera');
  const [duration, setDuration] = useState(8);
  const [journeyType, setJourneyType] = useState('INDIVIDUAL');
  const [arcCode, setArcCode] = useState('');
  const [experienceIdea, setExperienceIdea] = useState('');
  const [themes, setThemes] = useState('');

  // Result
  const [result, setResult] = useState<GenerationResult | null>(null);

  // Load arcs and journey types
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

        // Select first arc by default
        if (arcsData.arcs?.[0]) setArcCode(arcsData.arcs[0].code);
      } catch (err) {
        setError('Failed to load arc data');
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Filter arcs by selected journey type
  const filteredArcs = arcs.filter(
    (a) => a.journey_types.includes(journeyType)
  );

  // When journey type changes, reset arc if not compatible
  useEffect(() => {
    if (arcCode && !filteredArcs.find((a) => a.code === arcCode)) {
      setArcCode(filteredArcs[0]?.code || '');
    }
  }, [journeyType, filteredArcs, arcCode]);

  const selectedArc = arcs.find((a) => a.code === arcCode);

  async function handleGenerate(generateFull: boolean) {
    setGenerating(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch('/api/scripts/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name || undefined,
          region,
          duration,
          journey_type: journeyType,
          arc_code: arcCode,
          experience_idea: experienceIdea || undefined,
          themes: themes ? themes.split(',').map((t) => t.trim()) : undefined,
          generate_full: generateFull,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Generation failed');
      }

      setResult(data);
      onGenerated?.(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setGenerating(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-6 w-6 animate-spin text-lexa-gold" />
        <span className="ml-2 text-zinc-500">Loading arc data...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Basic Info */}
      <div className="rounded-lg border border-zinc-200 bg-white p-6">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 mb-4">
          Basic Info
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">
              Experience Name (optional)
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Leave blank to use arc name"
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-lexa-gold focus:outline-none focus:ring-1 focus:ring-lexa-gold"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">
              Region
            </label>
            <select
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-lexa-gold focus:outline-none focus:ring-1 focus:ring-lexa-gold"
            >
              {REGIONS.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">
              Duration
            </label>
            <select
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-lexa-gold focus:outline-none focus:ring-1 focus:ring-lexa-gold"
            >
              {DURATIONS.map((d) => (
                <option key={d} value={d}>{d} days</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Journey Type */}
      <div className="rounded-lg border border-zinc-200 bg-white p-6">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 mb-4">
          Journey Type
        </h3>
        <div className="flex flex-wrap gap-3">
          {journeyTypes.map((jt) => (
            <button
              key={jt.code}
              onClick={() => setJourneyType(jt.code)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition-all ${
                journeyType === jt.code
                  ? 'bg-lexa-navy text-white'
                  : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
              }`}
            >
              {jt.name}
            </button>
          ))}
        </div>
      </div>

      {/* Arc Template */}
      <div className="rounded-lg border border-zinc-200 bg-white p-6">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 mb-4">
          Arc Template
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredArcs.map((arc) => (
            <button
              key={arc.code}
              onClick={() => setArcCode(arc.code)}
              className={`rounded-lg border-2 p-4 text-left transition-all ${
                arcCode === arc.code
                  ? 'border-lexa-gold bg-amber-50'
                  : 'border-zinc-200 hover:border-zinc-300'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <div
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: arc.color_primary }}
                />
                <span className="font-semibold text-sm text-zinc-900">
                  {arc.name}
                </span>
              </div>
              <p className="text-xs text-zinc-500 italic">{arc.tagline}</p>
              <p className="text-xs text-zinc-400 mt-1">
                {arc.min_days}-{arc.max_days} days
              </p>
            </button>
          ))}
        </div>

        {selectedArc && (
          <div className="mt-4 rounded-md bg-zinc-50 p-4 text-sm text-zinc-600">
            <p className="font-medium text-zinc-800 mb-1">{selectedArc.name}: {selectedArc.tagline}</p>
            <p className="text-xs">{selectedArc.description.slice(0, 200)}...</p>
          </div>
        )}
      </div>

      {/* Experience Idea */}
      <div className="rounded-lg border border-zinc-200 bg-white p-6">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 mb-4">
          Experience Idea (Optional)
        </h3>
        <textarea
          value={experienceIdea}
          onChange={(e) => setExperienceIdea(e.target.value)}
          placeholder='Describe the experience concept, target guest, or unique angle... e.g. "A culinary journey for couples who love wine but want it woven into a deeper story"'
          rows={3}
          className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-lexa-gold focus:outline-none focus:ring-1 focus:ring-lexa-gold"
        />
      </div>

      {/* Themes */}
      <div className="rounded-lg border border-zinc-200 bg-white p-6">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 mb-4">
          Target Themes (Optional)
        </h3>
        <input
          type="text"
          value={themes}
          onChange={(e) => setThemes(e.target.value)}
          placeholder="Wellness, Romance, Culinary (comma-separated)"
          className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-lexa-gold focus:outline-none focus:ring-1 focus:ring-lexa-gold"
        />
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Generate Buttons */}
      <div className="flex gap-3">
        <button
          onClick={() => handleGenerate(false)}
          disabled={generating || !arcCode}
          className="flex items-center gap-2 rounded-md bg-lexa-navy px-6 py-3 text-sm font-medium text-white hover:bg-opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {generating && <Loader2 className="h-4 w-4 animate-spin" />}
          Generate Basic Script
        </button>
        <button
          onClick={() => handleGenerate(true)}
          disabled={generating || !arcCode}
          className="flex items-center gap-2 rounded-md bg-lexa-gold px-6 py-3 text-sm font-medium text-white hover:bg-opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {generating && <Loader2 className="h-4 w-4 animate-spin" />}
          Generate Full Package
        </button>
      </div>

      {/* Result Preview */}
      {result && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-6">
          <h3 className="text-sm font-semibold text-green-800 mb-2">
            Generated Successfully
          </h3>
          <p className="text-xs text-green-700 mb-3">
            Script ID: {result.script_id} | Status: {result.status}
          </p>
          <div className="rounded-md bg-white p-4 text-sm">
            <pre className="whitespace-pre-wrap text-xs text-zinc-600 max-h-96 overflow-y-auto">
              {JSON.stringify(result.stage1, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
