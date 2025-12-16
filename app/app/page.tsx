/**
 * Main Chat Interface - Protected Route
 */

'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client-browser';
import { useRouter } from 'next/navigation';
import ChatTranscript from '@/components/chat/chat-transcript';
import ChatInput from '@/components/chat/chat-input';
import VoiceToggle from '@/components/voice/voice-toggle';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  created_at: string;
}

export default function ChatPage() {
  const router = useRouter();
  const supabase = createClient();
  const [messages, setMessages] = useState<Message[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [stage, setStage] = useState('WELCOME');
  const [voiceEnabled, setVoiceEnabled] = useState(false);
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
      };
      
      setMessages(prev => [...prev, assistantMsg]);
      
      // Speak if voice enabled
      if (voiceEnabled && data.voiceEnabled) {
        speak(data.message);
      }
      
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
  
  // Simple TTS function (will be enhanced with voice components)
  const speak = (text: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      window.speechSynthesis.speak(utterance);
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
      
      if (messages.length === 0) {
        const welcomeMsg: Message = {
          id: 'welcome',
          role: 'assistant',
          content: `I'm LEXA. I am your Luxury Experience Assistant and your travel soulmate. I design the feeling behind your experience.\n\nGive me 90 seconds and three questions. If you don't feel understood, we stop.\n\nDo you want to communicate with me by text only, or text + voice?`,
          created_at: new Date().toISOString(),
        };
        
        setMessages([welcomeMsg]);
      }
    }
    
    init();
  }, [messages.length, router, supabase.auth]);
  
  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  };
  
  return (
    <div className="flex h-screen flex-col bg-gradient-to-br from-zinc-50 via-white to-lexa-cream">
      {/* Luxury Header */}
      <header className="relative border-b border-zinc-200/60 bg-white/80 backdrop-blur-lg px-6 py-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                <span className="bg-gradient-to-r from-lexa-navy to-lexa-gold bg-clip-text text-transparent">
                  LEXA
                </span>
              </h1>
              <p className="text-xs font-medium text-zinc-400 uppercase tracking-widest mt-0.5">
                Luxury Experience Architect
              </p>
            </div>
            
            {/* Stage Indicator */}
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-lexa-cream/50 rounded-full border border-lexa-gold/20">
              <div className="w-2 h-2 rounded-full bg-lexa-gold animate-pulse-slow" />
              <span className="text-xs font-medium text-lexa-navy">
                {stage.replace('_', ' ')}
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Voice Toggle */}
            <VoiceToggle
              enabled={voiceEnabled}
              onChange={setVoiceEnabled}
            />
            
            {/* User Menu */}
            <div className="flex items-center gap-3 pl-4 border-l border-zinc-200">
              <div className="text-right">
                <p className="text-sm font-medium text-zinc-900">{userEmail?.split('@')[0]}</p>
                <p className="text-xs text-zinc-500">{userEmail?.split('@')[1]}</p>
              </div>
              <button
                onClick={handleSignOut}
                className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-all hover:bg-lexa-navy hover:shadow-lg"
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
        stage={stage}
        onQuickReply={sendMessage}
      />
      
      {/* Input */}
      <ChatInput
        onSend={sendMessage}
        disabled={isLoading}
      />
    </div>
  );
}

