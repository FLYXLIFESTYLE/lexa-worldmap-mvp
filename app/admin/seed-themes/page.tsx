/**
 * Admin Page: Seed Theme Categories
 * Simple UI to seed the Neo4j database with theme categories
 */

'use client';

import { useState } from 'react';
import AdminNav from '@/components/admin/admin-nav';

interface SeedResult {
  success: boolean;
  message?: string;
  total_in_db?: number;
  themes?: Array<{ name: string; icon: string; status: string }>;
  error?: string;
  details?: string;
}

export default function SeedThemesPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SeedResult | null>(null);
  const [existingThemes, setExistingThemes] = useState<any[]>([]);
  const [showingExisting, setShowingExisting] = useState(false);

  async function handleSeed() {
    setLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/admin/seed-themes', {
        method: 'POST'
      });
      const data = await response.json();
      setResult(data);
    } catch (error: any) {
      setResult({
        success: false,
        error: 'Failed to seed themes',
        details: error.message
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleViewExisting() {
    setLoading(true);
    setShowingExisting(false);

    try {
      const response = await fetch('/api/admin/seed-themes');
      const data = await response.json();
      
      if (data.success) {
        setExistingThemes(data.themes);
        setShowingExisting(true);
      } else {
        setResult({
          success: false,
          error: 'Failed to fetch themes',
          details: data.error || 'Unknown error'
        });
      }
    } catch (error: any) {
      setResult({
        success: false,
        error: 'Failed to fetch themes',
        details: error.message
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-900">
      <AdminNav />
      
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-light text-white mb-4">
            🎨 Seed Theme Categories
          </h1>
          <p className="text-zinc-400 text-lg">
            Initialize the Neo4j database with 12 theme categories for LEXA
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4 justify-center mb-8">
          <button
            onClick={handleSeed}
            disabled={loading}
            className="px-8 py-4 bg-lexa-gold text-zinc-900 rounded-xl font-semibold hover:bg-yellow-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? '⏳ Seeding...' : '🌱 Seed Database'}
          </button>

          <button
            onClick={handleViewExisting}
            disabled={loading}
            className="px-8 py-4 bg-zinc-700 text-white rounded-xl font-semibold hover:bg-zinc-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? '⏳ Loading...' : '👀 View Existing'}
          </button>
        </div>

        {/* Result Display */}
        {result && (
          <div className={`p-6 rounded-xl ${result.success ? 'bg-green-900/20 border border-green-500/30' : 'bg-red-900/20 border border-red-500/30'}`}>
            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl">{result.success ? '✅' : '⚠️'}</span>
              <h2 className={`text-xl font-semibold ${result.success ? 'text-green-400' : 'text-red-400'}`}>
                {result.success ? 'Success!' : 'Error'}
              </h2>
            </div>

            {result.message && (
              <p className="text-white mb-3">{result.message}</p>
            )}

            {result.total_in_db !== undefined && (
              <p className="text-zinc-300 mb-4">
                Total themes in database: <span className="text-lexa-gold font-semibold">{result.total_in_db}</span>
              </p>
            )}

            {result.themes && result.themes.length > 0 && (
              <div className="mt-4">
                <h3 className="text-white font-semibold mb-3">Seeded Themes:</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {result.themes.map((theme, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-zinc-800 px-3 py-2 rounded-lg">
                      <span className="text-2xl">{theme.icon}</span>
                      <span className="text-sm text-white">{theme.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {result.error && (
              <>
                <p className="text-red-400 font-semibold mb-2">{result.error}</p>
                {result.details && (
                  <p className="text-sm text-zinc-400 font-mono bg-zinc-900 p-3 rounded">
                    {result.details}
                  </p>
                )}
              </>
            )}
          </div>
        )}

        {/* Existing Themes Display */}
        {showingExisting && existingThemes.length > 0 && (
          <div className="mt-8">
            <h2 className="text-2xl font-light text-white mb-6 text-center">
              Existing Themes ({existingThemes.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {existingThemes.map((theme, idx) => (
                <div key={idx} className="bg-zinc-800 rounded-xl p-6 border border-zinc-700">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-3xl">{theme.icon}</span>
                    <div>
                      <h3 className="text-white font-semibold">{theme.name}</h3>
                      <div className="flex items-center gap-1 mt-1">
                        {[...Array(5)].map((_, i) => (
                          <span
                            key={i}
                            className={`text-xs ${
                              i < Math.floor(theme.luxuryScore / 2)
                                ? 'text-lexa-gold'
                                : 'text-zinc-600'
                            }`}
                          >
                            ⭐
                          </span>
                        ))}
                        <span className="text-xs text-zinc-500 ml-2">
                          {theme.luxuryScore}/10
                        </span>
                      </div>
                    </div>
                  </div>
                  <p className="text-sm text-zinc-400 mb-2">{theme.description}</p>
                  {theme.short_description && (
                    <p className="text-xs text-zinc-500">{theme.short_description}</p>
                  )}
                  {theme.image_url && (
                    <div className="mt-3">
                      <img 
                        src={theme.image_url} 
                        alt={theme.name}
                        className="w-full h-32 object-cover rounded-lg"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {showingExisting && existingThemes.length === 0 && (
          <div className="text-center py-12 bg-zinc-800 rounded-xl border border-zinc-700">
            <span className="text-5xl mb-4 block">📭</span>
            <p className="text-zinc-400 mb-2">No themes found in database</p>
            <p className="text-sm text-zinc-500">Click "Seed Database" to add the 12 core themes</p>
          </div>
        )}

        {/* Info Section */}
        <div className="mt-12 bg-zinc-800 border border-zinc-700 rounded-xl p-6">
          <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
            <span>ℹ️</span>
            <span>About Theme Categories</span>
          </h3>
          <ul className="space-y-2 text-sm text-zinc-400">
            <li>• Seeds 12 core theme categories into Neo4j</li>
            <li>• Each theme has: name, description, icon, luxury score, personality types, evoked feelings, and image URL</li>
            <li>• Uses MERGE to avoid duplicates (safe to run multiple times)</li>
            <li>• Images are hosted on Unsplash with optimized URLs</li>
            <li>• Used by ThemeSelector component in demo chat</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

