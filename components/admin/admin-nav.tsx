'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const adminPages = [
  {
    name: 'Admin Dashboard',
    href: '/admin/dashboard',
    icon: '📊',
    description: 'Main admin overview'
  },
  {
    name: "Captain's Portal",
    href: '/admin/knowledge',
    icon: '📚',
    description: 'Knowledge management'
  },
  {
    name: 'ChatNeo4j',
    href: '/admin/chat-neo4j',
    icon: '💬',
    description: 'Query database'
  },
  {
    name: 'Destinations',
    href: '/admin/destinations',
    icon: '🗺️',
    description: 'Browse POIs'
  },
  {
    name: 'POI Editor',
    href: '/admin/knowledge/editor',
    icon: '✏️',
    description: 'Search & edit POIs'
  },
  {
    name: 'Scraped URLs',
    href: '/admin/knowledge/scraped-urls',
    icon: '🌐',
    description: 'Manage scraped content'
  },
  {
    name: 'Documentation',
    href: '/admin/documentation',
    icon: '📖',
    description: 'LEXA Architecture'
  }
];

export default function AdminNav() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Find current page
  const currentPage = adminPages.find(page => pathname === page.href) || {
    name: 'Admin',
    icon: '⚙️'
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Dropdown Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-4 py-2 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 transition-colors"
      >
        <span className="text-xl">{currentPage.icon}</span>
        <span className="font-medium text-gray-900">{currentPage.name}</span>
        <svg
          className={`w-5 h-5 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200 z-50">
          <div className="p-2">
            <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-100 mb-2">
              Admin Tools
            </div>
            
            {adminPages.map((page) => {
              const isActive = pathname === page.href;
              
              return (
                <Link
                  key={page.href}
                  href={page.href}
                  onClick={() => setIsOpen(false)}
                  className={`
                    flex items-start space-x-3 px-3 py-3 rounded-md transition-colors
                    ${isActive 
                      ? 'bg-blue-50 text-blue-900' 
                      : 'hover:bg-gray-50 text-gray-900'
                    }
                  `}
                >
                  <span className="text-2xl flex-shrink-0">{page.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${isActive ? 'text-blue-900' : 'text-gray-900'}`}>
                      {page.name}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {page.description}
                    </p>
                  </div>
                  {isActive && (
                    <div className="flex-shrink-0">
                      <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                    </div>
                  )}
                </Link>
              );
            })}
          </div>

          {/* Footer */}
          <div className="border-t border-gray-100 p-3">
            <Link
              href="/"
              onClick={() => setIsOpen(false)}
              className="flex items-center justify-center space-x-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span>Back to LEXA</span>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

