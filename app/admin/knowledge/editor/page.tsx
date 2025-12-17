'use client';

/**
 * Captain's Knowledge Editor - Enhanced
 * Rich editor with URL scraping, coordinates, photos, and best practices
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { InfoTooltip } from '@/components/knowledge/info-tooltip';
import { POISearch } from '@/components/admin/poi-search';
import { POIEditModal } from '@/components/admin/poi-edit-modal';
import { CreatePOIForm } from '@/components/admin/create-poi-form';

interface KnowledgeEntry {
  title: string;
  content: string;
  topic: string;
  tags: string[];
  appliesTo: string[];
  confidence: number;
  // New fields
  url?: string;
  coordinates?: {
    lat: number | null;
    lon: number | null;
  };
  photos: Array<{
    file: File;
    preview: string;
    url?: string;
  }>;
  uniqueRequests?: string;
  neverThoughtPossible?: string;
  bestPractices: {
    toys?: string;
    activities?: string;
    concierge?: string;
    agents?: string;
  };
}

const TOPICS = [
  'Best Time to Visit',
  'Insider Tips',
  'Hidden Gems',
  'Things to Avoid',
  'Local Customs',
  'Transportation',
  'Accommodation',
  'Dining Recommendations',
  'Activities & Experiences',
  'Practical Advice',
  'Safety & Security',
  'Budget Tips',
  'Luxury Recommendations',
  'Cultural Insights',
  'Yacht Operations',
  'Guest Services',
  'Concierge Service',
  'Agent',
  'Yacht Broker',
  'Other',
];

export default function KnowledgeEditorPage() {
  const router = useRouter();
  const [entry, setEntry] = useState<KnowledgeEntry>({
    title: '',
    content: '',
    topic: 'Insider Tips',
    tags: [],
    appliesTo: [],
    confidence: 80,
    url: '',
    coordinates: {
      lat: null,
      lon: null,
    },
    photos: [],
    uniqueRequests: '',
    neverThoughtPossible: '',
    bestPractices: {
      toys: '',
      activities: '',
      concierge: '',
      agents: '',
    },
  });
  const [tagInput, setTagInput] = useState('');
  const [destinationInput, setDestinationInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isScrapingUrl, setIsScrapingUrl] = useState(false);
  
  // POI search & edit state
  const [selectedPOIId, setSelectedPOIId] = useState<string | null>(null);
  const [showPOIModal, setShowPOIModal] = useState(false);
  const [showCreatePOI, setShowCreatePOI] = useState(false);

  const addTag = () => {
    if (tagInput.trim() && !entry.tags.includes(tagInput.trim())) {
      setEntry(prev => ({
        ...prev,
        tags: [...prev.tags, tagInput.trim()],
      }));
      setTagInput('');
    }
  };

  const removeTag = (tag: string) => {
    setEntry(prev => ({
      ...prev,
      tags: prev.tags.filter(t => t !== tag),
    }));
  };

  const addDestination = () => {
    if (destinationInput.trim() && !entry.appliesTo.includes(destinationInput.trim())) {
      setEntry(prev => ({
        ...prev,
        appliesTo: [...prev.appliesTo, destinationInput.trim()],
      }));
      setDestinationInput('');
    }
  };

  const removeDestination = (dest: string) => {
    setEntry(prev => ({
      ...prev,
      appliesTo: prev.appliesTo.filter(d => d !== dest),
    }));
  };

  const scrapeUrl = async () => {
    if (!entry.url) {
      alert('Please enter a URL first');
      return;
    }

    setIsScrapingUrl(true);

    try {
      const response = await fetch('/api/knowledge/scrape-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: entry.url }),
      });

      if (!response.ok) {
        throw new Error('Failed to scrape URL');
      }

      const data = await response.json();

      // Populate fields with scraped data
      if (data.title && !entry.title) {
        setEntry(prev => ({ ...prev, title: data.title }));
      }
      if (data.content) {
        setEntry(prev => ({ ...prev, content: prev.content + '\n\n' + data.content }));
      }
      if (data.tags && data.tags.length > 0) {
        setEntry(prev => ({
          ...prev,
          tags: [...new Set([...prev.tags, ...data.tags])],
        }));
      }

      alert('URL content extracted successfully!');
    } catch (error) {
      console.error('Error scraping URL:', error);
      alert('Failed to scrape URL. Please try again or enter content manually.');
    } finally {
      setIsScrapingUrl(false);
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newPhotos = Array.from(files).map(file => ({
      file,
      preview: URL.createObjectURL(file),
    }));

    setEntry(prev => ({
      ...prev,
      photos: [...prev.photos, ...newPhotos],
    }));
  };

  const removePhoto = (idx: number) => {
    setEntry(prev => ({
      ...prev,
      photos: prev.photos.filter((_, i) => i !== idx),
    }));
  };

  const saveEntry = async () => {
    if (!entry.title.trim() || !entry.content.trim()) {
      alert('Please fill in title and content');
      return;
    }

    setIsSaving(true);

    try {
      // Upload photos first
      const photoUrls: string[] = [];
      for (const photo of entry.photos) {
        const formData = new FormData();
        formData.append('file', photo.file);

        const uploadResponse = await fetch('/api/knowledge/upload-photo', {
          method: 'POST',
          body: formData,
        });

        if (uploadResponse.ok) {
          const uploadData = await uploadResponse.json();
          photoUrls.push(uploadData.url);
        }
      }

      // Save knowledge entry
      const response = await fetch('/api/knowledge/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...entry,
          photoUrls,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save knowledge');
      }

      const data = await response.json();

      alert('Knowledge saved successfully!');
      router.push('/admin/knowledge');
    } catch (error) {
      console.error('Error saving knowledge:', error);
      alert('Failed to save knowledge. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-50 via-white to-zinc-100">
      <div className="max-w-5xl mx-auto p-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push('/admin/knowledge')}
            className="text-lexa-navy hover:text-lexa-gold mb-4 flex items-center gap-2"
          >
            ← Back to Portal
          </button>
          <h1 className="text-4xl font-bold text-lexa-navy mb-2">
            Share Your Knowledge
          </h1>
          <p className="text-zinc-600">
            Add your expertise to help LEXA create extraordinary experiences
          </p>
        </div>

        {/* POI Search & Edit Section */}
        <div className="bg-gradient-to-r from-lexa-navy to-lexa-gold p-6 rounded-2xl shadow-lg mb-8">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">
                🔍 Edit Existing POIs
              </h2>
              <p className="text-white/90 text-sm">
                Search for locations like &quot;Club55&quot;, &quot;St. Tropez&quot;, or &quot;Monaco&quot; to update luxury scores, add comments, and share your insider knowledge
              </p>
            </div>
            <button
              onClick={() => setShowCreatePOI(true)}
              className="px-4 py-2 bg-white text-lexa-navy rounded-lg font-semibold hover:shadow-lg transition-all"
            >
              ➕ Create New POI
            </button>
          </div>
          <POISearch 
            onSelectPOI={(poi) => {
              setSelectedPOIId(poi.poi_uid);
              setShowPOIModal(true);
            }}
          />
        </div>

        {/* Form */}
        <div className="bg-white rounded-2xl shadow-lg p-8 space-y-6">
          {/* Title */}
          <div>
            <label className="flex items-center gap-2 text-lg font-semibold text-lexa-navy mb-2">
              Title
              <InfoTooltip text="Give your knowledge entry a clear, descriptive title. Example: 'Best Anchorages in Croatian Islands' or 'Booking Tips for Monaco Grand Prix'" />
            </label>
            <input
              type="text"
              value={entry.title}
              onChange={(e) => setEntry(prev => ({ ...prev, title: e.target.value }))}
              placeholder="e.g., Ultimate Guide to Yacht Provisioning in Montenegro"
              className="w-full px-4 py-3 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-lexa-gold focus:border-transparent"
            />
          </div>

          {/* URL Field */}
          <div>
            <label className="flex items-center gap-2 text-lg font-semibold text-lexa-navy mb-2">
              Source URL (Optional)
              <InfoTooltip text="Paste article URLs, blog posts, or destination guides. We'll extract the content automatically to help you get started faster." />
            </label>
            <div className="flex gap-2">
              <input
                type="url"
                value={entry.url}
                onChange={(e) => setEntry(prev => ({ ...prev, url: e.target.value }))}
                placeholder="https://example.com/best-adriatic-restaurants"
                className="flex-1 px-4 py-3 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-lexa-gold focus:border-transparent"
              />
              <button
                onClick={scrapeUrl}
                disabled={isScrapingUrl || !entry.url}
                className="px-6 py-3 bg-lexa-navy text-white rounded-lg hover:bg-lexa-gold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isScrapingUrl ? 'Scraping...' : 'Extract Content'}
              </button>
            </div>
          </div>

          {/* Topic */}
          <div>
            <label className="flex items-center gap-2 text-lg font-semibold text-lexa-navy mb-2">
              Topic
              <InfoTooltip text="Select the category that best matches your knowledge. This helps LEXA find the right information at the right time." />
            </label>
            <select
              value={entry.topic}
              onChange={(e) => setEntry(prev => ({ ...prev, topic: e.target.value }))}
              className="w-full px-4 py-3 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-lexa-gold focus:border-transparent"
            >
              {TOPICS.map(topic => (
                <option key={topic} value={topic}>
                  {topic}
                </option>
              ))}
            </select>
          </div>

          {/* Content */}
          <div>
            <label className="flex items-center gap-2 text-lg font-semibold text-lexa-navy mb-2">
              Content
              <InfoTooltip text="Share your detailed knowledge, tips, and insights. Be specific and include examples. The more detail, the better LEXA can help guests." />
            </label>
            <textarea
              value={entry.content}
              onChange={(e) => setEntry(prev => ({ ...prev, content: e.target.value }))}
              placeholder="Share your insights, tips, and detailed recommendations..."
              rows={10}
              className="w-full px-4 py-3 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-lexa-gold focus:border-transparent font-mono text-sm"
            />
            <p className="text-sm text-zinc-500 mt-1">{entry.content.length} characters</p>
          </div>

          {/* Location Coordinates */}
          <div>
            <label className="flex items-center gap-2 text-lg font-semibold text-lexa-navy mb-2">
              Location Coordinates (Optional)
              <InfoTooltip text="Enter exact coordinates or click map to select. Helps LEXA recommend precise locations. Example: 43.7384, 7.4246 for Monaco" />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <input
                type="number"
                step="any"
                value={entry.coordinates?.lat || ''}
                onChange={(e) => setEntry(prev => ({
                  ...prev,
                  coordinates: { ...prev.coordinates!, lat: e.target.value ? parseFloat(e.target.value) : null }
                }))}
                placeholder="Latitude (e.g., 43.7384)"
                className="px-4 py-3 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-lexa-gold focus:border-transparent"
              />
              <input
                type="number"
                step="any"
                value={entry.coordinates?.lon || ''}
                onChange={(e) => setEntry(prev => ({
                  ...prev,
                  coordinates: { ...prev.coordinates!, lon: e.target.value ? parseFloat(e.target.value) : null }
                }))}
                placeholder="Longitude (e.g., 7.4246)"
                className="px-4 py-3 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-lexa-gold focus:border-transparent"
              />
            </div>
          </div>

          {/* Photos */}
          <div>
            <label className="flex items-center gap-2 text-lg font-semibold text-lexa-navy mb-2">
              Photos (Optional)
              <InfoTooltip text="Add photos of locations, amenities, or experiences. Visual context helps LEXA recommendations. You can upload multiple photos." />
            </label>
            <div className="flex gap-3 mb-3">
              <label className="cursor-pointer px-4 py-2 bg-lexa-navy text-white rounded-lg hover:bg-lexa-gold transition-colors">
                📁 Upload Photos
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
              </label>

              <label className="cursor-pointer px-4 py-2 bg-lexa-navy text-white rounded-lg hover:bg-lexa-gold transition-colors">
                📷 Take Photo
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
              </label>
            </div>

            {/* Photo preview grid */}
            {entry.photos.length > 0 && (
              <div className="grid grid-cols-4 gap-2">
                {entry.photos.map((photo, idx) => (
                  <div key={idx} className="relative group">
                    <img
                      src={photo.preview}
                      alt={`Upload ${idx + 1}`}
                      className="w-full h-32 object-cover rounded-lg"
                    />
                    <button
                      onClick={() => removePhoto(idx)}
                      className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Unique Guest Requests */}
          <div>
            <label className="flex items-center gap-2 text-lg font-semibold text-lexa-navy mb-2">
              Unique Guest Requests (Optional)
              <InfoTooltip text="Unusual or extraordinary requests you've fulfilled. Helps LEXA understand what's possible for luxury travelers. Be specific about how you made it happen." />
            </label>
            <textarea
              value={entry.uniqueRequests}
              onChange={(e) => setEntry(prev => ({ ...prev, uniqueRequests: e.target.value }))}
              placeholder="e.g., Private dinner in underwater cave (organized through local dive operator), Helicopter transfer to secluded beach (coordinated with Monaco Helicopters), Chef flown in from Michelin-star restaurant (3-day advance booking required)..."
              rows={4}
              className="w-full px-4 py-3 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-lexa-gold focus:border-transparent"
            />
          </div>

          {/* Never Thought Possible */}
          <div>
            <label className="flex items-center gap-2 text-lg font-semibold text-lexa-navy mb-2">
              Things Never Thought Possible (Optional)
              <InfoTooltip text="Experiences that exceeded expectations or seemed impossible. These become LEXA's 'wow factor' recommendations. Share the story and the outcome." />
            </label>
            <textarea
              value={entry.neverThoughtPossible}
              onChange={(e) => setEntry(prev => ({ ...prev, neverThoughtPossible: e.target.value }))}
              placeholder="e.g., Swimming with bioluminescent plankton at midnight in a hidden bay near Hvar, Private tour of closed archaeological site through personal connection with curator, Cooking class with local fisherman's family who rarely accept guests..."
              rows={4}
              className="w-full px-4 py-3 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-lexa-gold focus:border-transparent"
            />
          </div>

          {/* Best Practices */}
          <div>
            <label className="flex items-center gap-2 text-lg font-semibold text-lexa-navy mb-3">
              Best Practices (Optional)
              <InfoTooltip text="Your expertise on yacht operations, guest services, and luxury details. Share operational knowledge that helps deliver perfect experiences." />
            </label>

            <div className="space-y-4 ml-4">
              {/* Water Toys */}
              <div>
                <label className="text-sm font-semibold text-zinc-700 mb-1 block">
                  Water Toys & Equipment
                </label>
                <textarea
                  value={entry.bestPractices.toys}
                  onChange={(e) => setEntry(prev => ({
                    ...prev,
                    bestPractices: { ...prev.bestPractices, toys: e.target.value }
                  }))}
                  placeholder="e.g., Always inflate SeaBobs 30min before guests wake. E-foils need calm conditions - best before 10am. Keep jet skis fueled and ready by 10am. Check all equipment daily..."
                  rows={3}
                  className="w-full px-4 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-lexa-gold focus:border-transparent text-sm"
                />
              </div>

              {/* Onboard Activities */}
              <div>
                <label className="text-sm font-semibold text-zinc-700 mb-1 block">
                  Onboard Activities
                </label>
                <textarea
                  value={entry.bestPractices.activities}
                  onChange={(e) => setEntry(prev => ({
                    ...prev,
                    bestPractices: { ...prev.bestPractices, activities: e.target.value }
                  }))}
                  placeholder="e.g., Sunset yoga on foredeck works best before dinner (7pm). Movie nights require sunset around 8pm for best ambiance. Wine tastings pair well with calm sea days. Set up cinema 1 hour before..."
                  rows={3}
                  className="w-full px-4 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-lexa-gold focus:border-transparent text-sm"
                />
              </div>

              {/* Concierge Services */}
              <div>
                <label className="text-sm font-semibold text-zinc-700 mb-1 block">
                  Concierge Services & Reservations
                </label>
                <textarea
                  value={entry.bestPractices.concierge}
                  onChange={(e) => setEntry(prev => ({
                    ...prev,
                    bestPractices: { ...prev.bestPractices, concierge: e.target.value }
                  }))}
                  placeholder="e.g., Book Nobu Ibiza 2 weeks ahead minimum. Private beach clubs require 24h notice. Helicopter transfers need weather confirmation morning-of. Restaurant reservations in peak season: minimum 1 week..."
                  rows={3}
                  className="w-full px-4 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-lexa-gold focus:border-transparent text-sm"
                />
              </div>

              {/* Local Agents */}
              <div>
                <label className="text-sm font-semibold text-zinc-700 mb-1 block">
                  Trusted Local Agents & Contacts
                </label>
                <textarea
                  value={entry.bestPractices.agents}
                  onChange={(e) => setEntry(prev => ({
                    ...prev,
                    bestPractices: { ...prev.bestPractices, agents: e.target.value }
                  }))}
                  placeholder="e.g., Maria at Porto Montenegro marina (fastest berth allocation, +382 xxx). Giuseppe for last-minute Capri reservations (knows every restaurant owner). Pierre for French Riviera helicopter transfers (best rates, speaks English)..."
                  rows={3}
                  className="w-full px-4 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-lexa-gold focus:border-transparent text-sm"
                />
              </div>
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="flex items-center gap-2 text-lg font-semibold text-lexa-navy mb-2">
              Tags
              <InfoTooltip text="Add keywords to help categorize and find this knowledge. Press Enter or click Add after typing each tag." />
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                placeholder="e.g., croatia, dining, luxury"
                className="flex-1 px-4 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-lexa-gold focus:border-transparent"
              />
              <button
                onClick={addTag}
                type="button"
                className="px-4 py-2 bg-zinc-200 text-zinc-700 rounded-lg hover:bg-zinc-300"
              >
                Add
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {entry.tags.map(tag => (
                <span
                  key={tag}
                  className="px-3 py-1 bg-lexa-navy text-white rounded-full text-sm flex items-center gap-2"
                >
                  {tag}
                  <button
                    onClick={() => removeTag(tag)}
                    className="hover:text-lexa-gold"
                  >
                    ✕
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Applies To */}
          <div>
            <label className="flex items-center gap-2 text-lg font-semibold text-lexa-navy mb-2">
              Applies To (Destinations/POIs)
              <InfoTooltip text="Link this knowledge to specific destinations or points of interest. This helps LEXA recommend your insights at the right locations." />
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={destinationInput}
                onChange={(e) => setDestinationInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addDestination())}
                placeholder="e.g., Dubrovnik, French Riviera"
                className="flex-1 px-4 py-2 border border-zinc-300 rounded-lg focus:ring-2 focus:ring-lexa-gold focus:border-transparent"
              />
              <button
                onClick={addDestination}
                type="button"
                className="px-4 py-2 bg-zinc-200 text-zinc-700 rounded-lg hover:bg-zinc-300"
              >
                Add
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {entry.appliesTo.map(dest => (
                <span
                  key={dest}
                  className="px-3 py-1 bg-zinc-100 text-zinc-700 rounded-full text-sm flex items-center gap-2"
                >
                  📍 {dest}
                  <button
                    onClick={() => removeDestination(dest)}
                    className="hover:text-red-500"
                  >
                    ✕
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Confidence */}
          <div>
            <label className="flex items-center gap-2 text-lg font-semibold text-lexa-navy mb-2">
              Confidence Level: {entry.confidence}%
              <InfoTooltip text="How confident are you in this information? 80-100% = Firsthand experience, 60-79% = Reliable secondhand info, below 60% = Needs verification" />
            </label>
            <input
              type="range"
              min="0"
              max="100"
              value={entry.confidence}
              onChange={(e) => setEntry(prev => ({ ...prev, confidence: parseInt(e.target.value) }))}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-zinc-500 mt-1">
              <span>Needs Verification</span>
              <span>Very Confident</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-4 pt-6">
            <button
              onClick={saveEntry}
              disabled={isSaving}
              className="flex-1 px-8 py-4 bg-gradient-to-r from-lexa-navy to-lexa-gold text-white rounded-xl font-semibold text-lg hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? 'Saving...' : '✨ Save Knowledge'}
            </button>
            <button
              onClick={() => router.push('/admin/knowledge')}
              className="px-8 py-4 bg-zinc-200 text-zinc-700 rounded-xl font-semibold hover:bg-zinc-300 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>

      {/* POI Edit Modal */}
      {showPOIModal && selectedPOIId && (
        <POIEditModal
          poiId={selectedPOIId}
          onClose={() => {
            setShowPOIModal(false);
            setSelectedPOIId(null);
          }}
          onSaved={() => {
            // Refresh or show success message
            alert('POI updated successfully! ✨');
          }}
        />
      )}

      {/* Create POI Modal */}
      {showCreatePOI && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-y-auto p-4">
          <div className="max-w-4xl w-full">
            <CreatePOIForm
              onSuccess={() => {
                setShowCreatePOI(false);
                alert('POI created successfully! You can now search for it. ✨');
              }}
              onCancel={() => setShowCreatePOI(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
