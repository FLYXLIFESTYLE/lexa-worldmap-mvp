'use client';

/**
 * Scraped URLs Management Page
 * View all scraped URLs with status and metadata
 */

import { useState, useEffect } from 'react';
import Link from 'next/link';
import AdminNav from '@/components/admin/admin-nav';

interface ScrapedURL {
  url: string;
  scrapedAt: Date;
  status: 'success' | 'failed' | 'processing';
  knowledgeCount: number;
  poisExtracted: number;
  relationshipsCreated: number;
  error?: string;
  subpagesFound?: string[];
  contributorName?: string;
}

export default function ScrapedURLsPage() {
  const [urls, setUrls] = useState<ScrapedURL[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchURLs();
  }, [page]);

  const fetchURLs = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/knowledge/scraped-urls?page=${page}&limit=50`);
      const data = await response.json();

      if (data.success) {
        setUrls(data.urls);
        setTotal(data.total);
      } else {
        setError(data.error || 'Failed to load URLs');
      }
    } catch (err) {
      setError('Failed to fetch scraped URLs');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (url: string) => {
    if (!confirm(`Delete record for ${url}?`)) return;

    try {
      const response = await fetch('/api/knowledge/scraped-urls', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });

      if (response.ok) {
        fetchURLs();
      } else {
        alert('Failed to delete URL record');
      }
    } catch (err) {
      console.error(err);
      alert('Failed to delete URL record');
    }
  };

  const handleRescrape = (url: string) => {
    // TODO: Implement re-scraping with force=true
    window.open(`/admin/knowledge/editor?url=${encodeURIComponent(url)}`, '_blank');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-lexa-navy via-zinc-900 to-black p-8">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex items-start justify-between mb-4">
          <Link
            href="/admin/knowledge"
            className="px-6 py-3 bg-zinc-800 text-white rounded-lg hover:bg-zinc-700 transition-colors"
          >
            ← Back to Portal
          </Link>
          <AdminNav />
        </div>
        
        <div className="flex items-center justify-between mb-4">
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-white mb-2">Scraped URLs</h1>
            <p className="text-zinc-400 mb-4">
              {total} URLs tracked • Page {page}
            </p>
            
            {/* Why - What - How */}
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 space-y-2 max-w-2xl">
              <div className="text-sm text-white">
                <strong className="text-lexa-gold">WHY:</strong> Track all URL scraping activity and prevent duplicate processing
              </div>
              <div className="text-sm text-white">
                <strong className="text-lexa-gold">WHAT:</strong> View scrape history, success rates, subpages found, and knowledge extracted
              </div>
              <div className="text-sm text-white">
                <strong className="text-lexa-gold">HOW:</strong> Review status, re-scrape failed URLs, or delete old records
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="max-w-7xl mx-auto mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
          <p className="text-red-400">{error}</p>
        </div>
      )}

      {/* Loading State */}
      {isLoading ? (
        <div className="max-w-7xl mx-auto text-center py-12">
          <p className="text-zinc-400">Loading URLs...</p>
        </div>
      ) : (
        <>
          {/* URL List */}
          <div className="max-w-7xl mx-auto space-y-4">
            {urls.map((urlData) => (
              <div
                key={urlData.url}
                className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6 hover:bg-white/10 transition-colors"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <a
                      href={urlData.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-lexa-gold hover:underline break-all"
                    >
                      {urlData.url}
                    </a>
                    <div className="mt-2 flex items-center gap-4 text-sm text-zinc-400">
                      <span>
                        {new Date(urlData.scrapedAt).toLocaleDateString()} at{' '}
                        {new Date(urlData.scrapedAt).toLocaleTimeString()}
                      </span>
                      {urlData.contributorName && (
                        <span>by {urlData.contributorName}</span>
                      )}
                      <span
                        className={`px-2 py-1 rounded ${
                          urlData.status === 'success'
                            ? 'bg-green-500/20 text-green-400'
                            : urlData.status === 'failed'
                            ? 'bg-red-500/20 text-red-400'
                            : 'bg-yellow-500/20 text-yellow-400'
                        }`}
                      >
                        {urlData.status}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleRescrape(urlData.url)}
                      className="px-4 py-2 bg-zinc-700 text-white rounded-lg hover:bg-zinc-600 transition-colors text-sm"
                    >
                      Re-scrape
                    </button>
                    <button
                      onClick={() => handleDelete(urlData.url)}
                      className="px-4 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors text-sm"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="bg-white/5 rounded-lg p-3">
                    <p className="text-zinc-400 text-xs mb-1">Knowledge</p>
                    <p className="text-white text-xl font-semibold">
                      {urlData.knowledgeCount}
                    </p>
                  </div>
                  <div className="bg-white/5 rounded-lg p-3">
                    <p className="text-zinc-400 text-xs mb-1">POIs</p>
                    <p className="text-white text-xl font-semibold">
                      {urlData.poisExtracted}
                    </p>
                  </div>
                  <div className="bg-white/5 rounded-lg p-3">
                    <p className="text-zinc-400 text-xs mb-1">Relationships</p>
                    <p className="text-white text-xl font-semibold">
                      {urlData.relationshipsCreated}
                    </p>
                  </div>
                </div>

                {/* Subpages */}
                {urlData.subpagesFound && urlData.subpagesFound.length > 0 && (
                  <div className="bg-white/5 rounded-lg p-3">
                    <p className="text-zinc-400 text-xs mb-2">
                      Subpages Found ({urlData.subpagesFound.length})
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {urlData.subpagesFound.slice(0, 5).map((subpage) => (
                        <a
                          key={subpage}
                          href={subpage}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-lexa-gold hover:underline"
                        >
                          {new URL(subpage).pathname}
                        </a>
                      ))}
                      {urlData.subpagesFound.length > 5 && (
                        <span className="text-xs text-zinc-500">
                          +{urlData.subpagesFound.length - 5} more
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Error */}
                {urlData.error && (
                  <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mt-3">
                    <p className="text-red-400 text-sm">{urlData.error}</p>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Pagination */}
          {total > 50 && (
            <div className="max-w-7xl mx-auto mt-8 flex justify-center gap-2">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="px-4 py-2 bg-zinc-800 text-white rounded-lg hover:bg-zinc-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="px-4 py-2 text-white">
                Page {page} of {Math.ceil(total / 50)}
              </span>
              <button
                onClick={() => setPage(page + 1)}
                disabled={page >= Math.ceil(total / 50)}
                className="px-4 py-2 bg-zinc-800 text-white rounded-lg hover:bg-zinc-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

