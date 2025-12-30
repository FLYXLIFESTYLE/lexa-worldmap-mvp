'use client';

/**
 * User Knowledge Upload
 * Lets any authenticated user upload itineraries, scripts, blogs, transcripts, etc.
 * This feeds LEXA with real examples to learn from (later: retrieval + synthesis).
 */

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useDropzone } from 'react-dropzone';
import { createClient } from '@/lib/supabase/client-browser';
import LuxuryBackground from '@/components/luxury-background';

interface UploadedFile {
  file: File;
  id: string;
  status: 'pending' | 'uploading' | 'processing' | 'completed' | 'error';
  result?: {
    poisExtracted: number;
    relationshipsCreated: number;
    wisdomCreated: number;
  };
  error?: string;
}

export default function KnowledgeUploadPage() {
  const router = useRouter();
  const supabase = createClient();

  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [keepFiles, setKeepFiles] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [userEmail, setUserEmail] = useState<string>('');

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        router.push('/auth/signin');
        return;
      }
      setUserEmail(data.user.email || '');
    })();
  }, [router, supabase.auth]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles: UploadedFile[] = acceptedFiles.map((file) => ({
      file,
      id: `${Date.now()}-${file.name}`,
      status: 'pending',
    }));
    setFiles((prev) => [...prev, ...newFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/json': ['.json'],
      'text/plain': ['.txt'],
      'text/markdown': ['.md'],
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/msword': ['.doc'],
      'text/vtt': ['.vtt'],
      'application/x-subrip': ['.srt'],
    },
  });

  const detectFileType = (filename: string): string => {
    const lower = filename.toLowerCase();
    if (lower.endsWith('.json')) return 'chatgpt';
    if (lower.endsWith('.vtt') || lower.endsWith('.srt')) return 'transcript';
    if (lower.endsWith('.pdf')) return 'pdf';
    if (lower.endsWith('.docx') || lower.endsWith('.doc')) return 'docx';
    return 'text';
  };

  const processFiles = async () => {
    setIsProcessing(true);

    for (const uploadedFile of files) {
      if (uploadedFile.status !== 'pending') continue;

      try {
        setFiles((prev) => prev.map((f) => (f.id === uploadedFile.id ? { ...f, status: 'uploading' } : f)));

        const formData = new FormData();
        formData.append('file', uploadedFile.file);
        formData.append('type', detectFileType(uploadedFile.file.name));
        formData.append('keep_file', String(keepFiles));

        const uploadResponse = await fetch('/api/knowledge/upload', {
          method: 'POST',
          body: formData,
        });

        if (!uploadResponse.ok) {
          const err = await uploadResponse.json().catch(() => ({}));
          throw new Error(err?.details || err?.error || 'Upload failed');
        }

        setFiles((prev) => prev.map((f) => (f.id === uploadedFile.id ? { ...f, status: 'processing' } : f)));

        const result = await uploadResponse.json();

        setFiles((prev) =>
          prev.map((f) =>
            f.id === uploadedFile.id
              ? { ...f, status: 'completed', result: result.stats }
              : f
          )
        );
      } catch (error) {
        setFiles((prev) =>
          prev.map((f) =>
            f.id === uploadedFile.id
              ? { ...f, status: 'error', error: error instanceof Error ? error.message : 'Unknown error' }
              : f
          )
        );
      }
    }

    setIsProcessing(false);
  };

  const processUrl = async () => {
    if (!urlInput.trim()) return;
    setIsProcessing(true);
    try {
      const response = await fetch('/api/knowledge/scrape-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: urlInput.trim() }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.details || data?.error || 'Scraping failed');

      // Display as a completed item
      setFiles((prev) => [
        ...prev,
        {
          file: new File([], urlInput.trim()),
          id: `url-${Date.now()}`,
          status: 'completed',
          result: {
            poisExtracted: data?.stats?.poisExtracted ?? 0,
            relationshipsCreated: data?.stats?.relationshipsCreated ?? 0,
            wisdomCreated: data?.stats?.wisdomCreated ?? 0,
          },
        },
      ]);
      setUrlInput('');
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to scrape URL');
    } finally {
      setIsProcessing(false);
    }
  };

  const totalStats = files.reduce(
    (acc, f) => ({
      pois: acc.pois + (f.result?.poisExtracted || 0),
      relationships: acc.relationships + (f.result?.relationshipsCreated || 0),
      wisdom: acc.wisdom + (f.result?.wisdomCreated || 0),
    }),
    { pois: 0, relationships: 0, wisdom: 0 }
  );

  return (
    <div className="relative min-h-screen overflow-hidden">
      <LuxuryBackground />
      <div className="relative z-10 px-6 py-12">
        <div className="mx-auto max-w-5xl">
          <header className="mb-8 flex items-start justify-between">
            <div>
              <h1 className="text-5xl font-bold tracking-tight text-white">
                <span className="bg-gradient-to-r from-white via-lexa-gold to-white bg-clip-text text-transparent animate-gradient">
                  Upload Ideas for LEXA
                </span>
              </h1>
              <p className="mt-3 text-zinc-300 max-w-2xl">
                Upload script examples, proven itineraries, travel reports, transcripts, or documents. This becomes LEXA’s
                idea library — so she can learn patterns, then combine them into new, original moments.
              </p>
              <p className="mt-2 text-xs text-zinc-400">
                Signed in as <span className="text-lexa-gold">{userEmail || '...'}</span>
              </p>
            </div>

            <button
              onClick={() => router.push('/app')}
              className="rounded-full border border-white/10 bg-white/5 px-5 py-2 text-sm font-semibold text-white hover:bg-white/10 hover:border-lexa-gold/30"
            >
              Back to chat
            </button>
          </header>

          {/* Summary */}
          {files.length > 0 && (
            <div className="mb-8 rounded-2xl border border-white/10 bg-black/25 backdrop-blur-xl p-6">
              <div className="grid grid-cols-3 gap-4 text-white">
                <div>
                  <p className="text-3xl font-bold">{totalStats.pois}</p>
                  <p className="text-xs text-zinc-300">POIs extracted</p>
                </div>
                <div>
                  <p className="text-3xl font-bold">{totalStats.relationships}</p>
                  <p className="text-xs text-zinc-300">Relationships created</p>
                </div>
                <div>
                  <p className="text-3xl font-bold">{totalStats.wisdom}</p>
                  <p className="text-xs text-zinc-300">Wisdom captured</p>
                </div>
              </div>
            </div>
          )}

          {/* Upload card */}
          <div className="rounded-2xl border border-white/10 bg-black/25 backdrop-blur-xl p-8">
            <h2 className="text-xl font-bold text-white">Upload files</h2>
            <p className="mt-2 text-sm text-zinc-300">
              Drag & drop or click. Supported: PDF, DOC/DOCX, TXT/MD, JSON (ChatGPT export), VTT/SRT.
            </p>

            <div
              {...getRootProps()}
              className={[
                'mt-6 border-2 border-dashed rounded-2xl p-12 text-center transition-all cursor-pointer',
                isDragActive ? 'border-lexa-gold bg-lexa-gold/10' : 'border-white/15 hover:border-lexa-gold/40 hover:bg-white/5',
              ].join(' ')}
            >
              <input {...getInputProps()} />
              <div className="text-5xl mb-4">📎</div>
              <p className="text-lg font-semibold text-white">
                {isDragActive ? 'Drop files here…' : 'Drag & drop files here'}
              </p>
              <p className="mt-2 text-sm text-zinc-400">or click to browse</p>
            </div>

            <div className="mt-6 rounded-xl border border-white/10 bg-white/5 p-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={keepFiles}
                  onChange={(e) => setKeepFiles(e.target.checked)}
                  className="h-5 w-5 rounded border-white/20 text-lexa-gold focus:ring-lexa-gold"
                />
                <div>
                  <p className="font-semibold text-white">Keep original files after extraction</p>
                  <p className="text-xs text-zinc-400 mt-1">
                    {keepFiles ? 'Files are stored securely for later reference.' : 'Recommended for privacy: only extracted insights are saved.'}
                  </p>
                </div>
              </label>
            </div>

            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              <button
                onClick={processFiles}
                disabled={isProcessing || files.every((f) => f.status !== 'pending')}
                className="rounded-2xl bg-gradient-to-r from-lexa-gold to-yellow-600 px-6 py-4 font-semibold text-zinc-900 disabled:opacity-50"
              >
                {isProcessing ? 'Processing…' : 'Upload & ingest'}
              </button>
              <button
                onClick={() => setFiles([])}
                disabled={isProcessing || files.length === 0}
                className="rounded-2xl border border-white/10 bg-white/5 px-6 py-4 font-semibold text-white hover:bg-white/10 disabled:opacity-50"
              >
                Clear
              </button>
            </div>
          </div>

          {/* URL scrape */}
          <div className="mt-6 rounded-2xl border border-white/10 bg-black/25 backdrop-blur-xl p-8">
            <h2 className="text-xl font-bold text-white">Add a website / travel report</h2>
            <p className="mt-2 text-sm text-zinc-300">
              Paste a link to a travel report, blog post, or itinerary page. LEXA will extract the useful parts.
            </p>
            <div className="mt-4 flex flex-col sm:flex-row gap-3">
              <input
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://…"
                className="flex-1 rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-zinc-100 placeholder-zinc-500 focus:border-lexa-gold focus:outline-none focus:ring-2 focus:ring-lexa-gold/20"
              />
              <button
                onClick={processUrl}
                disabled={isProcessing || !urlInput.trim()}
                className="rounded-2xl border border-lexa-gold/30 bg-lexa-gold/10 px-6 py-4 font-semibold text-lexa-gold hover:bg-lexa-gold/15 disabled:opacity-50"
              >
                Ingest URL
              </button>
            </div>
          </div>

          {/* File list */}
          {files.length > 0 && (
            <div className="mt-8 rounded-2xl border border-white/10 bg-black/25 backdrop-blur-xl p-6">
              <h3 className="text-lg font-bold text-white">This session</h3>
              <div className="mt-4 space-y-3">
                {files.map((f) => (
                  <div key={f.id} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-white">{f.file.name}</p>
                      <p className="text-xs text-zinc-400">
                        {f.status === 'pending' && 'Ready'}
                        {f.status === 'uploading' && 'Uploading…'}
                        {f.status === 'processing' && 'Extracting insights…'}
                        {f.status === 'completed' && 'Completed'}
                        {f.status === 'error' && `Error: ${f.error}`}
                      </p>
                    </div>
                    {f.result ? (
                      <div className="flex gap-4 text-xs text-zinc-300">
                        <span><span className="text-lexa-gold font-semibold">{f.result.poisExtracted}</span> POIs</span>
                        <span><span className="text-lexa-gold font-semibold">{f.result.relationshipsCreated}</span> rels</span>
                        <span><span className="text-lexa-gold font-semibold">{f.result.wisdomCreated}</span> wisdom</span>
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


