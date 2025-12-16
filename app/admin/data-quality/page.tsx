'use client';

/**
 * Admin Dashboard: Data Quality Agent
 * Manual trigger and monitoring for data quality checks
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client-browser';

interface QualityCheckResults {
  startTime: string;
  endTime?: string;
  duration?: number;
  duplicates: {
    duplicatesFound: number;
    poisMerged: number;
    poisDeleted: number;
    propertiesMerged: number;
    relationshipsMerged: number;
  };
  unnamedPOIs: {
    checked: number;
    deleted: number;
  };
  relations: {
    checked: number;
    created: number;
    byType: {
      LOCATED_IN: number;
      SUPPORTS_ACTIVITY: number;
      HAS_THEME: number;
    };
  };
  scoring: {
    checked: number;
    added: number;
    updated: number;
    byField: {
      luxury_score: number;
      confidence: number;
      evidence: number;
    };
  };
  enrichment: {
    queued: number;
    enriched: number;
    failed: number;
    cached: number;
    bySource: {
      google: number;
      wikipedia: number;
      osm: number;
    };
    fieldsAdded: {
      description: number;
      rating: number;
      photos: number;
      website: number;
      hours: number;
    };
    apiCost: number;
  };
  errors: string[];
}

interface ScoringStats {
  luxury: {
    distribution: {
      ultra_luxury: number;
      high_luxury: number;
      upscale: number;
      mid_range: number;
      standard: number;
    };
    stats: {
      total: number;
      unscored: number;
      avg: number;
      max: number;
      min: number;
      completion: number;
    };
    topPOIs: Array<{
      name: string;
      score: number;
      type: string;
      destination: string;
    }>;
  };
  confidence: {
    distribution: {
      very_high: number;
      high: number;
      good: number;
      moderate: number;
      low: number;
    };
    stats: {
      total: number;
      avg: number;
    };
  };
}

export default function DataQualityAdminPage() {
  const router = useRouter();
  const supabase = createClient();
  
  const [isRunning, setIsRunning] = useState(false);
  const [lastResults, setLastResults] = useState<QualityCheckResults | null>(null);
  const [scoringStats, setScoringStats] = useState<ScoringStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Check authentication
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/auth/signin');
        return;
      }
      setLoading(false);
    };

    checkAuth();
  }, [router, supabase.auth]);

  // Fetch status on mount
  useEffect(() => {
    if (!loading) {
      fetchStatus();
      fetchScoringStats();
    }
  }, [loading]);

  const fetchStatus = async () => {
    try {
      const response = await fetch('/api/data-quality/status');
      if (!response.ok) {
        throw new Error('Failed to fetch status');
      }
      
      const data = await response.json();
      setIsRunning(data.isRunning);
      setLastResults(data.lastRun);
    } catch (err) {
      console.error('Error fetching status:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch status');
    }
  };

  const fetchScoringStats = async () => {
    try {
      const response = await fetch('/api/data-quality/scoring-stats');
      if (!response.ok) {
        throw new Error('Failed to fetch scoring stats');
      }
      
      const data = await response.json();
      setScoringStats(data);
    } catch (err) {
      console.error('Error fetching scoring stats:', err);
    }
  };

  const runQualityCheck = async () => {
    setError(null);
    setIsRunning(true);

    try {
      const response = await fetch('/api/data-quality/run', {
        method: 'POST',
      });

      if (!response.ok) {
        const errorData = await response.json();
        const errorMessage = errorData.details 
          ? `${errorData.error}: ${errorData.details}`
          : errorData.error || 'Failed to run quality check';
        throw new Error(errorMessage);
      }

      const data = await response.json();
      setLastResults(data.results);
      setIsRunning(false);
      
    } catch (err) {
      console.error('Error running quality check:', err);
      setError(err instanceof Error ? err.message : 'Failed to run quality check');
      setIsRunning(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-zinc-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-lexa-cream via-white to-zinc-50 px-6 py-12">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-lexa-navy mb-2">
            Data Quality Agent
          </h1>
          <p className="text-zinc-600">
            Monitor and manage automated data quality checks for the Neo4j database
          </p>
        </div>

        {/* Control Panel */}
        <div className="bg-white rounded-2xl shadow-lg border border-zinc-200/60 p-6 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-lexa-navy mb-1">
                Manual Trigger
              </h2>
              <p className="text-sm text-zinc-500">
                Run a data quality check on demand
              </p>
            </div>
            
            <button
              onClick={runQualityCheck}
              disabled={isRunning}
              className={`px-6 py-3 rounded-lg font-semibold transition-all ${
                isRunning
                  ? 'bg-zinc-300 text-zinc-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-lexa-navy to-lexa-gold text-white hover:shadow-lg hover:scale-105'
              }`}
            >
              {isRunning ? (
                <span className="flex items-center gap-2">
                  <span className="animate-spin">⏳</span>
                  Running...
                </span>
              ) : (
                'Run Quality Check'
              )}
            </button>
          </div>

          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}
        </div>

        {/* Status Card */}
        {isRunning && (
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6 mb-8">
            <h3 className="text-lg font-bold text-blue-900 mb-4">
              Quality Check in Progress...
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <div className="animate-pulse w-2 h-2 bg-blue-500 rounded-full"></div>
                <span className="text-blue-700">Step 1: Finding and merging duplicates...</span>
              </div>
              <div className="flex items-center gap-2 opacity-50">
                <div className="w-2 h-2 bg-blue-300 rounded-full"></div>
                <span className="text-blue-600">Step 2: Removing unnamed POIs...</span>
              </div>
              <div className="flex items-center gap-2 opacity-50">
                <div className="w-2 h-2 bg-blue-300 rounded-full"></div>
                <span className="text-blue-600">Step 3: Creating missing relations...</span>
              </div>
              <div className="flex items-center gap-2 opacity-50">
                <div className="w-2 h-2 bg-blue-300 rounded-full"></div>
                <span className="text-blue-600">Step 4: Verifying scores...</span>
              </div>
              <div className="flex items-center gap-2 opacity-50">
                <div className="w-2 h-2 bg-blue-300 rounded-full"></div>
                <span className="text-blue-600">Step 5: Enriching POI data...</span>
              </div>
            </div>
          </div>
        )}

        {/* Scoring Statistics Dashboard */}
        {scoringStats && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-lexa-navy mb-4">
              Current Scoring Statistics
            </h2>
            
            {/* Overview Cards */}
            <div className="grid md:grid-cols-4 gap-4 mb-6">
              <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 border border-yellow-200 rounded-xl p-4">
                <p className="text-xs text-yellow-700 uppercase tracking-wider mb-1">Total POIs Scored</p>
                <p className="text-3xl font-bold text-yellow-900">{scoringStats.luxury.stats.total}</p>
                <p className="text-xs text-yellow-600 mt-1">
                  {scoringStats.luxury.stats.unscored} remaining
                </p>
              </div>
              
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-xl p-4">
                <p className="text-xs text-blue-700 uppercase tracking-wider mb-1">Avg Luxury Score</p>
                <p className="text-3xl font-bold text-blue-900">{scoringStats.luxury.stats.avg}</p>
                <p className="text-xs text-blue-600 mt-1">
                  Range: {scoringStats.luxury.stats.min}-{scoringStats.luxury.stats.max}
                </p>
              </div>
              
              <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-xl p-4">
                <p className="text-xs text-green-700 uppercase tracking-wider mb-1">Completion Rate</p>
                <p className="text-3xl font-bold text-green-900">{scoringStats.luxury.stats.completion}%</p>
                <p className="text-xs text-green-600 mt-1">
                  Scoring coverage
                </p>
              </div>
              
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-xl p-4">
                <p className="text-xs text-purple-700 uppercase tracking-wider mb-1">Avg Confidence</p>
                <p className="text-3xl font-bold text-purple-900">{scoringStats.confidence.stats.avg}</p>
                <p className="text-xs text-purple-600 mt-1">
                  {scoringStats.confidence.stats.total} relationships
                </p>
              </div>
            </div>

            {/* Luxury Score Distribution */}
            <div className="grid md:grid-cols-2 gap-6 mb-6">
              <div className="bg-white rounded-2xl shadow-lg border border-zinc-200/60 p-6">
                <h3 className="text-lg font-bold text-lexa-navy mb-4">
                  Luxury Score Distribution
                </h3>
                <div className="space-y-3">
                  {[
                    { label: 'Ultra-Luxury (90-100)', count: scoringStats.luxury.distribution.ultra_luxury, color: 'bg-yellow-400' },
                    { label: 'High Luxury (80-89)', count: scoringStats.luxury.distribution.high_luxury, color: 'bg-yellow-300' },
                    { label: 'Upscale (70-79)', count: scoringStats.luxury.distribution.upscale, color: 'bg-yellow-200' },
                    { label: 'Mid-Range (50-69)', count: scoringStats.luxury.distribution.mid_range, color: 'bg-zinc-300' },
                    { label: 'Standard (<50)', count: scoringStats.luxury.distribution.standard, color: 'bg-zinc-200' },
                  ].map((category, idx) => {
                    const percentage = scoringStats.luxury.stats.total > 0
                      ? Math.round((category.count / scoringStats.luxury.stats.total) * 100)
                      : 0;
                    return (
                      <div key={idx}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-zinc-700">{category.label}</span>
                          <span className="font-semibold text-zinc-900">
                            {category.count} ({percentage}%)
                          </span>
                        </div>
                        <div className="w-full bg-zinc-100 rounded-full h-2">
                          <div 
                            className={`${category.color} h-2 rounded-full transition-all duration-500`}
                            style={{width: `${percentage}%`}}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Confidence Score Distribution */}
              <div className="bg-white rounded-2xl shadow-lg border border-zinc-200/60 p-6">
                <h3 className="text-lg font-bold text-lexa-navy mb-4">
                  Confidence Score Distribution
                </h3>
                <div className="space-y-3">
                  {[
                    { label: 'Very High (0.9-1.0)', count: scoringStats.confidence.distribution.very_high, color: 'bg-green-500' },
                    { label: 'High (0.8-0.89)', count: scoringStats.confidence.distribution.high, color: 'bg-green-400' },
                    { label: 'Good (0.7-0.79)', count: scoringStats.confidence.distribution.good, color: 'bg-blue-400' },
                    { label: 'Moderate (0.6-0.69)', count: scoringStats.confidence.distribution.moderate, color: 'bg-yellow-400' },
                    { label: 'Low (<0.6)', count: scoringStats.confidence.distribution.low, color: 'bg-red-400' },
                  ].map((category, idx) => {
                    const percentage = scoringStats.confidence.stats.total > 0
                      ? Math.round((category.count / scoringStats.confidence.stats.total) * 100)
                      : 0;
                    return (
                      <div key={idx}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-zinc-700">{category.label}</span>
                          <span className="font-semibold text-zinc-900">
                            {category.count} ({percentage}%)
                          </span>
                        </div>
                        <div className="w-full bg-zinc-100 rounded-full h-2">
                          <div 
                            className={`${category.color} h-2 rounded-full transition-all duration-500`}
                            style={{width: `${percentage}%`}}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Top Luxury POIs */}
            <div className="bg-white rounded-2xl shadow-lg border border-zinc-200/60 p-6">
              <h3 className="text-lg font-bold text-lexa-navy mb-4">
                🏆 Top 10 Luxury POIs
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-200">
                      <th className="text-left py-2 px-3 text-zinc-600 font-semibold">Rank</th>
                      <th className="text-left py-2 px-3 text-zinc-600 font-semibold">Name</th>
                      <th className="text-left py-2 px-3 text-zinc-600 font-semibold">Type</th>
                      <th className="text-left py-2 px-3 text-zinc-600 font-semibold">Destination</th>
                      <th className="text-right py-2 px-3 text-zinc-600 font-semibold">Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {scoringStats.luxury.topPOIs.map((poi, idx) => (
                      <tr key={idx} className="border-b border-zinc-100 hover:bg-lexa-cream/20 transition-colors">
                        <td className="py-3 px-3">
                          <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                            idx === 0 ? 'bg-yellow-400 text-yellow-900' :
                            idx === 1 ? 'bg-zinc-300 text-zinc-700' :
                            idx === 2 ? 'bg-orange-300 text-orange-900' :
                            'bg-zinc-100 text-zinc-600'
                          }`}>
                            {idx + 1}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-medium text-zinc-900">{poi.name}</td>
                        <td className="py-3 px-3 text-zinc-600 capitalize">{poi.type?.replace(/_/g, ' ')}</td>
                        <td className="py-3 px-3 text-zinc-600">{poi.destination || 'N/A'}</td>
                        <td className="py-3 px-3 text-right">
                          <span className="inline-block bg-lexa-gold/20 text-lexa-navy px-2 py-1 rounded font-bold">
                            {poi.score}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Results Display */}
        {lastResults && (
          <div className="space-y-6">
            {/* Summary Card */}
            <div className="bg-white rounded-2xl shadow-lg border border-zinc-200/60 p-6">
              <h3 className="text-xl font-bold text-lexa-navy mb-4">
                Last Run Summary
              </h3>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div className="bg-lexa-cream/30 rounded-lg p-4">
                  <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Start Time</p>
                  <p className="text-sm font-semibold text-lexa-navy">
                    {new Date(lastResults.startTime).toLocaleString()}
                  </p>
                </div>
                <div className="bg-lexa-cream/30 rounded-lg p-4">
                  <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Duration</p>
                  <p className="text-sm font-semibold text-lexa-navy">
                    {lastResults.duration ? `${Math.round(lastResults.duration / 1000)}s` : 'N/A'}
                  </p>
                </div>
                <div className="bg-green-50 rounded-lg p-4">
                  <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Status</p>
                  <p className="text-sm font-semibold text-green-700">
                    {lastResults.errors.length === 0 ? '✓ Completed' : '⚠ With Errors'}
                  </p>
                </div>
                <div className="bg-blue-50 rounded-lg p-4">
                  <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Total Fixes</p>
                  <p className="text-sm font-semibold text-blue-700">
                    {lastResults.duplicates.poisDeleted + 
                     lastResults.unnamedPOIs.deleted + 
                     lastResults.relations.created}
                  </p>
                </div>
              </div>
            </div>

            {/* Detailed Results */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Duplicates */}
              <div className="bg-white rounded-2xl shadow-lg border border-zinc-200/60 p-6">
                <h4 className="text-lg font-bold text-lexa-navy mb-3">
                  Duplicates Merged
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-zinc-600">Found:</span>
                    <span className="font-semibold">{lastResults.duplicates.duplicatesFound}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-600">Merged:</span>
                    <span className="font-semibold">{lastResults.duplicates.poisMerged}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-600">Deleted:</span>
                    <span className="font-semibold">{lastResults.duplicates.poisDeleted}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-600">Properties Merged:</span>
                    <span className="font-semibold">{lastResults.duplicates.propertiesMerged}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-600">Relationships Merged:</span>
                    <span className="font-semibold">{lastResults.duplicates.relationshipsMerged}</span>
                  </div>
                </div>
              </div>

              {/* Unnamed POIs */}
              <div className="bg-white rounded-2xl shadow-lg border border-zinc-200/60 p-6">
                <h4 className="text-lg font-bold text-lexa-navy mb-3">
                  Unnamed POIs Removed
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-zinc-600">Deleted:</span>
                    <span className="font-semibold">{lastResults.unnamedPOIs.deleted}</span>
                  </div>
                </div>
              </div>

              {/* Relations */}
              <div className="bg-white rounded-2xl shadow-lg border border-zinc-200/60 p-6">
                <h4 className="text-lg font-bold text-lexa-navy mb-3">
                  Relations Created
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-zinc-600">LOCATED_IN:</span>
                    <span className="font-semibold">{lastResults.relations.byType.LOCATED_IN}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-600">SUPPORTS_ACTIVITY:</span>
                    <span className="font-semibold">{lastResults.relations.byType.SUPPORTS_ACTIVITY}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-600">HAS_THEME:</span>
                    <span className="font-semibold">{lastResults.relations.byType.HAS_THEME}</span>
                  </div>
                </div>
              </div>

              {/* Scoring */}
              <div className="bg-white rounded-2xl shadow-lg border border-zinc-200/60 p-6">
                <h4 className="text-lg font-bold text-lexa-navy mb-3">
                  Scoring Updates
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-zinc-600">Checked:</span>
                    <span className="font-semibold">{lastResults.scoring.checked}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-600">Luxury Scores Added:</span>
                    <span className="font-semibold text-lexa-gold">{lastResults.scoring.byField.luxury_score}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-600">Confidence Added:</span>
                    <span className="font-semibold text-blue-600">{lastResults.scoring.byField.confidence}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-600">Updated:</span>
                    <span className="font-semibold">{lastResults.scoring.updated}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Scoring Visualization */}
            <div className="bg-gradient-to-br from-lexa-navy to-lexa-gold/20 rounded-2xl shadow-lg p-6 text-white">
              <h4 className="text-xl font-bold mb-4">
                📊 Scoring Analysis
              </h4>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                  <p className="text-xs uppercase tracking-wider opacity-80 mb-1">
                    Luxury Scores Added
                  </p>
                  <p className="text-3xl font-bold">
                    {lastResults.scoring.byField.luxury_score}
                  </p>
                  <p className="text-xs opacity-70 mt-2">
                    POIs now have luxury ratings
                  </p>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                  <p className="text-xs uppercase tracking-wider opacity-80 mb-1">
                    Confidence Scores Added
                  </p>
                  <p className="text-3xl font-bold">
                    {lastResults.scoring.byField.confidence}
                  </p>
                  <p className="text-xs opacity-70 mt-2">
                    Relationships now have certainty ratings
                  </p>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                  <p className="text-xs uppercase tracking-wider opacity-80 mb-1">
                    Completion Rate
                  </p>
                  <p className="text-3xl font-bold">
                    {lastResults.scoring.checked > 0 
                      ? Math.round((lastResults.scoring.byField.luxury_score / lastResults.scoring.checked) * 100)
                      : 100}%
                  </p>
                  <p className="text-xs opacity-70 mt-2">
                    {lastResults.scoring.checked === 0 
                      ? 'All POIs scored!' 
                      : `${lastResults.scoring.checked - lastResults.scoring.byField.luxury_score} remaining`}
                  </p>
                </div>
              </div>

              {/* Luxury Score Distribution (Visual bars) */}
              <div className="mt-6 bg-white/10 backdrop-blur-sm rounded-lg p-4">
                <p className="text-sm font-semibold mb-3">Luxury Score Categories</p>
                <div className="space-y-2">
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span>Ultra-Luxury (90-100)</span>
                      <span className="font-semibold">~5%</span>
                    </div>
                    <div className="w-full bg-white/20 rounded-full h-2">
                      <div className="bg-yellow-300 h-2 rounded-full" style={{width: '5%'}}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span>High Luxury (80-89)</span>
                      <span className="font-semibold">~15%</span>
                    </div>
                    <div className="w-full bg-white/20 rounded-full h-2">
                      <div className="bg-yellow-200 h-2 rounded-full" style={{width: '15%'}}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span>Upscale (70-79)</span>
                      <span className="font-semibold">~25%</span>
                    </div>
                    <div className="w-full bg-white/20 rounded-full h-2">
                      <div className="bg-yellow-100 h-2 rounded-full" style={{width: '25%'}}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span>Mid-Range (50-69)</span>
                      <span className="font-semibold">~35%</span>
                    </div>
                    <div className="w-full bg-white/20 rounded-full h-2">
                      <div className="bg-white/60 h-2 rounded-full" style={{width: '35%'}}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span>Standard (below 50)</span>
                      <span className="font-semibold">~20%</span>
                    </div>
                    <div className="w-full bg-white/20 rounded-full h-2">
                      <div className="bg-white/40 h-2 rounded-full" style={{width: '20%'}}></div>
                    </div>
                  </div>
                </div>
                <p className="text-xs opacity-70 mt-3">
                  * Estimated distribution based on scoring algorithm
                </p>
              </div>
            </div>

            {/* Enrichment (if implemented) */}
            {lastResults.enrichment.enriched > 0 && (
              <div className="bg-white rounded-2xl shadow-lg border border-zinc-200/60 p-6">
                <h4 className="text-lg font-bold text-lexa-navy mb-3">
                  POI Enrichment
                </h4>
                <div className="grid md:grid-cols-3 gap-4 text-sm">
                  <div className="space-y-2">
                    <p className="text-xs text-zinc-500 uppercase tracking-wider">Sources</p>
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <span className="text-zinc-600">Google:</span>
                        <span className="font-semibold">{lastResults.enrichment.bySource.google}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-600">Wikipedia:</span>
                        <span className="font-semibold">{lastResults.enrichment.bySource.wikipedia}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-600">OSM:</span>
                        <span className="font-semibold">{lastResults.enrichment.bySource.osm}</span>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs text-zinc-500 uppercase tracking-wider">Fields Added</p>
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <span className="text-zinc-600">Description:</span>
                        <span className="font-semibold">{lastResults.enrichment.fieldsAdded.description}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-600">Rating:</span>
                        <span className="font-semibold">{lastResults.enrichment.fieldsAdded.rating}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-600">Photos:</span>
                        <span className="font-semibold">{lastResults.enrichment.fieldsAdded.photos}</span>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs text-zinc-500 uppercase tracking-wider">Summary</p>
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <span className="text-zinc-600">Enriched:</span>
                        <span className="font-semibold">{lastResults.enrichment.enriched}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-600">Cached:</span>
                        <span className="font-semibold">{lastResults.enrichment.cached}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-600">API Cost:</span>
                        <span className="font-semibold">${lastResults.enrichment.apiCost.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Errors */}
            {lastResults.errors.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-2xl p-6">
                <h4 className="text-lg font-bold text-red-900 mb-3">
                  Errors
                </h4>
                <ul className="space-y-1 text-sm text-red-800">
                  {lastResults.errors.map((error, index) => (
                    <li key={index}>• {error}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Info Box */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-2xl p-6">
          <h4 className="text-lg font-bold text-blue-900 mb-2">
            Automated Schedule
          </h4>
          <p className="text-sm text-blue-700">
            The data quality agent runs automatically every day at midnight UTC. 
            You can also trigger it manually at any time using the button above.
          </p>
        </div>
      </div>
    </div>
  );
}

