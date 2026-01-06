'use client';

/**
 * Admin: Company Brain - Historical Conversation Analysis
 * Analyzes 5 years of ChatGPT conversations to extract company DNA, script examples, and valuable ideas
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client-browser';
import AdminNav from '@/components/admin/admin-nav';
import PortalShell from '@/components/portal/portal-shell';

const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://lexa-worldmap-mvp-rlss.onrender.com';

export default function CompanyBrainPage() {
  const router = useRouter();
  const supabase = createClient();

  const [uploading, setUploading] = useState(false);
  const [analyses, setAnalyses] = useState<any[]>([]);
  const [selectedAnalysis, setSelectedAnalysis] = useState<any>(null);
  const [synthesizing, setSynthesizing] = useState(false);
  const [companyBrain, setCompanyBrain] = useState<any>(null);

  useEffect(() => {
    loadInsights();
  }, []);

  const loadInsights = async () => {
    try {
      const { data: session } = await supabase.auth.getSession();
      const accessToken = session.session?.access_token;

      const response = await fetch(`${API_BASE_URL}/api/company-brain/insights`, {
        headers: {
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {})
        }
      });

      if (response.ok) {
        const data = await response.json();
        setAnalyses(data.insights || []);
      }
    } catch (error) {
      console.error('Error loading insights:', error);
    }
  };

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setUploading(true);

    for (const file of Array.from(files)) {
      try {
        const formData = new FormData();
        formData.append('file', file);

        const { data: session } = await supabase.auth.getSession();
        const accessToken = session.session?.access_token;

        const response = await fetch(`${API_BASE_URL}/api/company-brain/analyze-conversation`, {
          method: 'POST',
          headers: {
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {})
          },
          body: formData
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.detail || 'Analysis failed');
        }

        const result = await response.json();
        alert(`✅ ${file.name} analyzed!\n` +
              `Script examples: ${result.script_examples_count}\n` +
              `Ideas worth discussing: ${result.features_worth_discussing_count}\n` +
              `Category: ${result.knowledge_category}`);

      } catch (error: any) {
        alert(`❌ Failed to analyze ${file.name}: ${error.message}`);
      }
    }

    setUploading(false);
    loadInsights();
  };

  const synthesizeAll = async () => {
    if (analyses.length === 0) {
      alert('No analyses to synthesize. Upload conversations first.');
      return;
    }

    setSynthesizing(true);

    try {
      const { data: session } = await supabase.auth.getSession();
      const accessToken = session.session?.access_token;

      const response = await fetch(`${API_BASE_URL}/api/company-brain/synthesize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {})
        },
        body: JSON.stringify({
          analysis_ids: analyses.map(a => a.id)
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Synthesis failed');
      }

      const result = await response.json();
      setCompanyBrain(result.company_brain);
      alert(`✅ Company Brain synthesized from ${result.conversations_synthesized} conversations!`);

    } catch (error: any) {
      alert(`❌ Synthesis failed: ${error.message}`);
    } finally {
      setSynthesizing(false);
    }
  };

  return (
    <PortalShell
      icon="🧠"
      title="Company Brain"
      subtitle="Extract company DNA from 5 years of ChatGPT conversations"
      backLink={{ href: '/admin/dashboard', label: 'Back to Admin' }}
      topRight={<AdminNav />}
      mission={[
        { label: 'YOUR MISSION', text: 'Mine historical ChatGPT conversations for experience scripts, feature ideas, and company philosophy.' },
        { label: 'PURPOSE', text: 'Build Company Brain knowledge base to train AIlessia and guide strategic decisions.' },
        { label: 'NO STORAGE', text: 'Documents are NOT stored (already on company server). Only insights extracted.' },
      ]}
      quickTips={[
        'Upload exported ChatGPT conversations as Word documents.',
        'Each conversation is analyzed for: script examples, feature ideas, design philosophy, company DNA.',
        'After uploading multiple conversations, click "Synthesize Company Brain" to consolidate insights.',
        'Script examples extracted here will train AIlessia\'s Script Composer.',
      ]}
    >
      {/* Upload Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 mb-8">
        <h2 className="text-2xl font-semibold text-gray-900 mb-4">📤 Upload Historical Conversations</h2>
        <p className="text-gray-600 mb-6">
          Upload exported ChatGPT conversations (Word documents). The agent will extract company DNA, experience scripts, and valuable ideas.
        </p>

        <div className="border-2 border-dashed border-gray-300 rounded-xl p-12 text-center hover:border-blue-400 transition-all">
          <input
            type="file"
            id="company-brain-upload"
            multiple
            accept=".doc,.docx"
            onChange={(e) => handleUpload(e.target.files)}
            className="hidden"
          />
          <label htmlFor="company-brain-upload" className="cursor-pointer block">
            <div className="text-6xl mb-4">🧠</div>
            <p className="text-xl font-semibold text-gray-900 mb-2">
              Click to Upload ChatGPT Conversations
            </p>
            <p className="text-sm text-gray-500">
              Word documents (.doc, .docx)
            </p>
          </label>
        </div>

        {uploading && (
          <div className="mt-4">
            <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
              <div className="h-2 w-1/2 bg-blue-500 animate-pulse" />
            </div>
            <p className="text-sm text-gray-600 mt-2">Analyzing conversation...</p>
          </div>
        )}
      </div>

      {/* Analyses List */}
      {analyses.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold text-gray-900">
              📚 Analyzed Conversations ({analyses.length})
            </h2>
            <button
              onClick={synthesizeAll}
              disabled={synthesizing}
              className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg font-semibold hover:shadow-lg disabled:opacity-50 transition-all"
            >
              {synthesizing ? '⏳ Synthesizing...' : '🧬 Synthesize Company Brain'}
            </button>
          </div>

          <div className="space-y-4">
            {analyses.map((analysis, i) => (
              <div
                key={i}
                className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => setSelectedAnalysis(selectedAnalysis?.id === analysis.id ? null : analysis)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 mb-1">
                      {analysis.metadata?.source_file || 'Conversation'}
                    </h3>
                    <p className="text-sm text-gray-600 mb-2">{analysis.summary}</p>
                    <div className="flex gap-4 text-sm">
                      <span className="text-blue-600">
                        📝 {JSON.parse(analysis.script_examples || '[]').length} script examples
                      </span>
                      <span className="text-green-600">
                        💡 {JSON.parse(analysis.features_worth_discussing || '[]').length} ideas
                      </span>
                      <span className="text-purple-600">
                        🎯 {analysis.knowledge_category}
                      </span>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500">
                    {new Date(analysis.analyzed_at).toLocaleDateString()}
                  </div>
                </div>

                {selectedAnalysis?.id === analysis.id && (
                  <div className="mt-4 pt-4 border-t border-gray-200 space-y-4">
                    {/* Script Examples */}
                    {JSON.parse(analysis.script_examples || '[]').length > 0 && (
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-2">📝 Script Examples</h4>
                        <div className="space-y-2">
                          {JSON.parse(analysis.script_examples || '[]').slice(0, 3).map((script: any, j: number) => (
                            <div key={j} className="bg-blue-50 rounded p-3 text-sm">
                              <div className="font-semibold text-blue-900">{script.script_title}</div>
                              <div className="text-gray-700">{script.theme} • {script.destination}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Features Worth Discussing */}
                    {JSON.parse(analysis.features_worth_discussing || '[]').length > 0 && (
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-2">💡 Ideas Worth Discussing</h4>
                        <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                          {JSON.parse(analysis.features_worth_discussing || '[]').slice(0, 5).map((feature: any, j: number) => (
                            <li key={j}>{feature.feature_idea || feature.idea}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Synthesized Company Brain */}
      {companyBrain && (
        <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl shadow-lg border-2 border-purple-200 p-8">
          <h2 className="text-3xl font-bold text-purple-900 mb-6">
            🧬 Company Brain - Synthesized
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Script Training Corpus */}
            {companyBrain.experience_script_training_corpus && (
              <div className="bg-white rounded-lg p-6">
                <h3 className="font-bold text-purple-900 mb-3">📝 Script Training Corpus</h3>
                <div className="text-4xl font-bold text-purple-600 mb-2">
                  {companyBrain.experience_script_training_corpus.total_script_examples || 0}
                </div>
                <div className="text-sm text-gray-600">
                  Script examples for AIlessia training
                </div>
              </div>
            )}

            {/* Features Worth Discussing */}
            {companyBrain.feature_roadmap?.worth_discussing && (
              <div className="bg-white rounded-lg p-6">
                <h3 className="font-bold text-blue-900 mb-3">💡 Ideas to Discuss</h3>
                <div className="text-4xl font-bold text-blue-600 mb-2">
                  {companyBrain.feature_roadmap.worth_discussing.length}
                </div>
                <div className="text-sm text-gray-600">
                  High-value ideas from 5 years
                </div>
              </div>
            )}

            {/* Design Principles */}
            {companyBrain.design_philosophy && (
              <div className="bg-white rounded-lg p-6">
                <h3 className="font-bold text-green-900 mb-3">🎯 Design Philosophy</h3>
                <div className="text-sm text-gray-700">
                  {Object.keys(companyBrain.design_philosophy).length} core principles extracted
                </div>
              </div>
            )}

            {/* Conversations Analyzed */}
            <div className="bg-white rounded-lg p-6">
              <h3 className="font-bold text-gray-900 mb-3">📊 Analysis Stats</h3>
              <div className="text-4xl font-bold text-gray-600 mb-2">
                {companyBrain.conversations_analyzed || 0}
              </div>
              <div className="text-sm text-gray-600">
                Conversations analyzed
              </div>
            </div>
          </div>

          {/* Download Options */}
          <div className="mt-6 flex gap-3">
            <button
              onClick={() => {
                const dataStr = JSON.stringify(companyBrain, null, 2);
                const dataBlob = new Blob([dataStr], { type: 'application/json' });
                const url = URL.createObjectURL(dataBlob);
                const link = document.createElement('a');
                link.href = url;
                link.download = 'company-brain.json';
                link.click();
              }}
              className="px-6 py-3 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700"
            >
              📥 Download Company Brain (JSON)
            </button>
            <button
              onClick={() => {
                // Download script training corpus separately
                if (companyBrain.experience_script_training_corpus) {
                  const dataStr = JSON.stringify(companyBrain.experience_script_training_corpus, null, 2);
                  const dataBlob = new Blob([dataStr], { type: 'application/json' });
                  const url = URL.createObjectURL(dataBlob);
                  const link = document.createElement('a');
                  link.href = url;
                  link.download = 'ailessia-training-corpus.json';
                  link.click();
                }
              }}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700"
            >
              📥 Download AIlessia Training Data
            </button>
          </div>
        </div>
      )}

      {analyses.length === 0 && !uploading && (
        <div className="text-center text-gray-500 py-12">
          No conversations analyzed yet. Upload your exported ChatGPT conversations to begin building the Company Brain.
        </div>
      )}
    </PortalShell>
  );
}
