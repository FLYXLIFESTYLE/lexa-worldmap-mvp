'use client';

import Link from 'next/link';
import AdminNav from '@/components/admin/admin-nav';

const adminTools = [
  {
    id: 'captains-portal',
    name: "Captain's Knowledge Portal",
    description: 'Contribute knowledge, upload files, scrape URLs, and manage content',
    icon: '📚',
    href: '/admin/knowledge',
    color: 'bg-blue-500',
    features: ['Upload files', 'Scrape URLs', 'Manual input', 'Knowledge browser']
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
    id: 'destinations',
    name: 'Destinations Browser',
    description: 'Browse POIs by destination with statistics and data quality metrics',
    icon: '🗺️',
    href: '/admin/destinations',
    color: 'bg-purple-500',
    features: ['POI statistics', 'Data quality', 'Destination coverage']
  },
  {
    id: 'poi-search',
    name: 'POI Search & Edit',
    description: 'Search for POIs and edit their properties, scores, and relationships',
    icon: '🔍',
    href: '/admin/knowledge/editor',
    color: 'bg-yellow-500',
    features: ['Search POIs', 'Edit properties', 'Update scores', 'Add comments']
  },
  {
    id: 'scraped-urls',
    name: 'Scraped URLs Manager',
    description: 'View and manage scraped URLs, re-trigger scrapes, and check status',
    icon: '🌐',
    href: '/admin/knowledge/scraped-urls',
    color: 'bg-indigo-500',
    features: ['URL history', 'Re-scrape', 'Status tracking', 'Subpage detection']
  },
  {
    id: 'documentation',
    name: 'LEXA Architecture',
    description: 'Complete system architecture, features, and technical documentation',
    icon: '📖',
    href: '/admin/documentation',
    color: 'bg-red-500',
    features: ['System architecture', 'Features list', 'Technical docs']
  },
  {
    id: 'data-quality',
    name: 'Data Quality Agent',
    description: 'Run data quality checks, merge duplicates, and fix relationships',
    icon: '🔧',
    href: '#',
    color: 'bg-gray-500',
    features: ['Duplicate detection', 'Merge POIs', 'Relationship fixes'],
    comingSoon: true
  },
  {
    id: 'enrichment',
    name: 'Enrichment Dashboard',
    description: 'Monitor enrichment progress, costs, and data quality metrics',
    icon: '💎',
    href: '#',
    color: 'bg-pink-500',
    features: ['Progress tracking', 'Cost estimation', 'Quality metrics'],
    comingSoon: true
  }
];

const quickStats = [
  { label: 'Total POIs', value: '203,000+', icon: '📍' },
  { label: 'Luxury POIs', value: '50,000+', icon: '💎' },
  { label: 'Destinations', value: '256', icon: '🏙️' },
  { label: 'Activities', value: '384K+', icon: '🎯' }
];

export default function AdminDashboard() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header with Navigation */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              Admin Dashboard
            </h1>
            <p className="text-lg text-gray-600">
              Manage LEXA's knowledge base, data quality, and system operations
            </p>
          </div>
          <AdminNav />
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          {quickStats.map((stat) => (
            <div key={stat.label} className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">{stat.label}</p>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                </div>
                <div className="text-4xl">{stat.icon}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Admin Tools Grid */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Admin Tools</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {adminTools.map((tool) => (
              <Link
                key={tool.id}
                href={tool.comingSoon ? '#' : tool.href}
                className={`bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow overflow-hidden ${
                  tool.comingSoon ? 'opacity-60 cursor-not-allowed' : ''
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

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
          </div>
        </div>

        {/* System Status (placeholder for future) */}
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

