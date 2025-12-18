'use client';

/**
 * Backlog Manager Component
 * Drag-and-drop interface for managing development backlog
 * Supports 3 priority levels: critical, high, normal
 */

import { useState, useEffect } from 'react';

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
    badge: 'bg-red-600 text-white'
  },
  high: {
    bg: 'bg-orange-50',
    border: 'border-orange-200',
    text: 'text-orange-900',
    badge: 'bg-orange-500 text-white'
  },
  normal: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    text: 'text-blue-900',
    badge: 'bg-blue-500 text-white'
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

export default function BacklogManager() {
  const [items, setItems] = useState<BacklogItem[]>([]);
  const [grouped, setGrouped] = useState<GroupedItems>({
    critical: [],
    high: [],
    normal: []
  });
  const [isLoading, setIsLoading] = useState(true);
  const [draggedItem, setDraggedItem] = useState<BacklogItem | null>(null);
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
  }, []);

  async function fetchBacklog() {
    try {
      const response = await fetch('/api/admin/backlog?status=pending');
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
        // Refresh backlog
        fetchBacklog();
        
        // Reset form
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

  async function handleUpdateItem(id: string, updates: Partial<BacklogItem>) {
    try {
      const response = await fetch('/api/admin/backlog', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...updates })
      });

      if (response.ok) {
        fetchBacklog();
      }
    } catch (error) {
      console.error('Failed to update item:', error);
    }
  }

  async function handleDeleteItem(id: string) {
    if (!confirm('Delete this backlog item?')) return;

    try {
      const response = await fetch(`/api/admin/backlog?id=${id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        fetchBacklog();
      }
    } catch (error) {
      console.error('Failed to delete item:', error);
    }
  }

  function handleDragStart(item: BacklogItem) {
    setDraggedItem(item);
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
  }

  async function handleDrop(e: React.DragEvent, targetItem: BacklogItem) {
    e.preventDefault();
    
    if (!draggedItem || draggedItem.id === targetItem.id) return;

    // Only allow reordering within same priority
    if (draggedItem.priority !== targetItem.priority) {
      alert('Can only reorder within the same priority level');
      return;
    }

    const priority = draggedItem.priority;
    const priorityItems = [...grouped[priority]];
    
    // Find indices
    const draggedIndex = priorityItems.findIndex(item => item.id === draggedItem.id);
    const targetIndex = priorityItems.findIndex(item => item.id === targetItem.id);

    // Reorder array
    const [removed] = priorityItems.splice(draggedIndex, 1);
    priorityItems.splice(targetIndex, 0, removed);

    // Update order_index for all items in this priority
    const updates = priorityItems.map((item, index) => ({
      id: item.id,
      order_index: index
    }));

    // Update UI immediately
    setGrouped({
      ...grouped,
      [priority]: priorityItems.map((item, index) => ({
        ...item,
        order_index: index
      }))
    });

    // Update backend
    try {
      await fetch('/api/admin/backlog/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: updates })
      });
    } catch (error) {
      console.error('Failed to reorder items:', error);
      // Refresh to get correct state
      fetchBacklog();
    }

    setDraggedItem(null);
  }

  function renderPrioritySection(priority: 'critical' | 'high' | 'normal') {
    const priorityItems = grouped[priority];
    const colors = priorityColors[priority];
    const priorityLabels = {
      critical: '🔴 CRITICAL',
      high: '🟠 HIGH',
      normal: '🔵 NORMAL'
    };

    return (
      <div key={priority} className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-bold text-gray-900">
            {priorityLabels[priority]}
          </h3>
          <span className="text-sm text-gray-500">
            {priorityItems.length} item{priorityItems.length !== 1 ? 's' : ''}
          </span>
        </div>

        <div className="space-y-2">
          {priorityItems.length === 0 ? (
            <div className={`${colors.bg} ${colors.border} border-2 border-dashed rounded-lg p-6 text-center`}>
              <p className={`${colors.text} text-sm`}>
                No {priority} priority items
              </p>
            </div>
          ) : (
            priorityItems.map((item) => (
              <div
                key={item.id}
                draggable
                onDragStart={() => handleDragStart(item)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, item)}
                className={`${colors.bg} ${colors.border} border-2 rounded-lg p-4 cursor-move hover:shadow-md transition-all ${
                  draggedItem?.id === item.id ? 'opacity-50' : ''
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-start gap-2 mb-2">
                      <span className="text-xl">
                        {categoryEmojis[item.category || 'other']}
                      </span>
                      <div className="flex-1">
                        <h4 className={`font-semibold ${colors.text}`}>
                          {item.title}
                        </h4>
                        {item.description && (
                          <p className="text-sm text-gray-600 mt-1">
                            {item.description}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 mt-2">
                      {item.category && (
                        <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                          {item.category}
                        </span>
                      )}
                      {item.estimated_hours && (
                        <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                          ⏱️ {item.estimated_hours}h
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleUpdateItem(item.id, { status: 'in_progress' })}
                      className="px-3 py-1 bg-green-500 text-white text-xs rounded hover:bg-green-600"
                      title="Start working"
                    >
                      ▶️
                    </button>
                    <button
                      onClick={() => handleUpdateItem(item.id, { status: 'completed' })}
                      className="px-3 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600"
                      title="Mark complete"
                    >
                      ✅
                    </button>
                    <button
                      onClick={() => handleDeleteItem(item.id)}
                      className="px-3 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600"
                      title="Delete"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin h-8 w-8 border-4 border-lexa-gold border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Development Backlog</h2>
          <p className="text-sm text-gray-600">
            Drag items to reorder within priority groups
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="px-4 py-2 bg-lexa-gold text-white rounded-lg hover:bg-lexa-navy transition-colors"
        >
          {showAddForm ? '✕ Cancel' : '+ Add Item'}
        </button>
      </div>

      {/* Add Item Form */}
      {showAddForm && (
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-gray-900 mb-3">Add New Backlog Item</h3>
          <div className="space-y-3">
            <input
              type="text"
              placeholder="Title *"
              value={newItem.title}
              onChange={(e) => setNewItem({ ...newItem, title: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-lexa-gold focus:border-transparent"
            />
            <textarea
              placeholder="Description"
              value={newItem.description}
              onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-lexa-gold focus:border-transparent"
              rows={2}
            />
            <div className="grid grid-cols-3 gap-3">
              <select
                value={newItem.priority}
                onChange={(e) => setNewItem({ ...newItem, priority: e.target.value as any })}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-lexa-gold focus:border-transparent"
              >
                <option value="critical">🔴 Critical</option>
                <option value="high">🟠 High</option>
                <option value="normal">🔵 Normal</option>
              </select>
              <select
                value={newItem.category}
                onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-lexa-gold focus:border-transparent"
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
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-lexa-gold focus:border-transparent"
              />
            </div>
            <button
              onClick={handleAddItem}
              disabled={!newItem.title.trim()}
              className="w-full px-4 py-2 bg-lexa-navy text-white rounded-lg hover:bg-lexa-gold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Add to Top of {newItem.priority.toUpperCase()} Priority
            </button>
          </div>
        </div>
      )}

      {/* Priority Sections */}
      {renderPrioritySection('critical')}
      {renderPrioritySection('high')}
      {renderPrioritySection('normal')}
    </div>
  );
}

