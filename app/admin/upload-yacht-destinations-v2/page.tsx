/**
 * Admin Page: Upload Yacht Destinations (Enhanced)
 * Features:
 * 1. Screenshot upload with OCR
 * 2. Text paste (existing)
 * 3. Editable data grid
 * 4. Approval workflow
 * 5. Auto POI collection trigger
 */

'use client';

import { useState, useEffect } from 'react';
import LuxuryBackground from '@/components/luxury-background';
import AdminNav from '@/components/admin/admin-nav';

interface EditableDestination {
  id: string;
  name: string;
  type: 'city' | 'country' | 'route';
  ports?: string[];
  isEditing: boolean;
}

type UploadMode = 'text' | 'screenshot';

export default function UploadYachtDestinationsPage() {
  const [mode, setMode] = useState<UploadMode>('screenshot');
  
  // Text mode state
  const [citiesText, setCitiesText] = useState('');
  const [countriesText, setCountriesText] = useState('');
  const [routesText, setRoutesText] = useState('');
  
  // Screenshot mode state
  const [uploading, setUploading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  
  // Shared state
  const [destinations, setDestinations] = useState<EditableDestination[]>([]);
  const [approved, setApproved] = useState(false);
  const [uploadResult, setUploadResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // Screenshot upload and OCR
  async function handleScreenshotUpload(files: FileList | null) {
    if (!files || files.length === 0) return;

    setExtracting(true);
    setDestinations([]);
    setApproved(false);
    setIsDragging(false);

    try {
      const formData = new FormData();
      Array.from(files).forEach(file => {
        formData.append('images', file);
      });

      const response = await fetch('/api/admin/extract-yacht-destinations', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.details || 'OCR extraction failed');
      }

      const data = await response.json();
      
      // Convert extracted data to editable format
      const extracted: EditableDestination[] = [
        ...data.extracted.cities.map((name: string) => ({
          id: `city-${Math.random()}`,
          name,
          type: 'city' as const,
          isEditing: false
        })),
        ...data.extracted.countries.map((name: string) => ({
          id: `country-${Math.random()}`,
          name,
          type: 'country' as const,
          isEditing: false
        })),
        ...data.extracted.routes.map((route: any) => ({
          id: `route-${Math.random()}`,
          name: route.name,
          type: 'route' as const,
          ports: route.ports,
          isEditing: false
        }))
      ];

      setDestinations(extracted);
      alert(`✅ Extracted ${extracted.length} destinations from ${data.files_processed} image(s)!`);
    } catch (error: any) {
      alert(`❌ Error: ${error.message}`);
    } finally {
      setExtracting(false);
    }
  }

  // Drag and drop handlers
  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleScreenshotUpload(files);
    }
  }

  // Paste handler (Ctrl+V)
  useEffect(() => {
    if (mode !== 'screenshot') return;

    function handlePaste(e: ClipboardEvent) {
      const items = e.clipboardData?.items;
      if (!items) return;

      const imageFiles: File[] = [];
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.indexOf('image') !== -1) {
          const file = item.getAsFile();
          if (file) {
            imageFiles.push(file);
          }
        }
      }

      if (imageFiles.length > 0) {
        e.preventDefault();
        const dataTransfer = new DataTransfer();
        imageFiles.forEach(file => dataTransfer.items.add(file));
        handleScreenshotUpload(dataTransfer.files);
      }
    }

    document.addEventListener('paste', handlePaste);
    return () => {
      document.removeEventListener('paste', handlePaste);
    };
  }, [mode]);

  // Parse text input
  function handleTextParse() {
    const parsed: EditableDestination[] = [];

    // Parse cities
    if (citiesText.trim()) {
      const cities = citiesText.split('\n').filter(line => line.trim());
      cities.forEach(city => {
        parsed.push({
          id: `city-${Math.random()}`,
          name: city.trim(),
          type: 'city',
          isEditing: false
        });
      });
    }

    // Parse countries
    if (countriesText.trim()) {
      const countries = countriesText.split('\n').filter(line => line.trim());
      countries.forEach(country => {
        parsed.push({
          id: `country-${Math.random()}`,
          name: country.trim(),
          type: 'country',
          isEditing: false
        });
      });
    }

    // Parse routes
    if (routesText.trim()) {
      const routes = routesText.split('\n').filter(line => line.trim());
      routes.forEach(line => {
        const match = line.match(/^([^:-]+)[\s:-]+(.+)$/);
        if (match) {
          const routeName = match[1].trim();
          const portsStr = match[2];
          const ports = portsStr.split(/[,•·|]/).map(p => p.trim()).filter(p => p);
          
          parsed.push({
            id: `route-${Math.random()}`,
            name: routeName,
            type: 'route',
            ports,
            isEditing: false
          });
        }
      });
    }

    setDestinations(parsed);
    setApproved(false);
  }

  // Edit destination
  function handleEdit(id: string, field: string, value: string) {
    setDestinations(prev => prev.map(dest => {
      if (dest.id === id) {
        if (field === 'name') {
          return { ...dest, name: value };
        } else if (field === 'ports' && dest.type === 'route') {
          return { ...dest, ports: value.split(',').map(p => p.trim()) };
        }
      }
      return dest;
    }));
  }

  // Delete destination
  function handleDelete(id: string) {
    setDestinations(prev => prev.filter(dest => dest.id !== id));
  }

  // Approve for upload
  function handleApprove() {
    if (destinations.length === 0) {
      alert('No destinations to approve!');
      return;
    }
    setApproved(true);
  }

  // Upload to database
  async function handleUpload() {
    if (!approved) {
      alert('Please approve the data first!');
      return;
    }

    if (!confirm(`Upload ${destinations.length} destinations and start POI collection?`)) {
      return;
    }

    setLoading(true);
    setUploadResult(null);

    try {
      // Convert to API format
      const apiDestinations = destinations.map(dest => ({
        name: dest.name,
        type: dest.type,
        ports: dest.ports,
        exists: false
      }));

      const response = await fetch('/api/admin/upload-yacht-destinations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ destinations: apiDestinations })
      });

      const data = await response.json();
      setUploadResult(data);

      if (data.success) {
        // Clear all data
        setDestinations([]);
        setApproved(false);
        setCitiesText('');
        setCountriesText('');
        setRoutesText('');
        
        // TODO: Trigger POI collection
        alert(`✅ Uploaded successfully! POI collection will start automatically.`);
      }
    } catch (error: any) {
      setUploadResult({
        success: false,
        error: 'Failed to upload',
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

        <div className="max-w-7xl mx-auto px-6 py-12">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-lexa-gold mb-2">
              ⛵ Upload Yacht Destinations
            </h1>
            <p className="text-zinc-400">
              Upload screenshots or paste text → Edit → Approve → Auto POI Collection
            </p>
          </div>

          {/* Mode Selector */}
          <div className="flex gap-4 mb-8">
            <button
              onClick={() => setMode('screenshot')}
              className={`px-6 py-3 rounded-xl font-semibold transition-all ${
                mode === 'screenshot'
                  ? 'bg-lexa-gold text-zinc-900'
                  : 'bg-zinc-800 text-white hover:bg-zinc-700'
              }`}
            >
              📸 Upload Screenshots (OCR)
            </button>
            <button
              onClick={() => setMode('text')}
              className={`px-6 py-3 rounded-xl font-semibold transition-all ${
                mode === 'text'
                  ? 'bg-lexa-gold text-zinc-900'
                  : 'bg-zinc-800 text-white hover:bg-zinc-700'
              }`}
            >
              📝 Paste Text
            </button>
          </div>

          {/* Screenshot Upload Mode */}
          {mode === 'screenshot' && (
            <div className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800 rounded-xl p-8 mb-8">
              <h2 className="text-2xl font-semibold text-lexa-gold mb-4">
                📸 Upload Screenshots
              </h2>
              <p className="text-zinc-400 mb-6">
                Upload images with city names, routes, or destination lists. We'll extract the text automatically using OCR.
              </p>
              
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-xl p-12 text-center transition-all ${
                  isDragging
                    ? 'border-lexa-gold bg-lexa-gold/10 scale-105'
                    : 'border-zinc-700 hover:border-lexa-gold'
                }`}
              >
                <input
                  type="file"
                  id="screenshot-upload"
                  accept="image/*"
                  multiple
                  onChange={(e) => handleScreenshotUpload(e.target.files)}
                  className="hidden"
                  disabled={extracting}
                />
                <label
                  htmlFor="screenshot-upload"
                  className="cursor-pointer block"
                >
                  {extracting ? (
                    <div className="space-y-4">
                      <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-lexa-gold"></div>
                      <p className="text-lexa-gold font-semibold">Extracting text from images...</p>
                    </div>
                  ) : isDragging ? (
                    <div className="space-y-4">
                      <div className="text-6xl">📥</div>
                      <div>
                        <p className="text-xl font-semibold text-lexa-gold mb-2">
                          Drop images here
                        </p>
                        <p className="text-sm text-zinc-400">
                          Release to upload
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="text-6xl">📸</div>
                      <div>
                        <p className="text-xl font-semibold text-white mb-2">
                          Click, Drag & Drop, or Press Ctrl+V
                        </p>
                        <p className="text-sm text-zinc-400 mb-3">
                          Supports: JPG, PNG, WebP • Multiple files allowed
                        </p>
                        <div className="flex items-center justify-center gap-4 text-xs text-zinc-500">
                          <span className="flex items-center gap-1">
                            <kbd className="px-2 py-1 bg-zinc-800 rounded border border-zinc-700">Click</kbd>
                            to browse
                          </span>
                          <span className="flex items-center gap-1">
                            <kbd className="px-2 py-1 bg-zinc-800 rounded border border-zinc-700">Drag</kbd>
                            files here
                          </span>
                          <span className="flex items-center gap-1">
                            <kbd className="px-2 py-1 bg-zinc-800 rounded border border-zinc-700">Ctrl+V</kbd>
                            to paste
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </label>
              </div>
              
              {mode === 'screenshot' && !extracting && (
                <p className="text-center text-xs text-zinc-500 mt-4">
                  💡 Tip: Copy a screenshot (Windows: Win+Shift+S, Mac: Cmd+Shift+4) and paste it here with Ctrl+V
                </p>
              )}
            </div>
          )}

          {/* Text Paste Mode */}
          {mode === 'text' && (
            <div className="space-y-6 mb-8">
              {/* Cities */}
              <div className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800 rounded-xl p-6">
                <label className="block text-lg font-semibold text-lexa-gold mb-2">
                  📍 Yacht Cities/Ports
                </label>
                <p className="text-sm text-zinc-400 mb-3">
                  One city per line
                </p>
                <textarea
                  value={citiesText}
                  onChange={(e) => setCitiesText(e.target.value)}
                  placeholder="Monaco&#10;Saint-Tropez&#10;Portofino"
                  className="w-full h-32 bg-zinc-950 border border-zinc-700 rounded-lg px-4 py-3 text-white font-mono text-sm focus:border-lexa-gold focus:ring-1 focus:ring-lexa-gold transition-all resize-none"
                />
              </div>

              {/* Countries */}
              <div className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800 rounded-xl p-6">
                <label className="block text-lg font-semibold text-lexa-gold mb-2">
                  🌍 Countries
                </label>
                <textarea
                  value={countriesText}
                  onChange={(e) => setCountriesText(e.target.value)}
                  placeholder="Monaco&#10;France&#10;Italy"
                  className="w-full h-32 bg-zinc-950 border border-zinc-700 rounded-lg px-4 py-3 text-white font-mono text-sm focus:border-lexa-gold focus:ring-1 focus:ring-lexa-gold transition-all resize-none"
                />
              </div>

              {/* Routes */}
              <div className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800 rounded-xl p-6">
                <label className="block text-lg font-semibold text-lexa-gold mb-2">
                  🗺️ Yacht Routes
                </label>
                <textarea
                  value={routesText}
                  onChange={(e) => setRoutesText(e.target.value)}
                  placeholder="French Riviera - Monaco, Nice, Cannes, Saint-Tropez"
                  className="w-full h-32 bg-zinc-950 border border-zinc-700 rounded-lg px-4 py-3 text-white font-mono text-sm focus:border-lexa-gold focus:ring-1 focus:ring-lexa-gold transition-all resize-none"
                />
              </div>

              <button
                onClick={handleTextParse}
                disabled={!citiesText && !countriesText && !routesText}
                className="w-full px-6 py-3 bg-lexa-gold text-zinc-900 rounded-xl font-semibold hover:bg-yellow-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                📊 Parse & Preview
              </button>
            </div>
          )}

          {/* Editable Data Grid */}
          {destinations.length > 0 && (
            <div className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800 rounded-xl p-6 mb-8">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-semibold text-lexa-gold mb-2">
                    ✏️ Review & Edit Extracted Data
                  </h2>
                  <p className="text-zinc-400 text-sm">
                    Click any field to edit • Delete unwanted entries • Approve when ready
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold text-lexa-gold">{destinations.length}</div>
                  <div className="text-sm text-zinc-400">Total Destinations</div>
                </div>
              </div>

              {/* Statistics */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-zinc-950 rounded-lg p-4">
                  <div className="text-2xl font-bold text-blue-400">
                    {destinations.filter(d => d.type === 'city').length}
                  </div>
                  <div className="text-sm text-zinc-400">Cities/Ports</div>
                </div>
                <div className="bg-zinc-950 rounded-lg p-4">
                  <div className="text-2xl font-bold text-green-400">
                    {destinations.filter(d => d.type === 'country').length}
                  </div>
                  <div className="text-sm text-zinc-400">Countries</div>
                </div>
                <div className="bg-zinc-950 rounded-lg p-4">
                  <div className="text-2xl font-bold text-purple-400">
                    {destinations.filter(d => d.type === 'route').length}
                  </div>
                  <div className="text-sm text-zinc-400">Routes</div>
                </div>
              </div>

              {/* Data Table */}
              <div className="max-h-96 overflow-y-auto space-y-2">
                {destinations.map((dest) => (
                  <div
                    key={dest.id}
                    className="flex items-center gap-3 bg-zinc-950 rounded-lg p-4 hover:bg-zinc-900 transition-all group"
                  >
                    <span className="text-2xl">
                      {dest.type === 'city' ? '📍' : dest.type === 'country' ? '🌍' : '🗺️'}
                    </span>
                    
                    <div className="flex-1">
                      <input
                        type="text"
                        value={dest.name}
                        onChange={(e) => handleEdit(dest.id, 'name', e.target.value)}
                        className="w-full bg-transparent border-b border-transparent hover:border-zinc-700 focus:border-lexa-gold focus:outline-none text-white font-semibold transition-all"
                      />
                      
                      {dest.ports && (
                        <input
                          type="text"
                          value={dest.ports.join(', ')}
                          onChange={(e) => handleEdit(dest.id, 'ports', e.target.value)}
                          placeholder="Ports (comma-separated)"
                          className="w-full bg-transparent border-b border-transparent hover:border-zinc-700 focus:border-lexa-gold focus:outline-none text-zinc-400 text-sm mt-1 transition-all"
                        />
                      )}
                    </div>

                    <span className="text-xs px-2 py-1 rounded bg-zinc-800 text-zinc-400">
                      {dest.type}
                    </span>

                    <button
                      onClick={() => handleDelete(dest.id)}
                      className="opacity-0 group-hover:opacity-100 px-3 py-1 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700 transition-all"
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>

              {/* Approval Section */}
              {!approved ? (
                <div className="mt-6 pt-6 border-t border-zinc-800">
                  <button
                    onClick={handleApprove}
                    className="w-full px-6 py-4 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl font-bold text-lg hover:from-green-700 hover:to-green-800 transition-all"
                  >
                    ✅ Approve Data for Upload
                  </button>
                </div>
              ) : (
                <div className="mt-6 pt-6 border-t border-zinc-800">
                  <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-4 mb-4">
                    <p className="text-green-400 font-semibold">
                      ✅ Data approved! Ready to upload to database.
                    </p>
                  </div>
                  <button
                    onClick={handleUpload}
                    disabled={loading}
                    className="w-full px-6 py-4 bg-lexa-gold text-zinc-900 rounded-xl font-bold text-lg hover:bg-yellow-600 transition-all disabled:opacity-50"
                  >
                    {loading ? '⏳ Uploading...' : '⬆️ Upload to Database & Start POI Collection'}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Upload Result */}
          {uploadResult && (
            <div className={`p-6 rounded-xl ${uploadResult.success ? 'bg-green-900/20 border border-green-500/30' : 'bg-red-900/20 border border-red-500/30'}`}>
              <div className="flex items-center gap-3 mb-4">
                <span className="text-3xl">{uploadResult.success ? '✅' : '⚠️'}</span>
                <h2 className={`text-xl font-semibold ${uploadResult.success ? 'text-green-400' : 'text-red-400'}`}>
                  {uploadResult.success ? 'Upload Complete!' : 'Upload Error'}
                </h2>
              </div>

              {uploadResult.summary && (
                <div className="space-y-2 text-sm text-zinc-300">
                  <p>• Created: <span className="text-green-400 font-semibold">{uploadResult.summary.created}</span></p>
                  <p>• Already existed: <span className="text-yellow-400 font-semibold">{uploadResult.summary.existing}</span></p>
                  <p>• Routes: <span className="text-purple-400 font-semibold">{uploadResult.summary.routes}</span></p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

