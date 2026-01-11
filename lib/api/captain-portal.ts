/**
 * Captain Portal API Client
 * Connects frontend to backend FastAPI endpoints
 */

import { createClient } from '@/lib/supabase/client-browser';

// Backend base URL
// Use env when provided; otherwise fall back to Render (prod) to avoid localhost connection errors.
const API_BASE_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  'https://lexa-worldmap-mvp-rlss.onrender.com';

// Debug log (remove after testing)
if (typeof window !== 'undefined') {
  console.log('🔧 Captain Portal API Base URL:', API_BASE_URL);
}

// Helper for making API requests
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;

  // Attach Supabase access token so backend can enforce per-user access.
  const supabase = createClient();
  const { data } = await supabase.auth.getSession();
  const accessToken = data.session?.access_token;

  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(error.detail || `API error: ${response.statusText}`);
  }

  return response.json();
}

// ============================================================================
// UPLOAD API
// ============================================================================

export interface UploadResponse {
  success: boolean;
  upload_id: string;
  filename: string;
  status: string;
  confidence_score?: number;
  pois_extracted: number;
  intelligence_extracted: {
    pois: number;
    experiences: number;
    trends: number;
    insights: number;
    prices: number;
    competitors: number;
  learnings: number;
  service_providers?: number;
  };
  extracted_data?: {
    pois?: any[];
    experiences?: any[];
    trends?: any[];
    client_insights?: any[];
    price_intelligence?: any;
    competitor_analysis?: any[];
    operational_learnings?: any[];
  service_providers?: any[];
  emotional_map?: any[];
  };
  counts_real?: Record<string, number>;
  counts_estimated?: Record<string, number>;
  extraction_contract?: any;
  file_size_kb?: number;
  message?: string;
}

export const uploadAPI = {
  /**
   * Upload a file
   */
  uploadFile: async (file: File): Promise<UploadResponse> => {
    const formData = new FormData();
    formData.append('file', file);

    const supabase = createClient();
    const { data } = await supabase.auth.getSession();
    const accessToken = data.session?.access_token;

    const response = await fetch(`${API_BASE_URL}/api/captain/upload/`, {
      method: 'POST',
      body: formData,
      headers: {
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Upload failed' }));
      throw new Error(error.detail);
    }

    return response.json();
  },

  /**
   * Upload text/paste
   */
  uploadText: async (title: string, content: string): Promise<UploadResponse> => {
    return apiRequest('/api/captain/upload/text', {
      method: 'POST',
      body: JSON.stringify({ title, text: content }),
    });
  },

  /**
   * Get upload history
   */
  getHistory: async (skip = 0, limit = 50) => {
    return apiRequest(`/api/captain/upload/history?offset=${skip}&limit=${limit}`, {
      method: 'GET',
    });
  },

  getUpload: async (uploadId: string) => {
    return apiRequest<{ upload: any }>(`/api/captain/upload/id/${uploadId}`, { method: 'GET' });
  },

  deleteUpload: async (uploadId: string) => {
    return apiRequest<{ success: boolean; deleted: string }>(`/api/captain/upload/id/${uploadId}`, { method: 'DELETE' });
  },

  updateUpload: async (uploadId: string, updates: { keep_file?: boolean; metadata?: any }) => {
    return apiRequest<{ success: boolean; upload_id: string }>(`/api/captain/upload/id/${uploadId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  },
};

// ============================================================================
// SCRAPING API
// ============================================================================

export const scrapingAPI = {
  /**
   * Scrape a single URL
   */
  scrapeURL: async (url: string, extractIntelligence = true, force = false) => {
    return apiRequest('/api/captain/scrape/url', {
      method: 'POST',
      body: JSON.stringify({ url, extract_subpages: true, extract_intelligence: extractIntelligence, force }),
    });
  },

  /**
   * Scrape multiple URLs
   */
  scrapeBatch: async (urls: string[], extractIntelligence = true) => {
    return apiRequest('/api/captain/scrape/batch', {
      method: 'POST',
      body: JSON.stringify({ urls, extract_intelligence: extractIntelligence }),
    });
  },

  listURLs: async (skip = 0, limit = 50) => {
    return apiRequest(`/api/captain/scrape/urls?offset=${skip}&limit=${limit}`, { method: 'GET' });
  },

  getScrape: async (scrapeId: string) => {
    return apiRequest<{ scrape: any }>(`/api/captain/scrape/id/${scrapeId}`, { method: 'GET' });
  },

  updateScrape: async (scrapeId: string, updates: { metadata?: any }) => {
    return apiRequest<{ success: boolean; scrape_id: string }>(`/api/captain/scrape/id/${scrapeId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  },
};

// ============================================================================
// POI API
// ============================================================================

export interface POI {
  id: string;
  name: string;
  destination?: string;
  category?: string;
  description?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  confidence_score: number;
  luxury_score?: number | null;
  verified: boolean;
  enhanced: boolean;
  promoted_to_main: boolean;
  created_at: string;
  updated_at?: string;
  keywords?: string[] | null;
  themes?: string[] | null;
}

export const poisAPI = {
  /**
   * Get list of POIs with filters
   */
  getPOIs: async (params: {
    skip?: number;
    limit?: number;
    destination?: string;
    category?: string;
    verified?: boolean;
    enhanced?: boolean;
    promoted?: boolean;
    search?: string;
  } = {}) => {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        queryParams.append(key, String(value));
      }
    });

    return apiRequest<{ pois: POI[]; total: number; skip: number; limit: number }>(
      `/api/captain/pois/?${queryParams.toString()}`,
      { method: 'GET' }
    );
  },

  /**
   * Backfill extracted_pois from cached upload/scrape history.
   * Useful if you have uploads completed before POIs were being materialized.
   */
  backfillFromHistory: async () => {
    return apiRequest<{ success: boolean; created_pois: number; uploads_processed: number; urls_processed: number }>(
      `/api/captain/pois/backfill`,
      { method: 'POST' }
    );
  },

  bulkVerify: async (ids: string[], verified = true) => {
    return apiRequest<{ success: boolean; updated: number; requested: number }>(`/api/captain/pois/bulk-verify`, {
      method: 'POST',
      body: JSON.stringify({ ids, verified }),
    });
  },

  /**
   * Get a single POI
   */
  getPOI: async (poiId: string): Promise<POI> => {
    return apiRequest(`/api/captain/pois/${poiId}`, { method: 'GET' });
  },

  /**
   * Update a POI
   */
  updatePOI: async (poiId: string, updates: Partial<POI>) => {
    return apiRequest(`/api/captain/pois/${poiId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  },

  /**
   * Verify a POI
   */
  verifyPOI: async (poiId: string, verified = true, confidenceScore?: number) => {
    return apiRequest(`/api/captain/pois/${poiId}/verify`, {
      method: 'POST',
      body: JSON.stringify({
        verified,
        confidence_score: confidenceScore,
      }),
    });
  },

  /**
   * Promote POI to main database
   */
  promotePOI: async (poiId: string) => {
    // Promotion is handled inside Next.js (needs Neo4j access on node runtime).
    const response = await fetch(`/api/captain/pois/${poiId}/promote`, { method: 'POST' });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.error || data.details || 'Failed to promote POI');
    }
    return data;
  },

  /**
   * Enrich a POI draft with Tavily + Claude (runs in Next.js).
   * This writes structured fields + provenance/citations back into extracted_pois.
   */
  enrichPOI: async (poiId: string, opts?: { destination?: string }) => {
    const response = await fetch(`/api/captain/pois/${poiId}/enrich`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(opts || {}),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const err = String(data.error || 'Failed to enrich POI');
      const details = data.details ? String(data.details) : '';
      throw new Error(details ? `${err}: ${details}` : err);
    }
    return data;
  },

  /**
   * Delete a POI
   */
  deletePOI: async (poiId: string) => {
    return apiRequest(`/api/captain/pois/${poiId}`, { method: 'DELETE' });
  },
};

// ============================================================================
// KEYWORDS API
// ============================================================================

export interface Keyword {
  id: string;
  keyword: string;
  active: boolean;
  total_articles_found: number;
  last_scanned?: string;
  created_at: string;
}

export interface Article {
  id: string;
  keyword_id: string;
  title: string;
  url: string;
  source?: string;
  summary?: string;
  discovered_at: string;
  status: 'new' | 'selected' | 'scraped' | 'deleted';
}

export const keywordsAPI = {
  /**
   * Get all keywords
   */
  getKeywords: async (activeOnly = true) => {
    return apiRequest<{ keywords: Keyword[]; total: number }>(
      `/api/captain/keywords/?active_only=${activeOnly}`,
      { method: 'GET' }
    );
  },

  /**
   * Create a new keyword
   */
  createKeyword: async (keyword: string, active = true) => {
    return apiRequest('/api/captain/keywords/', {
      method: 'POST',
      body: JSON.stringify({ keyword, active }),
    });
  },

  /**
   * Update a keyword
   */
  updateKeyword: async (keywordId: string, updates: { keyword?: string; active?: boolean }) => {
    return apiRequest(`/api/captain/keywords/${keywordId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  },

  /**
   * Delete a keyword
   */
  deleteKeyword: async (keywordId: string) => {
    return apiRequest(`/api/captain/keywords/${keywordId}`, { method: 'DELETE' });
  },

  /**
   * Get articles for a keyword
   */
  getKeywordArticles: async (keywordId: string, status?: string) => {
    const queryParams = status ? `?status=${status}` : '';
    return apiRequest<{ articles: Article[]; total: number }>(
      `/api/captain/keywords/${keywordId}/articles${queryParams}`,
      { method: 'GET' }
    );
  },

  /**
   * Get all articles
   */
  getAllArticles: async (params: { skip?: number; limit?: number; status?: string; search?: string } = {}) => {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        queryParams.append(key, String(value));
      }
    });

    return apiRequest<{ articles: Article[]; total: number }>(
      `/api/captain/keywords/articles/all?${queryParams.toString()}`,
      { method: 'GET' }
    );
  },

  /**
   * Perform action on article
   */
  articleAction: async (articleId: string, action: 'select' | 'delete' | 'scrape') => {
    return apiRequest(`/api/captain/keywords/articles/${articleId}/action`, {
      method: 'POST',
      body: JSON.stringify({ action }),
    });
  },
};

// ============================================================================
// STATS API
// ============================================================================

export const statsAPI = {
  /**
   * Get dashboard statistics
   */
  getDashboard: async (timeRange: '7d' | '30d' | '90d' | 'all' = '30d') => {
    return apiRequest(`/api/captain/stats/dashboard?time_range=${timeRange}`, {
      method: 'GET',
    });
  },

  /**
   * Get upload statistics
   */
  getUploadStats: async (timeRange: '7d' | '30d' | '90d' | 'all' = '30d') => {
    return apiRequest(`/api/captain/stats/uploads?time_range=${timeRange}`, {
      method: 'GET',
    });
  },

  /**
   * Get POI statistics
   */
  getPOIStats: async (timeRange: '7d' | '30d' | '90d' | 'all' = '30d') => {
    return apiRequest(`/api/captain/stats/pois?time_range=${timeRange}`, {
      method: 'GET',
    });
  },

  /**
   * Get intelligence statistics
   */
  getIntelligenceStats: async () => {
    return apiRequest('/api/captain/stats/intelligence', { method: 'GET' });
  },
};

// ============================================================================
// HEALTH CHECK
// ============================================================================

export const healthAPI = {
  /**
   * Check API health
   */
  check: async () => {
    return apiRequest('/health', { method: 'GET' });
  },
};
