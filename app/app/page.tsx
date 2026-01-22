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
import { LegalDisclaimer } from '@/components/legal-disclaimer';
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
  const [showResetModal, setShowResetModal] = useState(false);
  const starterPrompts = [
    {
      id: 'romantic-monaco',
      text: 'I want to spend a romantic weekend with my spouse in Monaco.',
    },
    {
      id: 'restorative-escape',
      text: 'We need a restorative escape after a demanding year - quiet, elegant, and not touristy.',
    },
    {
      id: 'culinary-signature',
      text: 'I want a culinary-led journey with one unforgettable signature moment.',
    },
  ];
  const showStarters = messages.length <= 1 && !isLoading;
  
  // Reset chat handler
  const handleResetChat = () => {
    setShowResetModal(true);
  };
  
  const confirmReset = async (saveConversation: boolean) => {
    try {
      if (saveConversation && sessionId) {
        // Mark session as completed/archived
        await fetch(`/api/lexa/sessions/${sessionId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ stage: 'COMPLETE' })
        });
      }
      
      // Clear local state
      setMessages([]);
      setSessionId(null);
      setStage('WELCOME');
      setShowResetModal(false);
      
      // Start fresh conversation
      await startConversation();
    } catch (error) {
      console.error('Error resetting chat:', error);
      alert('Failed to reset chat. Please try again.');
    }
  };
  
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
        id: data.assistantMessageId || `msg-${Date.now()}`,
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
            `Welcome. I'm LEXA.\n\nTell me what you're craving - and I'll shape the experience around it.`,
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
      <header className="relative border-b border-white/10 bg-black/20 backdrop-blur-xl px-4 py-4 sm:px-6 sm:py-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap items-center gap-4">
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
            
            {/* Reset Chat Button */}
            <button
              onClick={handleResetChat}
              className="flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 bg-white/5 text-white hover:bg-white/10 hover:border-lexa-gold/30 transition-all text-sm font-medium"
              title="Start a new conversation"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span className="hidden lg:inline">Reset Chat</span>
            </button>
          </div>
          
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between md:justify-end md:gap-4">
            {/* User Menu */}
            <div className="flex flex-wrap items-center gap-3 md:pl-4 md:border-l md:border-white/10">
              <button
                onClick={() => router.push('/account')}
                className="text-right hover:opacity-80 transition-opacity cursor-pointer"
                title="Go to Account Dashboard"
              >
                <p className="text-sm font-medium text-zinc-100">{userEmail?.split('@')[0]}</p>
                <p className="text-xs text-zinc-400">{userEmail?.split('@')[1]}</p>
              </button>
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
      
      {/* Starter suggestions (mobile) */}
      {showStarters ? (
        <div className="lexa-suggestion-strip lg:hidden">
          <p className="lexa-suggestion-title">Try a starting point</p>
          <div className="lexa-suggestion-row">
            {starterPrompts.map((prompt) => (
              <button
                key={prompt.id}
                onClick={() => sendMessage(prompt.text)}
                className="lexa-suggestion-card"
              >
                {prompt.text}
              </button>
            ))}
          </div>
        </div>
      ) : null}
      
      <div className="flex flex-1 overflow-hidden">
        <div className="flex flex-1 flex-col">
          {/* Chat Transcript */}
          <ChatTranscript
            messages={messages}
            isLoading={isLoading}
            onQuickReply={sendMessage}
          />
        </div>
        
        {/* Starter suggestions (desktop rail) */}
        <aside className={`hidden lg:flex lexa-suggestion-rail ${showStarters ? '' : 'opacity-0 pointer-events-none'}`}>
          <div className="lexa-suggestion-rail__inner">
            <p className="lexa-suggestion-title">Not sure how to start?</p>
            <p className="lexa-suggestion-subtitle">Tap any idea to send it as your first message.</p>
            <div className="lexa-suggestion-column">
              {starterPrompts.map((prompt) => (
                <button
                  key={prompt.id}
                  onClick={() => sendMessage(prompt.text)}
                  className="lexa-suggestion-card"
                >
                  {prompt.text}
                </button>
              ))}
            </div>
          </div>
        </aside>
      </div>
      
      {/* Input */}
      <ChatInput
        onSend={sendMessage}
        disabled={isLoading}
      />
      
      {/* Reset Chat Modal */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full">
            <div className="bg-lexa-navy text-white p-6 rounded-t-2xl">
              <h3 className="text-xl font-bold">🔄 Start New Conversation?</h3>
              <p className="text-zinc-300 mt-2 text-sm">
                This will start a fresh conversation with LEXA. Your current chat can be saved or deleted.
              </p>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-lexa-gold/10 border border-lexa-gold/30 rounded-lg p-4">
                <p className="text-sm text-zinc-700">
                  <strong>Note:</strong> Saved conversations will appear in your Account Dashboard where you can continue them later.
                </p>
              </div>
              
              <div className="space-y-3">
                <button
                  onClick={() => confirmReset(true)}
                  className="w-full px-6 py-3 rounded-xl bg-gradient-to-r from-lexa-gold to-yellow-600 hover:from-yellow-400 hover:to-lexa-gold text-zinc-900 font-semibold transition-all hover:scale-105 hover:shadow-xl"
                >
                  ✅ Save & Start New
                </button>
                
                <button
                  onClick={() => confirmReset(false)}
                  className="w-full px-6 py-3 rounded-xl border-2 border-red-500 text-red-600 hover:bg-red-50 font-semibold transition-all"
                >
                  🗑️ Delete & Start New
                </button>
                
                <button
                  onClick={() => setShowResetModal(false)}
                  className="w-full px-6 py-3 rounded-xl border-2 border-zinc-300 text-zinc-700 hover:bg-zinc-50 font-semibold transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Legal Disclaimer Footer */}
      <LegalDisclaimer variant="minimal" className="relative z-10" showIcon={false} />
      </div>
    </div>
  );
}


