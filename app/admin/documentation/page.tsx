'use client';

import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import AdminNav from '@/components/admin/admin-nav';
import PortalShell from '@/components/portal/portal-shell';

export default function DocumentationPage() {
  const [architecture, setArchitecture] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load Platform Architecture markdown
    fetch('/docs/LEXA_ARCHITECTURE.md')
      .then(res => res.text())
      .then(text => {
        setArchitecture(text);
        setLoading(false);
        
        // Enable anchor link navigation after content loads
        setTimeout(() => {
          if (window.location.hash) {
            const element = document.getElementById(window.location.hash.substring(1));
            if (element) {
              element.scrollIntoView({ behavior: 'smooth' });
            }
          }
        }, 100);
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
    <PortalShell
      icon="📖"
      title="Platform Architecture"
      subtitle="System overview and technical documentation"
      backLink={{ href: '/admin/dashboard', label: 'Back to Admin' }}
      topRight={<AdminNav />}
      mission={[
        { label: 'WHY', text: "Understand LEXA's architecture for faster troubleshooting." },
        { label: 'WHAT', text: 'System overview, components, scoring, relationships, and data flow.' },
        { label: 'HOW', text: 'Use Ctrl+F to find topics, or scroll through headings.' },
      ]}
      quickTips={[
        'If you change a flow (upload → extract → verify → promote), update this doc the same day.',
        'Keep architecture sections short: link out to deeper docs when needed.',
        'Prefer “source-backed” knowledge and audit trails for anything critical.',
      ]}
    >

        {/* Content */}
        <div className="bg-white rounded-lg shadow-sm p-8">
          <div className="prose prose-blue max-w-none">
            <ReactMarkdown
              components={{
                h1: ({node, children, ...props}) => {
                  const id = String(children).toLowerCase().replace(/[^a-z0-9]+/g, '-');
                  return <h1 id={id} className="text-4xl font-bold mt-8 mb-4 text-gray-900 scroll-mt-4" {...props}>{children}</h1>;
                },
                h2: ({node, children, ...props}) => {
                  const id = String(children).toLowerCase().replace(/[^a-z0-9]+/g, '-');
                  return <h2 id={id} className="text-3xl font-bold mt-6 mb-3 text-gray-800 scroll-mt-4" {...props}>{children}</h2>;
                },
                h3: ({node, children, ...props}) => {
                  const id = String(children).toLowerCase().replace(/[^a-z0-9]+/g, '-');
                  return <h3 id={id} className="text-2xl font-semibold mt-4 mb-2 text-gray-700 scroll-mt-4" {...props}>{children}</h3>;
                },
                h4: ({node, children, ...props}) => {
                  const id = String(children).toLowerCase().replace(/[^a-z0-9]+/g, '-');
                  return <h4 id={id} className="text-xl font-semibold mt-3 mb-2 text-gray-700 scroll-mt-4" {...props}>{children}</h4>;
                },
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
    </PortalShell>
  );
}

