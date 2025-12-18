'use client';

/**
 * Destination Browser - POI Coverage and Quality Assessment
 * 
 * Shows all destinations with POI statistics
 * Helps identify data gaps and quality issues
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AdminNav from '@/components/admin/admin-nav';

interface DestinationStats {
  destination: string;
  total_pois: number;
  luxury_pois: number;
  avg_luxury_score: number | null;
  poi_types: string[];
  has_captain_comments: number;
  top_types: Array<{ type: string; count: number }>;
}

interface OverallStats {
  total_pois: number;
  total_destinations: number;
  luxury_pois: number;
  avg_luxury_score: number | null;
  unscored_pois: number;
}

export default function DestinationBrowserPage() {
  const router = useRouter();
  const [destinations, setDestinations] = useState<DestinationStats[]>([]);
  const [overallStats, setOverallStats] = useState<OverallStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState('total_pois');
  const [order, setOrder] = useState('DESC');

  useEffect(() => {
    fetchDestinations();
  }, [sortBy, order]);

  const fetchDestinations = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      console.log('[Destination Browser] Fetching destinations...');
      
      const response = await fetch(
        `/api/neo4j/destinations?sortBy=${sortBy}&order=${order}&limit=100`
      );

      console.log('[Destination Browser] Response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json();
        console.error('[Destination Browser] API Error:', errorData);
        throw new Error(errorData.details || errorData.error || 'Failed to fetch destinations');
      }

      const data = await response.json();
      console.log('[Destination Browser] Received data:', {
        destinationsCount: data.destinations?.length,
        hasOverallStats: !!data.overallStats
      });

      if (!data.destinations || !Array.isArray(data.destinations)) {
        throw new Error('Invalid response format from API');
      }

      setDestinations(data.destinations);
      setOverallStats(data.overallStats || null);

    } catch (err) {
      console.error('[Destination Browser] Fetch error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load destinations. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setOrder(order === 'DESC' ? 'ASC' : 'DESC');
    } else {
      setSortBy(field);
      setOrder('DESC');
    }
  };

  const getQualityColor = (destination: DestinationStats) => {
    const luxuryPercent = destination.total_pois > 0 
      ? (destination.luxury_pois / destination.total_pois) * 100 
      : 0;
    
    if (luxuryPercent >= 30 && destination.avg_luxury_score && destination.avg_luxury_score >= 7) {
      return 'text-green-600 bg-green-50';
    } else if (luxuryPercent >= 15 || (destination.avg_luxury_score && destination.avg_luxury_score >= 6)) {
      return 'text-yellow-600 bg-yellow-50';
    } else {
      return 'text-red-600 bg-red-50';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-zinc-50 via-white to-zinc-100">
        <div className="max-w-7xl mx-auto p-8">
          <div className="flex justify-end mb-4">
            <AdminNav />
          </div>
          <div className="flex items-center justify-center py-20">
            <div className="flex items-center gap-3">
              <div className="animate-spin h-8 w-8 border-4 border-lexa-gold border-t-transparent rounded-full"></div>
              <span className="text-lexa-navy font-semibold">Loading destinations...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-zinc-50 via-white to-zinc-100">
        <div className="max-w-7xl mx-auto p-8">
          <div className="flex justify-end mb-4">
            <AdminNav />
          </div>
          <div className="bg-red-50 border-2 border-red-200 rounded-xl p-8 text-center">
            <div className="text-5xl mb-4">⚠️</div>
            <h2 className="text-2xl font-bold text-red-900 mb-2">Failed to Load Destinations</h2>
            <p className="text-red-700 mb-4">{error}</p>
            <button
              onClick={fetchDestinations}
              className="px-6 py-3 bg-lexa-navy text-white rounded-lg hover:bg-lexa-gold transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (destinations.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-zinc-50 via-white to-zinc-100">
        <div className="max-w-7xl mx-auto p-8">
          <div className="flex justify-end mb-4">
            <AdminNav />
          </div>
          <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-8 text-center">
            <div className="text-5xl mb-4">📍</div>
            <h2 className="text-2xl font-bold text-yellow-900 mb-2">No Destinations Found</h2>
            <p className="text-yellow-700 mb-4">
              No destinations with POIs found in the database. 
              <br />
              Import some POI data first or check your database connection.
            </p>
            <button
              onClick={() => router.push('/admin/knowledge')}
              className="px-6 py-3 bg-lexa-navy text-white rounded-lg hover:bg-lexa-gold transition-colors"
            >
              Go to Knowledge Portal
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-50 via-white to-zinc-100">
      <div className="max-w-7xl mx-auto p-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-start justify-between mb-4">
            <button
              onClick={() => router.push('/admin/knowledge')}
              className="text-lexa-navy hover:text-lexa-gold flex items-center gap-2"
            >
              ← Back to Portal
            </button>
            <AdminNav />
          </div>
          
          <h1 className="text-4xl font-bold text-lexa-navy mb-2">
            🌍 Destination Browser
          </h1>
          <p className="text-zinc-600 mb-4">
            Explore POI coverage and quality across all destinations
          </p>
          
          {/* Why - What - How */}
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 space-y-2">
            <div className="text-sm">
              <strong className="text-orange-900">WHY:</strong> <span className="text-gray-700">Assess data coverage and quality to prioritize enrichment efforts</span>
            </div>
            <div className="text-sm">
              <strong className="text-orange-900">WHAT:</strong> <span className="text-gray-700">View POI statistics by destination including luxury counts, scores, and data gaps</span>
            </div>
            <div className="text-sm">
              <strong className="text-orange-900">HOW:</strong> <span className="text-gray-700">Click column headers to sort, analyze quality indicators, and identify destinations needing work</span>
            </div>
          </div>
        </div>

        {/* Overall Statistics */}
        {overallStats && (
          <div className="grid grid-cols-5 gap-4 mb-8">
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <div className="text-3xl font-bold text-lexa-navy mb-1">
                {overallStats.total_pois.toLocaleString()}
              </div>
              <div className="text-sm text-zinc-600">Total POIs</div>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <div className="text-3xl font-bold text-lexa-gold mb-1">
                {overallStats.total_destinations}
              </div>
              <div className="text-sm text-zinc-600">Destinations</div>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <div className="text-3xl font-bold text-green-600 mb-1">
                {overallStats.luxury_pois.toLocaleString()}
              </div>
              <div className="text-sm text-zinc-600">Luxury POIs (≥7)</div>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <div className="text-3xl font-bold text-purple-600 mb-1">
                {overallStats.avg_luxury_score?.toFixed(1) || 'N/A'}
              </div>
              <div className="text-sm text-zinc-600">Avg Luxury Score</div>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <div className="text-3xl font-bold text-red-600 mb-1">
                {overallStats.unscored_pois.toLocaleString()}
              </div>
              <div className="text-sm text-zinc-600">Unscored POIs</div>
            </div>
          </div>
        )}

        {/* Refresh Button */}
        <div className="mb-4 flex justify-end">
          <button
            onClick={fetchDestinations}
            disabled={isLoading}
            className="px-4 py-2 bg-lexa-navy text-white rounded-lg hover:bg-lexa-gold transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            🔄 Refresh Data
          </button>
        </div>

        {/* Destinations Table */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-lexa-navy to-lexa-gold text-white">
              <tr>
                <th 
                  onClick={() => handleSort('destination')}
                  className="px-6 py-4 text-left font-semibold cursor-pointer hover:bg-white/10"
                >
                  Destination {sortBy === 'destination' && (order === 'DESC' ? '↓' : '↑')}
                </th>
                <th 
                  onClick={() => handleSort('total_pois')}
                  className="px-6 py-4 text-right font-semibold cursor-pointer hover:bg-white/10"
                >
                  Total POIs {sortBy === 'total_pois' && (order === 'DESC' ? '↓' : '↑')}
                </th>
                <th 
                  onClick={() => handleSort('luxury_pois')}
                  className="px-6 py-4 text-right font-semibold cursor-pointer hover:bg-white/10"
                >
                  Luxury POIs {sortBy === 'luxury_pois' && (order === 'DESC' ? '↓' : '↑')}
                </th>
                <th 
                  onClick={() => handleSort('avg_luxury_score')}
                  className="px-6 py-4 text-right font-semibold cursor-pointer hover:bg-white/10"
                >
                  Avg Score {sortBy === 'avg_luxury_score' && (order === 'DESC' ? '↓' : '↑')}
                </th>
                <th className="px-6 py-4 text-left font-semibold">
                  Top POI Types
                </th>
                <th className="px-6 py-4 text-center font-semibold">
                  Captain Comments
                </th>
                <th className="px-6 py-4 text-center font-semibold">
                  Quality
                </th>
              </tr>
            </thead>
            <tbody>
              {destinations.map((dest, idx) => (
                <tr key={idx} className="border-b border-zinc-100 hover:bg-zinc-50">
                  <td className="px-6 py-4 font-semibold text-lexa-navy">
                    {dest.destination}
                  </td>
                  <td className="px-6 py-4 text-right text-lexa-navy">
                    {dest.total_pois.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-right text-green-600 font-semibold">
                    {dest.luxury_pois}
                    <span className="text-xs text-zinc-500 ml-1">
                      ({((dest.luxury_pois / dest.total_pois) * 100).toFixed(0)}%)
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    {dest.avg_luxury_score 
                      ? <span className="font-semibold text-purple-600">
                          {dest.avg_luxury_score.toFixed(1)}
                        </span>
                      : <span className="text-zinc-400">N/A</span>
                    }
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {dest.top_types.slice(0, 3).map((type, tidx) => (
                        <span 
                          key={tidx}
                          className="px-2 py-1 bg-zinc-100 text-zinc-700 text-xs rounded"
                        >
                          {type.type} ({type.count})
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                      dest.has_captain_comments > 0 
                        ? 'bg-green-100 text-green-700'
                        : 'bg-zinc-100 text-zinc-500'
                    }`}>
                      {dest.has_captain_comments}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getQualityColor(dest)}`}>
                      {((dest.luxury_pois / dest.total_pois) * 100) >= 30 ? '🟢 High' : 
                       ((dest.luxury_pois / dest.total_pois) * 100) >= 15 ? '🟡 Medium' : 
                       '🔴 Low'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Legend */}
        <div className="mt-6 bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
          <strong className="text-blue-800">💡 Quality Rating:</strong>
          <div className="text-sm text-blue-700 mt-2 space-y-1">
            <div>🟢 <strong>High:</strong> ≥30% luxury POIs AND avg score ≥7</div>
            <div>🟡 <strong>Medium:</strong> 15-30% luxury POIs OR avg score 6-7</div>
            <div>🔴 <strong>Low:</strong> &lt;15% luxury POIs OR avg score &lt;6</div>
          </div>
        </div>
      </div>
    </div>
  );
}

