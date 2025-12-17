'use client';

import { useState, useEffect } from 'react';

interface POIDetail {
  poi_uid: string;
  name: string;
  type: string | null;
  destination_name: string | null;
  lat: number;
  lon: number;
  luxury_score: number | null;
  luxury_confidence: number | null;
  luxury_evidence: string | null;
  source: string;
  source_id: string;
  updated_at: string | null;
  scored_at: string | null;
  captain_comments: string | null;
  last_edited_by: string | null;
  last_edited_at: string | null;
  relationships: {
    destinations: string[];
    themes: string[];
    activities: string[];
    emotions: string[];
  };
}

interface POIEditModalProps {
  poiId: string;
  onClose: () => void;
  onSaved: () => void;
}

export function POIEditModal({ poiId, onClose, onSaved }: POIEditModalProps) {
  const [poi, setPoi] = useState<POIDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    type: '',
    luxury_score: '',
    luxury_confidence: '',
    luxury_evidence: '',
    captain_comments: '',
  });

  // Fetch POI details
  useEffect(() => {
    const fetchPOI = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`/api/knowledge/poi/${poiId}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch POI details');
        }

        const data = await response.json();
        setPoi(data.poi);

        // Initialize form with current values
        setFormData({
          name: data.poi.name || '',
          type: data.poi.type || '',
          luxury_score: data.poi.luxury_score?.toString() || '',
          luxury_confidence: data.poi.luxury_confidence?.toString() || '',
          luxury_evidence: data.poi.luxury_evidence || '',
          captain_comments: data.poi.captain_comments || '',
        });

      } catch (err) {
        console.error('Failed to fetch POI:', err);
        setError('Failed to load POI details');
      } finally {
        setIsLoading(false);
      }
    };

    fetchPOI();
  }, [poiId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      // Prepare update payload
      const updates: any = {};

      if (formData.name !== poi?.name) updates.name = formData.name;
      if (formData.type !== poi?.type) updates.type = formData.type || null;
      if (formData.luxury_score !== poi?.luxury_score?.toString()) {
        updates.luxury_score = formData.luxury_score ? parseFloat(formData.luxury_score) : null;
      }
      if (formData.luxury_confidence !== poi?.luxury_confidence?.toString()) {
        updates.luxury_confidence = formData.luxury_confidence ? parseFloat(formData.luxury_confidence) : null;
      }
      if (formData.luxury_evidence !== poi?.luxury_evidence) {
        updates.luxury_evidence = formData.luxury_evidence || null;
      }
      if (formData.captain_comments !== poi?.captain_comments) {
        updates.captain_comments = formData.captain_comments || null;
      }

      if (Object.keys(updates).length === 0) {
        setError('No changes to save');
        setIsSaving(false);
        return;
      }

      const response = await fetch(`/api/knowledge/poi/${poiId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update POI');
      }

      setSuccessMessage('POI updated successfully!');
      setTimeout(() => {
        onSaved();
        onClose();
      }, 1500);

    } catch (err) {
      console.error('Update error:', err);
      setError(err instanceof Error ? err.message : 'Failed to update POI');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8 max-w-2xl w-full mx-4">
          <div className="flex items-center justify-center">
            <div className="animate-spin h-8 w-8 border-4 border-lexa-gold border-t-transparent rounded-full"></div>
            <span className="ml-3 text-lexa-navy">Loading POI details...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error && !poi) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8 max-w-2xl w-full mx-4">
          <h2 className="text-2xl font-bold text-red-500 mb-4">Error</h2>
          <p className="text-zinc-700">{error}</p>
          <button
            onClick={onClose}
            className="mt-4 px-4 py-2 bg-lexa-navy text-white rounded-lg hover:bg-lexa-navy/90"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-y-auto">
      <div className="bg-white rounded-lg p-8 max-w-4xl w-full mx-4 my-8">
        {/* Header */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-3xl font-bold text-lexa-navy mb-2">Edit POI</h2>
            <p className="text-sm text-zinc-500">ID: {poi?.poi_uid}</p>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-lexa-navy text-2xl"
          >
            ✕
          </button>
        </div>

        {/* Success/Error Messages */}
        {successMessage && (
          <div className="mb-4 p-3 bg-green-100 text-green-700 rounded-lg">
            {successMessage}
          </div>
        )}
        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        {/* POI Info Card */}
        <div className="bg-lexa-bg rounded-lg p-4 mb-6">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-zinc-500">Source:</span>
              <span className="ml-2 font-semibold text-lexa-navy">{poi?.source}</span>
            </div>
            <div>
              <span className="text-zinc-500">Location:</span>
              <span className="ml-2 font-semibold text-lexa-navy">
                {poi?.lat.toFixed(4)}, {poi?.lon.toFixed(4)}
              </span>
            </div>
            <div>
              <span className="text-zinc-500">Last Edited:</span>
              <span className="ml-2 font-semibold text-lexa-navy">
                {poi?.last_edited_by || 'Never'}
              </span>
            </div>
            <div>
              <span className="text-zinc-500">Scored:</span>
              <span className="ml-2 font-semibold text-lexa-navy">
                {poi?.scored_at ? new Date(poi.scored_at).toLocaleDateString() : 'Not scored'}
              </span>
            </div>
          </div>

          {/* Relationships */}
          {poi && (
            <div className="mt-4 pt-4 border-t border-zinc-200">
              <div className="text-sm text-zinc-500 mb-2">Relationships:</div>
              <div className="flex flex-wrap gap-2">
                {poi.relationships.destinations.map((d, i) => (
                  <span key={i} className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                    📍 {d}
                  </span>
                ))}
                {poi.relationships.themes.map((t, i) => (
                  <span key={i} className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs">
                    🎨 {t}
                  </span>
                ))}
                {poi.relationships.activities.map((a, i) => (
                  <span key={i} className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">
                    ⚡ {a}
                  </span>
                ))}
                {poi.relationships.emotions.map((e, i) => (
                  <span key={i} className="px-2 py-1 bg-orange-100 text-orange-700 rounded text-xs">
                    ❤️ {e}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Edit Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Name */}
          <div>
            <label className="block text-sm font-semibold text-lexa-navy mb-2">
              POI Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 border-2 border-zinc-200 rounded-lg focus:border-lexa-gold focus:outline-none"
              required
            />
          </div>

          {/* Type */}
          <div>
            <label className="block text-sm font-semibold text-lexa-navy mb-2">
              Type
            </label>
            <input
              type="text"
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              placeholder="e.g., restaurant, hotel, beach_club"
              className="w-full px-4 py-2 border-2 border-zinc-200 rounded-lg focus:border-lexa-gold focus:outline-none"
            />
          </div>

          {/* Luxury Score & Confidence */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-lexa-navy mb-2">
                Luxury Score (0-10)
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="10"
                value={formData.luxury_score}
                onChange={(e) => setFormData({ ...formData, luxury_score: e.target.value })}
                className="w-full px-4 py-2 border-2 border-zinc-200 rounded-lg focus:border-lexa-gold focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-lexa-navy mb-2">
                Confidence (0-1)
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="1"
                value={formData.luxury_confidence}
                onChange={(e) => setFormData({ ...formData, luxury_confidence: e.target.value })}
                className="w-full px-4 py-2 border-2 border-zinc-200 rounded-lg focus:border-lexa-gold focus:outline-none"
              />
            </div>
          </div>

          {/* Luxury Evidence */}
          <div>
            <label className="block text-sm font-semibold text-lexa-navy mb-2">
              Luxury Evidence
            </label>
            <textarea
              value={formData.luxury_evidence}
              onChange={(e) => setFormData({ ...formData, luxury_evidence: e.target.value })}
              rows={3}
              placeholder="Why this score? What makes it luxurious?"
              className="w-full px-4 py-2 border-2 border-zinc-200 rounded-lg focus:border-lexa-gold focus:outline-none"
            />
          </div>

          {/* Captain Comments */}
          <div>
            <label className="block text-sm font-semibold text-lexa-navy mb-2">
              Captain Comments & Wisdom
            </label>
            <textarea
              value={formData.captain_comments}
              onChange={(e) => setFormData({ ...formData, captain_comments: e.target.value })}
              rows={4}
              placeholder="Add your insider knowledge, tips, experiences with this location..."
              className="w-full px-4 py-2 border-2 border-zinc-200 rounded-lg focus:border-lexa-gold focus:outline-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border-2 border-zinc-300 text-zinc-700 rounded-lg hover:bg-zinc-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-2 bg-lexa-gold text-white rounded-lg hover:bg-lexa-gold/90 disabled:opacity-50 flex items-center"
            >
              {isSaving ? (
                <>
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

