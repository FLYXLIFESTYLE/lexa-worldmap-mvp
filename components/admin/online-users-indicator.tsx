'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client-browser';

interface OnlineUser {
  user_id: string;
  email: string;
  last_seen: string;
}

/**
 * OnlineUsersIndicator
 * Shows count of online admin users with hover details
 * Uses Supabase Realtime for presence tracking
 */
export default function OnlineUsersIndicator() {
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [isHovered, setIsHovered] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    // Track current user presence
    async function trackPresence() {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return;

      // Check if user is admin/captain
      const { data: profile } = await supabase
        .from('captain_profiles')
        .select('role')
        .eq('user_id', user.id)
        .single();

      if (!profile || !['admin', 'captain'].includes(profile.role)) {
        return; // Only track admin/captain presence
      }

      // Update presence every 30 seconds
      const updatePresence = async () => {
        // Note: This is a simplified version
        // In production, you'd use Supabase Realtime Presence API
        // For now, we'll simulate with a heartbeat
        
        // Send heartbeat (you'd implement this endpoint)
        try {
          await fetch('/api/admin/presence', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: user.id, email: user.email })
          });
        } catch (error) {
          console.error('Failed to update presence:', error);
        }
      };

      // Initial update
      updatePresence();

      // Update every 30 seconds
      const interval = setInterval(updatePresence, 30000);

      return () => clearInterval(interval);
    }

    // Fetch online users
    async function fetchOnlineUsers() {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return;

      // Check if user is admin/captain
      const { data: profile } = await supabase
        .from('captain_profiles')
        .select('role')
        .eq('user_id', user.id)
        .single();

      if (!profile || !['admin', 'captain'].includes(profile.role)) {
        return;
      }

      try {
        const response = await fetch('/api/admin/presence');
        const data = await response.json();
        
        if (data.success) {
          setOnlineUsers(data.online_users || []);
        }
      } catch (error) {
        console.error('Failed to fetch online users:', error);
      }
    }

    trackPresence();
    fetchOnlineUsers();

    // Fetch online users every 15 seconds
    const fetchInterval = setInterval(fetchOnlineUsers, 15000);

    return () => clearInterval(fetchInterval);
  }, [supabase]);

  const onlineCount = onlineUsers.length;

  if (onlineCount === 0) {
    return null; // Don't show if no one online or not admin
  }

  return (
    <div 
      className="relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Indicator */}
      <div className="flex items-center gap-2 px-3 py-2 bg-green-100 border border-green-300 rounded-lg cursor-pointer">
        <div className="relative">
          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
          <div className="absolute inset-0 w-3 h-3 bg-green-500 rounded-full animate-ping opacity-75"></div>
        </div>
        <span className="text-sm font-medium text-green-900">
          {onlineCount} online
        </span>
      </div>

      {/* Hover Card */}
      {isHovered && (
        <div className="absolute top-full right-0 mt-2 w-64 bg-white rounded-lg shadow-xl border border-gray-200 z-50">
          <div className="p-4">
            <h3 className="text-sm font-bold text-gray-900 mb-3">
              Online Admins ({onlineCount})
            </h3>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {onlineUsers.map((user) => (
                <div key={user.user_id} className="flex items-center gap-3 p-2 bg-gray-50 rounded">
                  <div className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0"></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {user.email}
                    </p>
                    <p className="text-xs text-gray-500">
                      Active now
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

