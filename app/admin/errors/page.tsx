'use client';

import { useState, useEffect } from 'react';
import AdminNav from '@/components/admin/admin-nav';
import Link from 'next/link';
import { format } from 'date-fns';

interface ErrorLog {
  id: string;
  error_type: string;
  error_message: string;
  stack_trace: string | null;
  page_url: string | null;
  severity: 'critical' | 'high' | 'medium' | 'low';
  status: 'new' | 'reviewed' | 'fixed' | 'ignored';
  occurrence_count: number;
  first_seen: string;
  last_seen: string;
  backlog_item_id: string | null;
}

const severityColors = {
  critical: { bg: 'bg-red-100', text: 'text-red-800', badge: 'bg-red-600 text-white' },
  high: { bg: 'bg-orange-100', text: 'text-orange-800', badge: 'bg-orange-500 text-white' },
  medium: { bg: 'bg-yellow-100', text: 'text-yellow-800', badge: 'bg-yellow-500 text-white' },
  low: { bg: 'bg-blue-100', text: 'text-blue-800', badge: 'bg-blue-500 text-white' }
};

export default function ErrorLogsPage() {
  const [errors, setErrors] = useState<ErrorLog[]>([]);
  const [grouped, setGrouped] = useState<{ open: ErrorLog[]; resolved: ErrorLog[] }>({
    open: [],
    resolved: []
  });
  const [stats, setStats] = useState({ total: 0, open: 0, resolved: 0, critical: 0, high: 0, total_occurrences: 0 });
  const [statusFilter, setStatusFilter] = useState<'open' | 'resolved' | 'all'>('open');
  const [isLoading, setIsLoading] = useState(true);
  const [expandedError, setExpandedError] = useState<string | null>(null);

  useEffect(() => {
    fetchErrors();
  }, [statusFilter]);

  async function fetchErrors() {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/errors?status=${statusFilter}`);
      const data = await response.json();
      
      if (data.success) {
        setErrors(data.errors);
        setGrouped(data.grouped);
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Failed to fetch errors:', error);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleUpdateStatus(id: string, status: string) {
    try {
      const response = await fetch('/api/errors', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status })
      });

      if (response.ok) {
        fetchErrors();
      }
    } catch (error) {
      console.error('Failed to update error:', error);
    }
  }

  function renderErrorSection(title: string, sectionErrors: ErrorLog[]) {
    if (sectionErrors.length === 0) return null;

    return (
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          {title} ({sectionErrors.length})
        </h2>
        <div className="space-y-4">
          {sectionErrors.map((error) => {
            const colors = severityColors[error.severity];
            const isExpanded = expandedError === error.id;

            return (
              <div
                key={error.id}
                className={`${colors.bg} border-2 ${colors.bg.replace('bg-', 'border-')} rounded-lg p-5`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${colors.badge}`}>
                        {error.severity.toUpperCase()}
                      </span>
                      <span className="px-3 py-1 bg-purple-600 text-white text-xs font-bold rounded-full">
                        {error.occurrence_count}× occurred
                      </span>
                      {error.backlog_item_id && (
                        <span className="px-3 py-1 bg-blue-600 text-white text-xs font-medium rounded-full">
                          📋 In Backlog
                        </span>
                      )}
                    </div>

                    <h3 className={`text-lg font-bold ${colors.text} mb-2`}>
                      {error.error_type}
                    </h3>

                    <p className="text-gray-700 text-sm mb-3 font-mono bg-white/60 p-3 rounded">
                      {error.error_message}
                    </p>

                    <div className="text-xs text-gray-600 space-y-1">
                      {error.page_url && (
                        <div>
                          <strong>Page:</strong>{' '}
                          <a href={error.page_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                            {error.page_url}
                          </a>
                        </div>
                      )}
                      <div>
                        <strong>First seen:</strong> {format(new Date(error.first_seen), 'MMM d, yyyy HH:mm')}
                      </div>
                      <div>
                        <strong>Last seen:</strong> {format(new Date(error.last_seen), 'MMM d, yyyy HH:mm')}
                      </div>
                    </div>

                    {/* Stack Trace */}
                    {isExpanded && error.stack_trace && (
                      <div className="mt-4 pt-4 border-t border-gray-300">
                        <strong className="text-gray-800 block mb-2">Stack Trace:</strong>
                        <pre className="text-xs text-gray-700 bg-white/80 p-3 rounded overflow-x-auto">
                          {error.stack_trace}
                        </pre>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-2">
                    {error.stack_trace && (
                      <button
                        onClick={() => setExpandedError(isExpanded ? null : error.id)}
                        className="px-4 py-2 bg-gray-600 text-white text-sm rounded-lg hover:bg-gray-700 transition-colors"
                      >
                        {isExpanded ? '▲ Hide' : '▼ Stack'}
                      </button>
                    )}
                    {['new', 'reviewed'].includes(error.status) && (
                      <>
                        <button
                          onClick={() => handleUpdateStatus(error.id, 'reviewed')}
                          className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          👁️ Review
                        </button>
                        <button
                          onClick={() => handleUpdateStatus(error.id, 'fixed')}
                          className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors"
                        >
                          ✓ Fixed
                        </button>
                        <button
                          onClick={() => handleUpdateStatus(error.id, 'ignored')}
                          className="px-4 py-2 bg-gray-500 text-white text-sm rounded-lg hover:bg-gray-600 transition-colors"
                        >
                          ✕ Ignore
                        </button>
                      </>
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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading error logs...</p>
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
              ⚠️ Error Logs
            </h1>
            <p className="text-lg text-gray-600 mb-4">
              System errors and exceptions
            </p>
            
            {/* Why - What - How */}
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 space-y-2 max-w-2xl">
              <div className="text-sm">
                <strong className="text-purple-900">WHY:</strong> <span className="text-gray-700">Automatically detect and track system errors for faster debugging</span>
              </div>
              <div className="text-sm">
                <strong className="text-purple-900">WHAT:</strong> <span className="text-gray-700">View all errors with occurrence counts, stack traces, and severity</span>
              </div>
              <div className="text-sm">
                <strong className="text-purple-900">HOW:</strong> <span className="text-gray-700">Review errors, mark as fixed, and auto-add frequent errors to backlog</span>
              </div>
            </div>
          </div>
          <AdminNav />
        </div>

        {/* Stats */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <div className="grid grid-cols-2 md:grid-cols-6 gap-6">
            <div>
              <div className="text-3xl font-bold text-gray-900">{stats.total}</div>
              <div className="text-sm text-gray-600">Total Errors</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-purple-600">{stats.open}</div>
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
            <div>
              <div className="text-3xl font-bold text-blue-600">{stats.total_occurrences}</div>
              <div className="text-sm text-gray-600">Total Hits</div>
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
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Error Lists */}
        {statusFilter === 'all' || statusFilter === 'open' ? (
          renderErrorSection('⚠️ Open Errors', grouped.open)
        ) : null}

        {statusFilter === 'all' || statusFilter === 'resolved' ? (
          renderErrorSection('✅ Resolved', grouped.resolved)
        ) : null}

        {errors.length === 0 && (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <p className="text-gray-500 text-lg">
              No errors found. System running smoothly! 🎉
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

