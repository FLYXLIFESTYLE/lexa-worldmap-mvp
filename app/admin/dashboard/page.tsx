'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import AdminNav from '@/components/admin/admin-nav';

interface Stat {
  value: number;
  formatted: string;
  label: string;
  percentage?: number;
}

interface DashboardStats {
  totalPOIs: Stat;
  luxuryPOIs: Stat;
  totalRelations: Stat;
  totalClients: Stat;
}

// Section 1: Active Tools - Production ready
const activeTools = [
  {
    id: 'users',
    name: 'User Management',
    description: 'Manage user accounts, roles, and permissions',
    icon: '👥',
    href: '/admin/users',
    color: 'bg-blue-500',
    features: ['View all users', 'Assign roles', 'User statistics']
  },
  {
    id: 'bug-reports',
    name: 'Bug Reports',
    description: 'User-reported bugs and issues requiring attention',
    icon: '🐛',
    href: '/admin/bugs',
    color: 'bg-red-500',
    features: ['Open/Resolved tickets', 'Severity levels', 'Screenshots']
  },
  {
    id: 'error-logs',
    name: 'System Errors',
    description: 'System errors and exceptions with auto-tracking',
    icon: '⚠️',
    href: '/admin/errors',
    color: 'bg-orange-500',
    features: ['Auto-deduplication', 'Occurrence tracking', 'Stack traces']
  },
  {
    id: 'chat-neo4j',
    name: 'ChatNeo4j',
    description: 'Query the Neo4j database using natural language',
    icon: '💬',
    href: '/admin/chat-neo4j',
    color: 'bg-green-500',
    features: ['Natural language queries', 'Cypher generation', 'Data exploration']
  },
  {
    id: 'data-quality',
    name: 'Data Quality Dashboard',
    description: 'Monitor data quality and completeness across the system',
    icon: '📈',
    href: '/admin/data-quality',
    color: 'bg-purple-500',
    features: ['POI completeness', 'Missing data reports', 'Quality scores']
  },
  {
    id: 'poi-collection',
    name: 'POI Collection',
    description: 'Bulk POI import and management tools',
    icon: '📍',
    href: '/admin/poi-collection',
    color: 'bg-yellow-500',
    features: ['Import POIs from CSV', 'Bulk updates', 'Category assignment']
  },
  {
    id: 'poi-search',
    name: 'POI Search & Edit',
    description: 'Search for POIs and edit their properties and scores',
    icon: '🔍',
    href: '/admin/knowledge/editor',
    color: 'bg-indigo-500',
    features: ['Search POIs', 'Edit properties', 'Update scores']
  },
  {
    id: 'release-notes',
    name: 'Release Notes',
    description: 'Daily changelog of features and improvements',
    icon: '📝',
    href: '/admin/release-notes',
    color: 'bg-teal-500',
    features: ['Daily updates', 'Feature tracking', 'Version history']
  },
  {
    id: 'documentation',
    name: 'Platform Architecture',
    description: 'Complete system architecture and technical docs',
    icon: '📖',
    href: '/admin/documentation',
    color: 'bg-pink-500',
    features: ['System architecture', 'Features list', 'Technical docs']
  }
];

// Section 2: In Development / Inactive Tools
const inactiveToo = [
  {
    id: 'backlog',
    name: 'Development Backlog',
    description: 'Track and manage all development tasks and priorities',
    icon: '📋',
    href: '/admin/backlog',
    color: 'bg-gray-500',
    features: ['Open/Resolved tracking', 'Priority management', 'Status tracking']
  },
  {
    id: 'seed-themes',
    name: 'Seed Themes',
    description: 'One-time theme category setup (rarely needed)',
    icon: '🎨',
    href: '/admin/seed-themes',
    color: 'bg-gray-500',
    features: ['Add theme categories', 'Update themes', 'One-time setup']
  },
  {
    id: 'yacht-destinations',
    name: 'Yacht Destinations Upload',
    description: 'Legacy yacht destination upload tool',
    icon: '⛵',
    href: '/admin/upload-yacht-destinations-v2',
    color: 'bg-gray-500',
    features: ['CSV upload', 'OCR for images', 'Luxury scoring']
  },
  {
    id: 'debug-profile',
    name: 'Debug Profile',
    description: 'Debug user profiles and sessions',
    icon: '🔧',
    href: '/admin/debug-profile',
    color: 'bg-gray-500',
    features: ['View user data', 'Session debugging', 'Profile editor']
  },
  {
    id: 'destinations',
    name: 'Destinations Browser',
    description: 'Being integrated into ChatNeo4j',
    icon: '🗺️',
    href: '#',
    color: 'bg-gray-500',
    features: ['POI statistics', 'Data quality', 'Destination coverage'],
    comingSoon: true
  }
];

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch stats on mount
  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/admin/stats');
      const data = await response.json().catch(() => null);
      
      if (!response.ok) {
        const message =
          data?.details ||
          data?.error ||
          `HTTP ${response.status}: Failed to fetch statistics`;
        setError(message);
        return;
      }

      if (data?.success) {
        setStats(data.stats as DashboardStats);
      } else {
        const message = data?.details || data?.error || 'Failed to fetch statistics';
        setError(message);
      }
    } catch (err) {
      console.error('Error fetching stats:', err);
      setError('Failed to connect to API');
    } finally {
      setLoading(false);
    }
  };

  const quickStats = [
    { 
      label: 'Total POIs', 
      value: stats?.totalPOIs.formatted || '...',
      rawValue: stats?.totalPOIs.value || 0,
      icon: '📍', 
      link: 'https://console-preview.neo4j.io/tools/dashboards/2e6AFJReMaPttnBcT3YW?page=z69tCEIMTxsyG3FrnAwb',
      color: 'blue'
    },
    { 
      label: 'Luxury POIs', 
      value: stats?.luxuryPOIs.formatted || '...',
      rawValue: stats?.luxuryPOIs.value || 0,
      percentage: stats?.luxuryPOIs.percentage,
      icon: '💎', 
      link: 'https://console-preview.neo4j.io/tools/dashboards/2e6AFJReMaPttnBcT3YW?page=z69tCEIMTxsyG3FrnAwb',
      color: 'purple'
    },
    { 
      label: 'Total Relations', 
      value: stats?.totalRelations.formatted || '...',
      rawValue: stats?.totalRelations.value || 0,
      icon: '🔗', 
      link: 'https://console-preview.neo4j.io/tools/dashboards/2e6AFJReMaPttnBcT3YW?page=z69tCEIMTxsyG3FrnAwb',
      color: 'green'
    },
    { 
      label: 'Total Clients', 
      value: stats?.totalClients.formatted || '...',
      rawValue: stats?.totalClients.value || 0,
      icon: '👥', 
      link: 'https://console-preview.neo4j.io/tools/dashboards/2e6AFJReMaPttnBcT3YW?page=z69tCEIMTxsyG3FrnAwb',
      color: 'orange'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header with Navigation */}
        <div className="flex items-start justify-between mb-8">
          <div className="flex-1">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              Admin Dashboard
            </h1>
            <p className="text-lg text-gray-600 mb-4">
              System management for Chris, Paul, and Bakary
            </p>
            
            {/* Why - What - How */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2 max-w-3xl">
              <div className="text-sm">
                <strong className="text-blue-900">3 SECTIONS:</strong> <span className="text-gray-700">Statistics • Active Tools • In Development</span>
              </div>
              <div className="text-sm">
                <strong className="text-blue-900">ACCESS:</strong> <span className="text-gray-700">Admin-only dashboard for system management and monitoring</span>
              </div>
              <div className="text-sm">
                <strong className="text-blue-900">TIP:</strong> <span className="text-gray-700">Use Quick Actions for common tasks, browse tools by section below</span>
              </div>
            </div>
          </div>
          <AdminNav />
        </div>

        {/* Quick Stats - SECTION 1 */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl">📊</span>
            <h2 className="text-2xl font-bold text-gray-900">Section 1: Statistics</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {loading ? (
            // Loading skeletons
            [1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white rounded-lg shadow-sm p-6 animate-pulse">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
                    <div className="h-8 bg-gray-200 rounded w-16"></div>
                  </div>
                  <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
                </div>
              </div>
            ))
          ) : error ? (
            // Error state
            <div className="col-span-4 bg-red-50 border border-red-200 rounded-lg p-6 text-center">
              <p className="text-red-800 mb-2">⚠️ Failed to load statistics</p>
              <p className="text-sm text-red-600 mb-4">{error}</p>
              {error.toLowerCase().includes('unauthorized') && (
                <div className="mb-4">
                  <Link
                    href="/auth/signin"
                    className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-gray-900 text-white hover:bg-gray-800 transition-colors"
                  >
                    Sign in to view stats
                  </Link>
                </div>
              )}
              <button
                onClick={fetchStats}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Retry
              </button>
            </div>
          ) : (
            // Live stats
            quickStats.map((stat) => (
              <a 
                key={stat.label} 
                href={stat.link}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-all cursor-pointer group"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">{stat.label}</p>
                    <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
                    {stat.percentage !== undefined && (
                      <p className="text-xs text-gray-500 mt-1">
                        {stat.percentage}% of total
                      </p>
                    )}
                    <p className="text-xs text-blue-600 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      View in Neo4j →
                    </p>
                  </div>
                  <div className="text-4xl">{stat.icon}</div>
                </div>
                {/* Placeholder for day-over-day change (coming soon) */}
                {/* <div className="mt-3 pt-3 border-t border-gray-100">
                  <span className="text-xs text-green-600">↑ +5.2% from yesterday</span>
                </div> */}
              </a>
            ))
          )}
          </div>
        </div>

        {/* Refresh Button */}
        {!loading && stats && (
          <div className="flex justify-end mb-4">
            <button
              onClick={fetchStats}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors flex items-center gap-2"
            >
              <span>🔄</span>
              <span>Refresh Stats</span>
            </button>
          </div>
        )}

        {/* Quick Actions - MOVED ABOVE TOOLS */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <button
              className="px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-left"
              onClick={() => window.location.href = '/admin/knowledge/editor'}
            >
              <div className="font-semibold mb-1">📝 Add New POI</div>
              <div className="text-sm text-blue-100">Create a new point of interest</div>
            </button>
            
            <button
              className="px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-left"
              onClick={() => window.location.href = '/admin/chat-neo4j'}
            >
              <div className="font-semibold mb-1">💬 Query Database</div>
              <div className="text-sm text-green-100">Ask questions in natural language</div>
            </button>
            
            <button
              className="px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-left"
              onClick={() => window.location.href = '/admin/knowledge'}
            >
              <div className="font-semibold mb-1">📚 Upload Knowledge</div>
              <div className="text-sm text-purple-100">Add files or scrape URLs</div>
            </button>

            <button
              className="px-4 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-left"
              onClick={() => window.location.href = '/admin/backlog'}
            >
              <div className="font-semibold mb-1">📋 Add to Backlog</div>
              <div className="text-sm text-orange-100">Create new task or feature</div>
            </button>
          </div>
        </div>

        {/* SECTION 2: Active Tools */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl">✅</span>
            <h2 className="text-2xl font-bold text-gray-900">Section 2: Active Tools</h2>
            <span className="text-sm text-gray-500">({activeTools.length} tools)</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {activeTools.map((tool) => (
              <Link
                key={tool.id}
                href={tool.href}
                className="bg-white rounded-lg shadow-sm hover:shadow-md transition-all overflow-hidden"
              >
                <div className={`${tool.color} h-2`}></div>
                <div className="p-6">
                  <div className="flex items-center mb-3">
                    <span className="text-4xl mr-3">{tool.icon}</span>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {tool.name}
                      </h3>
                    </div>
                  </div>
                  <p className="text-gray-600 text-sm mb-4">
                    {tool.description}
                  </p>
                  <div className="space-y-1">
                    {tool.features.map((feature, idx) => (
                      <div key={idx} className="flex items-center text-xs text-gray-500">
                        <span className="mr-2">✓</span>
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* SECTION 3: In Development / Inactive */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl">🚧</span>
            <h2 className="text-2xl font-bold text-gray-900">Section 3: In Development / Inactive</h2>
            <span className="text-sm text-gray-500">({inactiveToo.length} tools)</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {inactiveToo.map((tool) => (
              <Link
                key={tool.id}
                href={tool.comingSoon ? '#' : tool.href}
                className={`bg-white rounded-lg shadow-sm hover:shadow-md transition-all overflow-hidden ${
                  tool.comingSoon ? 'opacity-60 cursor-not-allowed' : 'opacity-70 hover:opacity-100'
                }`}
                onClick={(e) => tool.comingSoon && e.preventDefault()}
              >
                <div className={`${tool.color} h-2`}></div>
                <div className="p-6">
                  <div className="flex items-center mb-3">
                    <span className="text-4xl mr-3">{tool.icon}</span>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {tool.name}
                        {tool.comingSoon && (
                          <span className="ml-2 text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded">
                            Coming Soon
                          </span>
                        )}
                      </h3>
                    </div>
                  </div>
                  <p className="text-gray-600 text-sm mb-4">
                    {tool.description}
                  </p>
                  <div className="space-y-1">
                    {tool.features.map((feature, idx) => (
                      <div key={idx} className="flex items-center text-xs text-gray-500">
                        <span className="mr-2">✓</span>
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* System Status */}
        <div className="mt-6 bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">System Status</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Neo4j Database</span>
              <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                ● Connected
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Claude AI API</span>
              <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                ● Active
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Google Places API</span>
              <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                ● Active
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

