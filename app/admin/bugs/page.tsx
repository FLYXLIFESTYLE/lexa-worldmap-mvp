'use client';

import { useState, useEffect } from 'react';
import AdminNav from '@/components/admin/admin-nav';
import Link from 'next/link';
import { format } from 'date-fns';

interface BugReport {
  id: string;
  title: string;
  description: string;
  page_url: string | null;
  severity: 'critical' | 'high' | 'medium' | 'low';
  status: 'open' | 'resolved' | 'duplicate' | 'wont_fix';
  category: string | null;
  reporter_email: string | null;
  reporter_name: string | null;
  created_at: string;
  resolved_at: string | null;
  steps_to_reproduce: string | null;
  expected_behavior: string | null;
  actual_behavior: string | null;
}

const severityColors = {
  critical: { bg: 'bg-red-100', text: 'text-red-800', badge: 'bg-red-600 text-white' },
  high: { bg: 'bg-orange-100', text: 'text-orange-800', badge: 'bg-orange-500 text-white' },
  medium: { bg: 'bg-yellow-100', text: 'text-yellow-800', badge: 'bg-yellow-500 text-white' },
  low: { bg: 'bg-blue-100', text: 'text-blue-800', badge: 'bg-blue-500 text-white' }
};

export default function BugReportsPage() {
  const [bugs, setBugs] = useState<BugReport[]>([]);
  const [grouped, setGrouped] = useState<{ open: BugReport[]; resolved: BugReport[] }>({
    open: [],
    resolved: []
  });
  const [stats, setStats] = useState({ total: 0, open: 0, resolved: 0, critical: 0, high: 0 });
  const [statusFilter, setStatusFilter] = useState<'open' | 'resolved' | 'all'>('open');
  const [isLoading, setIsLoading] = useState(true);
  const [expandedBug, setExpandedBug] = useState<string | null>(null);

  useEffect(() => {
    fetchBugs();
  }, [statusFilter]);

  async function fetchBugs() {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/bugs?status=${statusFilter}`);
      const data = await response.json();
      
      if (data.success) {
        setBugs(data.bugs);
        setGrouped(data.grouped);
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Failed to fetch bugs:', error);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleResolve(id: string) {
    try {
      const response = await fetch('/api/bugs', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: 'resolved' })
      });

      if (response.ok) {
        fetchBugs();
      }
    } catch (error) {
      console.error('Failed to resolve bug:', error);
    }
  }

  function renderBugSection(title: string, sectionBugs: BugReport[]) {
    if (sectionBugs.length === 0) return null;

    return (
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          {title} ({sectionBugs.length})
        </h2>
        <div className="space-y-4">
          {sectionBugs.map((bug) => {
            const colors = severityColors[bug.severity];
            const isExpanded = expandedBug === bug.id;

            return (
              <div
                key={bug.id}
                className={`${colors.bg} border-2 ${colors.bg.replace('bg-', 'border-')} rounded-lg p-5`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${colors.badge}`}>
                        {bug.severity.toUpperCase()}
                      </span>
                      {bug.category && (
                        <span className="px-3 py-1 bg-white/60 text-gray-700 text-xs font-medium rounded-full">
                          {bug.category}
                        </span>
                      )}
                      <span className={`px-3 py-1 ${
                        bug.status === 'open' 
                          ? 'bg-green-500 text-white' 
                          : 'bg-gray-400 text-white'
                      } text-xs font-medium rounded-full`}>
                        {bug.status}
                      </span>
                    </div>

                    <h3 className={`text-lg font-bold ${colors.text} mb-2`}>
                      {bug.title}
                    </h3>

                    <p className="text-gray-700 text-sm mb-3">
                      {bug.description}
                    </p>

                    <div className="text-xs text-gray-600 space-y-1">
                      {bug.reporter_email && (
                        <div>
                          <strong>Reporter:</strong> {bug.reporter_name || bug.reporter_email}
                        </div>
                      )}
                      {bug.page_url && (
                        <div>
                          <strong>Page:</strong>{' '}
                          <a href={bug.page_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                            {bug.page_url}
                          </a>
                        </div>
                      )}
                      <div>
                        <strong>Reported:</strong> {format(new Date(bug.created_at), 'MMM d, yyyy HH:mm')}
                      </div>
                      {bug.resolved_at && (
                        <div>
                          <strong>Resolved:</strong> {format(new Date(bug.resolved_at), 'MMM d, yyyy HH:mm')}
                        </div>
                      )}
                    </div>

                    {/* Expandable Details */}
                    {isExpanded && (
                      <div className="mt-4 pt-4 border-t border-gray-300 space-y-3">
                        {bug.steps_to_reproduce && (
                          <div>
                            <strong className="text-gray-800">Steps to Reproduce:</strong>
                            <p className="text-gray-700 whitespace-pre-wrap">{bug.steps_to_reproduce}</p>
                          </div>
                        )}
                        {bug.expected_behavior && (
                          <div>
                            <strong className="text-gray-800">Expected:</strong>
                            <p className="text-gray-700">{bug.expected_behavior}</p>
                          </div>
                        )}
                        {bug.actual_behavior && (
                          <div>
                            <strong className="text-gray-800">Actual:</strong>
                            <p className="text-gray-700">{bug.actual_behavior}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => setExpandedBug(isExpanded ? null : bug.id)}
                      className="px-4 py-2 bg-gray-600 text-white text-sm rounded-lg hover:bg-gray-700 transition-colors"
                    >
                      {isExpanded ? '▲ Less' : '▼ More'}
                    </button>
                    {bug.status === 'open' && (
                      <button
                        onClick={() => handleResolve(bug.id)}
                        className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors"
                      >
                        ✓ Resolve
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading bug reports...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div className="flex-1">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              🐛 Bug Reports
            </h1>
            <p className="text-lg text-gray-600 mb-4">
              User-reported bugs and issues
            </p>
            
            {/* Why - What - How */}
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 space-y-2 max-w-2xl">
              <div className="text-sm">
                <strong className="text-red-900">WHY:</strong> <span className="text-gray-700">Track and resolve user-reported bugs to improve LEXA</span>
              </div>
              <div className="text-sm">
                <strong className="text-red-900">WHAT:</strong> <span className="text-gray-700">View all bug reports with details, severity, and status</span>
              </div>
              <div className="text-sm">
                <strong className="text-red-900">HOW:</strong> <span className="text-gray-700">Review reports, mark as resolved, and track critical issues</span>
              </div>
            </div>
          </div>
          <AdminNav />
        </div>

        {/* Stats */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
            <div>
              <div className="text-3xl font-bold text-gray-900">{stats.total}</div>
              <div className="text-sm text-gray-600">Total Reports</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-green-600">{stats.open}</div>
              <div className="text-sm text-gray-600">Open</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-gray-600">{stats.resolved}</div>
              <div className="text-sm text-gray-600">Resolved</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-red-600">{stats.critical}</div>
              <div className="text-sm text-gray-600">Critical</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-orange-600">{stats.high}</div>
              <div className="text-sm text-gray-600">High Priority</div>
            </div>
          </div>

          {/* Filters */}
          <div className="flex gap-2 mt-6">
            {['open', 'resolved', 'all'].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status as any)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  statusFilter === status
                    ? 'bg-red-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Bug Lists */}
        {statusFilter === 'all' || statusFilter === 'open' ? (
          renderBugSection('🔴 Open Issues', grouped.open)
        ) : null}

        {statusFilter === 'all' || statusFilter === 'resolved' ? (
          renderBugSection('✅ Resolved', grouped.resolved)
        ) : null}

        {bugs.length === 0 && (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <p className="text-gray-500 text-lg">
              No bug reports found. Great job! 🎉
            </p>
          </div>
        )}

        {/* Back to Dashboard */}
        <div className="mt-8 text-center">
          <Link
            href="/admin/dashboard"
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <span>←</span> Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}

