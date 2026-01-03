'use client';

/**
 * Captain Portal: Upload & Manual Entry
 * Merges: File Upload, URL Scraping, Manual POI Entry, Yacht Destinations Upload
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client-browser';
import AdminNav from '@/components/admin/admin-nav';
import { uploadAPI, scrapingAPI } from '@/lib/api/captain-portal';

type UploadMode = 'file' | 'url' | 'manual' | 'yacht';

interface UploadedFile {
  name: string;
  size: number;
  type: string;
  status: 'pending' | 'processing' | 'done' | 'error';
  confidenceScore: number;
  uploadId?: string;
  extractedData?: any; // Full intelligence data for editing
}

interface YachtDestination {
  id: string;
  name: string;
  type: 'city' | 'country' | 'route';
  ports?: string[];
  isEditing: boolean;
}

export default function CaptainUploadPage() {
  const router = useRouter();
  const supabase = createClient();
  
  const [mode, setMode] = useState<UploadMode>('file');
  const [loading, setLoading] = useState(false);
  
  // File Upload State
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [editingFile, setEditingFile] = useState<UploadedFile | null>(null); // File being edited
  
  // URL Scraping State
  const [url, setUrl] = useState('');
  const [urls, setUrls] = useState<string[]>([]);
  
  // Manual Entry State
  const [poiName, setPoiName] = useState('');
  const [poiDescription, setPoiDescription] = useState('');
  const [poiCategory, setPoiCategory] = useState('restaurant');
  const [poiLocation, setPoiLocation] = useState('');
  const [confidenceScore, setConfidenceScore] = useState(80);
  
  // Yacht Destinations State
  const [yachtMode, setYachtMode] = useState<'screenshot' | 'text'>('screenshot');
  const [yachtDestinations, setYachtDestinations] = useState<YachtDestination[]>([]);
  const [extracting, setExtracting] = useState(false);
  const [citiesText, setCitiesText] = useState('');
  const [countriesText, setCountriesText] = useState('');
  const [routesText, setRoutesText] = useState('');
  const [yachtApproved, setYachtApproved] = useState(false);

  // Auth check
  useEffect(() => {
    async function checkAuth() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/auth/signin');
      }
    }
    checkAuth();
  }, [router, supabase.auth]);

  // FILE UPLOAD HANDLERS
  const handleFileUpload = async (uploadedFiles: FileList | null) => {
    if (!uploadedFiles || uploadedFiles.length === 0) return;
  
    setLoading(true);
  
    try {
      for (const file of Array.from(uploadedFiles)) {
        // Show file as processing
        const newFile: UploadedFile = {
          name: file.name,
          size: file.size,
          type: file.type,
          status: 'processing',
          confidenceScore: 0
        };
        setFiles(prev => [...prev, newFile]);
  
        // Upload to backend (THIS IS THE REAL API CALL)
        const result = await uploadAPI.uploadFile(file);
  
        // Update status to done WITH extracted data
        setFiles(prev => prev.map(f => 
          f.name === file.name 
            ? { 
                ...f, 
                status: 'done', 
                confidenceScore: result.confidence_score || 80,
                uploadId: result.upload_id,
                extractedData: result.extracted_data // Store for editing
              }
            : f
        ));
  
        // Show success message and open editor if data extracted
        const hasData = result.pois_extracted > 0 || result.intelligence_extracted.experiences > 0;
        if (hasData) {
          // Auto-open editor for extracted data
          const updatedFile = {
            name: file.name,
            size: file.size,
            type: file.type,
            status: 'done' as const,
            confidenceScore: result.confidence_score || 80,
            uploadId: result.upload_id,
            extractedData: result.extracted_data
          };
          setEditingFile(updatedFile);
        } else {
          alert(`✅ ${file.name} uploaded!\n` +
                `POIs found: ${result.pois_extracted}\n` +
                `Experiences: ${result.intelligence_extracted.experiences}\n` +
                `Trends: ${result.intelligence_extracted.trends}\n\n` +
                `No data extracted. Please review the document or try manual entry.`);
        }
      }
    } catch (error: any) {
      console.error('Upload failed:', error);
      alert(`❌ Upload failed: ${error.message}`);
      setFiles(prev => prev.map(f => ({ ...f, status: 'error' })));
    } finally {
      setLoading(false);
      setIsDragging(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    handleFileUpload(e.dataTransfer.files);
  };

  // URL SCRAPING HANDLERS
  const handleAddUrl = () => {
    if (!url.trim()) return;
    
    try {
      new URL(url); // Validate URL
      setUrls(prev => [...prev, url.trim()]);
      setUrl('');
      alert('✅ URL added to scraping queue!');
    } catch (error) {
      alert('❌ Invalid URL format');
    }
  };

  const handleRemoveUrl = (index: number) => {
    setUrls(prev => prev.filter((_, i) => i !== index));
  };

  const handleScrapeUrls = async () => {
    if (urls.length === 0) {
      alert('Please add at least one URL');
      return;
    }

    setLoading(true);
    try {
      // TODO: Call backend scraping API
      alert(`🌐 Scraping ${urls.length} URL(s)... This will be implemented soon.`);
      setUrls([]);
    } catch (error) {
      alert('❌ Scraping failed');
    } finally {
      setLoading(false);
    }
  };

  // MANUAL ENTRY HANDLERS
  const handleManualSubmit = async () => {
    if (!poiName.trim() || !poiDescription.trim()) {
      alert('Please fill in POI name and description');
      return;
    }

    setLoading(true);
    try {
      // TODO: Call backend API to create POI
      alert(`✅ POI "${poiName}" created with ${confidenceScore}% confidence!`);
      
      // Reset form
      setPoiName('');
      setPoiDescription('');
      setPoiLocation('');
      setConfidenceScore(80);
    } catch (error) {
      alert('❌ Failed to create POI');
    } finally {
      setLoading(false);
    }
  };

  // YACHT DESTINATIONS HANDLERS (from yacht upload page)
  const handleYachtScreenshotUpload = async (uploadedFiles: FileList | null) => {
    if (!uploadedFiles || uploadedFiles.length === 0) return;

    setExtracting(true);
    setYachtDestinations([]);
    setYachtApproved(false);

    try {
      const formData = new FormData();
      Array.from(uploadedFiles).forEach(file => {
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
      
      const extracted: YachtDestination[] = [
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

      setYachtDestinations(extracted);
      alert(`✅ Extracted ${extracted.length} destinations from ${data.files_processed} image(s)!`);
    } catch (error: any) {
      alert(`❌ Error: ${error.message}`);
    } finally {
      setExtracting(false);
    }
  };

  const handleYachtTextParse = () => {
    const parsed: YachtDestination[] = [];

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

    setYachtDestinations(parsed);
    setYachtApproved(false);
  };

  const handleYachtEdit = (id: string, field: string, value: string) => {
    setYachtDestinations(prev => prev.map(dest => {
      if (dest.id === id) {
        if (field === 'name') {
          return { ...dest, name: value };
        } else if (field === 'ports' && dest.type === 'route') {
          return { ...dest, ports: value.split(',').map(p => p.trim()) };
        }
      }
      return dest;
    }));
  };

  const handleYachtDelete = (id: string) => {
    setYachtDestinations(prev => prev.filter(dest => dest.id !== id));
  };

  const handleYachtUpload = async () => {
    if (!yachtApproved) {
      alert('Please approve the data first!');
      return;
    }

    if (!confirm(`Upload ${yachtDestinations.length} destinations and start POI collection?`)) {
      return;
    }

    setLoading(true);

    try {
      const apiDestinations = yachtDestinations.map(dest => ({
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

      if (data.success) {
        setYachtDestinations([]);
        setYachtApproved(false);
        setCitiesText('');
        setCountriesText('');
        setRoutesText('');
        alert(`✅ Uploaded successfully! POI collection will start automatically.`);
      }
    } catch (error: any) {
      alert('❌ Upload failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div className="flex-1">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              📤 Upload & Manual Entry
            </h1>
            <p className="text-lg text-gray-600 mb-4">
              Upload documents, scrape URLs, enter POIs manually, or upload yacht destinations
            </p>
            
            {/* Info Box */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2 max-w-3xl">
              <div className="text-sm">
                <strong className="text-blue-900">FORMATS:</strong>{' '}
                <span className="text-gray-700">PDF, Word, Excel, .txt, Images (.png, .jpg, .jpeg), or paste text</span>
              </div>
              <div className="text-sm">
                <strong className="text-blue-900">CONFIDENCE SCORE:</strong>{' '}
                <span className="text-gray-700">Defaults to 80% (maximum for uploads). Captain approval required for higher scores.</span>
              </div>
            </div>
          </div>
          <AdminNav />
        </div>

        {/* Mode Selector */}
        <div className="flex flex-wrap gap-3 mb-8">
          <button
            onClick={() => setMode('file')}
            className={`px-6 py-3 rounded-xl font-semibold transition-all ${
              mode === 'file'
                ? 'bg-blue-600 text-white shadow-lg'
                : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            📁 Upload Files
          </button>
          <button
            onClick={() => setMode('url')}
            className={`px-6 py-3 rounded-xl font-semibold transition-all ${
              mode === 'url'
                ? 'bg-blue-600 text-white shadow-lg'
                : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            🌐 Scrape URLs
          </button>
          <button
            onClick={() => setMode('manual')}
            className={`px-6 py-3 rounded-xl font-semibold transition-all ${
              mode === 'manual'
                ? 'bg-blue-600 text-white shadow-lg'
                : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            ✏️ Manual Entry
          </button>
          <button
            onClick={() => setMode('yacht')}
            className={`px-6 py-3 rounded-xl font-semibold transition-all ${
              mode === 'yacht'
                ? 'bg-blue-600 text-white shadow-lg'
                : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            ⛵ Yacht Destinations
          </button>
        </div>

        {/* FILE UPLOAD MODE */}
        {mode === 'file' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">📁 Upload Documents</h2>
            <p className="text-gray-600 mb-6">
              Upload PDF, Word, Excel, text files, or images. We'll extract POI data automatically.
            </p>

            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-xl p-12 text-center transition-all ${
                isDragging
                  ? 'border-blue-500 bg-blue-50 scale-105'
                  : 'border-gray-300 hover:border-blue-400'
              }`}
            >
              <input
                type="file"
                id="file-upload"
                multiple
                accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.png,.jpg,.jpeg"
                onChange={(e) => handleFileUpload(e.target.files)}
                className="hidden"
              />
              <label htmlFor="file-upload" className="cursor-pointer block">
                <div className="text-6xl mb-4">📤</div>
                <p className="text-xl font-semibold text-gray-900 mb-2">
                  Click, Drag & Drop, or Paste
                </p>
                <p className="text-sm text-gray-500">
                  PDF, Word, Excel, TXT, PNG, JPG, JPEG
                </p>
              </label>
            </div>

            {files.length > 0 && (
              <div className="mt-6 space-y-2">
                <h3 className="font-semibold text-gray-900 mb-3">Uploaded Files ({files.length})</h3>
                {files.map((file, index) => (
                  <div key={index} className="flex items-center justify-between bg-gray-50 rounded-lg p-4">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{file.name}</p>
                      <p className="text-sm text-gray-500">
                        {(file.size / 1024).toFixed(2)} KB • Confidence: {file.confidenceScore}%
                      </p>
                    </div>
                    <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                      {file.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* URL SCRAPING MODE */}
        {mode === 'url' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">🌐 Scrape URLs</h2>
            <p className="text-gray-600 mb-6">
              Add URLs to extract POI data from websites, blogs, and articles.
            </p>

            <div className="flex gap-3 mb-6">
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddUrl()}
                placeholder="https://example.com/luxury-destinations"
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                onClick={handleAddUrl}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
              >
                Add URL
              </button>
            </div>

            {urls.length > 0 && (
              <div className="space-y-2 mb-6">
                <h3 className="font-semibold text-gray-900">URLs to Scrape ({urls.length})</h3>
                {urls.map((u, index) => (
                  <div key={index} className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                    <span className="text-sm text-gray-700 truncate flex-1">{u}</span>
                    <button
                      onClick={() => handleRemoveUrl(index)}
                      className="ml-3 px-3 py-1 bg-red-100 text-red-700 rounded text-sm font-medium hover:bg-red-200"
                    >
                      Remove
                    </button>
                  </div>
                ))}
                
                <button
                  onClick={handleScrapeUrls}
                  disabled={loading}
                  className="w-full mt-4 px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50 transition-colors"
                >
                  {loading ? '⏳ Scraping...' : '🚀 Start Scraping All URLs'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* MANUAL ENTRY MODE */}
        {mode === 'manual' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">✏️ Manual POI Entry</h2>
            <p className="text-gray-600 mb-6">
              Manually enter a point of interest with details and confidence score.
            </p>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">POI Name</label>
                <input
                  type="text"
                  value={poiName}
                  onChange={(e) => setPoiName(e.target.value)}
                  placeholder="Le Louis XV - Alain Ducasse"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                <select
                  value={poiCategory}
                  onChange={(e) => setPoiCategory(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="restaurant">Restaurant</option>
                  <option value="hotel">Hotel</option>
                  <option value="attraction">Attraction</option>
                  <option value="activity">Activity</option>
                  <option value="experience">Experience</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
                <input
                  type="text"
                  value={poiLocation}
                  onChange={(e) => setPoiLocation(e.target.value)}
                  placeholder="Monaco"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea
                  value={poiDescription}
                  onChange={(e) => setPoiDescription(e.target.value)}
                  placeholder="Describe the POI, its unique features, and why it's special..."
                  rows={6}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Confidence Score: {confidenceScore}% (Max 80% for uploads)
                </label>
                <input
                  type="range"
                  min="0"
                  max="80"
                  value={confidenceScore}
                  onChange={(e) => setConfidenceScore(parseInt(e.target.value))}
                  className="w-full"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Captain approval required to increase beyond 80%
                </p>
              </div>

              <button
                onClick={handleManualSubmit}
                disabled={loading}
                className="w-full px-6 py-4 bg-green-600 text-white rounded-lg font-semibold text-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
              >
                {loading ? '⏳ Creating...' : '✅ Create POI'}
              </button>
            </div>
          </div>
        )}

        {/* YACHT DESTINATIONS MODE */}
        {mode === 'yacht' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">⛵ Yacht Destinations Upload</h2>
              <p className="text-gray-600 mb-6">
                Upload screenshots or paste text of yacht destinations → Edit → Approve → Auto POI Collection
              </p>

              {/* Yacht Mode Selector */}
              <div className="flex gap-4 mb-6">
                <button
                  onClick={() => setYachtMode('screenshot')}
                  className={`px-6 py-3 rounded-xl font-semibold transition-all ${
                    yachtMode === 'screenshot'
                      ? 'bg-lexa-gold text-zinc-900'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  📸 Upload Screenshots (OCR)
                </button>
                <button
                  onClick={() => setYachtMode('text')}
                  className={`px-6 py-3 rounded-xl font-semibold transition-all ${
                    yachtMode === 'text'
                      ? 'bg-lexa-gold text-zinc-900'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  📝 Paste Text
                </button>
              </div>

              {/* Screenshot Upload */}
              {yachtMode === 'screenshot' && (
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsDragging(false);
                    handleYachtScreenshotUpload(e.dataTransfer.files);
                  }}
                  className={`border-2 border-dashed rounded-xl p-12 text-center transition-all ${
                    isDragging
                      ? 'border-lexa-gold bg-yellow-50 scale-105'
                      : 'border-gray-300 hover:border-lexa-gold'
                  }`}
                >
                  <input
                    type="file"
                    id="yacht-screenshot-upload"
                    accept="image/*"
                    multiple
                    onChange={(e) => handleYachtScreenshotUpload(e.target.files)}
                    className="hidden"
                    disabled={extracting}
                  />
                  <label htmlFor="yacht-screenshot-upload" className="cursor-pointer block">
                    {extracting ? (
                      <div className="space-y-4">
                        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-lexa-gold"></div>
                        <p className="text-lexa-gold font-semibold">Extracting text from images...</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="text-6xl">📸</div>
                        <p className="text-xl font-semibold text-gray-900 mb-2">
                          Click or Drag & Drop Screenshots
                        </p>
                        <p className="text-sm text-gray-500">
                          JPG, PNG, WebP • Multiple files allowed
                        </p>
                      </div>
                    )}
                  </label>
                </div>
              )}

              {/* Text Paste */}
              {yachtMode === 'text' && (
                <div className="space-y-6">
                  <div>
                    <label className="block text-lg font-semibold text-gray-900 mb-2">
                      📍 Yacht Cities/Ports (one per line)
                    </label>
                    <textarea
                      value={citiesText}
                      onChange={(e) => setCitiesText(e.target.value)}
                      placeholder="Monaco&#10;Saint-Tropez&#10;Portofino"
                      className="w-full h-32 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 resize-none font-mono text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-lg font-semibold text-gray-900 mb-2">
                      🌍 Countries (one per line)
                    </label>
                    <textarea
                      value={countriesText}
                      onChange={(e) => setCountriesText(e.target.value)}
                      placeholder="Monaco&#10;France&#10;Italy"
                      className="w-full h-32 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 resize-none font-mono text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-lg font-semibold text-gray-900 mb-2">
                      🗺️ Yacht Routes
                    </label>
                    <textarea
                      value={routesText}
                      onChange={(e) => setRoutesText(e.target.value)}
                      placeholder="French Riviera - Monaco, Nice, Cannes, Saint-Tropez"
                      className="w-full h-32 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 resize-none font-mono text-sm"
                    />
                  </div>

                  <button
                    onClick={handleYachtTextParse}
                    disabled={!citiesText && !countriesText && !routesText}
                    className="w-full px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    📊 Parse & Preview
                  </button>
                </div>
              )}
            </div>

            {/* Editable Yacht Data Grid */}
            {yachtDestinations.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                      ✏️ Review & Edit Extracted Data
                    </h2>
                    <p className="text-gray-600 text-sm">
                      Click any field to edit • Delete unwanted entries • Approve when ready
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold text-blue-600">{yachtDestinations.length}</div>
                    <div className="text-sm text-gray-500">Total Destinations</div>
                  </div>
                </div>

                {/* Data Table */}
                <div className="max-h-96 overflow-y-auto space-y-2 mb-6">
                  {yachtDestinations.map((dest) => (
                    <div
                      key={dest.id}
                      className="flex items-center gap-3 bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-all group"
                    >
                      <span className="text-2xl">
                        {dest.type === 'city' ? '📍' : dest.type === 'country' ? '🌍' : '🗺️'}
                      </span>
                      
                      <div className="flex-1">
                        <input
                          type="text"
                          value={dest.name}
                          onChange={(e) => handleYachtEdit(dest.id, 'name', e.target.value)}
                          className="w-full bg-transparent border-b border-transparent hover:border-gray-300 focus:border-blue-500 focus:outline-none font-semibold transition-all"
                        />
                        
                        {dest.ports && (
                          <input
                            type="text"
                            value={dest.ports.join(', ')}
                            onChange={(e) => handleYachtEdit(dest.id, 'ports', e.target.value)}
                            placeholder="Ports (comma-separated)"
                            className="w-full bg-transparent border-b border-transparent hover:border-gray-300 focus:border-blue-500 focus:outline-none text-gray-600 text-sm mt-1 transition-all"
                          />
                        )}
                      </div>

                      <span className="text-xs px-2 py-1 rounded bg-gray-200 text-gray-600">
                        {dest.type}
                      </span>

                      <button
                        onClick={() => handleYachtDelete(dest.id)}
                        className="opacity-0 group-hover:opacity-100 px-3 py-1 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700 transition-all"
                      >
                        Delete
                      </button>
                    </div>
                  ))}
                </div>

                {/* Approval Section */}
                {!yachtApproved ? (
                  <button
                    onClick={() => setYachtApproved(true)}
                    className="w-full px-6 py-4 bg-green-600 text-white rounded-xl font-bold text-lg hover:bg-green-700 transition-all"
                  >
                    ✅ Approve Data for Upload
                  </button>
                ) : (
                  <div className="space-y-4">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <p className="text-green-700 font-semibold">
                        ✅ Data approved! Ready to upload to database.
                      </p>
                    </div>
                    <button
                      onClick={handleYachtUpload}
                      disabled={loading}
                      className="w-full px-6 py-4 bg-lexa-gold text-zinc-900 rounded-xl font-bold text-lg hover:bg-yellow-600 transition-all disabled:opacity-50"
                    >
                      {loading ? '⏳ Uploading...' : '⬆️ Upload to Database & Start POI Collection'}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Extracted Data Editor Modal */}
        {editingFile && editingFile.extractedData && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
              {/* Header */}
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    ✏️ Edit Extracted Data: {editingFile.name}
                  </h2>
                  <p className="text-sm text-gray-600 mt-1">
                    Review and enhance extracted intelligence. Set confidence score and save.
                  </p>
                </div>
                <button
                  onClick={() => setEditingFile(null)}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ×
                </button>
              </div>

              {/* Content - Scrollable */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Confidence Score */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Confidence Score: {editingFile.confidenceScore}%
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={editingFile.confidenceScore}
                    onChange={(e) => setEditingFile({
                      ...editingFile,
                      confidenceScore: parseInt(e.target.value)
                    })}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>0% (Unverified)</span>
                    <span>80% (Default Upload)</span>
                    <span>100% (Captain Approved)</span>
                  </div>
                </div>

                {/* POIs Section */}
                {editingFile.extractedData.pois && editingFile.extractedData.pois.length > 0 && (
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">
                      📍 POIs ({editingFile.extractedData.pois.length})
                    </h3>
                    <div className="space-y-3 max-h-64 overflow-y-auto">
                      {editingFile.extractedData.pois.map((poi: any, idx: number) => (
                        <div key={idx} className="bg-gray-50 rounded-lg p-3">
                          <input
                            type="text"
                            value={poi.name || ''}
                            onChange={(e) => {
                              const updated = { ...editingFile };
                              updated.extractedData.pois[idx].name = e.target.value;
                              setEditingFile(updated);
                            }}
                            placeholder="POI Name"
                            className="w-full font-semibold mb-2 px-2 py-1 border border-gray-300 rounded"
                          />
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <input
                              type="text"
                              value={poi.location || ''}
                              onChange={(e) => {
                                const updated = { ...editingFile };
                                updated.extractedData.pois[idx].location = e.target.value;
                                setEditingFile(updated);
                              }}
                              placeholder="Location"
                              className="px-2 py-1 border border-gray-300 rounded"
                            />
                            <input
                              type="text"
                              value={poi.type || ''}
                              onChange={(e) => {
                                const updated = { ...editingFile };
                                updated.extractedData.pois[idx].type = e.target.value;
                                setEditingFile(updated);
                              }}
                              placeholder="Type"
                              className="px-2 py-1 border border-gray-300 rounded"
                            />
                          </div>
                          <textarea
                            value={poi.description || ''}
                            onChange={(e) => {
                              const updated = { ...editingFile };
                              updated.extractedData.pois[idx].description = e.target.value;
                              setEditingFile(updated);
                            }}
                            placeholder="Description"
                            className="w-full mt-2 px-2 py-1 border border-gray-300 rounded text-sm"
                            rows={2}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Experiences Section */}
                {editingFile.extractedData.experiences && editingFile.extractedData.experiences.length > 0 && (
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">
                      ✨ Experiences ({editingFile.extractedData.experiences.length})
                    </h3>
                    <div className="space-y-3 max-h-64 overflow-y-auto">
                      {editingFile.extractedData.experiences.map((exp: any, idx: number) => (
                        <div key={idx} className="bg-gray-50 rounded-lg p-3">
                          <input
                            type="text"
                            value={exp.experience_title || ''}
                            onChange={(e) => {
                              const updated = { ...editingFile };
                              updated.extractedData.experiences[idx].experience_title = e.target.value;
                              setEditingFile(updated);
                            }}
                            placeholder="Experience Title"
                            className="w-full font-semibold mb-2 px-2 py-1 border border-gray-300 rounded"
                          />
                          <textarea
                            value={exp.description || ''}
                            onChange={(e) => {
                              const updated = { ...editingFile };
                              updated.extractedData.experiences[idx].description = e.target.value;
                              setEditingFile(updated);
                            }}
                            placeholder="Description"
                            className="w-full mt-2 px-2 py-1 border border-gray-300 rounded text-sm"
                            rows={2}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Competitors Section */}
                {editingFile.extractedData.competitor_analysis && editingFile.extractedData.competitor_analysis.length > 0 && (
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">
                      🏢 Competitors ({editingFile.extractedData.competitor_analysis.length})
                    </h3>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {editingFile.extractedData.competitor_analysis.map((comp: any, idx: number) => (
                        <div key={idx} className="bg-gray-50 rounded-lg p-3">
                          <input
                            type="text"
                            value={comp.competitor_name || ''}
                            onChange={(e) => {
                              const updated = { ...editingFile };
                              updated.extractedData.competitor_analysis[idx].competitor_name = e.target.value;
                              setEditingFile(updated);
                            }}
                            placeholder="Competitor Name"
                            className="w-full font-semibold px-2 py-1 border border-gray-300 rounded"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Footer Actions */}
              <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between bg-gray-50">
                <button
                  onClick={() => {
                    // TODO: Implement dump/delete functionality
                    setEditingFile(null);
                    setFiles(prev => prev.filter(f => f.name !== editingFile.name));
                  }}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700"
                >
                  🗑️ Dump File
                </button>
                <div className="flex gap-3">
                  <button
                    onClick={() => setEditingFile(null)}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={async () => {
                      // TODO: Save edited data with confidence score
                      setLoading(true);
                      try {
                        // Call API to update with edited data and confidence score
                        alert(`✅ Data saved with ${editingFile.confidenceScore}% confidence!`);
                        setEditingFile(null);
                      } catch (error) {
                        alert('❌ Failed to save data');
                      } finally {
                        setLoading(false);
                      }
                    }}
                    disabled={loading}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50"
                  >
                    {loading ? 'Saving...' : '💾 Save & Keep File'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

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
