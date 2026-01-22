/**
 * Company Brain Section Review
 *
 * Shows ALL extracted sections from uploaded documents
 * Admin can approve/reject each section individually
 * Only approved sections go into Script Engine retrieval
 */

'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import AdminNav from '@/components/admin/admin-nav';
import PortalShell from '@/components/portal/portal-shell';

type Section = {
  id: string;
  section_type: string;
  title: string;
  content: string;
  tags: string[];
  date_context: string | null;
  confidence: number;
  status: 'needs_review' | 'approved' | 'rejected';
  upload: { filename: string; created_at: string };
};

function CompanyBrainReviewContent() {
  const searchParams = useSearchParams();
  const uploadId = searchParams.get('upload_id');
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'needs_review' | 'approved' | 'rejected'>('needs_review');

  useEffect(() => {
    loadSections();
  }, [filter, uploadId]);

  const loadSections = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter !== 'all') params.set('status', filter);
      if (uploadId) params.set('upload_id', uploadId);
      const url = params.toString()
        ? `/api/admin/company-brain/sections?${params.toString()}`
        : '/api/admin/company-brain/sections';
      const res = await fetch(url);
      const data = await res.json();
      setSections(data.sections || []);
    } catch (error) {
      console.error('Failed to load sections:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/company-brain/sections/${id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: '' }),
      });
      if (res.ok) {
        loadSections();
      }
    } catch (error) {
      console.error('Failed to approve:', error);
    }
  };

  const handleReject = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/company-brain/sections/${id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: 'Outdated or irrelevant' }),
      });
      if (res.ok) {
        loadSections();
      }
    } catch (error) {
      console.error('Failed to reject:', error);
    }
  };

  const getSectionIcon = (type: string) => {
    const icons: Record<string, string> = {
      script_example: '📜',
      client_insight: '👤',
      design_principle: '🎨',
      feature_idea: '💡',
      outdated_content: '🗑️',
      vendor_relationship: '🤝',
      pricing_strategy: '💰',
      successful_pattern: '✨',
      conversation_example: '💬',
    };
    return icons[type] || '📄';
  };

  const getSectionColor = (type: string) => {
    const colors: Record<string, string> = {
      script_example: 'bg-purple-50 border-purple-200',
      client_insight: 'bg-blue-50 border-blue-200',
      design_principle: 'bg-green-50 border-green-200',
      feature_idea: 'bg-yellow-50 border-yellow-200',
      outdated_content: 'bg-red-50 border-red-200',
      vendor_relationship: 'bg-indigo-50 border-indigo-200',
      pricing_strategy: 'bg-emerald-50 border-emerald-200',
      successful_pattern: 'bg-pink-50 border-pink-200',
      conversation_example: 'bg-cyan-50 border-cyan-200',
    };
    return colors[type] || 'bg-gray-50 border-gray-200';
  };

  return (
    <PortalShell
      icon="🔍"
      title="Company Brain Review"
      subtitle="Review extracted sections - approve valuable insights, reject outdated content"
      backLink={{ href: '/admin/company-brain', label: 'Back to Upload' }}
      topRight={<AdminNav />}
      mission={[
        { label: 'YOUR MISSION', text: 'Review extracted sections from historic chats and approve only valuable, current insights.' },
        { label: 'APPROVE', text: 'Script examples, client insights, design principles that are still relevant.' },
        { label: 'REJECT', text: 'Outdated tech discussions, superseded approaches, context-specific ideas no longer applicable.' },
      ]}
      quickTips={[
        'Only approved sections are used in Script Engine retrieval.',
        'Reject outdated content to keep company brain clean and focused.',
        'Script examples are GOLD - these train LEXA\'s narrative style.',
      ]}
    >
      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex gap-3">
          {(['needs_review', 'approved', 'rejected', 'all'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === f
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {f.replace('_', ' ').charAt(0).toUpperCase() + f.slice(1).replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Sections List */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading sections...</p>
        </div>
      ) : !sections.length ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <p className="text-gray-600">
            {filter === 'needs_review' 
              ? 'No sections need review. Upload documents or change filter.'
              : `No ${filter} sections found.`}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {sections.map((section) => (
            <div
              key={section.id}
              className={`bg-white rounded-xl shadow-sm border-2 p-6 ${getSectionColor(section.section_type)}`}
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">{getSectionIcon(section.section_type)}</span>
                    <span className="text-xs font-semibold text-gray-500 uppercase">
                      {section.section_type.replace('_', ' ')}
                    </span>
                    {section.date_context && (
                      <span className="text-xs text-gray-500 bg-white px-2 py-1 rounded">
                        📅 {section.date_context}
                      </span>
                    )}
                    <span className="text-xs text-gray-500 bg-white px-2 py-1 rounded">
                      Confidence: {Math.round(section.confidence * 100)}%
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">{section.title}</h3>
                  <p className="text-xs text-gray-500 mt-1">
                    From: {section.upload.filename} • Uploaded: {new Date(section.upload.created_at).toLocaleDateString()}
                  </p>
                </div>
                {section.status === 'needs_review' && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleApprove(section.id)}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                    >
                      ✅ Approve
                    </button>
                    <button
                      onClick={() => handleReject(section.id)}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                    >
                      ❌ Reject
                    </button>
                  </div>
                )}
                {section.status === 'approved' && (
                  <span className="px-4 py-2 bg-green-100 text-green-800 rounded-lg font-medium">
                    ✅ Approved
                  </span>
                )}
                {section.status === 'rejected' && (
                  <span className="px-4 py-2 bg-red-100 text-red-800 rounded-lg font-medium">
                    ❌ Rejected
                  </span>
                )}
              </div>

              {/* Tags */}
              {section.tags && section.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {section.tags.map((tag: string) => (
                    <span
                      key={tag}
                      className="text-xs px-2 py-1 bg-white border border-gray-300 rounded-full text-gray-700"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Content */}
              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <pre className="whitespace-pre-wrap text-sm text-gray-700 font-sans">{section.content}</pre>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Summary */}
      {!loading && sections.length > 0 && (
        <div className="mt-6 bg-purple-50 border border-purple-200 rounded-xl p-6">
          <h3 className="font-semibold text-purple-900 mb-2">📊 Summary</h3>
          <p className="text-sm text-gray-700">
            Showing {sections.length} {filter === 'all' ? '' : filter} sections
          </p>
        </div>
      )}
    </PortalShell>
  );
}

export default function CompanyBrainReviewPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center text-gray-600">
          Loading review...
        </div>
      }
    >
      <CompanyBrainReviewContent />
    </Suspense>
  );
}
