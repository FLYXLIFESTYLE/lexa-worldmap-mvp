'use client';

/**
 * Captain's Knowledge Portal - Main Dashboard
 */

import { useRouter } from 'next/navigation';
import AdminNav from '@/components/admin/admin-nav';

export default function KnowledgePortalPage() {
  const router = useRouter();

  // TOP ROW: Write, Upload, Browse
  // SECOND ROW: ChatNeo4j, Destinations, Scraped URLs
  const features = [
    // Top Row
    {
      icon: '✏️',
      title: 'Write Knowledge',
      description: 'Manually add your travel insights, tips, and hidden gems directly',
      action: () => router.push('/admin/knowledge/editor'),
      color: 'from-green-500 to-green-600',
      featured: true,
    },
    {
      icon: '📤',
      title: 'Upload Knowledge',
      description: 'Upload ChatGPT conversations, Zoom transcripts, itineraries, or documents',
      action: () => router.push('/admin/knowledge/upload'),
      color: 'from-blue-500 to-blue-600',
      featured: true,
    },
    {
      icon: '🔍',
      title: 'Browse Knowledge',
      description: 'Search and explore all contributed knowledge in the database',
      action: () => router.push('/admin/knowledge/browse'),
      color: 'from-purple-500 to-purple-600',
      featured: true,
    },
    // Second Row
    {
      icon: '📊',
      title: 'Upload History',
      description: 'Track all file uploads with extraction statistics and manage files',
      action: () => router.push('/admin/knowledge/history'),
      color: 'from-indigo-500 to-indigo-600',
    },
    {
      icon: '💬',
      title: 'ChatNeo4j',
      description: 'Ask questions in plain English about your travel database - AI insights',
      action: () => router.push('/admin/chat-neo4j'),
      color: 'from-lexa-gold to-lexa-navy',
    },
    {
      icon: '🏖️',
      title: 'Scraped URLs',
      description: 'View and manage all URLs scraped for knowledge extraction',
      action: () => router.push('/admin/knowledge/scraped-urls'),
      color: 'from-pink-500 to-rose-600',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-lexa-cream via-white to-zinc-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-lexa-navy to-lexa-gold text-white px-6 py-16">
        <div className="mx-auto max-w-5xl">
          <div className="flex items-start justify-between mb-6">
            <div className="flex-1">
              <h1 className="text-5xl font-bold mb-4">
                🌍 Captain&apos;s Knowledge Portal
              </h1>
              <p className="text-xl opacity-90 mb-4">
                Share your travel expertise to help LEXA create extraordinary experiences
              </p>
              
              {/* Why - What - How */}
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 space-y-2">
                <div>
                  <strong className="text-lexa-gold">WHY:</strong> Your knowledge transforms LEXA from a database into an intelligent travel companion
                </div>
                <div>
                  <strong className="text-lexa-gold">WHAT:</strong> Capture hidden gems, insider tips, and luxury experiences that only experts know
                </div>
                <div>
                  <strong className="text-lexa-gold">HOW:</strong> Upload files, scrape URLs, write directly, or search existing POIs - choose your preferred method
                </div>
              </div>
            </div>
            <AdminNav />
          </div>
          <div className="flex gap-4">
            <button
              onClick={() => router.push('/admin/knowledge/upload')}
              className="px-8 py-3 bg-white text-lexa-navy rounded-lg font-semibold hover:bg-lexa-cream transition-colors"
            >
              Upload Files
            </button>
            <button
              onClick={() => router.push('/admin/knowledge/editor')}
              className="px-8 py-3 bg-white/10 backdrop-blur-sm border border-white/30 rounded-lg font-semibold hover:bg-white/20 transition-colors"
            >
              Write Knowledge
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-6 py-12">
        <div className="mx-auto max-w-5xl">
          {/* Feature Cards */}
          <div className="grid md:grid-cols-3 gap-6 mb-12">
            {features.slice(0, 3).map((feature, idx) => (
              <div
                key={idx}
                className={`bg-white rounded-2xl shadow-lg border ${feature.featured ? 'border-lexa-gold/50 ring-2 ring-lexa-gold/20' : 'border-zinc-200/60'} p-6 hover:shadow-xl transition-all cursor-pointer relative`}
                onClick={feature.action}
              >
                {feature.featured && (
                  <div className="absolute -top-2 -right-2 bg-lexa-gold text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg">
                    NEW!
                  </div>
                )}
                <div className="text-5xl mb-4">{feature.icon}</div>
                <h3 className="text-xl font-bold text-lexa-navy mb-2">
                  {feature.title}
                </h3>
                <p className="text-zinc-600 text-sm mb-4">
                  {feature.description}
                </p>
                <button className={`w-full px-4 py-2 bg-gradient-to-r ${feature.color} text-white rounded-lg font-semibold hover:shadow-md transition-all`}>
                  {feature.featured ? '✨ Try It Now →' : 'Get Started →'}
                </button>
              </div>
            ))}
          </div>

          {/* Secondary Tools */}
          <div className="grid md:grid-cols-3 gap-6 mb-12">
            {features.slice(3).map((feature, idx) => (
              <div
                key={idx}
                className="bg-white rounded-2xl shadow-lg border border-zinc-200/60 p-6 hover:shadow-xl transition-all cursor-pointer"
                onClick={feature.action}
              >
                <div className="text-5xl mb-4">{feature.icon}</div>
                <h3 className="text-xl font-bold text-lexa-navy mb-2">
                  {feature.title}
                </h3>
                <p className="text-zinc-600 text-sm mb-4">
                  {feature.description}
                </p>
                <button className={`w-full px-4 py-2 bg-gradient-to-r ${feature.color} text-white rounded-lg font-semibold hover:shadow-md transition-all`}>
                  Get Started →
                </button>
              </div>
            ))}
          </div>

          {/* What You Can Share */}
          <div className="bg-white rounded-2xl shadow-lg border border-zinc-200/60 p-8 mb-8">
            <h2 className="text-2xl font-bold text-lexa-navy mb-6">
              What You Can Share
            </h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold text-lexa-navy mb-3">📁 Documents & Files</h4>
                <ul className="space-y-2 text-sm text-zinc-600">
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 mt-0.5">✓</span>
                    <span>ChatGPT conversation exports (.json)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 mt-0.5">✓</span>
                    <span>Zoom call transcripts (.vtt, .srt)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 mt-0.5">✓</span>
                    <span>Travel itineraries (PDF, DOCX, TXT)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 mt-0.5">✓</span>
                    <span>Travel notes and journals</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 mt-0.5">✓</span>
                    <span>Destination guides</span>
                  </li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-lexa-navy mb-3">✏️ Written Knowledge</h4>
                <ul className="space-y-2 text-sm text-zinc-600">
                  <li className="flex items-start gap-2">
                    <span className="text-green-600 mt-0.5">✓</span>
                    <span>Hidden gems and insider tips</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-600 mt-0.5">✓</span>
                    <span>Best times to visit destinations</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-600 mt-0.5">✓</span>
                    <span>Local customs and cultural insights</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-600 mt-0.5">✓</span>
                    <span>Restaurant and hotel recommendations</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-600 mt-0.5">✓</span>
                    <span>Things to avoid and warnings</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* How It Works */}
          <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl p-8">
            <h2 className="text-2xl font-bold text-lexa-navy mb-6">
              How It Works
            </h2>
            <div className="grid md:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center text-3xl mx-auto mb-3 shadow-md">
                  1️⃣
                </div>
                <h4 className="font-semibold text-lexa-navy mb-2">Upload or Write</h4>
                <p className="text-sm text-zinc-600">
                  Share your knowledge through files or manual entry
                </p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center text-3xl mx-auto mb-3 shadow-md">
                  🤖
                </div>
                <h4 className="font-semibold text-lexa-navy mb-2">AI Processing</h4>
                <p className="text-sm text-zinc-600">
                  Claude AI extracts POIs, relationships, and insights
                </p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center text-3xl mx-auto mb-3 shadow-md">
                  💾
                </div>
                <h4 className="font-semibold text-lexa-navy mb-2">Knowledge Graph</h4>
                <p className="text-sm text-zinc-600">
                  Data is added to LEXA&apos;s Neo4j knowledge base
                </p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center text-3xl mx-auto mb-3 shadow-md">
                  ✨
                </div>
                <h4 className="font-semibold text-lexa-navy mb-2">Better Recommendations</h4>
                <p className="text-sm text-zinc-600">
                  LEXA uses your wisdom to create perfect itineraries
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

