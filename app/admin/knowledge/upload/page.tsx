'use client';

/**
 * Knowledge Upload Portal
 * For Captains to contribute travel wisdom, transcripts, itineraries, etc.
 */

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useDropzone } from 'react-dropzone';

interface UploadedFile {
  file: File;
  id: string;
  status: 'pending' | 'uploading' | 'processing' | 'completed' | 'error';
  progress: number;
  result?: {
    poisExtracted: number;
    relationshipsCreated: number;
    wisdomCreated: number;
  };
  error?: string;
}

export default function KnowledgeUploadPage() {
  const router = useRouter();
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [urlInput, setUrlInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [keepFiles, setKeepFiles] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles: UploadedFile[] = acceptedFiles.map((file) => ({
      file,
      id: `${Date.now()}-${file.name}`,
      status: 'pending',
      progress: 0,
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
      'text/vtt': ['.vtt'], // Video transcripts
      'application/x-subrip': ['.srt'], // Subtitles
    },
  });

  const processFiles = async () => {
    setIsProcessing(true);

    for (const uploadedFile of files) {
      if (uploadedFile.status !== 'pending') continue;

      try {
        // Update status
        setFiles((prev) =>
          prev.map((f) =>
            f.id === uploadedFile.id ? { ...f, status: 'uploading' as const } : f
          )
        );

        // Create form data
        const formData = new FormData();
        formData.append('file', uploadedFile.file);
        formData.append('type', detectFileType(uploadedFile.file.name));
        formData.append('keep_file', String(keepFiles));

        // Upload
        const uploadResponse = await fetch('/api/knowledge/upload', {
          method: 'POST',
          body: formData,
        });

        if (!uploadResponse.ok) {
          throw new Error('Upload failed');
        }

        // Process
        setFiles((prev) =>
          prev.map((f) =>
            f.id === uploadedFile.id ? { ...f, status: 'processing' as const } : f
          )
        );

        const result = await uploadResponse.json();

        // Complete
        setFiles((prev) =>
          prev.map((f) =>
            f.id === uploadedFile.id
              ? {
                  ...f,
                  status: 'completed' as const,
                  progress: 100,
                  result: result.stats,
                }
              : f
          )
        );
      } catch (error) {
        setFiles((prev) =>
          prev.map((f) =>
            f.id === uploadedFile.id
              ? {
                  ...f,
                  status: 'error' as const,
                  error: error instanceof Error ? error.message : 'Unknown error',
                }
              : f
          )
        );
      }
    }

    setIsProcessing(false);
  };

  const processUrl = async () => {
    if (!urlInput.trim()) return;

    try {
      setIsProcessing(true);
      
      const response = await fetch('/api/knowledge/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: urlInput }),
      });

      if (!response.ok) {
        throw new Error('Scraping failed');
      }

      const result = await response.json();
      
      // Add as a "file" in the list
      setFiles((prev) => [
        ...prev,
        {
          file: new File([], urlInput),
          id: `url-${Date.now()}`,
          status: 'completed',
          progress: 100,
          result: result.stats,
        },
      ]);

      setUrlInput('');
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to scrape URL');
    } finally {
      setIsProcessing(false);
    }
  };

  const detectFileType = (filename: string): string => {
    if (filename.endsWith('.json')) return 'chatgpt';
    if (filename.endsWith('.vtt') || filename.endsWith('.srt')) return 'transcript';
    if (filename.endsWith('.pdf')) return 'pdf';
    if (filename.endsWith('.docx')) return 'docx';
    return 'text';
  };

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
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
    <div className="min-h-screen bg-gradient-to-br from-lexa-cream via-white to-zinc-50 px-6 py-12">
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push('/admin/knowledge')}
            className="text-sm text-zinc-600 hover:text-lexa-navy mb-4 flex items-center gap-2"
          >
            ← Back to Knowledge Dashboard
          </button>
          <h1 className="text-4xl font-bold text-lexa-navy mb-2">
            📤 Share Your Travel Wisdom
          </h1>
          <p className="text-lg text-zinc-600">
            Upload conversations, transcripts, itineraries, or any travel knowledge to help LEXA learn
          </p>
        </div>

        {/* Stats Summary */}
        {files.length > 0 && (
          <div className="bg-gradient-to-r from-lexa-navy to-lexa-gold rounded-2xl p-6 mb-8 text-white">
            <h3 className="text-lg font-bold mb-3">Session Summary</h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-3xl font-bold">{totalStats.pois}</p>
                <p className="text-sm opacity-80">POIs Extracted</p>
              </div>
              <div>
                <p className="text-3xl font-bold">{totalStats.relationships}</p>
                <p className="text-sm opacity-80">Relationships Created</p>
              </div>
              <div>
                <p className="text-3xl font-bold">{totalStats.wisdom}</p>
                <p className="text-sm opacity-80">Wisdom Captured</p>
              </div>
            </div>
          </div>
        )}

        {/* File Upload Area */}
        <div className="bg-white rounded-2xl shadow-lg border border-zinc-200/60 p-8 mb-6">
          <h2 className="text-xl font-bold text-lexa-navy mb-4">Upload Files</h2>
          
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-xl p-12 text-center transition-all cursor-pointer ${
              isDragActive
                ? 'border-lexa-gold bg-lexa-gold/5'
                : 'border-zinc-300 hover:border-lexa-gold/50 hover:bg-zinc-50'
            }`}
          >
            <input {...getInputProps()} />
            <div className="text-6xl mb-4">📂</div>
            {isDragActive ? (
              <p className="text-xl font-semibold text-lexa-navy">Drop files here...</p>
            ) : (
              <>
                <p className="text-xl font-semibold text-lexa-navy mb-2">
                  Drag & drop files here
                </p>
                <p className="text-zinc-500 mb-4">or click to browse</p>
                <div className="inline-block bg-gradient-to-r from-lexa-navy to-lexa-gold text-white px-6 py-3 rounded-lg font-semibold">
                  Browse Files
                </div>
              </>
            )}
          </div>

          {/* Keep/Delete File Option */}
          <div className="mt-6 mb-6 p-4 bg-zinc-50 rounded-lg border border-zinc-200">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={keepFiles}
                onChange={(e) => setKeepFiles(e.target.checked)}
                className="w-5 h-5 rounded border-zinc-300 text-lexa-navy focus:ring-lexa-gold"
              />
              <div className="flex-1">
                <p className="font-semibold text-lexa-navy">Keep original files after extraction</p>
                <p className="text-sm text-zinc-600 mt-1">
                  {keepFiles ? (
                    <>
                      <span className="text-green-600 font-medium">✓ Files will be stored</span> - You can download them later
                    </>
                  ) : (
                    <>
                      <span className="text-orange-600 font-medium">Files will be deleted</span> - Only extracted data is saved (recommended for privacy)
                    </>
                  )}
                </p>
              </div>
            </label>
          </div>

          <div className="mt-6 grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
            <div className="flex items-center gap-2 text-zinc-600">
              <span className="text-green-600">✓</span> ChatGPT Export (.json)
            </div>
            <div className="flex items-center gap-2 text-zinc-600">
              <span className="text-green-600">✓</span> Zoom Transcripts (.vtt, .srt)
            </div>
            <div className="flex items-center gap-2 text-zinc-600">
              <span className="text-green-600">✓</span> Text Files (.txt, .md)
            </div>
            <div className="flex items-center gap-2 text-zinc-600">
              <span className="text-green-600">✓</span> Documents (.pdf, .docx)
            </div>
            <div className="flex items-center gap-2 text-zinc-600">
              <span className="text-green-600">✓</span> Itineraries (any format)
            </div>
            <div className="flex items-center gap-2 text-zinc-600">
              <span className="text-green-600">✓</span> Travel Notes
            </div>
          </div>
        </div>

        {/* URL Input */}
        <div className="bg-white rounded-2xl shadow-lg border border-zinc-200/60 p-6 mb-6">
          <h2 className="text-xl font-bold text-lexa-navy mb-4">Import from URL</h2>
          <p className="text-sm text-zinc-600 mb-4">
            Paste a link to a blog post, article, or travel guide
          </p>
          <div className="flex gap-3">
            <input
              type="url"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="https://example.com/my-travel-guide"
              className="flex-1 px-4 py-3 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-lexa-gold"
            />
            <button
              onClick={processUrl}
              disabled={!urlInput.trim() || isProcessing}
              className="px-6 py-3 bg-lexa-navy text-white rounded-lg font-semibold hover:bg-lexa-gold transition-colors disabled:bg-zinc-300 disabled:cursor-not-allowed"
            >
              Import
            </button>
          </div>
        </div>

        {/* Uploaded Files List */}
        {files.length > 0 && (
          <div className="bg-white rounded-2xl shadow-lg border border-zinc-200/60 p-6 mb-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-lexa-navy">
                Uploaded Files ({files.length})
              </h2>
              {files.some((f) => f.status === 'pending') && (
                <button
                  onClick={processFiles}
                  disabled={isProcessing}
                  className="px-6 py-2 bg-gradient-to-r from-lexa-navy to-lexa-gold text-white rounded-lg font-semibold hover:shadow-lg transition-all disabled:opacity-50"
                >
                  {isProcessing ? 'Processing...' : 'Process All'}
                </button>
              )}
            </div>

            <div className="space-y-3">
              {files.map((f) => (
                <div
                  key={f.id}
                  className="border border-zinc-200 rounded-lg p-4 hover:border-lexa-gold/50 transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3 flex-1">
                      <div className="text-2xl">
                        {f.status === 'completed' ? '✅' : 
                         f.status === 'error' ? '❌' :
                         f.status === 'processing' ? '⏳' :
                         f.status === 'uploading' ? '📤' : '📄'}
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-lexa-navy">
                          {f.file.name || 'URL Import'}
                        </p>
                        <p className="text-sm text-zinc-500">
                          {f.file.size ? `${(f.file.size / 1024).toFixed(1)} KB` : 'External'}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => removeFile(f.id)}
                      className="text-zinc-400 hover:text-red-500 transition-colors"
                    >
                      ✕
                    </button>
                  </div>

                  {/* Status */}
                  <div className="mb-2">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-zinc-600 capitalize">{f.status}</span>
                      {f.status !== 'error' && <span className="font-semibold">{f.progress}%</span>}
                    </div>
                    <div className="w-full bg-zinc-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all ${
                          f.status === 'completed' ? 'bg-green-500' :
                          f.status === 'error' ? 'bg-red-500' :
                          'bg-lexa-gold'
                        }`}
                        style={{ width: `${f.progress}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Results */}
                  {f.result && (
                    <div className="grid grid-cols-3 gap-3 mt-3 text-sm">
                      <div className="bg-blue-50 rounded px-3 py-2">
                        <p className="font-bold text-blue-900">{f.result.poisExtracted}</p>
                        <p className="text-xs text-blue-600">POIs</p>
                      </div>
                      <div className="bg-green-50 rounded px-3 py-2">
                        <p className="font-bold text-green-900">{f.result.relationshipsCreated}</p>
                        <p className="text-xs text-green-600">Relationships</p>
                      </div>
                      <div className="bg-purple-50 rounded px-3 py-2">
                        <p className="font-bold text-purple-900">{f.result.wisdomCreated}</p>
                        <p className="text-xs text-purple-600">Wisdom</p>
                      </div>
                    </div>
                  )}

                  {/* Error */}
                  {f.error && (
                    <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-800">
                      {f.error}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6">
          <h4 className="text-lg font-bold text-blue-900 mb-2">
            💡 Tips for Best Results
          </h4>
          <ul className="space-y-2 text-sm text-blue-800">
            <li className="flex items-start gap-2">
              <span className="text-blue-600 mt-0.5">•</span>
              <span><strong>ChatGPT Exports:</strong> Include full conversations about travel planning, destination discussions, or itinerary creation</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 mt-0.5">•</span>
              <span><strong>Zoom Transcripts:</strong> Upload .vtt or .srt files from client consultations or destination briefings</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 mt-0.5">•</span>
              <span><strong>Itineraries:</strong> Past trip itineraries help LEXA learn your style and preferences</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 mt-0.5">•</span>
              <span><strong>Travel Notes:</strong> Personal observations, hidden gems, and insider tips are incredibly valuable</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 mt-0.5">•</span>
              <span><strong>Processing Time:</strong> Large files may take several minutes to process with AI</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

