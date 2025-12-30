/**
 * Main Chat Interface - Protected Route
 */

'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client-browser';
import { useRouter } from 'next/navigation';
import ChatTranscript from '@/components/chat/chat-transcript';
import ChatInput from '@/components/chat/chat-input';
import LuxuryBackground from '@/components/luxury-background';
import type { LexaUiPayload } from '@/lib/lexa/types';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  created_at: string;
  ui?: LexaUiPayload | null;
}

export default function ChatPage() {
  const router = useRouter();
  const supabase = createClient();
  const [messages, setMessages] = useState<Message[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [stage, setStage] = useState('WELCOME');
  const [userEmail, setUserEmail] = useState<string>('');
  
  // Send message to LEXA
  const sendMessage = async (content: string) => {
    if (!content.trim() || isLoading) return;
    
    // Add user message optimistically
    const tempUserMsg: Message = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content,
      created_at: new Date().toISOString(),
    };
    
    setMessages(prev => [...prev, tempUserMsg]);
    setIsLoading(true);
    
    try {
      const response = await fetch('/api/lexa/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: content,
          sessionId,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to send message');
      }
      
      const data = await response.json();
      
      // Update session ID if new
      if (data.sessionId && !sessionId) {
        setSessionId(data.sessionId);
      }
      
      // Update stage
      if (data.stage) {
        setStage(data.stage);
      }
      
      // Add assistant message
      const assistantMsg: Message = {
        id: `msg-${Date.now()}`,
        role: 'assistant',
        content: data.message,
        created_at: new Date().toISOString(),
        ui: data.ui ?? null,
      };
      
      setMessages(prev => [...prev, assistantMsg]);
      
    } catch (error) {
      console.error('Error sending message:', error);
      
      // Add error message
      const errorMsg: Message = {
        id: `error-${Date.now()}`,
        role: 'system',
        content: 'Sorry, something went wrong. Please try again.',
        created_at: new Date().toISOString(),
      };
      
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  // Start conversation without creating a fake user bubble
  const startConversation = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/lexa/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: '__start__', sessionId }),
      });
      if (!response.ok) throw new Error('Failed to start chat');
      const data = await response.json();
      if (data.sessionId && !sessionId) setSessionId(data.sessionId);
      if (data.stage) setStage(data.stage);
      const welcomeMsg: Message = {
        id: 'welcome',
        role: 'assistant',
        content: data.message,
        created_at: new Date().toISOString(),
        ui: data.ui ?? null,
      };
      setMessages([welcomeMsg]);
    } catch (e) {
      console.error('Failed to start conversation:', e);
      setMessages([
        {
          id: 'welcome-fallback',
          role: 'assistant',
          content:
            `Welcome. I'm LEXA.\n\nTell me what you're craving — and I'll shape the experience around it.`,
          created_at: new Date().toISOString(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Check auth and load initial message
  useEffect(() => {
    async function init() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      
      if (!user) {
        router.push('/');
        return;
      }
      
      setUserEmail(user.email || '');
      
      if (messages.length === 0) await startConversation();
    }
    
    init();
  }, [messages.length, router, supabase.auth]);
  
  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  };
  
  return (
    <div className="relative flex h-screen flex-col overflow-hidden">
      <LuxuryBackground />
      <div className="relative z-10 flex h-screen flex-col">
      {/* Luxury Header */}
      <header className="relative border-b border-white/10 bg-black/20 backdrop-blur-xl px-6 py-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div>
              <div className="flex items-start gap-3">
                <h1 className="text-3xl font-bold tracking-tight leading-none">
                  <span className="bg-gradient-to-r from-white via-lexa-gold to-white bg-clip-text text-transparent animate-gradient">
                    LEXA
                  </span>
                </h1>
                <span className="mt-1 inline-flex items-center rounded-full bg-lexa-gold px-2.5 py-1 text-[10px] font-bold tracking-wider text-zinc-900 shadow-lg shadow-lexa-gold/30">
                  BETA
                </span>
              </div>
              <p className="text-xs font-medium text-zinc-300 uppercase tracking-widest mt-0.5">
                Luxury Experience Assistant
              </p>
            </div>
            
            {/* Stage Indicator */}
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-full border border-white/10">
              <div className="w-2 h-2 rounded-full bg-lexa-gold animate-pulse-slow" />
              <span className="text-xs font-medium text-zinc-200">
                {stage.replace('_', ' ')}
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {/* User Menu */}
            <div className="flex items-center gap-3 pl-4 border-l border-white/10">
              <div className="text-right">
                <p className="text-sm font-medium text-zinc-100">{userEmail?.split('@')[0]}</p>
                <p className="text-xs text-zinc-400">{userEmail?.split('@')[1]}</p>
              </div>
              <button
                onClick={handleSignOut}
                className="rounded-full border border-white/10 bg-white/5 px-5 py-2 text-sm font-medium text-white transition-all hover:bg-white/10 hover:border-lexa-gold/30"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
        
        {/* Decorative gradient line */}
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-lexa-gold to-transparent opacity-50" />
      </header>
      
      {/* Chat Transcript */}
      <ChatTranscript
        messages={messages}
        isLoading={isLoading}
        onQuickReply={sendMessage}
      />
      
      {/* Input */}
      <ChatInput
        onSend={sendMessage}
        disabled={isLoading}
      />
      </div>
    </div>
  );
}

