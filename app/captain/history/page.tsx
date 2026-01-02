'use client';

/**
 * Captain Portal: Upload History
 * Shows ONLY the captain's own uploads with extraction statistics
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client-browser';
import AdminNav from '@/components/admin/admin-nav';

interface UploadRecord {
  id: string;
  filename: string;
  file_type: string;
  file_size: number;
  uploaded_at: string;
  uploaded_by: string;
  pois_extracted: number;
  relationships_created: number;
  destinations_found: number;
  processing_status: 'pending' | 'processing' | 'completed' | 'failed';
  confidence_score_avg: number;
  error_message?: string;
  extracted_destinations?: string[];
  extracted_categories?: string[];
  keep_file: boolean;
  file_url?: string;
}

type StatusFilter = 'all' | 'completed' | 'processing' | 'failed';
type SortOption = 'date_desc' | 'date_asc' | 'name' | 'pois_desc';

export default function CaptainHistoryPage() {
  const router = useRouter();
  const supabase = createClient();
  
  const [loading, setLoading] = useState(true);
  const [uploads, setUploads] = useState<UploadRecord[]>([]);
  const [filteredUploads, setFilteredUploads] = useState<UploadRecord[]>([]);
  const [userEmail, setUserEmail] = useState('');
  
  // Filters & Sort
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('date_desc');
  
  // Expanded details
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Stats
  const [stats, setStats] = useState({
    total: 0,
    completed: 0,
    failed: 0,
    processing: 0,
    totalPOIs: 0,
    totalRelations: 0,
    totalDestinations: 0,
    avgConfidence: 0
  });

  // Auth check and fetch
  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/auth/signin');
        return;
      }
      
      setUserEmail(user.email || '');
      fetchUploads(user.email || '');
    }
    init();
  }, [router, supabase.auth]);

  // Fetch uploads (only this captain's uploads)
  const fetchUploads = async (email: string) => {
    setLoading(true);
    try {
      // TODO: Replace with actual API call filtered by user email
      // Mock data for now
      const mockUploads: UploadRecord[] = [
        {
          id: '1',
          filename: 'Monaco_Luxury_Hotels.pdf',
          file_type: 'application/pdf',
          file_size: 2457600, // 2.4 MB
          uploaded_at: new Date('2024-12-30T10:30:00').toISOString(),
          uploaded_by: email,
          pois_extracted: 15,
          relationships_created: 45,
          destinations_found: 3,
          processing_status: 'completed',
          confidence_score_avg: 85,
          extracted_destinations: ['Monaco', 'Monte Carlo', 'Cap d\'Ail'],
          extracted_categories: ['hotel', 'restaurant', 'attraction'],
          keep_file: true,
          file_url: '/files/monaco_hotels.pdf'
        },
        {
          id: '2',
          filename: 'French_Riviera_Restaurants.xlsx',
          file_type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          file_size: 156800, // 156 KB
          uploaded_at: new Date('2024-12-29T14:15:00').toISOString(),
          uploaded_by: email,
          pois_extracted: 8,
          relationships_created: 12,
          destinations_found: 5,
          processing_status: 'completed',
          confidence_score_avg: 78,
          extracted_destinations: ['Nice', 'Cannes', 'Saint-Tropez', 'Antibes', 'Monaco'],
          extracted_categories: ['restaurant'],
          keep_file: false
        },
        {
          id: '3',
          filename: 'Yacht_Activities.txt',
          file_type: 'text/plain',
          file_size: 45600, // 45 KB
          uploaded_at: new Date('2024-12-28T09:00:00').toISOString(),
          uploaded_by: email,
          pois_extracted: 0,
          relationships_created: 0,
          destinations_found: 0,
          processing_status: 'failed',
          confidence_score_avg: 0,
          error_message: 'Failed to extract structured data from text file. Format not recognized.',
          keep_file: true,
          file_url: '/files/yacht_activities.txt'
        },
        {
          id: '4',
          filename: 'Luxury_Experiences_Screenshot.png',
          file_type: 'image/png',
          file_size: 1890000, // 1.9 MB
          uploaded_at: new Date('2024-12-27T16:45:00').toISOString(),
          uploaded_by: email,
          pois_extracted: 0,
          relationships_created: 0,
          destinations_found: 0,
          processing_status: 'processing',
          confidence_score_avg: 0,
          keep_file: true
        }
      ];
      
      setUploads(mockUploads);
      
      // Calculate stats
      const total = mockUploads.length;
      const completed = mockUploads.filter(u => u.processing_status === 'completed').length;
      const failed = mockUploads.filter(u => u.processing_status === 'failed').length;
      const processing = mockUploads.filter(u => u.processing_status === 'processing' || u.processing_status === 'pending').length;
      const totalPOIs = mockUploads.reduce((sum, u) => sum + u.pois_extracted, 0);
      const totalRelations = mockUploads.reduce((sum, u) => sum + u.relationships_created, 0);
      const totalDestinations = mockUploads.reduce((sum, u) => sum + u.destinations_found, 0);
      const completedUploads = mockUploads.filter(u => u.processing_status === 'completed');
      const avgConfidence = completedUploads.length > 0
        ? completedUploads.reduce((sum, u) => sum + u.confidence_score_avg, 0) / completedUploads.length
        : 0;
      
      setStats({ total, completed, failed, processing, totalPOIs, totalRelations, totalDestinations, avgConfidence });
    } catch (error) {
      console.error('Failed to fetch uploads:', error);
    } finally {
      setLoading(false);
    }
  };

  // Apply filters and sort
  useEffect(() => {
    let filtered = [...uploads];
    
    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(u => u.processing_status === statusFilter);
    }
    
    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(u =>
        u.filename.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    // Sort
    switch (sortBy) {
      case 'date_desc':
        filtered.sort((a, b) => new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime());
        break;
      case 'date_asc':
        filtered.sort((a, b) => new Date(a.uploaded_at).getTime() - new Date(b.uploaded_at).getTime());
        break;
      case 'name':
        filtered.sort((a, b) => a.filename.localeCompare(b.filename));
        break;
      case 'pois_desc':
        filtered.sort((a, b) => b.pois_extracted - a.pois_extracted);
        break;
    }
    
    setFilteredUploads(filtered);
  }, [uploads, statusFilter, searchQuery, sortBy]);

  // Delete upload
  const handleDelete = async (id: string, filename: string) => {
    if (!confirm(`Delete "${filename}"? Extracted knowledge will remain in the database.`)) {
      return;
    }
    
    try {
      // TODO: Call backend API
      setUploads(prev => prev.filter(u => u.id !== id));
      alert('✅ Upload deleted!');
    } catch (error) {
      alert('❌ Failed to delete upload');
    }
  };

  // Re-process upload
  const handleReprocess = async (id: string) => {
    if (!confirm('Re-process this upload? This will re-extract all data.')) {
      return;
    }
    
    try {
      // TODO: Call backend API
      alert('🔄 Re-processing started! This may take a few minutes.');
    } catch (error) {
      alert('❌ Failed to start re-processing');
    }
  };

  // Download file
  const handleDownload = (fileUrl: string, filename: string) => {
    const link = document.createElement('a');
    link.href = fileUrl;
    link.download = filename;
    link.click();
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-700';
      case 'processing': return 'bg-blue-100 text-blue-700';
      case 'pending': return 'bg-yellow-100 text-yellow-700';
      case 'failed': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Format file type
  const formatFileType = (mimeType: string) => {
    const typeMap: { [key: string]: string } = {
      'application/pdf': 'PDF',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'Word',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'Excel',
      'text/plain': 'Text',
      'image/png': 'PNG Image',
      'image/jpeg': 'JPEG Image',
      'image/jpg': 'JPG Image'
    };
    return typeMap[mimeType] || mimeType;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">Loading your upload history...</p>
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
              📊 Your Upload History
            </h1>
            <p className="text-lg text-gray-600 mb-4">
              Track your uploads, extraction statistics, and manage your files
            </p>
            
            {/* Info Box */}
            <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 space-y-2 max-w-3xl">
              <div className="text-sm">
                <strong className="text-indigo-900">PERSONAL VIEW:</strong>{' '}
                <span className="text-gray-700">Only YOUR uploads are shown here</span>
              </div>
              <div className="text-sm">
                <strong className="text-indigo-900">FILE STORAGE:</strong>{' '}
                <span className="text-gray-700">Kept files can be downloaded, deleted files retain extracted knowledge</span>
              </div>
              <div className="text-sm">
                <strong className="text-indigo-900">RE-PROCESS:</strong>{' '}
                <span className="text-gray-700">Failed uploads can be re-processed to try again</span>
              </div>
            </div>
          </div>
          <AdminNav />
        </div>

        {/* Stats Dashboard */}
        <div className="grid grid-cols-4 md:grid-cols-8 gap-4 mb-8">
          <div className="col-span-2 bg-white rounded-lg shadow-sm p-4">
            <div className="text-3xl font-bold text-gray-900">{stats.total}</div>
            <div className="text-sm text-gray-600">Total Uploads</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
            <div className="text-sm text-gray-600">Completed</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="text-2xl font-bold text-blue-600">{stats.processing}</div>
            <div className="text-sm text-gray-600">Processing</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="text-2xl font-bold text-red-600">{stats.failed}</div>
            <div className="text-sm text-gray-600">Failed</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="text-2xl font-bold text-lexa-gold">{stats.totalPOIs}</div>
            <div className="text-sm text-gray-600">POIs</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="text-2xl font-bold text-lexa-gold">{stats.totalRelations}</div>
            <div className="text-sm text-gray-600">Relations</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="text-2xl font-bold text-purple-600">{stats.avgConfidence.toFixed(0)}%</div>
            <div className="text-sm text-gray-600">Avg Score</div>
          </div>
        </div>

        {/* Filters & Controls */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search Files
              </label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by filename..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Filter by Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Status</option>
                <option value="completed">Completed</option>
                <option value="processing">Processing</option>
                <option value="failed">Failed</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Sort By
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="date_desc">Newest First</option>
                <option value="date_asc">Oldest First</option>
                <option value="name">Name (A-Z)</option>
                <option value="pois_desc">Most POIs</option>
              </select>
            </div>
          </div>
          
          <div className="text-sm text-gray-600">
            Showing {filteredUploads.length} of {uploads.length} uploads
          </div>
        </div>

        {/* Upload List */}
        <div className="space-y-4">
          {filteredUploads.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm p-12 text-center">
              <div className="text-6xl mb-4">📭</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {uploads.length === 0 ? 'No Uploads Yet' : 'No Results Found'}
              </h3>
              <p className="text-gray-600 mb-6">
                {uploads.length === 0
                  ? 'Upload your first file to get started!'
                  : 'Try adjusting your search or filters'
                }
              </p>
              {uploads.length === 0 && (
                <button
                  onClick={() => router.push('/captain/upload')}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                >
                  Upload Files
                </button>
              )}
            </div>
          ) : (
            filteredUploads.map((upload) => (
              <div key={upload.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                {/* Main Row */}
                <div className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">{upload.filename}</h3>
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(upload.processing_status)}`}>
                          {upload.processing_status.toUpperCase()}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                        <span>📄 {formatFileType(upload.file_type)}</span>
                        <span>💾 {formatFileSize(upload.file_size)}</span>
                        <span>📅 {new Date(upload.uploaded_at).toLocaleDateString()}</span>
                        <span>🕐 {new Date(upload.uploaded_at).toLocaleTimeString()}</span>
                      </div>

                      {upload.processing_status === 'completed' && (
                        <div className="flex items-center gap-6 text-sm">
                          <span className="text-green-600 font-semibold">
                            📍 {upload.pois_extracted} POIs
                          </span>
                          <span className="text-blue-600 font-semibold">
                            🔗 {upload.relationships_created} Relations
                          </span>
                          <span className="text-purple-600 font-semibold">
                            🗺️ {upload.destinations_found} Destinations
                          </span>
                          <span className="text-orange-600 font-semibold">
                            📊 {upload.confidence_score_avg}% Avg Confidence
                          </span>
                        </div>
                      )}

                      {upload.error_message && (
                        <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                          <strong>Error:</strong> {upload.error_message}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setExpandedId(expandedId === upload.id ? null : upload.id)}
                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                      >
                        {expandedId === upload.id ? '▲ Hide' : '▼ Details'}
                      </button>
                      
                      {upload.file_url && upload.keep_file && (
                        <button
                          onClick={() => handleDownload(upload.file_url!, upload.filename)}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                        >
                          📥 Download
                        </button>
                      )}
                      
                      {upload.processing_status === 'failed' && (
                        <button
                          onClick={() => handleReprocess(upload.id)}
                          className="px-4 py-2 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-700 transition-colors"
                        >
                          🔄 Re-process
                        </button>
                      )}
                      
                      <button
                        onClick={() => handleDelete(upload.id, upload.filename)}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors"
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  </div>
                </div>

                {/* Expanded Details */}
                {expandedId === upload.id && (
                  <div className="border-t border-gray-200 bg-gray-50 p-6">
                    {upload.processing_status === 'completed' && (
                      <div className="space-y-4">
                        {/* Destinations */}
                        {upload.extracted_destinations && upload.extracted_destinations.length > 0 && (
                          <div>
                            <h4 className="font-semibold text-gray-900 mb-2">
                              🗺️ Extracted Destinations ({upload.extracted_destinations.length})
                            </h4>
                            <div className="flex flex-wrap gap-2">
                              {upload.extracted_destinations.map((dest, i) => (
                                <span key={i} className="px-3 py-1 bg-white rounded-full text-sm border border-gray-200">
                                  {dest}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Categories */}
                        {upload.extracted_categories && upload.extracted_categories.length > 0 && (
                          <div>
                            <h4 className="font-semibold text-gray-900 mb-2">
                              🏷️ POI Categories ({upload.extracted_categories.length})
                            </h4>
                            <div className="flex flex-wrap gap-2">
                              {upload.extracted_categories.map((cat, i) => (
                                <span key={i} className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                                  {cat}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* File Storage Status */}
                    <div className="mt-4 p-3 bg-white rounded-lg border border-gray-200">
                      <p className="text-sm">
                        <strong>File Storage:</strong>{' '}
                        {upload.keep_file && upload.file_url ? (
                          <span className="text-green-600">✓ Original file saved and available for download</span>
                        ) : (
                          <span className="text-gray-600">File was deleted after extraction (knowledge retained)</span>
                        )}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

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
