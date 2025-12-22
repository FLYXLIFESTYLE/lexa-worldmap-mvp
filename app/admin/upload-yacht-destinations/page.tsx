/**
 * Admin Page: Upload Yacht Destinations
 * Parse and upload yacht cities, countries, and routes
 */

'use client';

import { useState } from 'react';
import LuxuryBackground from '@/components/luxury-background';
import AdminNav from '@/components/admin/admin-nav';

interface ParsedDestination {
  name: string;
  type: 'city' | 'country' | 'route';
  country?: string;
  region?: string;
  ports?: string[];
  exists: boolean;
}

export default function UploadYachtDestinationsPage() {
  const [citiesText, setCitiesText] = useState('');
  const [countriesText, setCountriesText] = useState('');
  const [routesText, setRoutesText] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [parsedPreview, setParsedPreview] = useState<ParsedDestination[]>([]);

  function parseCities(text: string): ParsedDestination[] {
    const lines = text.split('\n').filter(line => line.trim());
    return lines.map(line => ({
      name: line.trim(),
      type: 'city' as const,
      exists: false
    }));
  }

  function parseCountries(text: string): ParsedDestination[] {
    const lines = text.split('\n').filter(line => line.trim());
    return lines.map(line => ({
      name: line.trim(),
      type: 'country' as const,
      exists: false
    }));
  }

  function parseRoutes(text: string): ParsedDestination[] {
    // Format: "Route Name - City1, City2, City3"
    // Or: "Route Name: City1 • City2 • City3"
    const lines = text.split('\n').filter(line => line.trim());
    
    return lines.map(line => {
      // Try to extract route name and cities
      const match = line.match(/^([^:-]+)[\s:-]+(.+)$/);
      if (!match) return null;

      const routeName = match[1].trim();
      const citiesStr = match[2];
      
      // Split by common delimiters
      const ports = citiesStr
        .split(/[,•·|]/)
        .map(city => city.trim())
        .filter(city => city.length > 0);

      return {
        name: routeName,
        type: 'route' as const,
        ports,
        exists: false
      };
    }).filter(Boolean) as ParsedDestination[];
  }

  function handlePreview() {
    const parsed: ParsedDestination[] = [];

    if (citiesText.trim()) {
      parsed.push(...parseCities(citiesText));
    }

    if (countriesText.trim()) {
      parsed.push(...parseCountries(countriesText));
    }

    if (routesText.trim()) {
      parsed.push(...parseRoutes(routesText));
    }

    setParsedPreview(parsed);
  }

  async function handleUpload() {
    if (parsedPreview.length === 0) {
      alert('Please preview your data first!');
      return;
    }

    if (!confirm(`Upload ${parsedPreview.length} destinations?\n\n` +
      `Cities: ${parsedPreview.filter(d => d.type === 'city').length}\n` +
      `Countries: ${parsedPreview.filter(d => d.type === 'country').length}\n` +
      `Routes: ${parsedPreview.filter(d => d.type === 'route').length}`
    )) {
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/admin/upload-yacht-destinations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ destinations: parsedPreview })
      });

      const data = await response.json();
      setResult(data);

      if (data.success) {
        // Clear inputs on success
        setCitiesText('');
        setCountriesText('');
        setRoutesText('');
        setParsedPreview([]);
      }
    } catch (error: any) {
      setResult({
        success: false,
        error: 'Failed to upload destinations',
        details: error.message
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white relative">
      <LuxuryBackground />

      <div className="relative z-10">
        <AdminNav />

        <div className="max-w-6xl mx-auto px-6 py-12">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-lexa-gold mb-2">
              ⛵ Upload Yacht Destinations
            </h1>
            <p className="text-zinc-400">
              Parse and upload yacht cities, countries, and routes for POI enrichment
            </p>
          </div>

          {/* Input Sections */}
          <div className="space-y-6 mb-8">
            {/* Cities Input */}
            <div className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800 rounded-xl p-6">
              <label className="block text-lg font-semibold text-lexa-gold mb-2">
                📍 Yacht Cities/Ports
              </label>
              <p className="text-sm text-zinc-400 mb-3">
                Paste one city per line (e.g., Monaco, Saint-Tropez, Portofino)
              </p>
              <textarea
                value={citiesText}
                onChange={(e) => setCitiesText(e.target.value)}
                placeholder="Monaco&#10;Saint-Tropez&#10;Portofino&#10;Cannes&#10;Antibes"
                className="w-full h-40 bg-zinc-950 border border-zinc-700 rounded-lg px-4 py-3 text-white font-mono text-sm focus:border-lexa-gold focus:ring-1 focus:ring-lexa-gold transition-all resize-none"
              />
            </div>

            {/* Countries Input */}
            <div className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800 rounded-xl p-6">
              <label className="block text-lg font-semibold text-lexa-gold mb-2">
                🌍 Countries
              </label>
              <p className="text-sm text-zinc-400 mb-3">
                Paste one country per line (e.g., Monaco, France, Italy)
              </p>
              <textarea
                value={countriesText}
                onChange={(e) => setCountriesText(e.target.value)}
                placeholder="Monaco&#10;France&#10;Italy&#10;Spain&#10;Greece"
                className="w-full h-40 bg-zinc-950 border border-zinc-700 rounded-lg px-4 py-3 text-white font-mono text-sm focus:border-lexa-gold focus:ring-1 focus:ring-lexa-gold transition-all resize-none"
              />
            </div>

            {/* Routes Input */}
            <div className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800 rounded-xl p-6">
              <label className="block text-lg font-semibold text-lexa-gold mb-2">
                🗺️ Yacht Routes
              </label>
              <p className="text-sm text-zinc-400 mb-3">
                Paste routes in format: "Route Name - City1, City2, City3" or "Route: City1 • City2"
              </p>
              <textarea
                value={routesText}
                onChange={(e) => setRoutesText(e.target.value)}
                placeholder="French Riviera - Monaco, Nice, Cannes, Saint-Tropez, Antibes&#10;Italian Riviera: Portofino • Santa Margherita • Cinque Terre&#10;Balearics - Ibiza, Mallorca, Menorca, Formentera"
                className="w-full h-40 bg-zinc-950 border border-zinc-700 rounded-lg px-4 py-3 text-white font-mono text-sm focus:border-lexa-gold focus:ring-1 focus:ring-lexa-gold transition-all resize-none"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 mb-8">
            <button
              onClick={handlePreview}
              disabled={loading || (!citiesText && !countriesText && !routesText)}
              className="px-6 py-3 bg-zinc-700 text-white rounded-xl font-semibold hover:bg-zinc-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              👁️ Preview Parsed Data
            </button>

            <button
              onClick={handleUpload}
              disabled={loading || parsedPreview.length === 0}
              className="px-6 py-3 bg-lexa-gold text-zinc-900 rounded-xl font-semibold hover:bg-yellow-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '⏳ Uploading...' : '⬆️ Upload to Database'}
            </button>
          </div>

          {/* Preview */}
          {parsedPreview.length > 0 && (
            <div className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800 rounded-xl p-6 mb-8">
              <h2 className="text-xl font-semibold text-lexa-gold mb-4">
                📋 Preview ({parsedPreview.length} destinations)
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="bg-zinc-950 rounded-lg p-4">
                  <div className="text-2xl font-bold text-blue-400">
                    {parsedPreview.filter(d => d.type === 'city').length}
                  </div>
                  <div className="text-sm text-zinc-400">Cities/Ports</div>
                </div>
                <div className="bg-zinc-950 rounded-lg p-4">
                  <div className="text-2xl font-bold text-green-400">
                    {parsedPreview.filter(d => d.type === 'country').length}
                  </div>
                  <div className="text-sm text-zinc-400">Countries</div>
                </div>
                <div className="bg-zinc-950 rounded-lg p-4">
                  <div className="text-2xl font-bold text-purple-400">
                    {parsedPreview.filter(d => d.type === 'route').length}
                  </div>
                  <div className="text-sm text-zinc-400">Routes</div>
                </div>
              </div>

              <div className="max-h-96 overflow-y-auto space-y-2">
                {parsedPreview.map((dest, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-3 bg-zinc-950 rounded-lg p-3 text-sm"
                  >
                    <span className="text-2xl">
                      {dest.type === 'city' ? '📍' : dest.type === 'country' ? '🌍' : '🗺️'}
                    </span>
                    <div className="flex-1">
                      <div className="font-semibold text-white">{dest.name}</div>
                      {dest.ports && (
                        <div className="text-xs text-zinc-400 mt-1">
                          {dest.ports.length} ports: {dest.ports.join(', ')}
                        </div>
                      )}
                    </div>
                    <span className="text-xs px-2 py-1 rounded bg-zinc-800 text-zinc-400">
                      {dest.type}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Result Display */}
          {result && (
            <div className={`p-6 rounded-xl ${result.success ? 'bg-green-900/20 border border-green-500/30' : 'bg-red-900/20 border border-red-500/30'}`}>
              <div className="flex items-center gap-3 mb-4">
                <span className="text-3xl">{result.success ? '✅' : '⚠️'}</span>
                <h2 className={`text-xl font-semibold ${result.success ? 'text-green-400' : 'text-red-400'}`}>
                  {result.success ? 'Upload Complete!' : 'Upload Error'}
                </h2>
              </div>

              {result.message && (
                <p className="text-white mb-3">{result.message}</p>
              )}

              {result.summary && (
                <div className="space-y-2 text-sm text-zinc-300 mb-4">
                  <p>• Total processed: <span className="text-lexa-gold font-semibold">{result.summary.total}</span></p>
                  <p>• New destinations: <span className="text-green-400 font-semibold">{result.summary.created}</span></p>
                  <p>• Already existed: <span className="text-yellow-400 font-semibold">{result.summary.existing}</span></p>
                  <p>• Routes created: <span className="text-purple-400 font-semibold">{result.summary.routes}</span></p>
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

          {/* Instructions */}
          <div className="mt-8 bg-blue-900/20 border border-blue-500/30 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-blue-400 mb-3">
              📖 How to Use
            </h3>
            <ol className="space-y-2 text-sm text-zinc-300">
              <li><strong>1. Paste your data</strong> into the text areas above</li>
              <li><strong>2. Click "Preview"</strong> to see how it will be parsed</li>
              <li><strong>3. Review</strong> the preview for accuracy</li>
              <li><strong>4. Click "Upload"</strong> to add to database</li>
              <li><strong>5. Next:</strong> Run POI enrichment on these destinations</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}

