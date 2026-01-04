'use client';

import Link from 'next/link';
import AdminNav from '@/components/admin/admin-nav';

type ToolCard = {
  id: string;
  name: string;
  description: string;
  icon: string;
  href: string;
  accentClass: string;
  features: string[];
  disabled?: boolean;
};

// Section 1: Active Tools (for now)
const activeTools: ToolCard[] = [
  {
    id: 'users',
    name: 'User Management',
    description: 'Manage user accounts, roles, and permissions',
    icon: '👥',
    href: '/admin/users',
    accentClass: 'bg-blue-600',
    features: ['View all users', 'Assign roles', 'User statistics'],
  },
  {
    id: 'bug-reports',
    name: 'Bug Reports',
    description: 'User-reported bugs and issues requiring attention',
    icon: '🐛',
    href: '/admin/bugs',
    accentClass: 'bg-red-600',
    features: ['Open/Resolved tickets', 'Severity levels', 'Screenshots'],
  },
];

// Section 2: Documentation
const documentationTools: ToolCard[] = [
  {
    id: 'release-notes',
    name: 'Release Notes',
    description: 'Daily changelog of features and improvements',
    icon: '📝',
    href: '/admin/release-notes',
    accentClass: 'bg-lexa-navy',
    features: ['Daily updates', 'Feature tracking', 'Version history'],
  },
  {
    id: 'backlog',
    name: 'Backlog',
    description: 'Track and manage tasks and priorities',
    icon: '📋',
    href: '/admin/backlog',
    accentClass: 'bg-lexa-navy',
    features: ['Priorities', 'Status tracking', 'Planning'],
  },
  {
    id: 'platform-architecture',
    name: 'Platform Architecture',
    description: 'Technical documentation and system overview',
    icon: '📖',
    href: '/admin/documentation',
    accentClass: 'bg-lexa-navy',
    features: ['System overview', 'Feature docs', 'Technical notes'],
  },
];

// Section 3: In Development / Inactive Tools
const inactiveTools: ToolCard[] = [
  // Disabled (moved down)
  {
    id: 'system-errors',
    name: 'System Errors',
    description: 'Disabled for now (moved to inactive)',
    icon: '⚠️',
    href: '/admin/errors',
    accentClass: 'bg-gray-400',
    features: ['Stack traces', 'Occurrence tracking'],
    disabled: true,
  },
  {
    id: 'chat-neo4j',
    name: 'ChatNeo4j',
    description: 'Disabled for now (moved to inactive)',
    icon: '💬',
    href: '/admin/chat-neo4j',
    accentClass: 'bg-gray-400',
    features: ['Natural language queries', 'Cypher generation'],
    disabled: true,
  },
  {
    id: 'data-quality',
    name: 'Data Quality Dashboard',
    description: 'Disabled for now (moved to inactive)',
    icon: '📈',
    href: '/admin/data-quality',
    accentClass: 'bg-gray-400',
    features: ['Completeness', 'Quality scores'],
    disabled: true,
  },

  // Keep existing inactive tools
  {
    id: 'seed-themes',
    name: 'Seed Themes',
    description: 'One-time theme category setup (rarely needed)',
    icon: '🎨',
    href: '/admin/seed-themes',
    accentClass: 'bg-gray-500',
    features: ['Add theme categories', 'Update themes', 'One-time setup'],
  },
  {
    id: 'debug-profile',
    name: 'Debug Profile',
    description: 'Debug user profiles and sessions',
    icon: '🔧',
    href: '/admin/debug-profile',
    accentClass: 'bg-gray-500',
    features: ['View user data', 'Session debugging', 'Profile editor'],
  },
  {
    id: 'destinations',
    name: 'Destinations Browser',
    description: 'Disabled for now (being integrated elsewhere)',
    icon: '🗺️',
    href: '#',
    accentClass: 'bg-gray-500',
    features: ['POI statistics', 'Destination coverage'],
    disabled: true,
  },
];

export default function AdminDashboard() {
  const renderToolCard = (tool: ToolCard) => {
    const disabled = !!tool.disabled;
    return (
      <Link
        key={tool.id}
        href={disabled ? '#' : tool.href}
        onClick={(e) => {
          if (disabled) e.preventDefault();
        }}
        className={[
          'bg-white rounded-xl shadow-lg border border-zinc-200 overflow-hidden transition-shadow',
          disabled ? 'opacity-60 cursor-not-allowed' : 'hover:shadow-xl',
        ].join(' ')}
      >
        <div className={`${tool.accentClass} h-2`} />
        <div className="p-6">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-4xl">{tool.icon}</span>
            <div>
              <h3 className="text-lg font-bold text-lexa-navy">
                {tool.name}
                {disabled && (
                  <span className="ml-2 text-xs bg-zinc-100 text-zinc-600 px-2 py-1 rounded">
                    Disabled
                  </span>
                )}
              </h3>
              <p className="text-sm text-zinc-600">{tool.description}</p>
            </div>
          </div>
          <div className="space-y-1">
            {tool.features.map((feature) => (
              <div key={feature} className="flex items-center text-sm text-zinc-600">
                <span className="mr-2 text-lexa-gold">✓</span>
                <span>{feature}</span>
              </div>
            ))}
          </div>
        </div>
      </Link>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-lexa-cream via-white to-zinc-50 px-6 py-12">
      <div className="mx-auto max-w-7xl">
        {/* Top Nav */}
        <AdminNav />

        {/* Blue top section (Captain Portal style) */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-xl p-6">
          <h1 className="text-4xl font-bold text-lexa-navy mb-2">Admin Dashboard</h1>
          <p className="text-zinc-700">
            Keep this page clean. Most daily work happens in the Captain&apos;s Knowledge Portal.
          </p>
        </div>

        {/* Captain Portal card on top */}
        <div className="mt-6 bg-white rounded-xl shadow-lg border border-zinc-200 overflow-hidden">
          <div className="bg-blue-600 h-2" />
          <div className="p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="text-5xl">⚓</div>
              <div>
                <h2 className="text-2xl font-bold text-lexa-navy">
                  Captain&apos;s Knowledge Portal
                </h2>
                <p className="text-zinc-600">
                  Upload, scrape, manual entry, verify and enhance POIs.
                </p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Link
                href="/captain"
                className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-lexa-navy text-white font-semibold hover:bg-lexa-navy/90 transition-colors"
              >
                Open Portal
              </Link>
              <Link
                href="/captain/upload"
                className="inline-flex items-center justify-center px-4 py-2 rounded-lg border border-lexa-navy/20 bg-white text-lexa-navy font-semibold hover:bg-lexa-cream transition-colors"
              >
                Upload & Manual Entry
              </Link>
            </div>
          </div>
        </div>

        {/* Section 1: Active Tools */}
        <div className="mt-10">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl">✅</span>
            <h2 className="text-2xl font-bold text-lexa-navy">Active Tools</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {activeTools.map(renderToolCard)}
          </div>
        </div>

        {/* Section 2: Documentation */}
        <div className="mt-10">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl">📖</span>
            <h2 className="text-2xl font-bold text-lexa-navy">Documentation</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {documentationTools.map(renderToolCard)}
          </div>
        </div>

        {/* Section 3: In Development / Inactive */}
        <div className="mt-10">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl">🚧</span>
            <h2 className="text-2xl font-bold text-lexa-navy">In Development / Inactive</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {inactiveTools.map(renderToolCard)}
          </div>
        </div>
      </div>
    </div>
  );
}

