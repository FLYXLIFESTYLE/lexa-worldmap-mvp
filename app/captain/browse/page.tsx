'use client';

/**
 * Captain Portal: Browse, Verify & Enhance
 * Merged: Browse POIs, Verify Data, Enhance Descriptions, Confidence Score Management
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client-browser';
import AdminNav from '@/components/admin/admin-nav';

interface POI {
  id: string;
  name: string;
  category: string;
  description: string;
  location: string;
  confidence_score: number;
  data_quality: 'excellent' | 'good' | 'fair' | 'poor';
  verified: boolean;
  enhanced: boolean;
  created_at: string;
  updated_at: string;
  created_by: string;
  luxury_score?: number;
  tags: string[];
}

type ViewMode = 'list' | 'edit';

export default function CaptainBrowsePage() {
  const router = useRouter();
  const supabase = createClient();
  
  const [loading, setLoading] = useState(true);
  const [pois, setPois] = useState<POI[]>([]);
  const [filteredPois, setFilteredPois] = useState<POI[]>([]);
  
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
  const [requestingApproval, setRequestingApproval] = useState(false);

  // Stats
  const [stats, setStats] = useState({
    total: 0,
    verified: 0,
    needsVerification: 0,
    lowQuality: 0,
    avgConfidence: 0
  });

  // Auth check
  useEffect(() => {
    async function checkAuth() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/auth/signin');
        return;
      }
      fetchPOIs();
    }
    checkAuth();
  }, [router, supabase.auth]);

  // Fetch POIs
  const fetchPOIs = async () => {
    setLoading(true);
    try {
      // TODO: Replace with actual API call
      // Mock data for now
      const mockPOIs: POI[] = [
        {
          id: '1',
          name: 'Le Louis XV - Alain Ducasse',
          category: 'restaurant',
          description: '3 Michelin stars. Exceptional Mediterranean cuisine in an opulent Belle Époque setting.',
          location: 'Monaco',
          confidence_score: 95,
          data_quality: 'excellent',
          verified: true,
          enhanced: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          created_by: 'captain@lexa.com',
          luxury_score: 95,
          tags: ['fine-dining', 'michelin', 'french-cuisine']
        },
        {
          id: '2',
          name: 'Hotel de Paris Monte-Carlo',
          category: 'hotel',
          description: 'Legendary palace hotel since 1864.',
          location: 'Monaco',
          confidence_score: 75,
          data_quality: 'fair',
          verified: false,
          enhanced: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          created_by: 'captain@lexa.com',
          luxury_score: 90,
          tags: ['luxury', 'historic']
        },
        {
          id: '3',
          name: 'Yacht Charter Experience',
          category: 'activity',
          description: 'Private yacht charter along the French Riviera.',
          location: 'Nice',
          confidence_score: 60,
          data_quality: 'poor',
          verified: false,
          enhanced: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          created_by: 'system',
          tags: ['yacht', 'charter']
        }
      ];
      
      setPois(mockPOIs);
      setFilteredPois(mockPOIs);
      
      // Calculate stats
      const total = mockPOIs.length;
      const verified = mockPOIs.filter(p => p.verified).length;
      const needsVerification = total - verified;
      const lowQuality = mockPOIs.filter(p => p.data_quality === 'poor' || p.data_quality === 'fair').length;
      const avgConfidence = mockPOIs.reduce((sum, p) => sum + p.confidence_score, 0) / total;
      
      setStats({ total, verified, needsVerification, lowQuality, avgConfidence });
    } catch (error) {
      console.error('Failed to fetch POIs:', error);
    } finally {
      setLoading(false);
    }
  };

  // Apply filters
  useEffect(() => {
    let filtered = [...pois];
    
    // Search
    if (searchQuery) {
      filtered = filtered.filter(poi =>
        poi.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        poi.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        poi.location.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    // Category
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(poi => poi.category === categoryFilter);
    }
    
    // Quality
    if (qualityFilter !== 'all') {
      filtered = filtered.filter(poi => poi.data_quality === qualityFilter);
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

  // Edit POI
  const handleEdit = (poi: POI) => {
    setSelectedPoi(poi);
    setEditedName(poi.name);
    setEditedDescription(poi.description);
    setEditedLocation(poi.location);
    setEditedCategory(poi.category);
    setEditedConfidence(poi.confidence_score);
    setEditedLuxuryScore(poi.luxury_score || 0);
    setEditedTags(poi.tags.join(', '));
    setViewMode('edit');
  };

  // Save POI
  const handleSave = async () => {
    if (!selectedPoi) return;
    
    // Check if confidence score increased beyond 80%
    const needsApproval = editedConfidence > 80 && editedConfidence > selectedPoi.confidence_score;
    
    if (needsApproval && !requestingApproval) {
      if (confirm('Increasing confidence beyond 80% requires captain approval. Request approval?')) {
        setRequestingApproval(true);
      } else {
        return;
      }
    }
    
    try {
      // TODO: Call backend API to save POI
      const updatedPoi: POI = {
        ...selectedPoi,
        name: editedName,
        description: editedDescription,
        location: editedLocation,
        category: editedCategory,
        confidence_score: needsApproval ? selectedPoi.confidence_score : editedConfidence,
        luxury_score: editedLuxuryScore,
        tags: editedTags.split(',').map(t => t.trim()).filter(t => t),
        enhanced: true,
        updated_at: new Date().toISOString()
      };
      
      setPois(prev => prev.map(p => p.id === selectedPoi.id ? updatedPoi : p));
      
      if (needsApproval && requestingApproval) {
        alert('✅ Changes saved! Confidence score increase submitted for approval.');
      } else {
        alert('✅ POI updated successfully!');
      }
      
      setViewMode('list');
      setSelectedPoi(null);
      setRequestingApproval(false);
    } catch (error) {
      alert('❌ Failed to save POI');
    }
  };

  // Verify POI
  const handleVerify = async (poi: POI) => {
    if (!confirm(`Mark "${poi.name}" as verified?`)) return;
    
    try {
      // TODO: Call backend API
      setPois(prev => prev.map(p => 
        p.id === poi.id ? { ...p, verified: true, updated_at: new Date().toISOString() } : p
      ));
      alert('✅ POI verified!');
    } catch (error) {
      alert('❌ Failed to verify POI');
    }
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
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div className="flex-1">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              🔍 Browse, Verify & Enhance
            </h1>
            <p className="text-lg text-gray-600 mb-4">
              Review POIs, verify data quality, enhance descriptions, and manage confidence scores
            </p>
            
            {/* Info Box */}
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 space-y-2 max-w-3xl">
              <div className="text-sm">
                <strong className="text-purple-900">VERIFY:</strong>{' '}
                <span className="text-gray-700">Check POI accuracy and mark as verified</span>
              </div>
              <div className="text-sm">
                <strong className="text-purple-900">ENHANCE:</strong>{' '}
                <span className="text-gray-700">Improve descriptions, add details, update information</span>
              </div>
              <div className="text-sm">
                <strong className="text-purple-900">CONFIDENCE:</strong>{' '}
                <span className="text-gray-700">Scores &gt;80% require captain approval to increase</span>
              </div>
            </div>
          </div>
          <AdminNav />
        </div>

        {/* Stats Dashboard */}
        <div className="grid grid-cols-5 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
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
            {/* Search & Filters */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Search & Filter</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Search POIs
                  </label>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Name, description, location..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category
                  </label>
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Quality
                  </label>
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Confidence Score
                  </label>
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
              </div>
              
              <div className="mt-4 text-sm text-gray-600">
                Showing {filteredPois.length} of {pois.length} POIs
              </div>
            </div>

            {/* POI List */}
            <div className="space-y-4">
              {filteredPois.length === 0 ? (
                <div className="bg-white rounded-lg shadow-sm p-12 text-center">
                  <div className="text-6xl mb-4">🔍</div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    No POIs Found
                  </h3>
                  <p className="text-gray-600">
                    Try adjusting your search or filters
                  </p>
                </div>
              ) : (
                filteredPois.map((poi) => (
                  <div key={poi.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-xl font-semibold text-gray-900">
                            {poi.name}
                          </h3>
                          {poi.verified && (
                            <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full">
                              ✓ Verified
                            </span>
                          )}
                          {poi.enhanced && (
                            <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full">
                              ✨ Enhanced
                            </span>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                          <span className="flex items-center gap-1">
                            📍 {poi.location}
                          </span>
                          <span className="flex items-center gap-1">
                            🏷️ {poi.category}
                          </span>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <div className={`text-2xl font-bold ${getScoreColor(poi.confidence_score)}`}>
                          {poi.confidence_score}%
                        </div>
                        <div className="text-xs text-gray-500">Confidence</div>
                      </div>
                    </div>
                    
                    <p className="text-gray-700 text-sm mb-4 leading-relaxed">
                      {poi.description}
                    </p>
                    
                    <div className="flex items-center gap-3 mb-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getQualityColor(poi.data_quality)}`}>
                        {poi.data_quality.toUpperCase()}
                      </span>
                      
                      {poi.luxury_score && (
                        <span className="px-3 py-1 bg-lexa-gold/10 text-lexa-navy rounded-full text-xs font-semibold">
                          ⭐ Luxury: {poi.luxury_score}
                        </span>
                      )}
                      
                      {poi.tags.map((tag, idx) => (
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
                        {!poi.verified && (
                          <button
                            onClick={() => handleVerify(poi)}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 transition-colors"
                          >
                            ✓ Verify
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
                ))
              )}
            </div>
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
                    {editedConfidence > 80 && editedConfidence > selectedPoi.confidence_score && (
                      <span className="ml-2 text-orange-600 text-xs">⚠️ Requires Approval</span>
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
                    Scores &gt;80% require captain approval to increase
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Luxury Score: {editedLuxuryScore}
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
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

        {/* Back Button */}
        <div className="mt-8">
          <button
            onClick={() => router.push('/captain')}
            className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
          >
            ← Back to Captain Portal
          </button>
        </div>
      </div>
    </div>
  );
}
