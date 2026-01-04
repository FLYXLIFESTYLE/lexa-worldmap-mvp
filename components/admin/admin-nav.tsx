'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client-browser';
import OnlineUsersIndicator from './online-users-indicator';

const adminPages = [
  {
    name: 'Admin Dashboard',
    href: '/admin/dashboard',
    icon: '📊',
    description: 'Main admin overview'
  },
  {
    name: 'Backlog',
    href: '/admin/backlog',
    icon: '📋',
    description: 'Development tasks'
  },
  {
    name: 'Bug Reports',
    href: '/admin/bugs',
    icon: '🐛',
    description: 'User-reported bugs'
  },
  {
    name: "Captain's Portal",
    href: '/captain',
    icon: '⚓',
    description: 'Knowledge management hub'
  },
  {
    name: 'ChatNeo4j',
    href: '/admin/chat-neo4j',
    icon: '💬',
    description: 'Query database'
  },
  {
    name: 'LEXA Demo Chat',
    href: '/demo/chat',
    icon: '✨',
    description: 'Test conversation flow'
  },
  {
    name: 'Platform Architecture',
    href: '/admin/documentation',
    icon: '📖',
    description: 'Documentation'
  },
  {
    name: 'Error Logs',
    href: '/admin/errors',
    icon: '⚠️',
    description: 'System errors'
  },
  {
    name: 'POI Editor',
    href: '/admin/knowledge/editor',
    icon: '✏️',
    description: 'Search & edit POIs'
  },
  {
    name: 'Release Notes',
    href: '/admin/release-notes',
    icon: '📝',
    description: 'Daily changelog'
  },
  {
    name: 'Scraped URLs',
    // Use the shared scraped_urls table view (admins-only)
    href: '/captain/urls',
    icon: '🌐',
    description: 'Scrape history (shared)'
  },
  {
    name: 'Seed Themes',
    href: '/admin/seed-themes',
    icon: '🎨',
    description: 'Initialize theme categories'
  },
  {
    name: 'Yacht Destinations',
    href: '/admin/upload-yacht-destinations-v2',
    icon: '⛵',
    description: 'Upload yacht ports & routes'
  },
  {
    name: 'POI Collection',
    href: '/admin/poi-collection',
    icon: '📍',
    description: 'Google Places batch collector'
  },
  {
    name: 'Upload History',
    href: '/admin/knowledge/history',
    icon: '📊',
    description: 'Track file uploads'
  }
];

export default function AdminNav() {
  const [isOpen, setIsOpen] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  // Get user info
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUserEmail(user?.email || null);
    };
    getUser();
  }, [supabase.auth]);

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

  // Handle sign out
  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/auth/signin');
    router.refresh();
  };

  // Find current page
  const currentPage = adminPages.find(page => pathname === page.href) || {
    name: 'Admin',
    icon: '⚙️'
  };

  return (
    <div className="flex items-center gap-3">
      {/* Online Users Indicator */}
      <OnlineUsersIndicator />
      
      {/* Dropdown */}
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

          {/* User Section */}
          <div className="border-t border-gray-100 p-2">
            <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Account
            </div>
            
            {/* User Profile */}
            <Link
              href="/admin/profile"
              onClick={() => setIsOpen(false)}
              className="flex items-center space-x-3 px-3 py-2 rounded-md hover:bg-gray-50 transition-colors"
            >
              <div className="w-8 h-8 bg-lexa-gold rounded-full flex items-center justify-center text-white font-semibold">
                {userEmail?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {userEmail || 'User'}
                </p>
                <p className="text-xs text-gray-500">View Profile</p>
              </div>
            </Link>

            {/* Sign Out */}
            <button
              onClick={handleSignOut}
              className="w-full flex items-center space-x-3 px-3 py-2 rounded-md hover:bg-red-50 transition-colors text-left mt-1"
            >
              <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span className="text-sm font-medium text-red-600">Sign Out</span>
            </button>
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
    </div>
  );
}

