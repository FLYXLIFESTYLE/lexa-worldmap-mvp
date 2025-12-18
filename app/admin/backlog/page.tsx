'use client';

import { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import AdminNav from '@/components/admin/admin-nav';
import Link from 'next/link';
import { format } from 'date-fns';

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

const statusColors = {
  pending: 'bg-yellow-100 text-yellow-800',
  in_progress: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-gray-100 text-gray-800'
};

const categoryEmojis: Record<string, string> = {
  feature: '✨',
  bug: '🐛',
  enhancement: '🚀',
  infrastructure: '🏗️',
  data: '💾',
  ui: '🎨',
  other: '📌'
};

export default function BacklogPage() {
  const [items, setItems] = useState<BacklogItem[]>([]);
  const [grouped, setGrouped] = useState<GroupedItems>({
    critical: [],
    high: [],
    normal: []
  });
  const [stats, setStats] = useState({ total: 0, open: 0, resolved: 0, critical: 0, high: 0 });
  const [statusFilter, setStatusFilter] = useState<'open' | 'resolved' | 'all'>('open');
  const [categoryFilter, setCategoryFilter] = useState<string | 'all'>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingItem, setEditingItem] = useState<BacklogItem | null>(null);
  const [newItem, setNewItem] = useState({
    title: '',
    description: '',
    priority: 'high' as 'critical' | 'high' | 'normal',
    category: 'feature',
    estimated_hours: ''
  });

  useEffect(() => {
    fetchBacklog();
  }, [statusFilter, categoryFilter]);

  async function fetchBacklog() {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/admin/backlog`);
      const data = await response.json();
      
      if (data.success) {
        let filteredItems = data.items;
        
        // Filter by open/resolved status
        if (statusFilter === 'open') {
          filteredItems = filteredItems.filter((item: BacklogItem) => 
            item.status === 'pending' || item.status === 'in_progress'
          );
        } else if (statusFilter === 'resolved') {
          filteredItems = filteredItems.filter((item: BacklogItem) => 
            item.status === 'completed' || item.status === 'cancelled'
          );
        }
        
        // Filter by category
        if (categoryFilter !== 'all') {
          filteredItems = filteredItems.filter((item: BacklogItem) => item.category === categoryFilter);
        }
        
        // Regroup filtered items
        const newGrouped: GroupedItems = {
          critical: filteredItems.filter((item: BacklogItem) => item.priority === 'critical').sort((a: BacklogItem, b: BacklogItem) => a.order_index - b.order_index),
          high: filteredItems.filter((item: BacklogItem) => item.priority === 'high').sort((a: BacklogItem, b: BacklogItem) => a.order_index - b.order_index),
          normal: filteredItems.filter((item: BacklogItem) => item.priority === 'normal').sort((a: BacklogItem, b: BacklogItem) => a.order_index - b.order_index)
        };
        
        // Calculate stats
        const openCount = data.items.filter((item: BacklogItem) => 
          item.status === 'pending' || item.status === 'in_progress'
        ).length;
        const resolvedCount = data.items.filter((item: BacklogItem) => 
          item.status === 'completed' || item.status === 'cancelled'
        ).length;
        
        setItems(filteredItems);
        setGrouped(newGrouped);
        setStats({
          total: data.items.length,
          open: openCount,
          resolved: resolvedCount,
          critical: newGrouped.critical.length,
          high: newGrouped.high.length
        });
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

  async function handleUpdateItem(item: BacklogItem) {
    try {
      const response = await fetch('/api/admin/backlog', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item)
      });

      if (response.ok) {
        setEditingItem(null);
        fetchBacklog();
      }
    } catch (error) {
      console.error('Failed to update item:', error);
    }
  }

  async function handleDeleteItem(id: string) {
    if (!confirm('Are you sure you want to delete this item?')) return;

    try {
      const response = await fetch('/api/admin/backlog', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });

      if (response.ok) {
        fetchBacklog();
      }
    } catch (error) {
      console.error('Failed to delete item:', error);
    }
  }

  async function onDragEnd(result: DropResult) {
    const { source, destination } = result;

    if (!destination) return;

    // Same position, no change
    if (source.droppableId === destination.droppableId && source.index === destination.index) {
      return;
    }

    const sourcePriority = source.droppableId as 'critical' | 'high' | 'normal';
    const destPriority = destination.droppableId as 'critical' | 'high' | 'normal';

    // Create new grouped state
    const newGrouped = { ...grouped };
    const sourceItems = Array.from(newGrouped[sourcePriority]);
    const [movedItem] = sourceItems.splice(source.index, 1);

    // Update item priority if moving between buckets
    if (sourcePriority !== destPriority) {
      movedItem.priority = destPriority;
    }

    if (sourcePriority === destPriority) {
      // Moving within same priority
      sourceItems.splice(destination.index, 0, movedItem);
      newGrouped[sourcePriority] = sourceItems;
    } else {
      // Moving between priorities
      const destItems = Array.from(newGrouped[destPriority]);
      destItems.splice(destination.index, 0, movedItem);
      newGrouped[sourcePriority] = sourceItems;
      newGrouped[destPriority] = destItems;
    }

    // Optimistic update
    setGrouped(newGrouped);

    // Update server
    try {
      // Update priority if changed
      if (sourcePriority !== destPriority) {
        await fetch('/api/admin/backlog', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: movedItem.id, priority: destPriority })
        });
      }

      // Reorder all items in affected priorities
      const updates: Array<{ id: string; order_index: number }> = [];
      if (sourcePriority === destPriority) {
        // Update only one priority
        newGrouped[sourcePriority].forEach((item, index) => {
          updates.push({ id: item.id, order_index: index });
        });
      } else {
        // Update both priorities
        newGrouped[sourcePriority].forEach((item, index) => {
          updates.push({ id: item.id, order_index: index });
        });
        newGrouped[destPriority].forEach((item, index) => {
          updates.push({ id: item.id, order_index: index });
        });
      }

      // Send batch update
      await fetch('/api/admin/backlog/reorder', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reorderedItems: updates })
      });
    } catch (error) {
      console.error('Failed to reorder items:', error);
      fetchBacklog(); // Revert on error
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

    return (
      <Droppable droppableId={priority} key={priority}>
        {(provided, snapshot) => (
          <div className="mb-8">
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

            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className={`space-y-3 min-h-[100px] rounded-lg p-4 transition-colors ${
                snapshot.isDraggingOver ? 'bg-gray-100' : 'bg-transparent'
              }`}
            >
              {priorityItems.length === 0 && (
                <div className="text-center py-8 text-gray-400">
                  Drop items here or they'll appear when you add them
                </div>
              )}

              {priorityItems.map((item, index) => (
                <Draggable key={item.id} draggableId={item.id} index={index}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      className={`${colors.bg} ${colors.border} border-2 rounded-lg p-5 ${
                        snapshot.isDragging ? 'shadow-lg rotate-2' : ''
                      }`}
                    >
                      {editingItem?.id === item.id ? (
                        <EditItemForm
                          item={editingItem}
                          onSave={handleUpdateItem}
                          onCancel={() => setEditingItem(null)}
                          onDelete={() => handleDeleteItem(item.id)}
                        />
                      ) : (
                        <div className="flex items-start justify-between gap-4">
                          <div {...provided.dragHandleProps} className="flex items-start gap-3 flex-1 cursor-grab active:cursor-grabbing">
                            <div className="text-gray-400 mt-1">⋮⋮</div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2 flex-wrap">
                                <span className="text-xl">
                                  {categoryEmojis[item.category || 'other']}
                                </span>
                                {item.category && (
                                  <span className="px-2 py-1 bg-white/60 text-gray-700 text-xs font-medium rounded-full">
                                    {item.category}
                                  </span>
                                )}
                                <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColors[item.status]}`}>
                                  {item.status.replace('_', ' ')}
                                </span>
                                {item.estimated_hours && (
                                  <span className="px-2 py-1 bg-white/60 text-gray-700 text-xs font-medium rounded-full">
                                    ⏱️ {item.estimated_hours}h
                                  </span>
                                )}
                              </div>

                              <h3 className={`text-lg font-bold ${colors.text} mb-2`}>
                                {item.title}
                              </h3>

                              {item.description && (
                                <p className="text-gray-700 text-sm leading-relaxed mb-2">
                                  {item.description}
                                </p>
                              )}

                              {item.tags && item.tags.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-2">
                                  {item.tags.map((tag, idx) => (
                                    <span key={idx} className="px-2 py-1 bg-white/80 text-gray-600 text-xs rounded-full">
                                      #{tag}
                                    </span>
                                  ))}
                                </div>
                              )}

                              <div className="text-xs text-gray-500 mt-3">
                                Created: {format(new Date(item.created_at), 'MMM d, yyyy')} • 
                                Updated: {format(new Date(item.updated_at), 'MMM d, yyyy')}
                              </div>
                            </div>
                          </div>

                          <button
                            onClick={() => setEditingItem(item)}
                            className="px-3 py-2 bg-white text-gray-700 text-sm rounded-lg hover:bg-gray-100 transition-colors flex-shrink-0"
                          >
                            ✏️ Edit
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          </div>
        )}
      </Droppable>
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
              📋 Development Backlog
            </h1>
            <p className="text-lg text-gray-600 mb-4">
              Drag & drop to reorder • Click Edit for inline editing
            </p>
            
            {/* Why - What - How */}
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 space-y-2 max-w-2xl">
              <div className="text-sm">
                <strong className="text-purple-900">WHY:</strong> <span className="text-gray-700">Keep all tasks organized by priority for efficient development planning</span>
              </div>
              <div className="text-sm">
                <strong className="text-purple-900">WHAT:</strong> <span className="text-gray-700">Drag to reorder within or between priority buckets, click Edit for inline changes</span>
              </div>
              <div className="text-sm">
                <strong className="text-purple-900">HOW:</strong> <span className="text-gray-700">Grab ⋮⋮ icon to drag, click Edit button to modify, filter by status</span>
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
          <div className="space-y-3">
            <div className="flex gap-2">
              {[
                { value: 'open', label: 'Open', count: stats.open },
                { value: 'resolved', label: 'Resolved', count: stats.resolved },
                { value: 'all', label: 'All', count: stats.total }
              ].map(({ value, label, count }) => (
                <button
                  key={value}
                  onClick={() => setStatusFilter(value as any)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    statusFilter === value
                      ? 'bg-lexa-navy text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {label} ({count})
                </button>
              ))}
            </div>
            
            {/* Category Filter */}
            <div className="flex gap-2">
              {[
                { value: 'all', label: 'All Categories', emoji: '📋' },
                { value: 'feature', label: 'Feature', emoji: '✨' },
                { value: 'bug', label: 'Bug', emoji: '🐛' },
                { value: 'enhancement', label: 'Enhancement', emoji: '🚀' },
                { value: 'infrastructure', label: 'Infrastructure', emoji: '🏗️' },
                { value: 'data', label: 'Data', emoji: '💾' },
                { value: 'ui', label: 'UI', emoji: '🎨' },
                { value: 'other', label: 'Other', emoji: '📌' }
              ].map(({ value, label, emoji }) => (
                <button
                  key={value}
                  onClick={() => setCategoryFilter(value)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    categoryFilter === value
                      ? 'bg-lexa-gold text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
                  }`}
                >
                  {emoji} {label}
                </button>
              ))}
            </div>
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
                  <option value="other">📌 Other</option>
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

        {/* Drag & Drop Context */}
        <DragDropContext onDragEnd={onDragEnd}>
          {renderPrioritySection('critical')}
          {renderPrioritySection('high')}
          {renderPrioritySection('normal')}
        </DragDropContext>

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

// Inline Edit Form Component
function EditItemForm({ 
  item, 
  onSave, 
  onCancel, 
  onDelete 
}: { 
  item: BacklogItem; 
  onSave: (item: BacklogItem) => void; 
  onCancel: () => void; 
  onDelete: () => void;
}) {
  const [editedItem, setEditedItem] = useState(item);

  const handleSave = () => {
    onSave(editedItem);
  };

  return (
    <div className="space-y-3">
      <input
        type="text"
        value={editedItem.title}
        onChange={(e) => setEditedItem({ ...editedItem, title: e.target.value })}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
      />
      <textarea
        value={editedItem.description || ''}
        onChange={(e) => setEditedItem({ ...editedItem, description: e.target.value })}
        rows={2}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
      />
      <div className="grid grid-cols-3 gap-2">
        <select
          value={editedItem.status}
          onChange={(e) => setEditedItem({ ...editedItem, status: e.target.value as any })}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
        >
          <option value="pending">Pending</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <select
          value={editedItem.category || 'other'}
          onChange={(e) => setEditedItem({ ...editedItem, category: e.target.value })}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
        >
          <option value="feature">✨ Feature</option>
          <option value="bug">🐛 Bug</option>
          <option value="enhancement">🚀 Enhancement</option>
          <option value="infrastructure">🏗️ Infrastructure</option>
          <option value="data">💾 Data</option>
          <option value="ui">🎨 UI</option>
          <option value="other">📌 Other</option>
        </select>
        <input
          type="number"
          step="0.5"
          value={editedItem.estimated_hours || ''}
          onChange={(e) => setEditedItem({ ...editedItem, estimated_hours: parseFloat(e.target.value) || null })}
          placeholder="Hours"
          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
        />
      </div>
      <div className="flex gap-2">
        <button
          onClick={handleSave}
          className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
        >
          ✓ Save
        </button>
        <button
          onClick={onCancel}
          className="flex-1 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors font-medium"
        >
          ✕ Cancel
        </button>
        <button
          onClick={onDelete}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
        >
          🗑️
        </button>
      </div>
    </div>
  );
}
