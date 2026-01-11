'use client';

/**
 * Captain Portal: Knowledge Nuggets Inbox
 * - Shows unstructured snippets captured during extraction (NOT POIs)
 * - Lets captains enrich them (Tavily + Claude) and/or convert to POI drafts
 */

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminNav from '@/components/admin/admin-nav';
import PortalShell from '@/components/portal/portal-shell';
import { createClient } from '@/lib/supabase/client-browser';

type NuggetType =
  | 'note'
  | 'poi_fragment'
  | 'brand_signal'
  | 'event'
  | 'opening_update'
  | 'pricing_signal'
  | 'restriction'
  | 'other';

type Nugget = {
  id: string;
  nugget_type: NuggetType;
  destination: string | null;
  text: string;
  upload_id: string | null;
  scrape_id: string | null;
  created_at: string;
  updated_at: string;
  enrichment: any;
};

function preview(text: string, max = 220): string {
  const t = (text || '').trim().replace(/\s+/g, ' ');
  if (t.length <= max) return t;
  return `${t.slice(0, max)}…`;
}

export default function CaptainNuggetsPage() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [nuggets, setNuggets] = useState<Nugget[]>([]);

  // filters
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | NuggetType>('all');
  const [destinationFilter, setDestinationFilter] = useState('');

  const [busyId, setBusyId] = useState<string | null>(null);

  async function fetchNuggets() {
    setLoading(true);
    try {
      const { data: session } = await supabase.auth.getUser();
      if (!session.user) {
        router.push('/auth/signin');
        return;
      }

      const { data, error } = await supabase
        .from('knowledge_nuggets')
        .select('id,nugget_type,destination,text,upload_id,scrape_id,created_at,updated_at,enrichment')
        .order('created_at', { ascending: false })
        .limit(200);

      if (error) throw error;
      setNuggets((data || []) as Nugget[]);
    } catch (e) {
      console.error('Failed to fetch nuggets', e);
      alert('❌ Failed to load Knowledge Nuggets. Make sure migration 021 ran on this DB.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchNuggets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const dest = destinationFilter.trim().toLowerCase();
    return nuggets.filter((n) => {
      if (typeFilter !== 'all' && n.nugget_type !== typeFilter) return false;
      if (dest && !(n.destination || '').toLowerCase().includes(dest)) return false;
      if (!q) return true;
      return (
        (n.text || '').toLowerCase().includes(q) ||
        (n.destination || '').toLowerCase().includes(q) ||
        (n.nugget_type || '').toLowerCase().includes(q)
      );
    });
  }, [nuggets, search, typeFilter, destinationFilter]);

  const stats = useMemo(() => {
    const total = nuggets.length;
    const byType = nuggets.reduce<Record<string, number>>((acc, n) => {
      acc[n.nugget_type] = (acc[n.nugget_type] || 0) + 1;
      return acc;
    }, {});
    return { total, byType };
  }, [nuggets]);

  async function handleEnrich(n: Nugget) {
    try {
      const ok = confirm(
        `Enrich this nugget with Tavily + Claude?\n\nThis will classify it (event/opening/brand signal/etc.) and add structured fields + citations.`
      );
      if (!ok) return;
      setBusyId(n.id);
      const res = await fetch(`/api/captain/nuggets/${n.id}/enrich`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ destination: n.destination || undefined }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || data.details || 'Enrichment failed');
      await fetchNuggets();
      alert('✅ Nugget enriched. Review classification + extracted signals.');
    } catch (e: any) {
      alert(`❌ Enrichment failed: ${e?.message || 'Unknown error'}`);
    } finally {
      setBusyId(null);
    }
  }

  async function handleConvertToPoi(n: Nugget) {
    try {
      const name = prompt('Enter the REAL POI name (e.g., "Hotel du Cap-Eden-Roc"):', '');
      if (!name || !name.trim()) return;
      const destination = prompt(
        'Destination (optional). Leave blank to keep nugget destination:',
        n.destination || ''
      );
      const category = prompt('Category (optional, e.g. hotel, restaurant, experience):', '');

      setBusyId(n.id);
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user) {
        router.push('/auth/signin');
        return;
      }

      // Create an extracted_pois draft. Keep confidence low until verified.
      const { error } = await supabase.from('extracted_pois').insert({
        name: name.trim(),
        destination: destination?.trim() || n.destination,
        category: category?.trim() || null,
        description: n.text,
        confidence_score: 50,
        verified: false,
        enhanced: true,
        promoted_to_main: false,
        upload_id: n.upload_id,
        scrape_id: n.scrape_id,
        created_by: user.id,
        // Keep provenance trail + link back to nugget
        metadata: { from_nugget_id: n.id, nugget_type: n.nugget_type },
      });

      if (error) throw error;
      alert('✅ POI draft created. You can now find it in Browse → Edit/Verify/Enrich.');
    } catch (e: any) {
      alert(`❌ Convert failed: ${e?.message || 'Unknown error'}`);
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(n: Nugget) {
    try {
      const ok = confirm('Delete this nugget? (This cannot be undone.)');
      if (!ok) return;
      setBusyId(n.id);
      const { error } = await supabase.from('knowledge_nuggets').delete().eq('id', n.id);
      if (error) throw error;
      setNuggets((prev) => prev.filter((x) => x.id !== n.id));
    } catch (e: any) {
      alert(`❌ Delete failed: ${e?.message || 'Unknown error'}`);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <PortalShell
      icon="🧠"
      title="Knowledge Nuggets (Inbox)"
      subtitle="Unstructured snippets from uploads/URLs. Enrich them and convert to POIs when needed."
      backLink={{ href: '/captain', label: 'Back to Captain Portal' }}
      topRight={<AdminNav />}
      mission={[
        { label: 'KEEP', text: 'Sentence fragments and signals are stored as nuggets (not POIs).' },
        { label: 'ENRICH', text: 'Use Tavily + Claude to classify and extract structured signals with citations.' },
        { label: 'CONVERT', text: 'When you know the real place name, convert a nugget into a POI draft.' },
      ]}
      quickTips={[
        'If a nugget is “opening soon”, enrich it and keep the date + source link.',
        'Convert to POI only when the name is unambiguous.',
        'POIs require verification + provenance before promotion to Neo4j.',
      ]}
    >
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
          <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
          <div className="text-sm text-gray-600">Total Nuggets</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
          <div className="text-2xl font-bold text-fuchsia-700">{stats.byType.poi_fragment || 0}</div>
          <div className="text-sm text-gray-600">POI Fragments</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
          <div className="text-2xl font-bold text-blue-700">{stats.byType.event || 0}</div>
          <div className="text-sm text-gray-600">Events</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
          <div className="text-2xl font-bold text-emerald-700">{stats.byType.opening_update || 0}</div>
          <div className="text-sm text-gray-600">Openings</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Search & Filter</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Text, destination, type…"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as any)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All</option>
              <option value="poi_fragment">POI fragment</option>
              <option value="event">Event</option>
              <option value="opening_update">Opening update</option>
              <option value="brand_signal">Brand signal</option>
              <option value="pricing_signal">Pricing signal</option>
              <option value="restriction">Restriction</option>
              <option value="note">Note</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Destination</label>
            <input
              type="text"
              value={destinationFilter}
              onChange={(e) => setDestinationFilter(e.target.value)}
              placeholder="e.g. French Riviera"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
        <div className="mt-4 text-sm text-gray-600">Showing {filtered.length} of {nuggets.length}</div>
      </div>

      {/* List */}
      {loading ? (
        <div className="text-center text-gray-600">Loading nuggets…</div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-12 text-center border border-gray-200">
          <div className="text-6xl mb-4">🧠</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No Nuggets Found</h3>
          <p className="text-gray-600">Upload a file or scrape a URL to generate nuggets.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((n) => {
            const busy = busyId === n.id;
            return (
              <div key={n.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-start justify-between gap-6">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="px-2 py-1 rounded-full text-xs font-semibold bg-fuchsia-100 text-fuchsia-800">
                        {n.nugget_type}
                      </span>
                      <span className="text-xs text-gray-500">
                        {new Date(n.created_at).toLocaleString()}
                      </span>
                      {n.destination && (
                        <span className="px-2 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                          📍 {n.destination}
                        </span>
                      )}
                    </div>
                    <div className="text-gray-900 font-medium mb-2">{preview(n.text)}</div>
                    {n.enrichment && n.enrichment.summary && (
                      <div className="text-sm text-gray-600">
                        <strong>Summary:</strong> {String(n.enrichment.summary)}
                      </div>
                    )}
                  </div>

                  <div className="shrink-0 flex flex-col gap-2">
                    <button
                      onClick={() => handleEnrich(n)}
                      disabled={busy}
                      className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-semibold hover:bg-purple-700 disabled:opacity-60"
                    >
                      ⚡ Enrich
                    </button>
                    <button
                      onClick={() => handleConvertToPoi(n)}
                      disabled={busy}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-60"
                    >
                      ✨ Convert to POI
                    </button>
                    <button
                      onClick={() => handleDelete(n)}
                      disabled={busy}
                      className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg text-sm font-semibold hover:bg-gray-300 disabled:opacity-60"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </PortalShell>
  );
}

