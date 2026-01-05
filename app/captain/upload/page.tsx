'use client';

/**
 * Captain Portal: Upload & Manual Entry
 * Merges: File Upload, URL Scraping, Manual POI Entry, Yacht Destinations Upload
 */

import { useState, useEffect, Suspense, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client-browser';
import AdminNav from '@/components/admin/admin-nav';
import { uploadAPI, scrapingAPI } from '@/lib/api/captain-portal';
import PortalShell from '@/components/portal/portal-shell';

type UploadMode = 'file' | 'url' | 'manual' | 'yacht';

interface UploadedFile {
  name: string;
  size: number;
  type: string;
  status: 'pending' | 'processing' | 'done' | 'error';
  confidenceScore: number;
  uploadId?: string;
  extractedData?: any; // Full intelligence data for editing
  countsReal?: Record<string, number>;
  countsEstimated?: Record<string, number>;
  extractionContract?: any;
  keepDecision?: 'keep' | 'dump';
}

interface YachtDestination {
  id: string;
  name: string;
  type: 'city' | 'country' | 'route';
  ports?: string[];
  isEditing: boolean;
}

function CaptainUploadPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  // Upload confidence policy: extracted items default to 80% and are capped at 80%
  // until a separate "Captain approval" / promotion flow exists.
  const clampUploadConfidence = (c: unknown): number => {
    const n = typeof c === 'number' ? c : NaN;
    if (!Number.isFinite(n)) return 0.8;
    return Math.min(Math.max(n, 0), 0.8);
  };

  const normalizeExtractedData = (data: any): any => {
    if (!data || typeof data !== 'object') return data;
    const next = structuredClone(data);

    if (Array.isArray(next.pois)) {
      next.pois = next.pois.map((p: any) => ({ ...p, confidence: clampUploadConfidence(p?.confidence) }));
    }
    if (Array.isArray(next.experiences)) {
      next.experiences = next.experiences.map((e: any) => ({ ...e, confidence: clampUploadConfidence(e?.confidence) }));
    }
    if (Array.isArray(next.service_providers)) {
      next.service_providers = next.service_providers.map((sp: any) => ({ ...sp, confidence: clampUploadConfidence(sp?.confidence) }));
    }
    return next;
  };
  
  const [mode, setMode] = useState<UploadMode>('file');
  const [loading, setLoading] = useState(false);

  // Scraping progress UI
  const [scrapeJobs, setScrapeJobs] = useState<Array<{ url: string; status: 'queued' | 'scraping' | 'done' | 'already' | 'error'; message?: string }>>([]);
  const [scrapeProgressPct, setScrapeProgressPct] = useState(0);
  const [forceRescrape, setForceRescrape] = useState(false);
  
  // File Upload State
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [editingFile, setEditingFile] = useState<UploadedFile | null>(null); // File being edited
  const [selectedPois, setSelectedPois] = useState<Set<number>>(new Set());
  const [selectedExperiences, setSelectedExperiences] = useState<Set<number>>(new Set());
  const [selectedProviders, setSelectedProviders] = useState<Set<number>>(new Set());
  const isProcessing = loading || files.some(f => f.status === 'processing');
  
  // URL Scraping State
  const [url, setUrl] = useState('');
  const [urls, setUrls] = useState<string[]>([]);
  
  // Manual Entry State
  const [isAdmin, setIsAdmin] = useState(false);
  const [manualQuery, setManualQuery] = useState('');
  const [manualSearchResults, setManualSearchResults] = useState<any[]>([]);
  const [manualDuplicate, setManualDuplicate] = useState<any | null>(null);
  const [manualRecent, setManualRecent] = useState<any[]>([]);

  const [manualPoiUid, setManualPoiUid] = useState<string | null>(null);
  const [poiName, setPoiName] = useState('');
  const [poiType, setPoiType] = useState('restaurant');
  const [poiLocationLabel, setPoiLocationLabel] = useState('');
  const [poiLocationScope, setPoiLocationScope] = useState<'city' | 'country' | 'region' | 'area'>('city');
  const [poiWebsiteUrl, setPoiWebsiteUrl] = useState('');
  const [poiAddress, setPoiAddress] = useState('');
  const [poiDescription, setPoiDescription] = useState('');
  const [poiLat, setPoiLat] = useState('');
  const [poiLon, setPoiLon] = useState('');
  const [poiCoordinateMode, setPoiCoordinateMode] = useState<'land' | 'sea'>('land');
  const [manualConfidencePct, setManualConfidencePct] = useState(80);
  const [manualExtraText, setManualExtraText] = useState('');
  const [manualAttachments, setManualAttachments] = useState<Array<{ name: string; url: string; kind: 'photo' | 'doc' }>>([]);
  const manualFileInputRef = useRef<HTMLInputElement | null>(null);
  
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
        return;
      }
      try {
        const { data: profile } = await supabase
          .from('captain_profiles')
          .select('role')
          .eq('user_id', user.id)
          .single();
        setIsAdmin(profile?.role === 'admin');
      } catch {
        setIsAdmin(false);
      }
    }
    checkAuth();
  }, [router, supabase.auth]);

  // Persist selected mode so refresh stays on the same tab
  const setModePersist = (next: UploadMode) => {
    setMode(next);
    try {
      localStorage.setItem('captain_upload_mode', next);
    } catch {}
    try {
      const params = new URLSearchParams(searchParams.toString());
      params.set('tab', next);
      router.replace(`/captain/upload?${params.toString()}`);
    } catch {}
  };

  useEffect(() => {
    const tab = searchParams.get('tab') as UploadMode | null;
    if (tab && ['file', 'url', 'manual', 'yacht'].includes(tab)) {
      setMode(tab);
      return;
    }
    try {
      const saved = localStorage.getItem('captain_upload_mode') as UploadMode | null;
      if (saved && ['file', 'url', 'manual', 'yacht'].includes(saved)) setMode(saved);
    } catch {}
  }, [searchParams]);

  // Open an upload from history: /captain/upload?open=<upload_id>
  useEffect(() => {
    const openId = searchParams.get('open');
    if (!openId) return;

    (async () => {
      try {
        const res = await uploadAPI.getUpload(openId);
        const row = (res as any).upload;
        const meta = row?.metadata || {};
        const extracted = meta?.extracted_data;
        const contract = meta?.extraction_contract;

        if (!extracted || !contract) {
          alert('This upload has no cached extraction data yet.');
          return;
        }

        const openedFile: UploadedFile = {
          name: row.filename,
          size: row.file_size || 0,
          type: row.file_type || 'unknown',
          status: row.processing_status === 'completed' ? 'done' : 'error',
          confidenceScore: row.confidence_score || 80,
          uploadId: row.id,
          extractedData: normalizeExtractedData(extracted),
          countsReal: contract?.final_package?.counts?.real_extracted || row.counts_real || {},
          countsEstimated: contract?.final_package?.counts?.estimated_potential || row.counts_estimated || {},
          extractionContract: contract,
          keepDecision: row.keep_file ? 'keep' : 'dump',
        };

        setEditingFile(openedFile);
      } catch (e: any) {
        console.error('Failed to open upload:', e);
        alert(`Failed to open upload: ${e.message}`);
      }
    })();
  }, [searchParams]);

  // Open a scrape from history: /captain/upload?openScrape=<scrape_id>
  useEffect(() => {
    const openScrapeId = searchParams.get('openScrape');
    if (!openScrapeId) return;

    (async () => {
      try {
        const res = await scrapingAPI.getScrape(openScrapeId);
        const row = (res as any).scrape;
        const meta = row?.metadata || {};
        const extracted = meta?.extracted_data;
        const contract = meta?.extraction_contract;

        if (!extracted || !contract) {
          alert('This scraped URL has no cached extraction yet.');
          return;
        }

        const openedFile: UploadedFile = {
          name: row.url,
          size: row.content_length || 0,
          type: 'url',
          status: row.scraping_status === 'success' ? 'done' : 'error',
          confidenceScore: 80,
          uploadId: row.id,
          extractedData: normalizeExtractedData(extracted),
          countsReal: meta?.counts_real || {},
          countsEstimated: meta?.counts_estimated || {},
          extractionContract: contract,
          keepDecision: 'keep',
        };

        setModePersist('url');
        setEditingFile(openedFile);
      } catch (e: any) {
        console.error('Failed to open scrape:', e);
        alert(`Failed to open scrape: ${e.message}`);
      }
    })();
  }, [searchParams]);

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
          confidenceScore: 0,
          keepDecision: 'keep',
        };
        setFiles((prev) => [...prev, newFile]);

        try {
          // Upload to backend (THIS IS THE REAL API CALL)
          const result = await uploadAPI.uploadFile(file);
          const extractedDataNormalized = normalizeExtractedData(result.extracted_data);

          // Update status to done WITH extracted data
          setFiles((prev) =>
            prev.map((f) =>
              f.name === file.name
                ? {
                    ...f,
                    status: 'done',
                    confidenceScore: result.confidence_score || 80,
                    uploadId: result.upload_id,
                    extractedData: extractedDataNormalized, // Store for editing
                    countsReal: result.counts_real,
                    countsEstimated: result.counts_estimated,
                    extractionContract: result.extraction_contract,
                    keepDecision: 'keep',
                  }
                : f
            )
          );

          // Show success message and open editor if data extracted
          const hasData =
            result.pois_extracted > 0 || result.intelligence_extracted.experiences > 0;
          if (hasData) {
            // Auto-open editor for extracted data
            const updatedFile = {
              name: file.name,
              size: file.size,
              type: file.type,
              status: 'done' as const,
              confidenceScore: result.confidence_score || 80,
              uploadId: result.upload_id,
              extractedData: extractedDataNormalized,
              countsReal: result.counts_real,
              countsEstimated: result.counts_estimated,
              extractionContract: result.extraction_contract,
              keepDecision: 'keep' as const,
            };
            setEditingFile(updatedFile);
          } else {
            alert(
              `✅ ${file.name} uploaded!\n` +
                `POIs found: ${result.pois_extracted}\n` +
                `Experiences: ${result.intelligence_extracted.experiences}\n` +
                `Trends: ${result.intelligence_extracted.trends}\n\n` +
                `No data extracted. Please review the document or try manual entry.`
            );
          }
        } catch (error: any) {
          console.error('Upload failed:', error);
          alert(`❌ Upload failed: ${error.message}`);
          setFiles((prev) =>
            prev.map((f) => (f.name === file.name ? { ...f, status: 'error' } : f))
          );
        }
      }
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
    setScrapeJobs(urls.map((u) => ({ url: u, status: 'queued' as const })));
    setScrapeProgressPct(0);
    try {
      const total = urls.length;
      for (let i = 0; i < urls.length; i++) {
        const targetUrl = urls[i];
        setScrapeJobs((prev) => prev.map((j) => (j.url === targetUrl ? { ...j, status: 'scraping' } : j)));
        const result: any = await scrapingAPI.scrapeURL(targetUrl, true, forceRescrape);

        // If backend couldn't extract readable content, show an error instead of opening an empty editor.
        if (result?.success === false || !result?.extracted_data) {
          const msg = String(result?.message || result?.error || 'No readable content extracted from URL.');
          setScrapeJobs((prev) => prev.map((j) => (j.url === targetUrl ? { ...j, status: 'error', message: msg } : j)));
          setScrapeProgressPct(Math.round(((i + 1) / total) * 100));
          continue;
        }

        if (result?.already_scraped) {
          setScrapeJobs((prev) =>
            prev.map((j) =>
              j.url === targetUrl
                ? { ...j, status: 'already', message: `Already scraped (${result.previous_scraped_at || 'earlier'})` }
                : j
            )
          );
        } else {
          setScrapeJobs((prev) => prev.map((j) => (j.url === targetUrl ? { ...j, status: 'done' } : j)));
        }

        const extractedDataNormalized = normalizeExtractedData(result.extracted_data);

        const newFile: UploadedFile = {
          name: targetUrl,
          size: result.content_length || 0,
          type: 'url',
          status: 'done',
          confidenceScore: 80,
          uploadId: result.scrape_id || result.upload_id,
          extractedData: extractedDataNormalized,
          countsReal: result.counts_real,
          countsEstimated: result.counts_estimated,
          extractionContract: result.extraction_contract,
          keepDecision: 'keep',
        };

        setFiles(prev => [...prev, newFile]);
        setEditingFile(newFile);
        setScrapeProgressPct(Math.round(((i + 1) / total) * 100));
      }

      setUrls([]);
    } catch (error: any) {
      alert(`❌ Scraping failed: ${error.message || 'Unknown error'}`);
      setScrapeJobs((prev) => prev.map((j) => (j.status === 'scraping' || j.status === 'queued' ? { ...j, status: 'error', message: error.message } : j)));
    } finally {
      setLoading(false);
      setScrapeProgressPct((p) => (p < 100 ? 100 : p));
    }
  };

  // MANUAL ENTRY HANDLERS
  const fetchManualRecent = async () => {
    if (!isAdmin) return;
    try {
      const res = await fetch('/api/knowledge/poi/manual?limit=50');
      const data = await res.json();
      if (data?.success) setManualRecent(data.pois || []);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    if (mode === 'manual') fetchManualRecent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, isAdmin]);

  const searchPois = async (q: string) => {
    const query = (q || '').trim();
    if (query.length < 2) {
      setManualSearchResults([]);
      return;
    }
    const res = await fetch(`/api/knowledge/search-poi?q=${encodeURIComponent(query)}&limit=10`);
    const data = await res.json();
    setManualSearchResults(data?.results || []);
  };

  // Auto duplicate detection (simple): if the top result name matches exactly (case-insensitive), flag it.
  useEffect(() => {
    const name = poiName.trim();
    if (name.length < 2) {
      setManualDuplicate(null);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/knowledge/search-poi?q=${encodeURIComponent(name)}&limit=5`);
        const data = await res.json();
        const top = (data?.results || [])[0];
        if (top && String(top.name || '').toLowerCase() === name.toLowerCase()) {
          setManualDuplicate(top);
        } else {
          setManualDuplicate(null);
        }
      } catch {
        setManualDuplicate(null);
      }
    }, 500);
    return () => clearTimeout(t);
  }, [poiName]);

  const loadPoiForEdit = async (poi_uid: string) => {
    const res = await fetch(`/api/knowledge/poi/${encodeURIComponent(poi_uid)}`);
    const data = await res.json();
    const poi = data?.poi;
    if (!poi) {
      alert('Failed to load POI details.');
      return;
    }
    setManualPoiUid(poi.poi_uid);
    setPoiName(poi.name || '');
    setPoiType(poi.type || 'restaurant');
    setPoiLocationLabel(poi.destination_name || '');
    setPoiLocationScope((poi.location_scope || 'city') as any);
    setPoiWebsiteUrl(poi.website_url || '');
    setPoiAddress(poi.address || '');
    setPoiDescription(poi.description || '');
    setPoiLat(String(poi.lat ?? ''));
    setPoiLon(String(poi.lon ?? ''));
    setPoiCoordinateMode((poi.coordinate_mode || 'land') as any);
    setManualConfidencePct(Math.round(((poi.confidence_score ?? 0.8) as number) * 100));
    setManualExtraText(poi.extra_text || '');
    const photos = (poi.photo_urls || []).map((u: string) => ({ name: 'photo', url: u, kind: 'photo' as const }));
    const docs = (poi.attachment_urls || []).map((u: string) => ({ name: 'attachment', url: u, kind: 'doc' as const }));
    setManualAttachments([...(photos || []), ...(docs || [])]);
    setModePersist('manual');
  };

  const resetManualForm = () => {
    setManualPoiUid(null);
    setPoiName('');
    setPoiType('restaurant');
    setPoiLocationLabel('');
    setPoiLocationScope('city');
    setPoiWebsiteUrl('');
    setPoiAddress('');
    setPoiDescription('');
    setPoiLat('');
    setPoiLon('');
    setPoiCoordinateMode('land');
    setManualConfidencePct(80);
    setManualExtraText('');
    setManualAttachments([]);
    setManualDuplicate(null);
  };

  const uploadManualFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setLoading(true);
    try {
      for (const file of Array.from(fileList)) {
        const formData = new FormData();
        formData.append('file', file);
        const res = await fetch('/api/knowledge/upload-attachment', { method: 'POST', body: formData });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.details || data?.error || 'Upload failed');
        const kind = (file.type || '').startsWith('image/') ? 'photo' : 'doc';
        setManualAttachments((prev) => [...prev, { name: file.name, url: data.url, kind }]);
      }
    } catch (e: any) {
      alert(`❌ Upload failed: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleManualSubmit = async () => {
    if (!isAdmin) {
      alert('Admins only: Manual POI entry is restricted.');
      return;
    }
    if (!poiName.trim() || !poiDescription.trim()) {
      alert('Please fill in POI name and description');
      return;
    }
    if (!poiLocationLabel.trim()) {
      alert('Please set a location (city/country/region/area name).');
      return;
    }
    const lat = Number(poiLat);
    const lon = Number(poiLon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      alert('Please enter valid coordinates (lat/lon).');
      return;
    }

    // If duplicate detected, offer to open it instead.
    if (!manualPoiUid && manualDuplicate) {
      const open = confirm(`A POI named "${manualDuplicate.name}" already exists. Open it instead of creating a duplicate?`);
      if (open) {
        await loadPoiForEdit(manualDuplicate.poi_uid);
        return;
      }
    }

    const payload: any = {
      name: poiName.trim(),
      type: poiType,
      destination_name: poiLocationLabel.trim(),
      lat,
      lon,
      website_url: poiWebsiteUrl.trim() || undefined,
      address: poiAddress.trim() || undefined,
      location_scope: poiLocationScope,
      coordinate_mode: poiCoordinateMode,
      description: poiDescription.trim(),
      confidence_score: Math.max(0, Math.min(1, manualConfidencePct / 100)),
      extra_text: manualExtraText.trim() || undefined,
      photo_urls: manualAttachments.filter(a => a.kind === 'photo').map(a => a.url),
      attachment_urls: manualAttachments.filter(a => a.kind === 'doc').map(a => a.url),
    };

    setLoading(true);
    try {
      if (manualPoiUid) {
        const res = await fetch(`/api/knowledge/poi/${encodeURIComponent(manualPoiUid)}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.details || data?.error || 'Failed to update POI');
        alert('✅ POI updated.');
      } else {
        const res = await fetch('/api/knowledge/poi/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.details || data?.error || 'Failed to create POI');
        alert('✅ POI created.');
      }
      await fetchManualRecent();
      resetManualForm();
    } catch (e: any) {
      alert(`❌ Failed: ${e.message}`);
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

  // Normalize providers: if service_providers is empty but competitor_analysis exists, seed providers
  useEffect(() => {
    if (!editingFile) return;
    const hasProviders = Array.isArray(editingFile.extractedData?.service_providers) && editingFile.extractedData.service_providers.length > 0;
    const hasCompetitors = Array.isArray(editingFile.extractedData?.competitor_analysis) && editingFile.extractedData.competitor_analysis.length > 0;
    if (!hasProviders && hasCompetitors) {
      const updated = { ...editingFile, extractedData: { ...editingFile.extractedData, service_providers: [...editingFile.extractedData.competitor_analysis] } };
      setEditingFile(updated);
    }
  }, [editingFile]);

  // Helpers for bulk selection
  const toggleSelection = (setFn: React.Dispatch<React.SetStateAction<Set<number>>>, current: Set<number>, idx: number) => {
    const next = new Set(current);
    if (next.has(idx)) {
      next.delete(idx);
    } else {
      next.add(idx);
    }
    setFn(next);
  };

  const clearSelections = () => {
    setSelectedPois(new Set());
    setSelectedExperiences(new Set());
    setSelectedProviders(new Set());
  };

  return (
    <PortalShell
      icon="📤"
      title="Upload & Manual Entry"
      subtitle="Upload documents, scrape URLs, enter POIs manually, or upload yacht destinations"
      backLink={{ href: '/captain', label: 'Back to Captain Portal' }}
      topRight={<AdminNav />}
      mission={[
        { label: 'UPLOAD FORMATS', text: 'PDF, Word, Excel, .txt, Images (.png, .jpg, .jpeg), or paste text.' },
        { label: 'CONFIDENCE SCORE', text: 'Uploads default to 80% (max). Verification is required for higher scores.' },
        { label: 'WORKFLOW', text: 'Upload → review/edit → keep/dump → (later) promote to official knowledge.' },
      ]}
      quickTips={[
        'If an upload extracts 0 items, your file likely has no readable text (scan/image). Try a text-based PDF.',
        'For URLs, use “Force” if you need to refresh cached results.',
        'Saving edits also marks the item as KEEP (so you can find it again later).',
      ]}
    >

        {/* Mode Selector */}
        <div className="flex flex-wrap gap-3 mb-8">
          <button
            onClick={() => setModePersist('file')}
            className={`px-6 py-3 rounded-xl font-semibold transition-all ${
              mode === 'file'
                ? 'bg-blue-600 text-white shadow-lg'
                : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            📁 Upload Files
          </button>
          <button
            onClick={() => setModePersist('url')}
            className={`px-6 py-3 rounded-xl font-semibold transition-all ${
              mode === 'url'
                ? 'bg-blue-600 text-white shadow-lg'
                : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            🌐 Scrape URLs
          </button>
          <button
            onClick={() => setModePersist('manual')}
            className={`px-6 py-3 rounded-xl font-semibold transition-all ${
              mode === 'manual'
                ? 'bg-blue-600 text-white shadow-lg'
                : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            ✏️ Manual Entry
          </button>
          <button
            onClick={() => setModePersist('yacht')}
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

            {isProcessing && (
              <div className="mt-4 w-full">
                <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                  <div className="h-2 w-1/2 bg-blue-500 animate-pulse" />
                </div>
                <p className="text-sm text-gray-600 mt-2">Processing… extracting data from your file.</p>
              </div>
            )}

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
                      {file.extractedData && (
                        <p className="text-xs text-gray-500 mt-1">
                          Summary: POIs {file.extractedData.pois?.length ?? 0} • Experiences {file.extractedData.experiences?.length ?? 0} • Providers {file.extractedData.service_providers?.length ?? 0}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {file.keepDecision && (
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                          file.keepDecision === 'keep' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {file.keepDecision === 'keep' ? 'Keep' : 'Dump'}
                        </span>
                      )}
                      <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                        {file.status}
                      </span>
                    </div>
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

                <label className="mt-3 flex items-center gap-2 text-sm text-gray-700 select-none">
                  <input
                    type="checkbox"
                    checked={forceRescrape}
                    onChange={(e) => setForceRescrape(e.target.checked)}
                    className="h-4 w-4"
                  />
                  Force refresh (re-scrape even if already scraped)
                </label>
              </div>
            )}

            {/* Progress + per-URL status */}
            {loading && (
              <div className="mt-4 w-full">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-gray-700 font-semibold">Scraping in progress…</p>
                  <p className="text-sm text-gray-600">{scrapeProgressPct}%</p>
                </div>
                <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-2 bg-blue-500 transition-all"
                    style={{ width: `${Math.max(5, scrapeProgressPct)}%` }}
                  />
                </div>
              </div>
            )}

            {scrapeJobs.length > 0 && (
              <div className="mt-6 border border-gray-200 rounded-lg p-4 bg-gray-50">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Scrape Status</h3>
                <div className="space-y-2">
                  {scrapeJobs.map((job) => (
                    <div key={job.url} className="flex items-center justify-between gap-3 bg-white border border-gray-200 rounded-lg px-3 py-2">
                      <span className="text-sm text-gray-700 truncate flex-1">{job.url}</span>
                      <span className={`text-xs px-2 py-1 rounded-full font-semibold ${
                        job.status === 'queued' ? 'bg-gray-200 text-gray-700' :
                        job.status === 'scraping' ? 'bg-blue-100 text-blue-700' :
                        job.status === 'done' ? 'bg-green-100 text-green-700' :
                        job.status === 'already' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {job.status}
                      </span>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-600 mt-3">
                  Tip: If nothing happens, open DevTools → Network and look for the request to <code>/api/captain/scrape/url</code>.
                </p>
                {scrapeJobs.some(j => j.status === 'already') && !forceRescrape && (
                  <p className="text-xs text-yellow-800 mt-2">
                    Some URLs were already scraped, so LEXA reused cached results. Enable <strong>Force refresh</strong> to pull new pages (recommended after scraper upgrades).
                  </p>
                )}
              </div>
            )}

            {/* Show last scraped results inside this tab */}
            {files.filter(f => f.type === 'url').length > 0 && (
              <div className="mt-6">
                <h3 className="text-lg font-bold text-gray-900 mb-3">Recent Scrape Results</h3>
                <div className="space-y-2">
                  {files.filter(f => f.type === 'url').slice().reverse().slice(0, 5).map((f, idx) => (
                    <button
                      key={`${f.name}-${idx}`}
                      onClick={() => setEditingFile(f)}
                      className="w-full text-left bg-white border border-gray-200 rounded-lg p-4 hover:bg-gray-50"
                    >
                      <div className="flex items-center justify-between">
                        <div className="min-w-0">
                          <p className="font-semibold text-gray-900 truncate">{f.name}</p>
                          <p className="text-xs text-gray-600 mt-1">
                            POIs {f.extractedData?.pois?.length ?? 0} • Experiences {f.extractedData?.experiences?.length ?? 0} • Providers {f.extractedData?.service_providers?.length ?? 0}
                          </p>
                        </div>
                        <span className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-700 font-semibold">Open</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* MANUAL ENTRY MODE */}
        {mode === 'manual' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">✏️ Manual POI Entry</h2>
            <p className="text-gray-600 mb-6">
              Search for existing POIs, edit them, or create a new POI with full details.
            </p>

            {!isAdmin ? (
              <div className="p-4 rounded-lg bg-yellow-50 border border-yellow-200 text-yellow-900">
                Manual POI entry is currently <strong>Admins only</strong>.
              </div>
            ) : (
              <div className="space-y-8">
                {/* Search existing POIs */}
                <div className="border border-gray-200 rounded-xl p-6 bg-gray-50">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">🔎 Search POIs to Edit</h3>
                  <div className="flex gap-3">
                    <input
                      type="text"
                      value={manualQuery}
                      onChange={(e) => setManualQuery(e.target.value)}
                      placeholder="Search by name, destination, or type…"
                      className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <button
                      onClick={() => searchPois(manualQuery)}
                      className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700"
                    >
                      Search
                    </button>
                  </div>
                  {manualSearchResults.length > 0 && (
                    <div className="mt-4 space-y-2">
                      {manualSearchResults.map((r) => (
                        <div key={r.poi_uid} className="flex items-center justify-between bg-white border border-gray-200 rounded-lg p-3">
                          <div className="min-w-0">
                            <div className="font-semibold text-gray-900 truncate">{r.name}</div>
                            <div className="text-xs text-gray-600">
                              {r.type || 'poi'} • {r.destination_name || '—'} • Confidence {(typeof r.confidence_score === 'number' ? Math.round(r.confidence_score * 100) : 0)}%
                            </div>
                          </div>
                          <button
                            onClick={() => loadPoiForEdit(r.poi_uid)}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700"
                          >
                            Open to Edit
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Create / Edit Form */}
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {manualPoiUid ? '✏️ Edit POI' : '➕ Create New POI'}
                    </h3>
                    {manualPoiUid && (
                      <button
                        onClick={resetManualForm}
                        className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300"
                      >
                        New POI
                      </button>
                    )}
                  </div>

                  {manualDuplicate && !manualPoiUid && (
                    <div className="p-4 rounded-lg bg-yellow-50 border border-yellow-200 text-yellow-900 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-semibold">This POI may already exist</div>
                        <div className="text-sm truncate">
                          {manualDuplicate.name} • {manualDuplicate.destination_name || '—'}
                        </div>
                      </div>
                      <button
                        onClick={() => loadPoiForEdit(manualDuplicate.poi_uid)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700"
                      >
                        Open Existing
                      </button>
                    </div>
                  )}

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

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
                      <select
                        value={poiType}
                        onChange={(e) => setPoiType(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="restaurant">Restaurant</option>
                        <option value="hotel">Hotel</option>
                        <option value="spa">Spa</option>
                        <option value="attraction">Attraction</option>
                        <option value="activity">Activity</option>
                        <option value="experience">Experience</option>
                        <option value="provider">Service Provider</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Website URL</label>
                      <input
                        type="url"
                        value={poiWebsiteUrl}
                        onChange={(e) => setPoiWebsiteUrl(e.target.value)}
                        placeholder="https://…"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Location (name)</label>
                      <input
                        type="text"
                        value={poiLocationLabel}
                        onChange={(e) => setPoiLocationLabel(e.target.value)}
                        placeholder="Monaco / Paris / Amalfi Coast"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Location type</label>
                      <select
                        value={poiLocationScope}
                        onChange={(e) => setPoiLocationScope(e.target.value as any)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="city">City</option>
                        <option value="country">Country</option>
                        <option value="region">Region</option>
                        <option value="area">Area</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Address (optional)</label>
                    <input
                      type="text"
                      value={poiAddress}
                      onChange={(e) => setPoiAddress(e.target.value)}
                      placeholder="Street, postcode, etc."
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Lat</label>
                      <input
                        type="number"
                        value={poiLat}
                        onChange={(e) => setPoiLat(e.target.value)}
                        placeholder="43.7384"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Lon</label>
                      <input
                        type="number"
                        value={poiLon}
                        onChange={(e) => setPoiLon(e.target.value)}
                        placeholder="7.4246"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Coordinates</label>
                      <select
                        value={poiCoordinateMode}
                        onChange={(e) => setPoiCoordinateMode(e.target.value as any)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="land">On land (venue)</option>
                        <option value="sea">At sea (anchorage)</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                    <textarea
                      value={poiDescription}
                      onChange={(e) => setPoiDescription(e.target.value)}
                      placeholder="Describe the POI, its unique features, and why it's special…"
                      rows={6}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    />
                  </div>

                  {/* Attachments */}
                  <div className="border border-gray-200 rounded-xl p-6 bg-gray-50 space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-gray-900">📎 POI Attachments</div>
                        <div className="text-xs text-gray-600">Upload photos/docs or paste additional notes.</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          ref={manualFileInputRef}
                          type="file"
                          multiple
                          className="hidden"
                          onChange={(e) => uploadManualFiles(e.target.files)}
                          disabled={loading}
                        />
                        <button
                          type="button"
                          onClick={() => manualFileInputRef.current?.click()}
                          disabled={loading}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50"
                        >
                          Upload files
                        </button>
                      </div>
                    </div>
                    {manualAttachments.length > 0 && (
                      <div className="space-y-2">
                        {manualAttachments.map((a, idx) => (
                          <div key={`${a.url}-${idx}`} className="flex items-center justify-between bg-white border border-gray-200 rounded-lg p-3">
                            <div className="min-w-0">
                              <div className="text-sm font-medium text-gray-900 truncate">{a.name}</div>
                              <div className="text-xs text-gray-600 truncate">{a.url}</div>
                            </div>
                            <button
                              onClick={() => setManualAttachments((prev) => prev.filter((_, i) => i !== idx))}
                              className="px-3 py-1 bg-red-100 text-red-700 rounded text-sm font-semibold hover:bg-red-200"
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Additional text (paste)</label>
                      <textarea
                        value={manualExtraText}
                        onChange={(e) => setManualExtraText(e.target.value)}
                        placeholder="Paste extra notes, brochure text, or anything that helps future enrichment…"
                        rows={4}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Confidence Score: {manualConfidencePct}%
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={manualConfidencePct}
                      onChange={(e) => setManualConfidencePct(parseInt(e.target.value))}
                      className="w-full"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Manual entry can go up to 100%. Uploads stay capped at 80%.
                    </p>
                  </div>

                  <button
                    onClick={handleManualSubmit}
                    disabled={loading}
                    className="w-full px-6 py-4 bg-green-600 text-white rounded-lg font-semibold text-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                  >
                    {loading ? '⏳ Saving...' : manualPoiUid ? '💾 Save POI' : '✅ Create POI'}
                  </button>
                </div>

                {/* Recent manual POIs */}
                <div className="border border-gray-200 rounded-xl p-6">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-semibold text-gray-900">🧾 Recent Manual POIs (Admins)</h3>
                    <button
                      onClick={fetchManualRecent}
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300"
                    >
                      Refresh
                    </button>
                  </div>
                  {manualRecent.length === 0 ? (
                    <p className="text-sm text-gray-600">No manual POIs yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {manualRecent.map((p) => (
                        <div key={p.poi_uid} className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg p-3">
                          <div className="min-w-0">
                            <div className="font-semibold text-gray-900 truncate">{p.name}</div>
                            <div className="text-xs text-gray-600">
                              {p.type || 'poi'} • {p.destination_name || '—'} • Confidence {(typeof p.confidence_score === 'number' ? Math.round(p.confidence_score * 100) : 0)}%
                            </div>
                          </div>
                          <button
                            onClick={() => loadPoiForEdit(p.poi_uid)}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700"
                          >
                            Open
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
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
                    Review and enhance extracted intelligence. Set confidence and save.
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
                {/* Summary & Keep/Dump */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <h3 className="text-sm font-semibold text-gray-800 mb-2">Quick Summary</h3>
                    {(() => {
                      const countsReal = editingFile.countsReal || {};
                      const countsEst = editingFile.countsEstimated || {};
                      const getCount = (key: string, fallback: number) =>
                        countsReal[key] ?? countsEst[key] ?? fallback;
                      const pois = getCount('pois', editingFile.extractedData.pois?.length || 0);
                      const exps = getCount('experiences', editingFile.extractedData.experiences?.length || 0);
                      const providers = getCount('service_providers', editingFile.extractedData.service_providers?.length || 0);
                      return (
                        <ul className="text-sm text-gray-700 space-y-1">
                          <li>POIs: <span className="font-semibold">{pois}</span></li>
                          <li>Experiences: <span className="font-semibold">{exps}</span></li>
                          <li>Providers: <span className="font-semibold">{providers}</span></li>
                        </ul>
                      );
                    })()}
                  </div>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <h3 className="text-sm font-semibold text-gray-800 mb-2">Keep or Dump?</h3>
                    <div className="flex gap-3">
                      <button
                        onClick={() => {
                          const updated = { ...editingFile, keepDecision: 'keep' as const };
                          setEditingFile(updated);
                          setFiles(prev => prev.map(f => f.name === editingFile.name ? updated : f));
                        }}
                        className={`px-4 py-2 rounded-lg font-semibold ${editingFile.keepDecision === 'keep' ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-700'}`}
                      >
                        ✅ Keep
                      </button>
                      <button
                        onClick={() => {
                          const updated = { ...editingFile, keepDecision: 'dump' as const };
                          setEditingFile(updated);
                          setFiles(prev => prev.map(f => f.name === editingFile.name ? updated : f));
                        }}
                        className={`px-4 py-2 rounded-lg font-semibold ${editingFile.keepDecision === 'dump' ? 'bg-red-600 text-white' : 'bg-gray-200 text-gray-700'}`}
                      >
                        🗑️ Dump
                      </button>
                    </div>
                  </div>
                </div>

                {/* Claude-style Summary + Report */}
                {(() => {
                  const meta = editingFile.extractionContract?.final_package?.metadata || {};
                  const captainSummary = meta?.captain_summary as string | undefined;
                  const reportMarkdown = meta?.report_markdown as string | undefined;

                  if (!captainSummary && !reportMarkdown) return null;

                  return (
                    <div className="border border-gray-200 rounded-lg p-4 bg-white">
                      <h3 className="text-lg font-bold text-gray-900 mb-2">✨ Claude-style Extraction</h3>
                      {captainSummary && (
                        <div className="bg-lexa-gold/10 border border-lexa-gold/30 rounded-lg p-4 mb-4">
                          <pre className="whitespace-pre-wrap text-sm text-gray-800 font-sans">
                            {captainSummary}
                          </pre>
                        </div>
                      )}
                      {reportMarkdown && (
                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-sm font-semibold text-gray-800">Extracted Data Document</p>
                            <button
                              onClick={() => {
                                navigator.clipboard?.writeText(reportMarkdown).then(
                                  () => alert('✅ Copied extraction document to clipboard'),
                                  () => alert('❌ Copy failed')
                                );
                              }}
                              className="text-xs px-3 py-1 rounded bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold"
                            >
                              Copy
                            </button>
                          </div>
                          <pre className="whitespace-pre-wrap text-sm text-gray-800 font-sans">
                            {reportMarkdown}
                          </pre>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* POIs Section */}
                {editingFile.extractedData.pois && editingFile.extractedData.pois.length > 0 && (
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">
                      📍 POIs ({editingFile.extractedData.pois.length})
                    </h3>
                    <div className="flex items-center gap-3 mb-3 text-sm">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={selectedPois.size === editingFile.extractedData.pois.length}
                          onChange={(e) => {
                            const next = new Set<number>();
                            if (e.target.checked) {
                              editingFile.extractedData.pois.forEach((_: any, idx: number) => next.add(idx));
                            }
                            setSelectedPois(next);
                          }}
                        />
                        Select all
                      </label>
                      <button
                        onClick={() => {
                          if (!editingFile) return;
                          if (selectedPois.size === 0) return;
                          const remaining = editingFile.extractedData.pois.filter((_: any, idx: number) => !selectedPois.has(idx));
                          const updated = { ...editingFile, extractedData: { ...editingFile.extractedData, pois: remaining } };
                          setEditingFile(updated);
                          setSelectedPois(new Set());
                        }}
                        className="text-red-600 hover:underline disabled:text-gray-400"
                        disabled={selectedPois.size === 0}
                      >
                        Delete selected ({selectedPois.size})
                      </button>
                    </div>
                    <div className="space-y-3 max-h-64 overflow-y-auto">
                      {editingFile.extractedData.pois.map((poi: any, idx: number) => (
                        <div key={idx} className="bg-gray-50 rounded-lg p-3">
                          <div className="flex items-center justify-between mb-1">
                            <label className="flex items-center gap-2 text-sm text-gray-700">
                              <input
                                type="checkbox"
                                checked={selectedPois.has(idx)}
                                onChange={() => toggleSelection(setSelectedPois, selectedPois, idx)}
                              />
                              Select
                            </label>
                            <button
                              onClick={() => {
                                const remaining = editingFile.extractedData.pois.filter((_: any, i: number) => i !== idx);
                                const updated = { ...editingFile, extractedData: { ...editingFile.extractedData, pois: remaining } };
                                setEditingFile(updated);
                                const next = new Set(selectedPois);
                                next.delete(idx);
                                setSelectedPois(next);
                              }}
                              className="text-red-600 text-xs hover:underline"
                            >
                              🗑 Delete
                            </button>
                          </div>
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
                          <div className="mt-2 flex items-center gap-2 text-sm">
                            <span className="text-gray-600">Confidence</span>
                            <input
                              type="number"
                              min={0}
                              max={100}
                              step={1}
                              value={typeof poi.confidence === 'number' ? Math.round(poi.confidence * 100) : 80}
                              onChange={(e) => {
                                const updated = { ...editingFile };
                                const val = parseFloat(e.target.value);
                                updated.extractedData.pois[idx].confidence = isNaN(val) ? undefined : val / 100;
                                setEditingFile(updated);
                              }}
                              className="w-24 px-2 py-1 border border-gray-300 rounded"
                              placeholder="0-100"
                            />
                          </div>
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
                    <div className="flex items-center gap-3 mb-3 text-sm">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={selectedExperiences.size === editingFile.extractedData.experiences.length}
                          onChange={(e) => {
                            const next = new Set<number>();
                            if (e.target.checked) {
                              editingFile.extractedData.experiences.forEach((_: any, idx: number) => next.add(idx));
                            }
                            setSelectedExperiences(next);
                          }}
                        />
                        Select all
                      </label>
                      <button
                        onClick={() => {
                          if (selectedExperiences.size === 0) return;
                          const remaining = editingFile.extractedData.experiences.filter((_: any, idx: number) => !selectedExperiences.has(idx));
                          const updated = { ...editingFile, extractedData: { ...editingFile.extractedData, experiences: remaining } };
                          setEditingFile(updated);
                          setSelectedExperiences(new Set());
                        }}
                        className="text-red-600 hover:underline disabled:text-gray-400"
                        disabled={selectedExperiences.size === 0}
                      >
                        Delete selected ({selectedExperiences.size})
                      </button>
                    </div>
                    <div className="space-y-3 max-h-64 overflow-y-auto">
                      {editingFile.extractedData.experiences.map((exp: any, idx: number) => (
                        <div key={idx} className="bg-gray-50 rounded-lg p-3">
                          <div className="flex items-center justify-between mb-1">
                            <label className="flex items-center gap-2 text-sm text-gray-700">
                              <input
                                type="checkbox"
                                checked={selectedExperiences.has(idx)}
                                onChange={() => toggleSelection(setSelectedExperiences, selectedExperiences, idx)}
                              />
                              Select
                            </label>
                            <button
                              onClick={() => {
                                const remaining = editingFile.extractedData.experiences.filter((_: any, i: number) => i !== idx);
                                const updated = { ...editingFile, extractedData: { ...editingFile.extractedData, experiences: remaining } };
                                setEditingFile(updated);
                                const next = new Set(selectedExperiences);
                                next.delete(idx);
                                setSelectedExperiences(next);
                              }}
                              className="text-red-600 text-xs hover:underline"
                            >
                              🗑 Delete
                            </button>
                          </div>
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
                          <div className="mt-2 flex items-center gap-2 text-sm">
                            <span className="text-gray-600">Confidence</span>
                            <input
                              type="number"
                              min={0}
                              max={100}
                              step={1}
                              value={typeof exp.confidence === 'number' ? Math.round(exp.confidence * 100) : 80}
                              onChange={(e) => {
                                const updated = { ...editingFile };
                                const val = parseFloat(e.target.value);
                                updated.extractedData.experiences[idx].confidence = isNaN(val) ? undefined : val / 100;
                                setEditingFile(updated);
                              }}
                              className="w-24 px-2 py-1 border border-gray-300 rounded"
                              placeholder="0-100"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Service Providers Section */}
                {editingFile.extractedData.service_providers && editingFile.extractedData.service_providers.length > 0 && (
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">
                      🧑‍⚕️ Service Providers ({editingFile.extractedData.service_providers.length})
                    </h3>
                    <div className="flex items-center gap-3 mb-3 text-sm">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={selectedProviders.size === editingFile.extractedData.service_providers.length}
                          onChange={(e) => {
                            const next = new Set<number>();
                            if (e.target.checked) {
                              editingFile.extractedData.service_providers.forEach((_: any, idx: number) => next.add(idx));
                            }
                            setSelectedProviders(next);
                          }}
                        />
                        Select all
                      </label>
                      <button
                        onClick={() => {
                          if (selectedProviders.size === 0) return;
                          const remaining = editingFile.extractedData.service_providers.filter((_: any, idx: number) => !selectedProviders.has(idx));
                          const updated = { ...editingFile, extractedData: { ...editingFile.extractedData, service_providers: remaining } };
                          setEditingFile(updated);
                          setSelectedProviders(new Set());
                        }}
                        className="text-red-600 hover:underline disabled:text-gray-400"
                        disabled={selectedProviders.size === 0}
                      >
                        Delete selected ({selectedProviders.size})
                      </button>
                    </div>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {editingFile.extractedData.service_providers.map((provider: any, idx: number) => (
                        <div key={idx} className="bg-gray-50 rounded-lg p-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <label className="flex items-center gap-2 text-sm text-gray-700">
                              <input
                                type="checkbox"
                                checked={selectedProviders.has(idx)}
                                onChange={() => toggleSelection(setSelectedProviders, selectedProviders, idx)}
                              />
                              Select
                            </label>
                            <button
                              onClick={() => {
                                const remaining = editingFile.extractedData.service_providers.filter((_: any, i: number) => i !== idx);
                                const updated = { ...editingFile, extractedData: { ...editingFile.extractedData, service_providers: remaining } };
                                setEditingFile(updated);
                                const next = new Set(selectedProviders);
                                next.delete(idx);
                                setSelectedProviders(next);
                              }}
                              className="text-red-600 text-xs hover:underline"
                            >
                              🗑 Delete
                            </button>
                          </div>
                          <input
                            type="text"
                            value={provider.name || ''}
                            onChange={(e) => {
                              const updated = { ...editingFile };
                              updated.extractedData.service_providers[idx].name = e.target.value;
                              setEditingFile(updated);
                            }}
                            placeholder="Provider Name"
                            className="w-full font-semibold px-2 py-1 border border-gray-300 rounded"
                          />
                          <input
                            type="text"
                            value={provider.service_type || ''}
                            onChange={(e) => {
                              const updated = { ...editingFile };
                              updated.extractedData.service_providers[idx].service_type = e.target.value;
                              setEditingFile(updated);
                            }}
                            placeholder="Service Type"
                            className="w-full text-sm px-2 py-1 border border-gray-300 rounded"
                          />
                          <textarea
                            value={provider.description || ''}
                            onChange={(e) => {
                              const updated = { ...editingFile };
                              updated.extractedData.service_providers[idx].description = e.target.value;
                              setEditingFile(updated);
                            }}
                            placeholder="Description"
                            className="w-full text-sm px-2 py-1 border border-gray-300 rounded"
                            rows={2}
                          />
                          <div className="flex items-center gap-2 text-sm">
                            <span className="text-gray-600">Confidence</span>
                            <input
                              type="number"
                              min={0}
                              max={100}
                              step={1}
                              value={typeof provider.confidence === 'number' ? Math.round(provider.confidence * 100) : 80}
                              onChange={(e) => {
                                const updated = { ...editingFile };
                                const val = parseFloat(e.target.value);
                                updated.extractedData.service_providers[idx].confidence = isNaN(val) ? undefined : val / 100;
                                setEditingFile(updated);
                              }}
                              className="w-24 px-2 py-1 border border-gray-300 rounded"
                              placeholder="0-100"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Footer Actions */}
              <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between bg-gray-50">
                {editingFile.type !== 'url' ? (
                  <button
                    onClick={() => {
                      const updated = { ...editingFile, keepDecision: 'dump' as const };
                      setFiles(prev => prev.map(f => f.name === editingFile.name ? updated : f));
                      setLoading(true);
                      (async () => {
                        try {
                          if (editingFile.uploadId) {
                            await uploadAPI.updateUpload(editingFile.uploadId, {
                              keep_file: false,
                              metadata: {
                                extracted_data: updated.extractedData,
                                extraction_contract: updated.extractionContract,
                              },
                            });
                          }
                          alert(`🗑️ Marked "${editingFile.name}" as DUMP (remove original file).`);
                          setEditingFile(null);
                        } catch (error: any) {
                          alert(`❌ Failed to update dump status: ${error.message || 'Unknown error'}`);
                        } finally {
                          setLoading(false);
                        }
                      })();
                    }}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700"
                  >
                    🗑️ Dump File
                  </button>
                ) : (
                  <div className="text-sm text-gray-600">
                    URL scrape results are shared (admins can update).
                  </div>
                )}
                <div className="flex gap-3">
                  <button
                    onClick={() => setEditingFile(null)}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={async () => {
                      // Save edited data locally and keep file
                      const updated = { ...editingFile, keepDecision: 'keep' as const };
                      setFiles(prev => prev.map(f => f.name === editingFile.name ? updated : f));
                      setLoading(true);
                      try {
                        if (editingFile.uploadId) {
                          if (editingFile.type === 'url') {
                            await scrapingAPI.updateScrape(editingFile.uploadId, {
                              metadata: {
                                extracted_data: updated.extractedData,
                                extraction_contract: updated.extractionContract,
                                captain_summary: updated.extractionContract?.final_package?.metadata?.captain_summary,
                                report_markdown: updated.extractionContract?.final_package?.metadata?.report_markdown,
                              },
                            });
                            alert('✅ Saved scraped URL edits.');
                          } else {
                            await uploadAPI.updateUpload(editingFile.uploadId, {
                              keep_file: true,
                              metadata: {
                                extracted_data: updated.extractedData,
                                extraction_contract: updated.extractionContract,
                                captain_summary: updated.extractionContract?.final_package?.metadata?.captain_summary,
                                report_markdown: updated.extractionContract?.final_package?.metadata?.report_markdown,
                              },
                            });
                            alert('✅ Saved edits. Marked as KEEP.');
                          }
                        }
                        setEditingFile(null);
                      } catch (error: any) {
                        alert(`❌ Failed to save data: ${error.message || 'Unknown error'}`);
                      } finally {
                        setLoading(false);
                      }
                    }}
                    disabled={loading}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50"
                  >
                    {loading ? 'Saving...' : editingFile.type === 'url' ? '💾 Save Scrape Edits' : '💾 Save & Keep File'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
    </PortalShell>
  );
}

export default function CaptainUploadPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center"><p className="text-gray-600">Loading…</p></div>}>
      <CaptainUploadPageInner />
    </Suspense>
  );
}
