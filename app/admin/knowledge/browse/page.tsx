'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AdminNav from '@/components/admin/admin-nav';

interface KnowledgeEntry {
  id: string;
  content: string;
  title: string;
  source_type: string;
  created_at: string;
  created_by: string;
  tags: string[];
}

export default function BrowseKnowledgePage() {
  const router = useRouter();
  const [entries, setEntries] = useState<KnowledgeEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');

  useEffect(() => {
    fetchKnowledge();
  }, []);

  async function fetchKnowledge() {
    setIsLoading(true);
    try {
      const response = await fetch('/api/knowledge/browse');
      if (response.ok) {
        const data = await response.json();
        setEntries(data.entries || []);
      }
    } catch (error) {
      console.error('Failed to fetch knowledge:', error);
    } finally {
      setIsLoading(false);
    }
  }

  const filteredEntries = entries.filter(entry => {
    const matchesSearch = !searchQuery || 
      entry.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.content?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'all' || entry.source_type === filterType;
    return matchesSearch && matchesType;
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading knowledge base...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div className="flex-1">
            <button
              onClick={() => router.push('/admin/knowledge')}
              className="text-purple-600 hover:text-purple-800 flex items-center gap-2 mb-4"
            >
              ← Back to Knowledge Portal
            </button>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              📚 Browse Knowledge
            </h1>
            <p className="text-lg text-gray-600 mb-4">
              Search and explore all contributed knowledge in the database
            </p>
            
            {/* Why - What - How */}
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 space-y-2 max-w-2xl">
              <div className="text-sm">
                <strong className="text-purple-900">WHY:</strong> <span className="text-gray-700">View all knowledge stored in LEXA's database for review and quality assurance</span>
              </div>
              <div className="text-sm">
                <strong className="text-purple-900">WHAT:</strong> <span className="text-gray-700">Uploaded documents, scraped URLs, and manual entries with searchable content</span>
              </div>
              <div className="text-sm">
                <strong className="text-purple-900">HOW:</strong> <span className="text-gray-700">Use search bar to find specific content, filter by type, and view details</span>
              </div>
            </div>
          </div>
          <AdminNav />
        </div>

        {/* Search & Filters */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search Knowledge
              </label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by title or content..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Filter by Type
              </label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="all">All Types</option>
                <option value="upload">Uploaded Documents</option>
                <option value="scraped">Scraped URLs</option>
                <option value="manual">Manual Entry</option>
              </select>
            </div>
          </div>
          <div className="mt-4 text-sm text-gray-600">
            Showing {filteredEntries.length} of {entries.length} knowledge entries
          </div>
        </div>

        {/* Knowledge Entries */}
        {filteredEntries.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <div className="text-6xl mb-4">📚</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {entries.length === 0 ? 'No Knowledge Yet' : 'No Results Found'}
            </h3>
            <p className="text-gray-600 mb-6">
              {entries.length === 0 
                ? 'Start contributing knowledge to see it here'
                : 'Try adjusting your search or filters'
              }
            </p>
            {entries.length === 0 && (
              <button
                onClick={() => router.push('/admin/knowledge/editor')}
                className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                Add Knowledge
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredEntries.map((entry) => (
              <div key={entry.id} className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {entry.title || 'Untitled Entry'}
                  </h3>
                  <span className="px-3 py-1 bg-purple-100 text-purple-800 text-xs font-medium rounded-full">
                    {entry.source_type}
                  </span>
                </div>
                <p className="text-gray-600 text-sm mb-3 line-clamp-3">
                  {entry.content}
                </p>
                {entry.tags && entry.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {entry.tags.map((tag, idx) => (
                      <span key={idx} className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>Added {new Date(entry.created_at).toLocaleDateString()}</span>
                  <span>By {entry.created_by || 'Unknown'}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Info Banner */}
        <div className="mt-8 bg-blue-50 border-2 border-blue-200 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-3">📄 About Uploaded Documents</h3>
          <div className="space-y-2 text-sm text-blue-800">
            <p><strong>Storage:</strong> Uploaded documents are processed and their content is extracted. The original files are stored securely in Supabase Storage.</p>
            <p><strong>Data Extraction:</strong> Only relevant travel information is extracted (destinations, activities, recommendations). Personal information is automatically filtered out.</p>
            <p><strong>Privacy:</strong> No personal details (names, addresses, phone numbers, payment info) are stored in the knowledge base.</p>
            <p><strong>Access:</strong> All uploaded knowledge is visible to Captains and Admins only.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

