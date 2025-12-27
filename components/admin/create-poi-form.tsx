'use client';

import { useState } from 'react';

interface CreatePOIFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

const POI_TYPES = [
  'restaurant',
  'hotel',
  'beach_club',
  'marina',
  'yacht_club',
  'spa',
  'golf_course',
  'nightclub',
  'bar',
  'lounge',
  'shopping',
  'boutique',
  'gallery',
  'museum',
  'landmark',
  'viewpoint',
  'beach',
  'cove',
  'anchorage',
  'port',
  'casino',
  'theater',
  'concert_hall',
  'other',
];

const COMMON_THEMES = [
  'Luxury Dining',
  'Fine Dining',
  'Beach & Sun',
  'Water Sports',
  'Nightlife',
  'Wellness & Spa',
  'Shopping',
  'Culture & Art',
  'Adventure',
  'Romance',
  'Family',
  'Yachting',
];

const COMMON_ACTIVITIES = [
  'Fine Dining',
  'Beach Lounging',
  'Swimming',
  'Snorkeling',
  'Diving',
  'Water Sports',
  'Sunbathing',
  'Spa & Wellness',
  'Shopping',
  'Nightclub',
  'Cocktails',
  'Wine Tasting',
  'Yachting',
  'Sailing',
];

export function CreatePOIForm({ onSuccess, onCancel }: CreatePOIFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    type: 'restaurant',
    destination_name: '',
    lat: '',
    lon: '',
    luxury_score_base: '',
    confidence_score: '',
    score_evidence: '',
    captain_comments: '',
    description: '',
    themes: [] as string[],
    activities: [] as string[],
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      // Validation
      if (!formData.name || !formData.destination_name || !formData.lat || !formData.lon) {
        throw new Error('Please fill in all required fields');
      }

      const lat = parseFloat(formData.lat);
      const lon = parseFloat(formData.lon);

      if (isNaN(lat) || isNaN(lon)) {
        throw new Error('Invalid coordinates');
      }

      if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
        throw new Error('Coordinates out of range');
      }

      const payload: any = {
        name: formData.name,
        type: formData.type,
        destination_name: formData.destination_name,
        lat,
        lon,
      };

      if (formData.luxury_score_base) {
        payload.luxury_score_base = parseFloat(formData.luxury_score_base);
      }
      if (formData.confidence_score) {
        payload.confidence_score = parseFloat(formData.confidence_score);
      }
      if (formData.score_evidence) {
        const raw = formData.score_evidence.trim();
        payload.score_evidence = raw.startsWith('{') ? raw : JSON.stringify({ notes: raw });
      }
      if (formData.captain_comments) {
        payload.captain_comments = formData.captain_comments;
      }
      if (formData.description) {
        payload.description = formData.description;
      }
      if (formData.themes.length > 0) {
        payload.themes = formData.themes;
      }
      if (formData.activities.length > 0) {
        payload.activities = formData.activities;
      }

      const response = await fetch('/api/knowledge/poi/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create POI');
      }

      setSuccess(true);
      setTimeout(() => {
        if (onSuccess) onSuccess();
      }, 1500);

    } catch (err) {
      console.error('POI creation error:', err);
      setError(err instanceof Error ? err.message : 'Failed to create POI');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleTheme = (theme: string) => {
    setFormData(prev => ({
      ...prev,
      themes: prev.themes.includes(theme)
        ? prev.themes.filter(t => t !== theme)
        : [...prev.themes, theme]
    }));
  };

  const toggleActivity = (activity: string) => {
    setFormData(prev => ({
      ...prev,
      activities: prev.activities.includes(activity)
        ? prev.activities.filter(a => a !== activity)
        : [...prev.activities, activity]
    }));
  };

  if (success) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
        <div className="text-6xl mb-4">✅</div>
        <h3 className="text-2xl font-bold text-green-600 mb-2">POI Created Successfully!</h3>
        <p className="text-zinc-600">The new POI has been added to the database.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg p-8">
      <h2 className="text-3xl font-bold text-lexa-navy mb-6">Create New POI</h2>

      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Name */}
        <div>
          <label className="block text-sm font-semibold text-lexa-navy mb-2">
            POI Name *
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g., Club 55"
            className="w-full px-4 py-2 border-2 border-zinc-200 rounded-lg focus:border-lexa-gold focus:outline-none"
            required
          />
        </div>

        {/* Type & Destination */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-lexa-navy mb-2">
              Type *
            </label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              className="w-full px-4 py-2 border-2 border-zinc-200 rounded-lg focus:border-lexa-gold focus:outline-none"
              required
            >
              {POI_TYPES.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-lexa-navy mb-2">
              Destination *
            </label>
            <input
              type="text"
              value={formData.destination_name}
              onChange={(e) => setFormData({ ...formData, destination_name: e.target.value })}
              placeholder="e.g., St. Tropez"
              className="w-full px-4 py-2 border-2 border-zinc-200 rounded-lg focus:border-lexa-gold focus:outline-none"
              required
            />
          </div>
        </div>

        {/* Coordinates */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-lexa-navy mb-2">
              Latitude *
            </label>
            <input
              type="number"
              step="any"
              value={formData.lat}
              onChange={(e) => setFormData({ ...formData, lat: e.target.value })}
              placeholder="e.g., 43.2346"
              className="w-full px-4 py-2 border-2 border-zinc-200 rounded-lg focus:border-lexa-gold focus:outline-none"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-lexa-navy mb-2">
              Longitude *
            </label>
            <input
              type="number"
              step="any"
              value={formData.lon}
              onChange={(e) => setFormData({ ...formData, lon: e.target.value })}
              placeholder="e.g., 6.6789"
              className="w-full px-4 py-2 border-2 border-zinc-200 rounded-lg focus:border-lexa-gold focus:outline-none"
              required
            />
          </div>
        </div>

        {/* Luxury Score & Confidence (canonical) */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-lexa-navy mb-2">
              Luxury Score Base (0-10)
            </label>
            <input
              type="number"
              step="0.1"
              min="0"
              max="10"
              value={formData.luxury_score_base}
              onChange={(e) => setFormData({ ...formData, luxury_score_base: e.target.value })}
              placeholder="e.g., 9.5"
              className="w-full px-4 py-2 border-2 border-zinc-200 rounded-lg focus:border-lexa-gold focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-lexa-navy mb-2">
              Confidence Score (0-1)
            </label>
            <input
              type="number"
              step="0.1"
              min="0"
              max="1"
              value={formData.confidence_score}
              onChange={(e) => setFormData({ ...formData, confidence_score: e.target.value })}
              placeholder="e.g., 0.95"
              className="w-full px-4 py-2 border-2 border-zinc-200 rounded-lg focus:border-lexa-gold focus:outline-none"
            />
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-semibold text-lexa-navy mb-2">
            Description
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={2}
            placeholder="Brief description of the POI..."
            className="w-full px-4 py-2 border-2 border-zinc-200 rounded-lg focus:border-lexa-gold focus:outline-none"
          />
        </div>

        {/* Score Evidence (JSON) */}
        <div>
          <label className="block text-sm font-semibold text-lexa-navy mb-2">
            Score Evidence (JSON)
          </label>
          <textarea
            value={formData.score_evidence}
            onChange={(e) => setFormData({ ...formData, score_evidence: e.target.value })}
            rows={2}
            placeholder="Why this luxury score? What makes it special?"
            className="w-full px-4 py-2 border-2 border-zinc-200 rounded-lg focus:border-lexa-gold focus:outline-none"
          />
        </div>

        {/* Captain Comments */}
        <div>
          <label className="block text-sm font-semibold text-lexa-navy mb-2">
            Captain Comments & Insider Knowledge
          </label>
          <textarea
            value={formData.captain_comments}
            onChange={(e) => setFormData({ ...formData, captain_comments: e.target.value })}
            rows={3}
            placeholder="Share your insider tips, best times to visit, booking advice, etc..."
            className="w-full px-4 py-2 border-2 border-zinc-200 rounded-lg focus:border-lexa-gold focus:outline-none"
          />
        </div>

        {/* Themes */}
        <div>
          <label className="block text-sm font-semibold text-lexa-navy mb-2">
            Themes (select all that apply)
          </label>
          <div className="flex flex-wrap gap-2">
            {COMMON_THEMES.map(theme => (
              <button
                key={theme}
                type="button"
                onClick={() => toggleTheme(theme)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  formData.themes.includes(theme)
                    ? 'bg-lexa-gold text-white'
                    : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
                }`}
              >
                {theme}
              </button>
            ))}
          </div>
        </div>

        {/* Activities */}
        <div>
          <label className="block text-sm font-semibold text-lexa-navy mb-2">
            Activities (select all that apply)
          </label>
          <div className="flex flex-wrap gap-2">
            {COMMON_ACTIVITIES.map(activity => (
              <button
                key={activity}
                type="button"
                onClick={() => toggleActivity(activity)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  formData.activities.includes(activity)
                    ? 'bg-purple-500 text-white'
                    : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
                }`}
              >
                {activity}
              </button>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-6 py-2 border-2 border-zinc-300 text-zinc-700 rounded-lg hover:bg-zinc-50"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-2 bg-lexa-gold text-white rounded-lg hover:bg-lexa-gold/90 disabled:opacity-50 flex items-center"
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                Creating...
              </>
            ) : (
              'Create POI'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

