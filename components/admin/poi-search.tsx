'use client';

import { useState, useEffect, useCallback } from 'react';
import { debounce } from 'lodash';

interface POISearchResult {
  poi_uid: string;
  name: string;
  type: string | null;
  destination_name: string | null;
  lat: number;
  lon: number;
  luxury_score: number | null;
  luxury_confidence: number | null;
  source: string;
}

interface POISearchProps {
  onSelectPOI: (poi: POISearchResult) => void;
  placeholder?: string;
}

export function POISearch({ onSelectPOI, placeholder = 'Search POIs (e.g., Club55, St. Tropez)...' }: POISearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<POISearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Debounced search function
  const searchPOIs = useCallback(
    debounce(async (searchQuery: string) => {
      if (searchQuery.length < 2) {
        setResults([]);
        setIsOpen(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `/api/knowledge/search-poi?q=${encodeURIComponent(searchQuery)}&limit=15`
        );

        if (!response.ok) {
          throw new Error('Search failed');
        }

        const data = await response.json();
        setResults(data.results || []);
        setIsOpen(true);
      } catch (err) {
        console.error('POI search error:', err);
        setError('Failed to search POIs');
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    }, 300),
    []
  );

  useEffect(() => {
    searchPOIs(query);
  }, [query, searchPOIs]);

  const handleSelect = (poi: POISearchResult) => {
    setQuery(poi.name);
    setIsOpen(false);
    onSelectPOI(poi);
  };

  const handleClear = () => {
    setQuery('');
    setResults([]);
    setIsOpen(false);
    setError(null);
  };

  return (
    <div className="relative w-full">
      {/* Search Input */}
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setIsOpen(true)}
          placeholder={placeholder}
          className="w-full px-4 py-3 pr-20 border-2 border-lexa-gold/30 rounded-lg focus:border-lexa-gold focus:outline-none text-lexa-navy placeholder-zinc-400"
        />
        
        {/* Loading Spinner */}
        {isLoading && (
          <div className="absolute right-12 top-1/2 -translate-y-1/2">
            <div className="animate-spin h-5 w-5 border-2 border-lexa-gold border-t-transparent rounded-full"></div>
          </div>
        )}

        {/* Clear Button */}
        {query && !isLoading && (
          <button
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-lexa-navy px-2"
          >
            ✕
          </button>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="mt-2 text-red-500 text-sm">
          {error}
        </div>
      )}

      {/* Search Results Dropdown */}
      {isOpen && results.length > 0 && (
        <div className="absolute z-50 w-full mt-2 bg-white border-2 border-lexa-gold/30 rounded-lg shadow-xl max-h-96 overflow-y-auto">
          {results.map((poi) => (
            <button
              key={poi.poi_uid}
              onClick={() => handleSelect(poi)}
              className="w-full px-4 py-3 text-left hover:bg-lexa-gold/10 border-b border-zinc-100 last:border-b-0 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="font-semibold text-lexa-navy">
                    {poi.name}
                  </div>
                  <div className="text-sm text-zinc-600 mt-1">
                    {poi.destination_name && (
                      <span className="mr-3">📍 {poi.destination_name}</span>
                    )}
                    {poi.type && (
                      <span className="text-lexa-gold">• {poi.type}</span>
                    )}
                  </div>
                </div>
                <div className="ml-4 text-right">
                  {poi.luxury_score !== null && (
                    <div className="text-sm font-semibold text-lexa-gold">
                      ★ {poi.luxury_score.toFixed(1)}
                    </div>
                  )}
                  {poi.luxury_confidence !== null && (
                    <div className="text-xs text-zinc-500">
                      {(poi.luxury_confidence * 100).toFixed(0)}% conf
                    </div>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* No Results Message */}
      {isOpen && !isLoading && results.length === 0 && query.length >= 2 && (
        <div className="absolute z-50 w-full mt-2 bg-white border-2 border-lexa-gold/30 rounded-lg shadow-xl p-4 text-center text-zinc-500">
          No POIs found for &quot;{query}&quot;
        </div>
      )}
    </div>
  );
}

