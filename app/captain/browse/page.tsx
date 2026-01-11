'use client';

/**
 * Captain Portal: Browse, Verify & Enhance
 * Merged: Browse POIs, Verify Data, Enhance Descriptions, Confidence Score Management
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client-browser';
import AdminNav from '@/components/admin/admin-nav';
import { poisAPI } from '@/lib/api/captain-portal';
import PortalShell from '@/components/portal/portal-shell';
import { looksLikeBadPoiName } from '@/lib/brain/poi-contract';

interface POI {
  id: string;
  name: string;
  destination: string | null;
  category: string | null;
  description: string | null;
  confidence_score: number;
  verified: boolean;
  enhanced: boolean;
  promoted_to_main: boolean;
  created_at: string;
  updated_at: string;
  created_by: string;
  luxury_score?: number | null;
  keywords?: string[] | null;
  themes?: string[] | null;
}

type NuggetType =
  | 'note'
  | 'poi_fragment'
  | 'brand_signal'
  | 'event'
  | 'opening_update'
  | 'pricing_signal'
  | 'restriction'
  | 'other';

interface KnowledgeNugget {
  id: string;
  nugget_type: NuggetType;
  destination: string | null;
  text: string;
  source_refs?: any[] | null;
  citations?: any[] | null;
  enrichment?: any | null;
  created_at: string;
  updated_at: string;
  created_by: string;
}

type ViewMode = 'list' | 'edit';
type ListSection = 'pois' | 'nuggets';

export default function CaptainBrowsePage() {
  const router = useRouter();
  const supabase = createClient();
  
  const [loading, setLoading] = useState(true);
  const [backfillLoading, setBackfillLoading] = useState(false);
  const [pois, setPois] = useState<POI[]>([]);
  const [filteredPois, setFilteredPois] = useState<POI[]>([]);

  const [section, setSection] = useState<ListSection>('pois');
  const [nuggetsLoading, setNuggetsLoading] = useState(false);
  const [nuggets, setNuggets] = useState<KnowledgeNugget[]>([]);
  const [filteredNuggets, setFilteredNuggets] = useState<KnowledgeNugget[]>([]);
  const [nuggetTypeFilter, setNuggetTypeFilter] = useState<'all' | NuggetType>('all');
  
  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [qualityFilter, setQualityFilter] = useState('all');
  const [scoreFilter, setScoreFilter] = useState('all');
  
  // Edit State
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedPoi, setSelectedPoi] = useState<POI | null>(null);
  const [editedName, setEditedName] = useState('');
  const [editedDescription, setEditedDescription] = useState('');
  const [editedLocation, setEditedLocation] = useState('');
  const [editedCategory, setEditedCategory] = useState('');
  const [editedConfidence, setEditedConfidence] = useState(80);
  const [editedLuxuryScore, setEditedLuxuryScore] = useState(0);
  const [editedTags, setEditedTags] = useState('');

  // Stats
  const [stats, setStats] = useState({
    total: 0,
    verified: 0,
    needsVerification: 0,
    lowQuality: 0,
    avgConfidence: 0
  });
  const [poiTotalAvailable, setPoiTotalAvailable] = useState(0);

  // Auth check
  useEffect(() => {
    async function checkAuth() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/auth/signin');
        return;
      }
      fetchPOIs();
      fetchNuggets();
    }
    checkAuth();
  }, [router, supabase.auth]);

  // Fetch POIs
  const fetchPOIs = async () => {
    setLoading(true);
    try {
      // NOTE: previously this was 100, which made the UI look like imports “didn't work”.
      // We'll fetch a larger page so imported POIs show up immediately.
      const res = await poisAPI.getPOIs({ skip: 0, limit: 1000 });
      const list = (res.pois || []) as POI[];
      setPoiTotalAvailable(Number(res.total || 0));

      // Normalize arrays (keywords/themes can be null)
      const normalized = list.map((p) => ({
        ...p,
        keywords: Array.isArray(p.keywords) ? p.keywords : [],
        themes: Array.isArray(p.themes) ? p.themes : [],
      }));

      setPois(normalized);
      setFilteredPois(normalized);

      // Calculate stats
      const total = normalized.length;
      const verifiedCount = normalized.filter((p) => p.verified).length;
      const needsVerification = total - verifiedCount;
      const lowQuality = normalized.filter((p) => p.confidence_score < 80).length;
      const avgConfidence =
        total === 0 ? 0 : normalized.reduce((sum, p) => sum + (p.confidence_score || 0), 0) / total;

      setStats({
        total,
        verified: verifiedCount,
        needsVerification,
        lowQuality,
        avgConfidence,
      });
    } catch (error) {
      console.error('Failed to fetch POIs:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchNuggets = async () => {
    setNuggetsLoading(true);
    try {
      const { data, error } = await supabase
        .from('knowledge_nuggets')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(200);
      if (error) throw error;

      const list = (data || []) as KnowledgeNugget[];
      const normalized = list.map((n) => ({
        ...n,
        source_refs: Array.isArray((n as any).source_refs) ? (n as any).source_refs : [],
        citations: Array.isArray((n as any).citations) ? (n as any).citations : [],
        enrichment: (n as any).enrichment || {},
      }));
      setNuggets(normalized);
      setFilteredNuggets(normalized);
    } catch (e) {
      console.error('Failed to fetch knowledge nuggets:', e);
    } finally {
      setNuggetsLoading(false);
    }
  };

  const handleBackfill = async () => {
    setBackfillLoading(true);
    try {
      const res = await poisAPI.backfillFromHistory();
      await fetchPOIs();
      alert(
        `✅ Imported ${res.created_pois} POIs from your uploads/URLs (uploads: ${res.uploads_processed}, URLs: ${res.urls_processed}).`
      );
    } catch (e: any) {
      alert(`❌ Backfill failed: ${e?.message || 'Unknown error'}`);
    } finally {
      setBackfillLoading(false);
    }
  };

  const handleImportGenerated = async () => {
    const destination = prompt('Destination name (must match destinations list):', 'French Riviera') || '';
    if (!destination.trim()) return;
    const source = (prompt('Source (osm / wikidata / overture / any):', 'osm') || 'osm').trim().toLowerCase();
    const limitRaw = (prompt('How many to import (max 5000):', '500') || '500').trim();
    const limit = Math.max(1, Math.min(5000, Number(limitRaw) || 500));

    try {
      const res = await fetch('/api/captain/pois/import-generated', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ destination, source, limit }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(String(data.details || data.error || 'Import failed'));
      }
      await fetchPOIs();
      alert(`✅ Imported ${data.created || 0} generated POIs into the review list for ${destination}.`);
    } catch (e: any) {
      alert(`❌ Import generated POIs failed: ${e?.message || 'Unknown error'}`);
    }
  };

  const handleBulkVerifyVisible = async () => {
    const ids = filteredPois.filter((p) => !p.verified).map((p) => p.id);
    if (!ids.length) {
      alert('✅ All visible POIs are already verified.');
      return;
    }
    if (!confirm(`Verify (approve) ${ids.length} POIs?`)) return;

    try {
      const res = await poisAPI.bulkVerify(ids, true);
      await fetchPOIs();
      alert(`✅ Verified ${res.updated} of ${res.requested} POIs.`);
    } catch (e: any) {
      alert(`❌ Bulk verify failed: ${e?.message || 'Unknown error'}`);
    }
  };

  // Apply filters
  useEffect(() => {
    let filtered = [...pois];
    
    // Search
    if (searchQuery) {
      filtered = filtered.filter(poi =>
        poi.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (poi.description || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (poi.destination || '').toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    // Category
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(poi => poi.category === categoryFilter);
    }
    
    // Quality
    if (qualityFilter !== 'all') {
      filtered = filtered.filter(poi => getQualityFromScore(poi.confidence_score) === qualityFilter);
    }
    
    // Score
    if (scoreFilter === 'low') {
      filtered = filtered.filter(poi => poi.confidence_score < 60);
    } else if (scoreFilter === 'medium') {
      filtered = filtered.filter(poi => poi.confidence_score >= 60 && poi.confidence_score < 80);
    } else if (scoreFilter === 'high') {
      filtered = filtered.filter(poi => poi.confidence_score >= 80);
    }
    
    setFilteredPois(filtered);
  }, [searchQuery, categoryFilter, qualityFilter, scoreFilter, pois]);

  useEffect(() => {
    let filtered = [...nuggets];

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter((n) => {
        return (
          (n.text || '').toLowerCase().includes(q) ||
          (n.destination || '').toLowerCase().includes(q) ||
          (n.nugget_type || '').toLowerCase().includes(q)
        );
      });
    }

    if (nuggetTypeFilter !== 'all') {
      filtered = filtered.filter((n) => n.nugget_type === nuggetTypeFilter);
    }

    setFilteredNuggets(filtered);
  }, [searchQuery, nuggetTypeFilter, nuggets]);

  const handleNuggetEnrich = async (n: KnowledgeNugget) => {
    try {
      const response = await fetch(`/api/captain/nuggets/${n.id}/enrich`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const err = String(data.error || 'Failed to enrich nugget');
        const details = data.details ? String(data.details) : '';
        throw new Error(details ? `${err}: ${details}` : err);
      }
      await fetchNuggets();
      alert('✅ Nugget enriched.');
    } catch (e: any) {
      alert(`❌ Nugget enrichment failed: ${e?.message || 'Unknown error'}`);
    }
  };

  const handleConvertNuggetToPoi = async (n: KnowledgeNugget) => {
    const suggested = String((n.enrichment as any)?.suggested_poi_name || '').trim();
    const poiName = prompt('Real POI name (required):', suggested || '');
    if (!poiName || !poiName.trim()) return;
    if (looksLikeBadPoiName(poiName)) {
      alert(
        '❌ That still looks like a sentence fragment. Please enter a real place name (short, proper noun style).'
      );
      return;
    }

    const poiCategory = prompt('Category (restaurant / hotel / attraction / activity / experience):', 'attraction');
    if (!poiCategory || !poiCategory.trim()) return;

    try {
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth.user?.id;
      if (!userId) {
        alert('❌ You are not signed in.');
        return;
      }

      const description = String((n.enrichment as any)?.summary || '').trim() || n.text.slice(0, 500);
      const sourceRefs = Array.isArray((n as any).source_refs) ? (n as any).source_refs : [];
      const citations = Array.isArray((n as any).citations) ? (n as any).citations : [];

      const { error: insertErr } = await supabase.from('extracted_pois').insert({
        name: poiName.trim(),
        destination: n.destination,
        category: poiCategory.trim(),
        description,
        confidence_score: 60,
        verified: false,
        enhanced: false,
        promoted_to_main: false,
        created_by: userId,
        source_refs: sourceRefs,
        citations,
      });
      if (insertErr) throw insertErr;

      // Optional: delete nugget after converting (keeps inbox clean)
      if (confirm('Delete this nugget now that it is converted to a POI?')) {
        const { error: delErr } = await supabase.from('knowledge_nuggets').delete().eq('id', n.id);
        if (delErr) console.warn('Failed to delete nugget:', delErr);
      }

      await fetchNuggets();
      await fetchPOIs();
      alert('✅ Converted nugget into a POI draft (now visible in the POI list).');
    } catch (e: any) {
      alert(`❌ Convert failed: ${e?.message || 'Unknown error'}`);
    }
  };

  const handleDeleteNugget = async (n: KnowledgeNugget) => {
    if (!confirm('Delete this nugget?')) return;
    try {
      const { error } = await supabase.from('knowledge_nuggets').delete().eq('id', n.id);
      if (error) throw error;
      await fetchNuggets();
    } catch (e: any) {
      alert(`❌ Delete failed: ${e?.message || 'Unknown error'}`);
    }
  };

  // Edit POI
  const handleEdit = (poi: POI) => {
    setSelectedPoi(poi);
    setEditedName(poi.name);
    setEditedDescription(poi.description || '');
    setEditedLocation(poi.destination || '');
    setEditedCategory(poi.category || 'restaurant');
    setEditedConfidence(poi.confidence_score);
    setEditedLuxuryScore(poi.luxury_score || 0);
    setEditedTags((poi.keywords || []).join(', '));
    setViewMode('edit');
  };

  // Save POI
  const handleSave = async () => {
    if (!selectedPoi) return;
    
    try {
      const nextKeywords = editedTags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      const wantsHighConfidence = editedConfidence > 80;

      let updatedPoi: POI | null = null;

      // Rule: scores >80 require verification (this is the "Captain approval")
      if (wantsHighConfidence && !selectedPoi.verified) {
        const ok = confirm(
          'To set confidence above 80%, you must VERIFY this POI (Captain approval). Verify now?'
        );
        if (!ok) return;

        const res = await poisAPI.verifyPOI(selectedPoi.id, true, editedConfidence);
        updatedPoi = (res as any).poi as POI;
      } else {
        const res = await poisAPI.updatePOI(selectedPoi.id, {
          name: editedName,
          destination: editedLocation,
          category: editedCategory,
          description: editedDescription,
          confidence_score: wantsHighConfidence ? editedConfidence : editedConfidence,
          luxury_score: editedLuxuryScore || undefined,
          keywords: nextKeywords,
          enhanced: true,
        });
        updatedPoi = (res as any).poi as POI;
      }

      setPois((prev) => prev.map((p) => (p.id === selectedPoi.id ? { ...p, ...updatedPoi! } : p)));
      alert('✅ POI saved successfully!');
      
      setViewMode('list');
      setSelectedPoi(null);
    } catch (error) {
      alert('❌ Failed to save POI');
    }
  };

  // Verify POI
  const handleVerify = async (poi: POI) => {
    if (!confirm(`Mark "${poi.name}" as verified?`)) return;
    
    try {
      const res = await poisAPI.verifyPOI(poi.id, true);
      const updated = (res as any).poi as POI;
      setPois((prev) => prev.map((p) => (p.id === poi.id ? { ...p, ...updated } : p)));
      alert('✅ POI verified!');
    } catch (error) {
      alert('❌ Failed to verify POI');
    }
  };

  const handlePromote = async (poi: POI) => {
    if (!poi.verified) {
      alert('⚠️ Please verify this POI first.');
      return;
    }
    if (poi.promoted_to_main) {
      alert('✅ This POI is already promoted.');
      return;
    }
    if (!confirm(`Promote "${poi.name}" to official knowledge (Neo4j)?`)) return;

    try {
      await poisAPI.promotePOI(poi.id);
      setPois((prev) =>
        prev.map((p) =>
          p.id === poi.id ? { ...p, promoted_to_main: true, updated_at: new Date().toISOString() } : p
        )
      );
      alert('✅ POI promoted! It is now official knowledge.');
    } catch (error: any) {
      alert(`❌ Failed to promote POI: ${error?.message || 'Unknown error'}`);
    }
  };

  const handleEnrich = async (poi: POI) => {
    try {
      const ok = confirm(
        `Enrich "${poi.name}" with real-time web info (Tavily + Claude)?\n\nThis will fill missing fields + add citations.`
      );
      if (!ok) return;
      await poisAPI.enrichPOI(poi.id, poi.destination ? { destination: poi.destination } : undefined);
      await fetchPOIs();
      alert('✅ Enrichment complete! Review the updated fields and verify if correct.');
    } catch (e: any) {
      alert(`❌ Enrichment failed: ${e?.message || 'Unknown error'}`);
    }
  };

  const getQualityFromScore = (score: number): 'excellent' | 'good' | 'fair' | 'poor' => {
    if (score >= 90) return 'excellent';
    if (score >= 80) return 'good';
    if (score >= 60) return 'fair';
    return 'poor';
  };

  // Get quality badge color
  const getQualityColor = (quality: string) => {
    switch (quality) {
      case 'excellent': return 'bg-green-100 text-green-700';
      case 'good': return 'bg-blue-100 text-blue-700';
      case 'fair': return 'bg-yellow-100 text-yellow-700';
      case 'poor': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  // Get score color
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">Loading POIs...</p>
        </div>
      </div>
    );
  }

  return (
    <PortalShell
      icon="🔍"
      title="Browse, Verify & Enhance"
      subtitle="Review POIs, verify data quality, enhance descriptions, and manage confidence scores"
      backLink={{ href: '/captain', label: 'Back to Captain Portal' }}
      topRight={<AdminNav />}
      mission={[
        { label: 'VERIFY', text: 'Check POI accuracy and mark as verified.' },
        { label: 'ENHANCE', text: 'Improve descriptions and add missing details.' },
        { label: 'CONFIDENCE', text: 'Scores >80% require captain verification.' },
      ]}
      quickTips={[
        'Verify first, then increase confidence above 80%.',
        'Use tags to make search and matching easier for LEXA.',
        'Only promote POIs after they are verified and clean.',
      ]}
    >

        {/* Stats Dashboard */}
        <div className="grid grid-cols-5 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="text-2xl font-bold text-gray-900">{poiTotalAvailable || stats.total}</div>
            <div className="text-sm text-gray-600">Total POIs</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="text-2xl font-bold text-green-600">{stats.verified}</div>
            <div className="text-sm text-gray-600">Verified</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="text-2xl font-bold text-orange-600">{stats.needsVerification}</div>
            <div className="text-sm text-gray-600">Needs Verification</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="text-2xl font-bold text-red-600">{stats.lowQuality}</div>
            <div className="text-sm text-gray-600">Low Quality</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="text-2xl font-bold text-blue-600">{stats.avgConfidence.toFixed(0)}%</div>
            <div className="text-sm text-gray-600">Avg Confidence</div>
          </div>
        </div>

        {/* LIST VIEW */}
        {viewMode === 'list' && (
          <>
            {/* Section Switcher */}
            <div className="mb-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSection('pois')}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold border transition-colors ${
                    section === 'pois'
                      ? 'bg-lexa-navy text-white border-lexa-navy'
                      : 'bg-white text-gray-800 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  POIs ({poiTotalAvailable || pois.length})
                </button>
                <button
                  type="button"
                  onClick={() => setSection('nuggets')}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold border transition-colors ${
                    section === 'nuggets'
                      ? 'bg-lexa-navy text-white border-lexa-navy'
                      : 'bg-white text-gray-800 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  Nuggets ({nuggets.length})
                </button>
              </div>

              <div className="text-sm text-gray-600">
                {section === 'pois'
                  ? 'Browse and verify POI drafts before promoting.'
                  : 'Sentence fragments and signals that need Captain review.'}
              </div>
            </div>

            {/* Search & Filters */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Search & Filter</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Search
                  </label>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={
                      section === 'pois' ? 'Name, description, location...' : 'Text, destination, type...'
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {section === 'pois' ? (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                      <select
                        value={categoryFilter}
                        onChange={(e) => setCategoryFilter(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="all">All Categories</option>
                        <option value="restaurant">Restaurant</option>
                        <option value="hotel">Hotel</option>
                        <option value="attraction">Attraction</option>
                        <option value="activity">Activity</option>
                        <option value="experience">Experience</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Quality</label>
                      <select
                        value={qualityFilter}
                        onChange={(e) => setQualityFilter(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="all">All Quality</option>
                        <option value="excellent">Excellent</option>
                        <option value="good">Good</option>
                        <option value="fair">Fair</option>
                        <option value="poor">Poor</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Confidence Score</label>
                      <select
                        value={scoreFilter}
                        onChange={(e) => setScoreFilter(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="all">All Scores</option>
                        <option value="high">High (&gt;80%)</option>
                        <option value="medium">Medium (60-80%)</option>
                        <option value="low">Low (&lt;60%)</option>
                      </select>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Nugget type</label>
                      <select
                        value={nuggetTypeFilter}
                        onChange={(e) => setNuggetTypeFilter(e.target.value as any)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="all">All types</option>
                        <option value="poi_fragment">POI fragment</option>
                        <option value="event">Event</option>
                        <option value="opening_update">Opening update</option>
                        <option value="pricing_signal">Pricing signal</option>
                        <option value="brand_signal">Brand signal</option>
                        <option value="restriction">Restriction</option>
                        <option value="note">Note</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <div className="md:col-span-2">
                      <div className="text-sm text-gray-600 pt-8">
                        Tip: Use “⚡ Enrich” to classify and extract facts + citations. Use “Convert to POI” only when you
                        know the real place name.
                      </div>
                    </div>
                  </>
                )}
              </div>
              
              <div className="mt-4 flex items-center justify-between gap-4">
                <div className="text-sm text-gray-600">
                  {section === 'pois'
                    ? `Showing ${filteredPois.length} of ${poiTotalAvailable || pois.length} POIs`
                    : `Showing ${filteredNuggets.length} of ${nuggets.length} nuggets`}
                </div>

                <div className="flex items-center gap-2">
                  {section === 'pois' && !loading && stats.total > 0 && (
                    <button
                      type="button"
                      onClick={handleBulkVerifyVisible}
                      className="px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-semibold hover:bg-green-700"
                      title="Verifies (approves) all visible, unverified POIs."
                    >
                      Verify all visible
                    </button>
                  )}

                  {section === 'pois' && (
                    <button
                      type="button"
                      onClick={handleImportGenerated}
                      className="px-4 py-2 rounded-lg bg-lexa-navy text-white text-sm font-semibold hover:bg-lexa-navy/90"
                      title="Import open-source POIs (OSM/Wikidata/Overture) into this review list."
                    >
                      Import Generated POIs
                    </button>
                  )}

                  {section === 'pois' && !loading && stats.total === 0 && (
                    <button
                      type="button"
                      onClick={handleBackfill}
                      disabled={backfillLoading}
                      className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-60"
                      title="If you already uploaded/scraped data before, this imports it into the Verify list."
                    >
                      {backfillLoading ? 'Importing…' : 'Import POIs from History'}
                    </button>
                  )}
                </div>
              </div>
            </div>

            {section === 'pois' ? (
              /* POI List */
              <div className="space-y-4">
                {filteredPois.length === 0 ? (
                  <div className="bg-white rounded-lg shadow-sm p-12 text-center">
                    <div className="text-6xl mb-4">🔍</div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">No POIs Found</h3>
                    <p className="text-gray-600">
                      {stats.total === 0
                        ? 'You have no POIs yet. Upload a file / scrape a URL, or import from history.'
                        : 'Try adjusting your search or filters'}
                    </p>
                    {!loading && stats.total === 0 && (
                      <div className="mt-4">
                        <button
                          type="button"
                          onClick={handleBackfill}
                          disabled={backfillLoading}
                          className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-60"
                        >
                          {backfillLoading ? 'Importing…' : 'Import POIs from History'}
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  filteredPois.map((poi) => {
                    const badName = looksLikeBadPoiName(poi.name);
                    return (
                      <div
                        key={poi.id}
                        className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="text-xl font-semibold text-gray-900">{poi.name}</h3>
                              {poi.verified && (
                                <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full">
                                  ✓ Verified
                                </span>
                              )}
                              {poi.promoted_to_main && (
                                <span className="px-2 py-1 bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-full">
                                  ★ Promoted
                                </span>
                              )}
                              {poi.enhanced && (
                                <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full">
                                  ✨ Enhanced
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                              <span className="flex items-center gap-1">📍 {poi.destination || '—'}</span>
                              <span className="flex items-center gap-1">🏷️ {poi.category || '—'}</span>
                            </div>
                          </div>

                          <div className="text-right">
                            <div className={`text-2xl font-bold ${getScoreColor(poi.confidence_score)}`}>
                              {poi.confidence_score}%
                            </div>
                            <div className="text-xs text-gray-500">Confidence</div>
                          </div>
                        </div>

                        <p className="text-gray-700 text-sm mb-4 leading-relaxed">{poi.description || '—'}</p>

                        <div className="flex items-center gap-3 mb-4">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-semibold ${getQualityColor(
                              getQualityFromScore(poi.confidence_score)
                            )}`}
                          >
                            {getQualityFromScore(poi.confidence_score).toUpperCase()}
                          </span>

                          {poi.luxury_score !== null && poi.luxury_score !== undefined && (
                            <span className="px-3 py-1 bg-lexa-gold/10 text-lexa-navy rounded-full text-xs font-semibold">
                              ⭐ Luxury: {poi.luxury_score}
                            </span>
                          )}

                          {(poi.keywords || []).slice(0, 6).map((tag, idx) => (
                            <span key={idx} className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                              #{tag}
                            </span>
                          ))}
                        </div>

                        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                          <div className="text-xs text-gray-500">
                            Updated {new Date(poi.updated_at).toLocaleDateString()}
                          </div>

                          <div className="flex gap-2">
                            <button
                              onClick={() => handleEnrich(poi)}
                              disabled={badName}
                              className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-semibold hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              title={
                                badName
                                  ? 'Fix the POI name first (it currently looks like a sentence fragment). Click "Edit & Enhance" and replace it with the real place name.'
                                  : 'Auto-fill missing data using Tavily + Claude (with citations).'
                              }
                            >
                              ⚡ Enrich
                            </button>
                            {!poi.verified && (
                              <button
                                onClick={() => handleVerify(poi)}
                                className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 transition-colors"
                              >
                                ✓ Verify
                              </button>
                            )}
                            {poi.verified && !poi.promoted_to_main && (
                              <button
                                onClick={() => handlePromote(poi)}
                                className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors"
                              >
                                ★ Promote
                              </button>
                            )}
                            <button
                              onClick={() => handleEdit(poi)}
                              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors"
                            >
                              ✏️ Edit & Enhance
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            ) : (
              /* Nuggets List */
              <div className="space-y-4">
                {nuggetsLoading ? (
                  <div className="bg-white rounded-lg shadow-sm p-12 text-center text-gray-600">Loading nuggets…</div>
                ) : filteredNuggets.length === 0 ? (
                  <div className="bg-white rounded-lg shadow-sm p-12 text-center">
                    <div className="text-6xl mb-4">📥</div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">No Nuggets</h3>
                    <p className="text-gray-600">When ingestion finds “sentence fragment POIs”, they will show up here.</p>
                  </div>
                ) : (
                  filteredNuggets.map((n) => (
                    <div
                      key={n.id}
                      className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between gap-6">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs font-semibold rounded-full">
                              {n.nugget_type}
                            </span>
                            <span className="text-sm text-gray-600">📍 {n.destination || '—'}</span>
                            <span className="text-xs text-gray-500">
                              Updated {new Date(n.updated_at).toLocaleDateString()}
                            </span>
                          </div>

                          <div className="text-gray-900 font-semibold mb-2">
                            Suggested POI: {String((n.enrichment as any)?.suggested_poi_name || '—')}
                          </div>

                          <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">
                            {n.text.length > 600 ? `${n.text.slice(0, 600)}…` : n.text}
                          </p>
                        </div>

                        <div className="shrink-0 flex flex-col gap-2">
                          <button
                            onClick={() => handleNuggetEnrich(n)}
                            className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-semibold hover:bg-purple-700 disabled:opacity-60"
                          >
                            ⚡ Enrich
                          </button>
                          <button
                            onClick={() => handleConvertNuggetToPoi(n)}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-60"
                          >
                            ✨ Convert to POI
                          </button>
                          <button
                            onClick={() => handleDeleteNugget(n)}
                            className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg text-sm font-semibold hover:bg-gray-300 disabled:opacity-60"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </>
        )}

        {/* EDIT VIEW */}
        {viewMode === 'edit' && selectedPoi && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-semibold text-gray-900">
                ✏️ Edit & Enhance POI
              </h2>
              <button
                onClick={() => {
                  setViewMode('list');
                  setSelectedPoi(null);
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">POI Name</label>
                <input
                  type="text"
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                  <select
                    value={editedCategory}
                    onChange={(e) => setEditedCategory(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="restaurant">Restaurant</option>
                    <option value="hotel">Hotel</option>
                    <option value="attraction">Attraction</option>
                    <option value="activity">Activity</option>
                    <option value="experience">Experience</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
                  <input
                    type="text"
                    value={editedLocation}
                    onChange={(e) => setEditedLocation(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea
                  value={editedDescription}
                  onChange={(e) => setEditedDescription(e.target.value)}
                  rows={6}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
                <p className="text-xs text-gray-500 mt-1">
                  💡 Enhance with specific details, emotional resonance, and unique features
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tags (comma-separated)</label>
                <input
                  type="text"
                  value={editedTags}
                  onChange={(e) => setEditedTags(e.target.value)}
                  placeholder="luxury, romantic, michelin, waterfront"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Confidence Score: {editedConfidence}%
                    {editedConfidence > 80 && !selectedPoi.verified && (
                      <span className="ml-2 text-orange-600 text-xs">⚠️ Requires Verification</span>
                    )}
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={editedConfidence}
                    onChange={(e) => setEditedConfidence(parseInt(e.target.value))}
                    className="w-full"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Scores &gt;80% require verification (captain approval)
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Luxury Score: {editedLuxuryScore}
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="10"
                    value={editedLuxuryScore}
                    onChange={(e) => setEditedLuxuryScore(parseInt(e.target.value))}
                    className="w-full"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    How exclusive/luxurious is this POI?
                  </p>
                </div>
              </div>

              <div className="flex gap-3 pt-6 border-t border-gray-200">
                <button
                  onClick={handleSave}
                  className="flex-1 px-6 py-4 bg-blue-600 text-white rounded-lg font-semibold text-lg hover:bg-blue-700 transition-colors"
                >
                  💾 Save Changes
                </button>
                <button
                  onClick={() => {
                    setViewMode('list');
                    setSelectedPoi(null);
                  }}
                  className="px-6 py-4 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

    </PortalShell>
  );
}
