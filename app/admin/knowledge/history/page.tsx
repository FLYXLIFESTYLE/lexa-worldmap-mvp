'use client';

/**
 * Upload History Page
 * Shows all file uploads with extraction details and management options
 */

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import AdminNav from '@/components/admin/admin-nav';

interface UploadRecord {
  id: string;
  filename: string;
  file_type: string;
  file_size: number;
  uploaded_at: string;
  pois_extracted: number;
  relationships_created: number;
  wisdom_created: number;
  processing_status: 'pending' | 'processing' | 'completed' | 'failed';
  error_message?: string;
  extracted_destinations?: string[];
  extracted_activities?: string[];
  extracted_themes?: string[];
  keep_file: boolean;
  file_url?: string;
  deleted_at?: string;
}

export default function UploadHistoryPage() {
  const [uploads, setUploads] = useState<UploadRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'completed' | 'failed'>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    fetchUploads();
  }, []);

  const fetchUploads = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/uploads');
      if (response.ok) {
        const data = await response.json();
        setUploads(data.uploads || []);
      }
    } catch (error) {
      console.error('Failed to fetch uploads:', error);
    } finally {
      setLoading(false);
    }
  };

  const deleteUpload = async (id: string) => {
    if (!confirm('Delete this upload record and associated file? Extracted knowledge will remain in the database.')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/uploads/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setUploads(uploads.filter(u => u.id !== id));
      } else {
        alert('Failed to delete upload');
      }
    } catch (error) {
      console.error('Delete error:', error);
      alert('Failed to delete upload');
    }
  };

  const downloadFile = (fileUrl: string, filename: string) => {
    const link = document.createElement('a');
    link.href = fileUrl;
    link.download = filename;
    link.click();
  };

  const filteredUploads = uploads.filter(upload => {
    if (filter === 'completed') return upload.processing_status === 'completed';
    if (filter === 'failed') return upload.processing_status === 'failed';
    return true;
  });

  const stats = {
    total: uploads.length,
    completed: uploads.filter(u => u.processing_status === 'completed').length,
    failed: uploads.filter(u => u.processing_status === 'failed').length,
    totalPOIs: uploads.reduce((sum, u) => sum + (u.pois_extracted || 0), 0),
    totalRelationships: uploads.reduce((sum, u) => sum + (u.relationships_created || 0), 0),
    totalWisdom: uploads.reduce((sum, u) => sum + (u.wisdom_created || 0), 0),
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-lexa-cream via-white to-zinc-50 px-6 py-12">
      <AdminNav />
      
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-4xl font-bold text-lexa-navy">
              📊 Upload History
            </h1>
            <button
              onClick={fetchUploads}
              className="px-4 py-2 bg-lexa-navy text-white rounded-lg hover:bg-lexa-navy/90 transition-colors"
            >
              🔄 Refresh
            </button>
          </div>
          
          {/* Why-What-How */}
          <div className="bg-gradient-to-r from-lexa-navy/5 to-lexa-gold/5 rounded-xl p-6 mb-6 border border-lexa-gold/20">
            <h3 className="font-bold text-lexa-navy mb-2">Why - What - How</h3>
            <p className="text-zinc-700">
              <strong>Why:</strong> Track all file uploads and their extraction results to monitor data quality and system performance.<br/>
              <strong>What:</strong> View detailed statistics for each upload including POIs, relationships, and entities extracted.<br/>
              <strong>How:</strong> Filter uploads by status, expand to see details, download original files (if kept), or delete records.
            </p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            <div className="bg-white rounded-xl p-4 border border-zinc-200 shadow-sm">
              <p className="text-2xl font-bold text-lexa-navy">{stats.total}</p>
              <p className="text-sm text-zinc-600">Total Uploads</p>
            </div>
            <div className="bg-white rounded-xl p-4 border border-zinc-200 shadow-sm">
              <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
              <p className="text-sm text-zinc-600">Completed</p>
            </div>
            <div className="bg-white rounded-xl p-4 border border-zinc-200 shadow-sm">
              <p className="text-2xl font-bold text-red-600">{stats.failed}</p>
              <p className="text-sm text-zinc-600">Failed</p>
            </div>
            <div className="bg-white rounded-xl p-4 border border-zinc-200 shadow-sm">
              <p className="text-2xl font-bold text-lexa-gold">{stats.totalPOIs}</p>
              <p className="text-sm text-zinc-600">POIs</p>
            </div>
            <div className="bg-white rounded-xl p-4 border border-zinc-200 shadow-sm">
              <p className="text-2xl font-bold text-lexa-gold">{stats.totalRelationships}</p>
              <p className="text-sm text-zinc-600">Relationships</p>
            </div>
            <div className="bg-white rounded-xl p-4 border border-zinc-200 shadow-sm">
              <p className="text-2xl font-bold text-lexa-gold">{stats.totalWisdom}</p>
              <p className="text-sm text-zinc-600">Wisdom</p>
            </div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setFilter('all')}
            className={`px-6 py-2 rounded-lg font-semibold transition-colors ${
              filter === 'all'
                ? 'bg-lexa-navy text-white'
                : 'bg-white text-zinc-600 hover:bg-zinc-50'
            }`}
          >
            All ({stats.total})
          </button>
          <button
            onClick={() => setFilter('completed')}
            className={`px-6 py-2 rounded-lg font-semibold transition-colors ${
              filter === 'completed'
                ? 'bg-green-600 text-white'
                : 'bg-white text-zinc-600 hover:bg-zinc-50'
            }`}
          >
            Completed ({stats.completed})
          </button>
          <button
            onClick={() => setFilter('failed')}
            className={`px-6 py-2 rounded-lg font-semibold transition-colors ${
              filter === 'failed'
                ? 'bg-red-600 text-white'
                : 'bg-white text-zinc-600 hover:bg-zinc-50'
            }`}
          >
            Failed ({stats.failed})
          </button>
        </div>

        {/* Uploads List */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block w-8 h-8 border-4 border-lexa-navy border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-4 text-zinc-600">Loading uploads...</p>
          </div>
        ) : filteredUploads.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-lg border border-zinc-200 p-12 text-center">
            <p className="text-6xl mb-4">📭</p>
            <p className="text-xl font-semibold text-lexa-navy mb-2">No Uploads Found</p>
            <p className="text-zinc-600">
              {filter === 'all' 
                ? 'Upload your first file to get started!' 
                : `No ${filter} uploads yet.`}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredUploads.map((upload) => (
              <div
                key={upload.id}
                className="bg-white rounded-xl shadow-lg border border-zinc-200 overflow-hidden hover:shadow-xl transition-shadow"
              >
                {/* Main Row */}
                <div className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-bold text-lexa-navy">{upload.filename}</h3>
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          upload.processing_status === 'completed' ? 'bg-green-100 text-green-700' :
                          upload.processing_status === 'failed' ? 'bg-red-100 text-red-700' :
                          upload.processing_status === 'processing' ? 'bg-blue-100 text-blue-700' :
                          'bg-zinc-100 text-zinc-700'
                        }`}>
                          {upload.processing_status}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-zinc-600 mb-3">
                        <span>📄 {upload.file_type}</span>
                        <span>💾 {(upload.file_size / 1024).toFixed(1)} KB</span>
                        <span>🕐 {format(new Date(upload.uploaded_at), 'MMM d, yyyy h:mm a')}</span>
                      </div>

                      {upload.processing_status === 'completed' && (
                        <div className="flex items-center gap-6 text-sm">
                          <span className="text-lexa-gold font-semibold">
                            📍 {upload.pois_extracted} POIs
                          </span>
                          <span className="text-lexa-gold font-semibold">
                            🔗 {upload.relationships_created} Relations
                          </span>
                          <span className="text-lexa-gold font-semibold">
                            💡 {upload.wisdom_created} Wisdom
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
                        className="px-4 py-2 bg-zinc-100 text-zinc-700 rounded-lg hover:bg-zinc-200 transition-colors"
                      >
                        {expandedId === upload.id ? '▲ Hide' : '▼ Details'}
                      </button>
                      
                      {upload.file_url && upload.keep_file && (
                        <button
                          onClick={() => downloadFile(upload.file_url!, upload.filename)}
                          className="px-4 py-2 bg-lexa-navy text-white rounded-lg hover:bg-lexa-navy/90 transition-colors"
                        >
                          📥 Download
                        </button>
                      )}
                      
                      <button
                        onClick={() => deleteUpload(upload.id)}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  </div>
                </div>

                {/* Expanded Details */}
                {expandedId === upload.id && (
                  <div className="border-t border-zinc-200 bg-zinc-50 p-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {/* Destinations */}
                      {upload.extracted_destinations && upload.extracted_destinations.length > 0 && (
                        <div>
                          <h4 className="font-bold text-lexa-navy mb-2">🗺️ Destinations ({upload.extracted_destinations.length})</h4>
                          <div className="flex flex-wrap gap-2">
                            {upload.extracted_destinations.map((dest, i) => (
                              <span key={i} className="px-3 py-1 bg-white rounded-full text-sm border border-zinc-200">
                                {dest}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Activities */}
                      {upload.extracted_activities && upload.extracted_activities.length > 0 && (
                        <div>
                          <h4 className="font-bold text-lexa-navy mb-2">🎯 Activities ({upload.extracted_activities.length})</h4>
                          <div className="flex flex-wrap gap-2">
                            {upload.extracted_activities.map((activity, i) => (
                              <span key={i} className="px-3 py-1 bg-white rounded-full text-sm border border-zinc-200">
                                {activity}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Themes */}
                      {upload.extracted_themes && upload.extracted_themes.length > 0 && (
                        <div>
                          <h4 className="font-bold text-lexa-navy mb-2">✨ Themes ({upload.extracted_themes.length})</h4>
                          <div className="flex flex-wrap gap-2">
                            {upload.extracted_themes.map((theme, i) => (
                              <span key={i} className="px-3 py-1 bg-white rounded-full text-sm border border-zinc-200">
                                {theme}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* File Storage Status */}
                    <div className="mt-4 p-3 bg-white rounded-lg border border-zinc-200">
                      <p className="text-sm">
                        <strong>File Storage:</strong>{' '}
                        {upload.keep_file && upload.file_url ? (
                          <span className="text-green-600">✓ Original file saved and available for download</span>
                        ) : (
                          <span className="text-zinc-600">File was deleted after extraction (only knowledge retained)</span>
                        )}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

