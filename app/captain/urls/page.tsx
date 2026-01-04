'use client';

/**
 * Captain Portal: Scraped URLs
 * Shows ALL scraped URLs from the system (visible to all captains)
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client-browser';
import AdminNav from '@/components/admin/admin-nav';
import { scrapingAPI } from '@/lib/api/captain-portal';

interface ScrapedURL {
  id: string;
  url: string;
  domain: string;
  scraped_at: string;
  entered_by_email?: string;
  status: 'success' | 'failed' | 'processing';
  pois_discovered: number;
  relationships_discovered: number;
  subpages_discovered: number;
  subpages?: string[];
  error_message?: string;
  last_scraped: string;
  metadata?: any;
}

type StatusFilter = 'all' | 'success' | 'failed' | 'processing';
type SortOption = 'date_desc' | 'date_asc' | 'domain' | 'pois_desc';

export default function CaptainURLsPage() {
  const router = useRouter();
  const supabase = createClient();
  
  const [loading, setLoading] = useState(true);
  const [urls, setUrls] = useState<ScrapedURL[]>([]);
  const [filteredUrls, setFilteredUrls] = useState<ScrapedURL[]>([]);
  
  // Filters & Sort
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [domainFilter, setDomainFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('date_desc');
  
  // Expanded details
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Stats
  const [stats, setStats] = useState({
    total: 0,
    success: 0,
    failed: 0,
    processing: 0,
    totalPOIs: 0,
    totalRelations: 0,
    totalKnowledge: 0,
    uniqueDomains: 0
  });

  // Unique domains for filter
  const [domains, setDomains] = useState<string[]>([]);

  // Auth check
  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/auth/signin');
        return;
      }
      fetchURLs();
    }
    init();
  }, [router, supabase.auth]);

  // Fetch URLs (ALL captains' URLs)
  const fetchURLs = async () => {
    setLoading(true);
    try {
      const res: any = await scrapingAPI.listURLs(0, 200);
      const rows: ScrapedURL[] = res.urls || [];
      setUrls(rows);

      const total = rows.length;
      const success = rows.filter(u => u.status === 'success').length;
      const failed = rows.filter(u => u.status === 'failed').length;
      const processing = rows.filter(u => u.status === 'processing').length;
      const totalPOIs = rows.reduce((sum, u) => sum + (u.pois_discovered || 0), 0);
      const totalRelations = rows.reduce((sum, u) => sum + (u.relationships_discovered || 0), 0);
      const totalKnowledge = 0;
      const uniqueDomains = new Set(rows.map(u => u.domain)).size;
      setStats({ total, success, failed, processing, totalPOIs, totalRelations, totalKnowledge, uniqueDomains });

      const uniqueDomainsList = Array.from(new Set(rows.map(u => u.domain))).sort();
      setDomains(uniqueDomainsList);
    } catch (error) {
      console.error('Failed to fetch URLs:', error);
    } finally {
      setLoading(false);
    }
  };

  // Apply filters and sort
  useEffect(() => {
    let filtered = [...urls];
    
    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(u => u.status === statusFilter);
    }
    
    // Domain filter
    if (domainFilter !== 'all') {
      filtered = filtered.filter(u => u.domain === domainFilter);
    }
    
    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(u =>
        u.url.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.domain.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    // Sort
    switch (sortBy) {
      case 'date_desc':
        filtered.sort((a, b) => new Date(b.scraped_at).getTime() - new Date(a.scraped_at).getTime());
        break;
      case 'date_asc':
        filtered.sort((a, b) => new Date(a.scraped_at).getTime() - new Date(b.scraped_at).getTime());
        break;
      case 'domain':
        filtered.sort((a, b) => a.domain.localeCompare(b.domain));
        break;
      case 'pois_desc':
        filtered.sort((a, b) => (b.pois_discovered || 0) - (a.pois_discovered || 0));
        break;
    }
    
    setFilteredUrls(filtered);
  }, [urls, statusFilter, domainFilter, searchQuery, sortBy]);

  // Re-scrape URL
  const handleRescrape = async (url: string, urlId: string) => {
    if (!confirm(`Re-scrape "${url}"? This will refresh all extracted data.`)) {
      return;
    }
    
    try {
      await scrapingAPI.scrapeURL(url, true, true);
      alert('🔄 Re-scraping started! This may take a moment.');
      fetchURLs();
    } catch (error) {
      alert('❌ Failed to start re-scraping');
    }
  };

  // Delete URL record
  const handleDelete = async (url: string, urlId: string) => {
    if (!confirm(`Delete scraping record for "${url}"? Extracted knowledge will remain in database.`)) {
      return;
    }
    
    try {
      // Admin-only deletion not wired yet; keep audit trail.
      setUrls(prev => prev.filter(u => u.id !== urlId));
      alert('✅ Hidden locally. Admin deletion endpoint can be added next.');
    } catch (error) {
      alert('❌ Failed to delete URL record');
    }
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'bg-green-100 text-green-700';
      case 'processing': return 'bg-blue-100 text-blue-700';
      case 'failed': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  // Extract domain from URL
  const extractDomain = (url: string) => {
    try {
      return new URL(url).hostname;
    } catch {
      return url;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">Loading scraped URLs...</p>
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
              🌐 Scraped URLs
            </h1>
            <p className="text-lg text-gray-600 mb-4">
              All scraped URLs from the system (visible to all captains)
            </p>
            
            {/* Info Box */}
            <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 space-y-2 max-w-3xl">
              <div className="text-sm">
                <strong className="text-indigo-900">SHARED VIEW:</strong>{' '}
                <span className="text-gray-700">ALL captains can see ALL scraped URLs, regardless of who added them</span>
              </div>
              <div className="text-sm">
                <strong className="text-indigo-900">RE-SCRAPE:</strong>{' '}
                <span className="text-gray-700">Any captain can re-scrape a URL to refresh data</span>
              </div>
              <div className="text-sm">
                <strong className="text-indigo-900">SUBPAGES:</strong>{' '}
                <span className="text-gray-700">System automatically discovers and scrapes related pages</span>
              </div>
            </div>
          </div>
          <AdminNav />
        </div>

        {/* Stats Dashboard */}
        <div className="grid grid-cols-4 md:grid-cols-8 gap-4 mb-8">
          <div className="col-span-2 bg-white rounded-lg shadow-sm p-4">
            <div className="text-3xl font-bold text-gray-900">{stats.total}</div>
            <div className="text-sm text-gray-600">Total URLs</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="text-2xl font-bold text-green-600">{stats.success}</div>
            <div className="text-sm text-gray-600">Success</div>
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
            <div className="text-2xl font-bold text-purple-600">{stats.uniqueDomains}</div>
            <div className="text-sm text-gray-600">Domains</div>
          </div>
        </div>

        {/* Filters & Controls */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search URLs
              </label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by URL or domain..."
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
                <option value="success">Success</option>
                <option value="processing">Processing</option>
                <option value="failed">Failed</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Filter by Domain
              </label>
              <select
                value={domainFilter}
                onChange={(e) => setDomainFilter(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Domains</option>
                {domains.map(domain => (
                  <option key={domain} value={domain}>{domain}</option>
                ))}
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
                <option value="domain">Domain (A-Z)</option>
                <option value="pois_desc">Most POIs</option>
              </select>
            </div>
          </div>
          
          <div className="text-sm text-gray-600">
            Showing {filteredUrls.length} of {urls.length} URLs
          </div>
        </div>

        {/* URL List */}
        <div className="space-y-4">
          {filteredUrls.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm p-12 text-center">
              <div className="text-6xl mb-4">🌐</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {urls.length === 0 ? 'No URLs Scraped Yet' : 'No Results Found'}
              </h3>
              <p className="text-gray-600 mb-6">
                {urls.length === 0
                  ? 'Start scraping URLs to see them here!'
                  : 'Try adjusting your search or filters'
                }
              </p>
              {urls.length === 0 && (
                <button
                  onClick={() => router.push('/captain/upload')}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                >
                  Add URLs to Scrape
                </button>
              )}
            </div>
          ) : (
            filteredUrls.map((urlData) => (
              <div key={urlData.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                {/* Main Row */}
                <div className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2 flex-wrap">
                        <a
                          href={urlData.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline font-medium break-all"
                        >
                          {urlData.url}
                        </a>
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(urlData.status)}`}>
                          {urlData.status.toUpperCase()}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-gray-600 mb-3 flex-wrap">
                        <span>🌐 {urlData.domain}</span>
                        <span>📅 {new Date(urlData.scraped_at).toLocaleDateString()}</span>
                        {urlData.entered_by_email && <span>👤 {urlData.entered_by_email}</span>}
                        <span>🕐 {new Date(urlData.last_scraped || urlData.scraped_at).toLocaleTimeString()}</span>
                      </div>

                      {urlData.status === 'success' && (
                        <div className="flex items-center gap-6 text-sm">
                          <span className="text-green-600 font-semibold">
                            📍 {urlData.pois_discovered} POIs
                          </span>
                          <span className="text-blue-600 font-semibold">
                            🔗 {urlData.relationships_discovered} Relations
                          </span>
                          {urlData.subpages_discovered > 0 && (
                            <span className="text-orange-600 font-semibold">
                              📄 {urlData.subpages_discovered} Subpages
                            </span>
                          )}
                        </div>
                      )}

                      {urlData.error_message && (
                        <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                          <strong>Error:</strong> {urlData.error_message}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 ml-4">
                      <button
                        onClick={() => router.push(`/captain/upload?tab=url&openScrape=${urlData.id}`)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                      >
                        Open
                      </button>
                      <button
                        onClick={() => setExpandedId(expandedId === urlData.id ? null : urlData.id)}
                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                      >
                        {expandedId === urlData.id ? '▲ Hide' : '▼ Details'}
                      </button>
                      
                      <button
                        onClick={() => handleRescrape(urlData.url, urlData.id)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                      >
                        🔄 Re-scrape
                      </button>
                      
                      <button
                        onClick={() => handleDelete(urlData.url, urlData.id)}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors"
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  </div>
                </div>

                {/* Expanded Details */}
                {expandedId === urlData.id && (
                  <div className="border-t border-gray-200 bg-gray-50 p-6">
                    {urlData.status === 'success' && urlData.subpages && urlData.subpages.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-3">
                          📄 Discovered Subpages ({urlData.subpages.length})
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                          {urlData.subpages.map((subpage, i) => (
                            <a
                              key={i}
                              href={subpage}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-3 py-2 bg-white rounded-lg border border-gray-200 text-sm text-blue-600 hover:bg-blue-50 hover:border-blue-300 transition-colors truncate"
                              title={subpage}
                            >
                              {subpage}
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Scraping Info */}
                    <div className="mt-4 p-3 bg-white rounded-lg border border-gray-200">
                      <p className="text-sm">
                        <strong>Last Scraped:</strong>{' '}
                        {new Date(urlData.last_scraped).toLocaleString()}
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
