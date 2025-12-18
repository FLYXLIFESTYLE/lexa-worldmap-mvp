'use client';

import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import AdminNav from '@/components/admin/admin-nav';

export default function DocumentationPage() {
  const [architecture, setArchitecture] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load LEXA Architecture markdown
    fetch('/docs/LEXA_ARCHITECTURE.md')
      .then(res => res.text())
      .then(text => {
        setArchitecture(text);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load architecture:', err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading documentation...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                LEXA Architecture & Features
              </h1>
              <p className="text-gray-600">
                Complete system architecture, features, and technical documentation
              </p>
            </div>
            <AdminNav />
          </div>
        </div>

        {/* Content */}
        <div className="bg-white rounded-lg shadow-sm p-8">
          <div className="prose prose-blue max-w-none">
            <ReactMarkdown
              components={{
                h1: ({node, ...props}) => <h1 className="text-4xl font-bold mt-8 mb-4 text-gray-900" {...props} />,
                h2: ({node, ...props}) => <h2 className="text-3xl font-bold mt-6 mb-3 text-gray-800" {...props} />,
                h3: ({node, ...props}) => <h3 className="text-2xl font-semibold mt-4 mb-2 text-gray-700" {...props} />,
                h4: ({node, ...props}) => <h4 className="text-xl font-semibold mt-3 mb-2 text-gray-700" {...props} />,
                p: ({node, ...props}) => <p className="mb-4 text-gray-600 leading-relaxed" {...props} />,
                ul: ({node, ...props}) => <ul className="list-disc list-inside mb-4 space-y-2" {...props} />,
                ol: ({node, ...props}) => <ol className="list-decimal list-inside mb-4 space-y-2" {...props} />,
                li: ({node, ...props}) => <li className="text-gray-600" {...props} />,
                code: ({node, inline, ...props}: any) => 
                  inline ? 
                    <code className="bg-gray-100 px-2 py-1 rounded text-sm font-mono text-gray-800" {...props} /> :
                    <code className="block bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm font-mono my-4" {...props} />,
                blockquote: ({node, ...props}) => (
                  <blockquote className="border-l-4 border-blue-500 pl-4 italic text-gray-600 my-4" {...props} />
                ),
                a: ({node, ...props}) => (
                  <a className="text-blue-600 hover:text-blue-800 underline" {...props} />
                ),
                table: ({node, ...props}) => (
                  <div className="overflow-x-auto my-4">
                    <table className="min-w-full divide-y divide-gray-200 border" {...props} />
                  </div>
                ),
                thead: ({node, ...props}) => <thead className="bg-gray-50" {...props} />,
                tbody: ({node, ...props}) => <tbody className="bg-white divide-y divide-gray-200" {...props} />,
                tr: ({node, ...props}) => <tr {...props} />,
                th: ({node, ...props}) => (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" {...props} />
                ),
                td: ({node, ...props}) => (
                  <td className="px-6 py-4 text-sm text-gray-600" {...props} />
                ),
              }}
            >
              {architecture}
            </ReactMarkdown>
          </div>
        </div>

        {/* Quick Links */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <a
            href="/admin/knowledge"
            className="bg-white p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Captain's Portal
            </h3>
            <p className="text-gray-600 text-sm">
              Contribute knowledge and manage POIs
            </p>
          </a>

          <a
            href="/admin/chat-neo4j"
            className="bg-white p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              ChatNeo4j
            </h3>
            <p className="text-gray-600 text-sm">
              Query database with natural language
            </p>
          </a>

          <a
            href="/admin/destinations"
            className="bg-white p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Destinations Browser
            </h3>
            <p className="text-gray-600 text-sm">
              Browse POIs by destination
            </p>
          </a>
        </div>
      </div>
    </div>
  );
}

