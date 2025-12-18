'use client';

import { useState, useEffect } from 'react';
import AdminNav from '@/components/admin/admin-nav';
import { ReleaseDay, ReleaseNote, SortOrder, FilterScope } from '@/lib/release-notes/types';

const categoryColors = {
  feature: 'bg-blue-100 text-blue-800',
  enhancement: 'bg-green-100 text-green-800',
  bugfix: 'bg-red-100 text-red-800',
  performance: 'bg-yellow-100 text-yellow-800',
  documentation: 'bg-purple-100 text-purple-800',
  infrastructure: 'bg-gray-100 text-gray-800',
  security: 'bg-orange-100 text-orange-800',
  database: 'bg-indigo-100 text-indigo-800'
};

const categoryIcons = {
  feature: '✨',
  enhancement: '🚀',
  bugfix: '🐛',
  performance: '⚡',
  documentation: '📖',
  infrastructure: '🏗️',
  security: '🔒',
  database: '💾'
};

export default function ReleaseNotesPage() {
  const [days, setDays] = useState<ReleaseDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortOrder, setSortOrder] = useState<SortOrder>('newest-first');
  const [filterScope, setFilterScope] = useState<FilterScope>('all');
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchReleaseNotes();
  }, [sortOrder, filterScope]);

  async function fetchReleaseNotes() {
    setLoading(true);
    try {
      const response = await fetch(`/api/release-notes?sort=${sortOrder}&scope=${filterScope}`);
      const data = await response.json();
      
      if (data.success) {
        setDays(data.days);
      }
    } catch (error) {
      console.error('Failed to fetch release notes:', error);
    } finally {
      setLoading(false);
    }
  }

  function toggleDay(date: string) {
    const newExpanded = new Set(expandedDays);
    if (newExpanded.has(date)) {
      newExpanded.delete(date);
    } else {
      newExpanded.add(date);
    }
    setExpandedDays(newExpanded);
  }

  function formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading release notes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              Release Notes
            </h1>
            <p className="text-lg text-gray-600">
              Daily changelog and feature updates
            </p>
          </div>
          <AdminNav />
        </div>

        {/* Filters & Sort */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Sort Order */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Sort Order
              </label>
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as SortOrder)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="newest-first">Newest First</option>
                <option value="oldest-first">Oldest First</option>
                <option value="by-feature">By Feature (Most Active)</option>
              </select>
            </div>

            {/* Filter Scope */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Visibility
              </label>
              <select
                value={filterScope}
                onChange={(e) => setFilterScope(e.target.value as FilterScope)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Notes</option>
                <option value="public">Public Only</option>
                <option value="internal">Internal Only</option>
              </select>
            </div>
          </div>

          {/* Stats */}
          <div className="mt-4 pt-4 border-t border-gray-200 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900">{days.length}</p>
              <p className="text-sm text-gray-600">Days</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900">
                {days.reduce((sum, day) => sum + day.totalChanges, 0)}
              </p>
              <p className="text-sm text-gray-600">Total Changes</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-900">
                {days.reduce((sum, day) => sum + day.notes.filter(n => n.category === 'feature').length, 0)}
              </p>
              <p className="text-sm text-gray-600">Features</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-red-900">
                {days.reduce((sum, day) => sum + day.notes.filter(n => n.category === 'bugfix').length, 0)}
              </p>
              <p className="text-sm text-gray-600">Bugfixes</p>
            </div>
          </div>
        </div>

        {/* Release Days */}
        {days.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <p className="text-gray-500 text-lg">No release notes found.</p>
            <p className="text-gray-400 text-sm mt-2">
              Release notes will be captured automatically daily at midnight.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {days.map((day) => {
              const isExpanded = expandedDays.has(day.date);
              
              return (
                <div key={day.date} className="bg-white rounded-lg shadow-sm overflow-hidden">
                  {/* Day Header */}
                  <button
                    onClick={() => toggleDay(day.date)}
                    className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="text-2xl">
                        {isExpanded ? '📂' : '📁'}
                      </div>
                      <div className="text-left">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {formatDate(day.date)}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {day.totalChanges} change{day.totalChanges !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                    <svg
                      className={`w-6 h-6 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {/* Day Content */}
                  {isExpanded && (
                    <div className="px-6 pb-6 space-y-4">
                      {day.notes.map((note) => (
                        <div key={note.id} className="border-l-4 border-gray-200 pl-4 py-2">
                          <div className="flex items-start justify-between">
                            <div className="flex items-start space-x-3 flex-1">
                              <span className="text-2xl">{categoryIcons[note.category]}</span>
                              <div className="flex-1">
                                <div className="flex items-center space-x-2 mb-1">
                                  <h4 className="font-semibold text-gray-900">{note.title}</h4>
                                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${categoryColors[note.category]}`}>
                                    {note.category}
                                  </span>
                                  {!note.isPublic && (
                                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-200 text-gray-700">
                                      Internal
                                    </span>
                                  )}
                                </div>
                                <p className="text-sm text-gray-600 mb-2">{note.description}</p>
                                
                                {note.details && (
                                  <details className="text-sm text-gray-500">
                                    <summary className="cursor-pointer hover:text-gray-700">
                                      View details
                                    </summary>
                                    <div className="mt-2 pl-4 border-l-2 border-gray-200">
                                      {note.details}
                                    </div>
                                  </details>
                                )}
                                
                                {note.tags && note.tags.length > 0 && (
                                  <div className="flex flex-wrap gap-2 mt-2">
                                    {note.tags.map((tag, idx) => (
                                      <span key={idx} className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded">
                                        {tag}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

