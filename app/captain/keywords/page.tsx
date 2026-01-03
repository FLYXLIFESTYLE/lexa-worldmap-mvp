'use client';

/**
 * Captain Portal: Keyword Monitor
 * Like Google Alerts - set keywords, receive daily article notifications, queue for scraping
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client-browser';
import AdminNav from '@/components/admin/admin-nav';
import { Bell, Plus, Edit2, Trash2, Check, X, ExternalLink, Clock } from 'lucide-react';
import { keywordsAPI } from '@/lib/api/captain-portal';

interface Keyword {
  id: string;
  keyword: string;
  created_at: string;
  created_by: string;
  article_count: number;
  last_scan: string;
  active: boolean;
}

interface Article {
  id: string;
  keyword_id: string;
  keyword: string;
  title: string;
  url: string;
  source: string;
  published_date: string;
  summary: string;
  selected_for_scraping: boolean;
  scraped: boolean;
  scraped_at?: string;
  discovered_at: string;
}

export default function CaptainKeywordsPage() {
  const router = useRouter();
  const supabase = createClient();
  
  const [loading, setLoading] = useState(true);
  const [keywords, setKeywords] = useState<Keyword[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [filteredArticles, setFilteredArticles] = useState<Article[]>([]);
  
  // Keyword management
  const [showAddKeyword, setShowAddKeyword] = useState(false);
  const [newKeyword, setNewKeyword] = useState('');
  const [editingKeyword, setEditingKeyword] = useState<string | null>(null);
  const [editKeywordText, setEditKeywordText] = useState('');
  
  // Filters
  const [selectedKeywordFilter, setSelectedKeywordFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'new' | 'selected' | 'scraped'>('all');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');
  
  // Selection
  const [selectedArticles, setSelectedArticles] = useState<Set<string>>(new Set());

  // Stats
  const [stats, setStats] = useState({
    totalKeywords: 0,
    activeKeywords: 0,
    totalArticles: 0,
    newArticles: 0,
    selectedArticles: 0,
    scrapedArticles: 0,
    nextScan: '11:00 PM'
  });

  // Auth check
  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/auth/signin');
        return;
      }
      fetchData();
    }
    init();
  }, [router, supabase.auth]);

  // Fetch keywords and articles
  const fetchData = async () => {
    setLoading(true);
    try {
      // TODO: Replace with actual API calls
      // Mock data
      const mockKeywords: Keyword[] = [
        {
          id: '1',
          keyword: 'Monaco luxury hotels',
          created_at: new Date('2024-12-20').toISOString(),
          created_by: 'captain@lexa.com',
          article_count: 12,
          last_scan: new Date('2024-12-30T23:00:00').toISOString(),
          active: true
        },
        {
          id: '2',
          keyword: 'French Riviera restaurants',
          created_at: new Date('2024-12-22').toISOString(),
          created_by: 'captain@lexa.com',
          article_count: 8,
          last_scan: new Date('2024-12-30T23:00:00').toISOString(),
          active: true
        },
        {
          id: '3',
          keyword: 'Yacht charter Mediterranean',
          created_at: new Date('2024-12-25').toISOString(),
          created_by: 'paul@lexa.com',
          article_count: 15,
          last_scan: new Date('2024-12-30T23:00:00').toISOString(),
          active: false
        }
      ];

      const mockArticles: Article[] = [
        {
          id: '1',
          keyword_id: '1',
          keyword: 'Monaco luxury hotels',
          title: 'New Five-Star Hotel Opens in Monte Carlo: Hotel Metropole Unveils Renovated Suites',
          url: 'https://www.luxurytravel.com/monaco-new-hotel-2024',
          source: 'Luxury Travel Magazine',
          published_date: new Date('2024-12-30').toISOString(),
          summary: 'The iconic Hotel Metropole Monte-Carlo has completed a major renovation of its luxury suites, featuring Karl Lagerfeld designs and Michelin-starred dining.',
          selected_for_scraping: false,
          scraped: false,
          discovered_at: new Date('2024-12-31T00:00:00').toISOString()
        },
        {
          id: '2',
          keyword_id: '1',
          keyword: 'Monaco luxury hotels',
          title: 'Top 10 Most Expensive Hotels in Monaco for 2025',
          url: 'https://www.forbes.com/monaco-hotels-2025',
          source: 'Forbes Travel',
          published_date: new Date('2024-12-29').toISOString(),
          summary: 'From Hotel de Paris to Fairmont Monte Carlo, discover the most luxurious accommodations in the principality.',
          selected_for_scraping: true,
          scraped: false,
          discovered_at: new Date('2024-12-30T00:00:00').toISOString()
        },
        {
          id: '3',
          keyword_id: '2',
          keyword: 'French Riviera restaurants',
          title: 'Alain Ducasse Opens New Restaurant Concept in Cannes',
          url: 'https://www.eater.com/cannes-ducasse-2024',
          source: 'Eater',
          published_date: new Date('2024-12-28').toISOString(),
          summary: 'The celebrated chef debuts a casual Mediterranean bistro concept featuring local ingredients and wine pairings.',
          selected_for_scraping: true,
          scraped: true,
          scraped_at: new Date('2024-12-29T10:00:00').toISOString(),
          discovered_at: new Date('2024-12-29T00:00:00').toISOString()
        },
        {
          id: '4',
          keyword_id: '3',
          keyword: 'Yacht charter Mediterranean',
          title: 'Luxury Yacht Charter Bookings Surge 45% for Summer 2025',
          url: 'https://www.yachtingmagazine.com/bookings-2025',
          source: 'Yachting World',
          published_date: new Date('2024-12-27').toISOString(),
          summary: 'Mediterranean yacht charters see unprecedented demand, with Monaco and Saint-Tropez leading destinations.',
          selected_for_scraping: false,
          scraped: false,
          discovered_at: new Date('2024-12-28T00:00:00').toISOString()
        }
      ];

      setKeywords(mockKeywords);
      setArticles(mockArticles);

      // Calculate stats
      const totalKeywords = mockKeywords.length;
      const activeKeywords = mockKeywords.filter(k => k.active).length;
      const totalArticles = mockArticles.length;
      const newArticles = mockArticles.filter(a => !a.selected_for_scraping && !a.scraped).length;
      const selectedArticles = mockArticles.filter(a => a.selected_for_scraping && !a.scraped).length;
      const scrapedArticles = mockArticles.filter(a => a.scraped).length;

      setStats({
        totalKeywords,
        activeKeywords,
        totalArticles,
        newArticles,
        selectedArticles,
        scrapedArticles,
        nextScan: '11:00 PM'
      });
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter articles
  useEffect(() => {
    let filtered = [...articles];

    // Keyword filter
    if (selectedKeywordFilter !== 'all') {
      filtered = filtered.filter(a => a.keyword_id === selectedKeywordFilter);
    }

    // Status filter
    if (statusFilter === 'new') {
      filtered = filtered.filter(a => !a.selected_for_scraping && !a.scraped);
    } else if (statusFilter === 'selected') {
      filtered = filtered.filter(a => a.selected_for_scraping && !a.scraped);
    } else if (statusFilter === 'scraped') {
      filtered = filtered.filter(a => a.scraped);
    }

    // Date filter
    const now = new Date();
    if (dateFilter === 'today') {
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      filtered = filtered.filter(a => new Date(a.discovered_at) >= today);
    } else if (dateFilter === 'week') {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      filtered = filtered.filter(a => new Date(a.discovered_at) >= weekAgo);
    } else if (dateFilter === 'month') {
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      filtered = filtered.filter(a => new Date(a.discovered_at) >= monthAgo);
    }

    // Sort by newest first
    filtered.sort((a, b) => new Date(b.discovered_at).getTime() - new Date(a.discovered_at).getTime());

    setFilteredArticles(filtered);
  }, [articles, selectedKeywordFilter, statusFilter, dateFilter]);

  // Add keyword
  const handleAddKeyword = async () => {
    if (!newKeyword.trim()) return;

    try {
      // TODO: Call backend API
      const newKw: Keyword = {
        id: Date.now().toString(),
        keyword: newKeyword.trim(),
        created_at: new Date().toISOString(),
        created_by: 'captain@lexa.com',
        article_count: 0,
        last_scan: new Date().toISOString(),
        active: true
      };

      setKeywords(prev => [...prev, newKw]);
      setNewKeyword('');
      setShowAddKeyword(false);
      alert('✅ Keyword added! Daily scanning will begin at 11 PM.');
    } catch (error) {
      alert('❌ Failed to add keyword');
    }
  };

  // Delete keyword
  const handleDeleteKeyword = async (id: string, keyword: string) => {
    if (!confirm(`Delete keyword "${keyword}"? Associated articles will remain but no new ones will be found.`)) {
      return;
    }

    try {
      // TODO: Call backend API
      setKeywords(prev => prev.filter(k => k.id !== id));
      alert('✅ Keyword deleted!');
    } catch (error) {
      alert('❌ Failed to delete keyword');
    }
  };

  // Toggle keyword active status
  const handleToggleKeyword = async (id: string) => {
    try {
      // TODO: Call backend API
      setKeywords(prev => prev.map(k =>
        k.id === id ? { ...k, active: !k.active } : k
      ));
    } catch (error) {
      alert('❌ Failed to toggle keyword');
    }
  };

  // Select article for scraping
  const handleSelectArticle = async (id: string, selected: boolean) => {
    try {
      // TODO: Call backend API
      setArticles(prev => prev.map(a =>
        a.id === id ? { ...a, selected_for_scraping: selected } : a
      ));
    } catch (error) {
      alert('❌ Failed to update article');
    }
  };

  // Delete article
  const handleDeleteArticle = async (id: string, title: string) => {
    if (!confirm(`Delete article "${title}"?`)) {
      return;
    }

    try {
      // TODO: Call backend API
      setArticles(prev => prev.filter(a => a.id !== id));
      alert('✅ Article deleted!');
    } catch (error) {
      alert('❌ Failed to delete article');
    }
  };

  // Bulk select for scraping
  const handleBulkSelect = () => {
    if (selectedArticles.size === 0) {
      alert('Please select articles first');
      return;
    }

    try {
      setArticles(prev => prev.map(a =>
        selectedArticles.has(a.id) ? { ...a, selected_for_scraping: true } : a
      ));
      setSelectedArticles(new Set());
      alert(`✅ ${selectedArticles.size} article(s) queued for scraping!`);
    } catch (error) {
      alert('❌ Failed to queue articles');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">Loading keyword monitor...</p>
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
              🔔 Keyword Monitor
            </h1>
            <p className="text-lg text-gray-600 mb-4">
              Like Google Alerts for luxury travel - set keywords, receive daily articles
            </p>

            {/* Info Box */}
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 space-y-2 max-w-3xl">
              <div className="text-sm">
                <strong className="text-orange-900">DAILY SCANNING:</strong>{' '}
                <span className="text-gray-700">System scans all active keywords every day at 11 PM</span>
              </div>
              <div className="text-sm">
                <strong className="text-orange-900">ARTICLE QUEUE:</strong>{' '}
                <span className="text-gray-700">Select articles to queue for unstructured data scraping</span>
              </div>
              <div className="text-sm">
                <strong className="text-orange-900">CLEANUP:</strong>{' '}
                <span className="text-gray-700">Delete unwanted articles to keep your feed clean</span>
              </div>
            </div>
          </div>
          <AdminNav />
        </div>

        {/* Stats Dashboard */}
        <div className="grid grid-cols-3 md:grid-cols-7 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="text-2xl font-bold text-gray-900">{stats.totalKeywords}</div>
            <div className="text-sm text-gray-600">Keywords</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="text-2xl font-bold text-green-600">{stats.activeKeywords}</div>
            <div className="text-sm text-gray-600">Active</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="text-2xl font-bold text-blue-600">{stats.totalArticles}</div>
            <div className="text-sm text-gray-600">Articles</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="text-2xl font-bold text-orange-600">{stats.newArticles}</div>
            <div className="text-sm text-gray-600">New</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="text-2xl font-bold text-purple-600">{stats.selectedArticles}</div>
            <div className="text-sm text-gray-600">Queued</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="text-2xl font-bold text-lexa-gold">{stats.scrapedArticles}</div>
            <div className="text-sm text-gray-600">Scraped</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4 flex flex-col items-center justify-center">
            <Clock className="h-5 w-5 text-gray-600 mb-1" />
            <div className="text-sm font-semibold text-gray-900">{stats.nextScan}</div>
            <div className="text-xs text-gray-500">Next Scan</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Keywords Management */}
          <div className="lg:col-span-1 space-y-6">
            {/* Add Keyword Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Your Keywords</h2>
                <button
                  onClick={() => setShowAddKeyword(!showAddKeyword)}
                  className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>

              {showAddKeyword && (
                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <input
                    type="text"
                    value={newKeyword}
                    onChange={(e) => setNewKeyword(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddKeyword()}
                    placeholder="e.g., Monaco luxury hotels"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-2"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleAddKeyword}
                      className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                    >
                      Add
                    </button>
                    <button
                      onClick={() => {
                        setShowAddKeyword(false);
                        setNewKeyword('');
                      }}
                      className="px-3 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Keywords List */}
              <div className="space-y-2">
                {keywords.map((kw) => (
                  <div
                    key={kw.id}
                    className={`p-3 rounded-lg border ${
                      kw.active ? 'bg-white border-gray-200' : 'bg-gray-50 border-gray-200 opacity-60'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <button
                            onClick={() => handleToggleKeyword(kw.id)}
                            className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                              kw.active ? 'bg-green-500 border-green-500' : 'bg-white border-gray-300'
                            }`}
                          >
                            {kw.active && <Check className="h-3 w-3 text-white" />}
                          </button>
                          <span className="font-medium text-gray-900 text-sm truncate">
                            {kw.keyword}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500 ml-6">
                          {kw.article_count} articles
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteKeyword(kw.id, kw.keyword)}
                        className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}

                {keywords.length === 0 && (
                  <div className="text-center py-8 text-gray-500 text-sm">
                    No keywords yet. Add your first keyword above!
                  </div>
                )}
              </div>
            </div>

            {/* Info Card */}
            <div className="bg-gradient-to-br from-blue-50 to-purple-50 border border-blue-200 rounded-xl p-4">
              <h3 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                <Bell className="h-4 w-4" />
                How It Works
              </h3>
              <ul className="space-y-2 text-sm text-gray-700">
                <li>• Add keywords you want to monitor</li>
                <li>• System scans daily at 11 PM</li>
                <li>• Review articles next morning</li>
                <li>• Select useful ones for scraping</li>
                <li>• Delete irrelevant articles</li>
              </ul>
            </div>
          </div>

          {/* Right Column: Articles Feed */}
          <div className="lg:col-span-2 space-y-6">
            {/* Filters */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Article Feed</h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Filter by Keyword
                  </label>
                  <select
                    value={selectedKeywordFilter}
                    onChange={(e) => setSelectedKeywordFilter(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="all">All Keywords</option>
                    {keywords.map(kw => (
                      <option key={kw.id} value={kw.id}>{kw.keyword}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Status
                  </label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as any)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="all">All Status</option>
                    <option value="new">New</option>
                    <option value="selected">Selected</option>
                    <option value="scraped">Scraped</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Date Range
                  </label>
                  <select
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value as any)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="all">All Time</option>
                    <option value="today">Today</option>
                    <option value="week">This Week</option>
                    <option value="month">This Month</option>
                  </select>
                </div>
              </div>

              {selectedArticles.size > 0 && (
                <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <span className="text-sm font-medium text-blue-900">
                    {selectedArticles.size} article(s) selected
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={handleBulkSelect}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                    >
                      Queue for Scraping
                    </button>
                    <button
                      onClick={() => setSelectedArticles(new Set())}
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-300 transition-colors"
                    >
                      Clear
                    </button>
                  </div>
                </div>
              )}

              <div className="text-sm text-gray-600">
                Showing {filteredArticles.length} of {articles.length} articles
              </div>
            </div>

            {/* Articles List */}
            <div className="space-y-4">
              {filteredArticles.length === 0 ? (
                <div className="bg-white rounded-lg shadow-sm p-12 text-center">
                  <div className="text-6xl mb-4">📰</div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    No Articles Yet
                  </h3>
                  <p className="text-gray-600">
                    Add keywords and wait for the daily scan at 11 PM!
                  </p>
                </div>
              ) : (
                filteredArticles.map((article) => (
                  <div
                    key={article.id}
                    className={`bg-white rounded-xl shadow-sm border ${
                      article.scraped
                        ? 'border-green-200 bg-green-50/30'
                        : article.selected_for_scraping
                        ? 'border-purple-200 bg-purple-50/30'
                        : 'border-gray-200'
                    } p-6`}
                  >
                    <div className="flex items-start gap-4">
                      {/* Checkbox */}
                      {!article.scraped && (
                        <input
                          type="checkbox"
                          checked={selectedArticles.has(article.id)}
                          onChange={(e) => {
                            const newSelected = new Set(selectedArticles);
                            if (e.target.checked) {
                              newSelected.add(article.id);
                            } else {
                              newSelected.delete(article.id);
                            }
                            setSelectedArticles(newSelected);
                          }}
                          className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                      )}

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex-1 min-w-0">
                            <a
                              href={article.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-lg font-semibold text-gray-900 hover:text-blue-600 transition-colors line-clamp-2 flex items-start gap-2"
                            >
                              {article.title}
                              <ExternalLink className="h-4 w-4 flex-shrink-0 mt-1" />
                            </a>
                            <div className="flex items-center gap-3 mt-1 text-sm text-gray-600">
                              <span>{article.source}</span>
                              <span>•</span>
                              <span>{new Date(article.published_date).toLocaleDateString()}</span>
                              <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                                {article.keyword}
                              </span>
                            </div>
                          </div>

                          {/* Status Badge */}
                          {article.scraped ? (
                            <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold flex-shrink-0">
                              ✓ Scraped
                            </span>
                          ) : article.selected_for_scraping ? (
                            <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-semibold flex-shrink-0">
                              ⏳ Queued
                            </span>
                          ) : (
                            <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-semibold flex-shrink-0">
                              New
                            </span>
                          )}
                        </div>

                        <p className="text-sm text-gray-700 leading-relaxed mb-3">
                          {article.summary}
                        </p>

                        {/* Actions */}
                        <div className="flex items-center gap-2">
                          {!article.scraped && !article.selected_for_scraping && (
                            <button
                              onClick={() => handleSelectArticle(article.id, true)}
                              className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                            >
                              Select for Scraping
                            </button>
                          )}

                          {article.selected_for_scraping && !article.scraped && (
                            <button
                              onClick={() => handleSelectArticle(article.id, false)}
                              className="px-3 py-1.5 bg-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-300 transition-colors"
                            >
                              Unselect
                            </button>
                          )}

                          <button
                            onClick={() => handleDeleteArticle(article.id, article.title)}
                            className="px-3 py-1.5 bg-red-100 text-red-700 rounded-lg text-sm font-medium hover:bg-red-200 transition-colors"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
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
