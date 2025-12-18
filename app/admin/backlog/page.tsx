'use client';

/**
 * Backlog Overview Page
 * Dedicated page for viewing and managing all backlog items
 * Similar to Release Notes but for development tasks
 */

import { useState, useEffect } from 'react';
import AdminNav from '@/components/admin/admin-nav';
import Link from 'next/link';

interface BacklogItem {
  id: string;
  title: string;
  description: string | null;
  priority: 'critical' | 'high' | 'normal';
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  category: string | null;
  order_index: number;
  estimated_hours: number | null;
  tags: string[];
  notes: string | null;
  created_at: string;
  updated_at: string;
}

interface GroupedItems {
  critical: BacklogItem[];
  high: BacklogItem[];
  normal: BacklogItem[];
}

const priorityColors = {
  critical: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    text: 'text-red-900',
    badge: 'bg-red-600 text-white',
    icon: '🔴'
  },
  high: {
    bg: 'bg-orange-50',
    border: 'border-orange-200',
    text: 'text-orange-900',
    badge: 'bg-orange-500 text-white',
    icon: '🟠'
  },
  normal: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    text: 'text-blue-900',
    badge: 'bg-blue-500 text-white',
    icon: '🔵'
  }
};

const categoryEmojis: Record<string, string> = {
  feature: '✨',
  bug: '🐛',
  enhancement: '🚀',
  infrastructure: '🏗️',
  data: '💾',
  ui: '🎨',
  other: '📝'
};

export default function BacklogPage() {
  const [items, setItems] = useState<BacklogItem[]>([]);
  const [grouped, setGrouped] = useState<GroupedItems>({
    critical: [],
    high: [],
    normal: []
  });
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'pending' | 'in_progress' | 'completed' | 'all'>('pending');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newItem, setNewItem] = useState({
    title: '',
    description: '',
    priority: 'high' as 'critical' | 'high' | 'normal',
    category: 'feature',
    estimated_hours: ''
  });

  useEffect(() => {
    fetchBacklog();
  }, [statusFilter]);

  async function fetchBacklog() {
    try {
      const response = await fetch(`/api/admin/backlog?status=${statusFilter}`);
      const data = await response.json();
      
      if (data.success) {
        setItems(data.items);
        setGrouped(data.grouped);
      }
    } catch (error) {
      console.error('Failed to fetch backlog:', error);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleAddItem() {
    if (!newItem.title.trim()) return;

    try {
      const response = await fetch('/api/admin/backlog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newItem,
          estimated_hours: newItem.estimated_hours ? parseFloat(newItem.estimated_hours) : null
        })
      });

      const data = await response.json();
      
      if (data.success) {
        fetchBacklog();
        setNewItem({
          title: '',
          description: '',
          priority: 'high',
          category: 'feature',
          estimated_hours: ''
        });
        setShowAddForm(false);
      }
    } catch (error) {
      console.error('Failed to add item:', error);
    }
  }

  async function handleUpdateStatus(id: string, status: string) {
    try {
      const response = await fetch('/api/admin/backlog', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status })
      });

      if (response.ok) {
        fetchBacklog();
      }
    } catch (error) {
      console.error('Failed to update item:', error);
    }
  }

  function renderPrioritySection(priority: 'critical' | 'high' | 'normal') {
    const priorityItems = grouped[priority];
    const colors = priorityColors[priority];
    const priorityLabels = {
      critical: 'CRITICAL',
      high: 'HIGH PRIORITY',
      normal: 'NORMAL'
    };

    if (priorityItems.length === 0) return null;

    return (
      <div key={priority} className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-3xl">{colors.icon}</span>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {priorityLabels[priority]}
            </h2>
            <p className="text-sm text-gray-600">
              {priorityItems.length} item{priorityItems.length !== 1 ? 's' : ''}
              {priorityItems.some(i => i.estimated_hours) && (
                <span className="ml-2">
                  • Total: {priorityItems.reduce((sum, item) => sum + (item.estimated_hours || 0), 0)}h estimated
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {priorityItems.map((item) => (
            <div
              key={item.id}
              className={`${colors.bg} ${colors.border} border-2 rounded-lg p-5 hover:shadow-md transition-all`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-start gap-3 mb-2">
                    <span className="text-2xl">
                      {categoryEmojis[item.category || 'other']}
                    </span>
                    <div className="flex-1">
                      <h3 className={`text-lg font-semibold ${colors.text} mb-1`}>
                        {item.title}
                      </h3>
                      {item.description && (
                        <p className="text-gray-700 text-sm leading-relaxed">
                          {item.description}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 mt-3 ml-11">
                    {item.category && (
                      <span className="px-3 py-1 bg-white/60 text-gray-700 text-xs font-medium rounded-full">
                        {item.category}
                      </span>
                    )}
                    {item.estimated_hours && (
                      <span className="px-3 py-1 bg-white/60 text-gray-700 text-xs font-medium rounded-full">
                        ⏱️ {item.estimated_hours}h
                      </span>
                    )}
                    {item.status === 'in_progress' && (
                      <span className="px-3 py-1 bg-green-500 text-white text-xs font-medium rounded-full">
                        ▶️ In Progress
                      </span>
                    )}
                  </div>
                </div>

                {item.status === 'pending' && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleUpdateStatus(item.id, 'in_progress')}
                      className="px-4 py-2 bg-green-500 text-white text-sm rounded-lg hover:bg-green-600 transition-colors"
                      title="Start working"
                    >
                      ▶️ Start
                    </button>
                    <button
                      onClick={() => handleUpdateStatus(item.id, 'completed')}
                      className="px-4 py-2 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600 transition-colors"
                      title="Mark complete"
                    >
                      ✅ Done
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-lexa-gold mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading backlog...</p>
        </div>
      </div>
    );
  }

  const totalItems = items.length;
  const totalHours = items.reduce((sum, item) => sum + (item.estimated_hours || 0), 0);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div className="flex-1">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              Development Backlog
            </h1>
            <p className="text-lg text-gray-600 mb-4">
              Track and manage all development tasks, features, and improvements
            </p>
            
            {/* Why - What - How */}
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 space-y-2 max-w-2xl">
              <div className="text-sm">
                <strong className="text-purple-900">WHY:</strong> <span className="text-gray-700">Keep all tasks organized by priority for efficient development planning</span>
              </div>
              <div className="text-sm">
                <strong className="text-purple-900">WHAT:</strong> <span className="text-gray-700">View all backlog items grouped by priority (Critical/High/Normal)</span>
              </div>
              <div className="text-sm">
                <strong className="text-purple-900">HOW:</strong> <span className="text-gray-700">Filter by status, add new items, or mark tasks as started/completed</span>
              </div>
            </div>
          </div>
          <AdminNav />
        </div>

        {/* Stats & Filters */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex gap-6">
              <div>
                <div className="text-3xl font-bold text-gray-900">{totalItems}</div>
                <div className="text-sm text-gray-600">Total Items</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-lexa-gold">{totalHours}h</div>
                <div className="text-sm text-gray-600">Estimated</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-red-600">{grouped.critical.length}</div>
                <div className="text-sm text-gray-600">Critical</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-orange-600">{grouped.high.length}</div>
                <div className="text-sm text-gray-600">High</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-blue-600">{grouped.normal.length}</div>
                <div className="text-sm text-gray-600">Normal</div>
              </div>
            </div>

            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="px-6 py-3 bg-lexa-gold text-white rounded-lg hover:bg-lexa-navy transition-colors font-semibold"
            >
              {showAddForm ? '✕ Cancel' : '+ Add Item'}
            </button>
          </div>

          {/* Status Filter */}
          <div className="flex gap-2">
            {['pending', 'in_progress', 'completed', 'all'].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status as any)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  statusFilter === status
                    ? 'bg-lexa-navy text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        {/* Add Item Form */}
        {showAddForm && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Add New Backlog Item</h3>
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Title *"
                value={newItem.title}
                onChange={(e) => setNewItem({ ...newItem, title: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-lexa-gold focus:border-transparent"
              />
              <textarea
                placeholder="Description"
                value={newItem.description}
                onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-lexa-gold focus:border-transparent"
                rows={3}
              />
              <div className="grid grid-cols-3 gap-4">
                <select
                  value={newItem.priority}
                  onChange={(e) => setNewItem({ ...newItem, priority: e.target.value as any })}
                  className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-lexa-gold focus:border-transparent"
                >
                  <option value="critical">🔴 Critical</option>
                  <option value="high">🟠 High</option>
                  <option value="normal">🔵 Normal</option>
                </select>
                <select
                  value={newItem.category}
                  onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
                  className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-lexa-gold focus:border-transparent"
                >
                  <option value="feature">✨ Feature</option>
                  <option value="bug">🐛 Bug</option>
                  <option value="enhancement">🚀 Enhancement</option>
                  <option value="infrastructure">🏗️ Infrastructure</option>
                  <option value="data">💾 Data</option>
                  <option value="ui">🎨 UI</option>
                  <option value="other">📝 Other</option>
                </select>
                <input
                  type="number"
                  step="0.5"
                  placeholder="Hours"
                  value={newItem.estimated_hours}
                  onChange={(e) => setNewItem({ ...newItem, estimated_hours: e.target.value })}
                  className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-lexa-gold focus:border-transparent"
                />
              </div>
              <button
                onClick={handleAddItem}
                disabled={!newItem.title.trim()}
                className="w-full px-6 py-3 bg-lexa-navy text-white rounded-lg hover:bg-lexa-gold transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
              >
                Add to Backlog
              </button>
            </div>
          </div>
        )}

        {/* Backlog Items by Priority */}
        <div>
          {renderPrioritySection('critical')}
          {renderPrioritySection('high')}
          {renderPrioritySection('normal')}

          {totalItems === 0 && (
            <div className="bg-white rounded-lg shadow-sm p-12 text-center">
              <p className="text-gray-500 text-lg">
                No {statusFilter !== 'all' ? statusFilter : ''} backlog items found.
              </p>
              <button
                onClick={() => setShowAddForm(true)}
                className="mt-4 px-6 py-3 bg-lexa-gold text-white rounded-lg hover:bg-lexa-navy transition-colors"
              >
                Add Your First Item
              </button>
            </div>
          )}
        </div>

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

