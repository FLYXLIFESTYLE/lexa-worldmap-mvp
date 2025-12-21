/**
 * LEXA Chat Interface - Deep Emotional Conversation
 * After 3-step builder approval
 */

'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client-browser';
import { useRouter } from 'next/navigation';
import { Send, Sparkles } from 'lucide-react';
import { lexaAPI, loadFromLocalStorage, saveToLocalStorage, formatConversationHistory, extractContextFromBuilder } from '@/lib/api/lexa-client';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  quickReplies?: string[];
  timestamp: string;
}

interface BuilderState {
  time: { month: string | null; year: number };
  destination: { name: string | null };
  theme: { name: string | null };
}

export default function LexaChatPage() {
  const router = useRouter();
  const supabase = createClient();
  const [userEmail, setUserEmail] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [builderState, setBuilderState] = useState<BuilderState | null>(null);
  const [conversationStage, setConversationStage] = useState<'wow' | 'details' | 'complete'>('wow');
  const [accountId, setAccountId] = useState<string | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(true);

  // Check auth and load builder state
  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/auth/signin');
        return;
      }
      setUserEmail(user.email || '');

      // Load LEXA account from localStorage
      const lexaAccount = loadFromLocalStorage('lexa_account');
      if (!lexaAccount) {
        console.error('No LEXA account found');
        router.push('/auth/signup');
        return;
      }

      setAccountId(lexaAccount.account_id);

      // Load builder state from localStorage
      const savedState = localStorage.getItem('lexa_builder_state');
      if (!savedState) {
        router.push('/experience');
        return;
      }

      const state = JSON.parse(savedState);
      setBuilderState(state);

      // Start conversation with AIlessia using real API
      try {
        const context = extractContextFromBuilder(state);
        const response = await lexaAPI.startConversation(
          lexaAccount.account_id,
          lexaAccount.session_id,
          context
        );

        // Add AIlessia's greeting
        const welcomeMessage: Message = {
          id: 'welcome',
          role: 'assistant',
          content: response.ailessia_response,
          quickReplies: [
            'Peace and relaxation',
            'Deeply connected to my partner',
            'Proud of achieving something special',
            'Free and spontaneous',
          ],
          timestamp: new Date().toISOString(),
        };

        setMessages([welcomeMessage]);
        setConversationStage(response.conversation_stage as any);
      } catch (error) {
        console.error('Failed to start conversation:', error);
        
        // Fallback to default greeting
        const welcomeMessage: Message = {
          id: 'welcome',
          role: 'assistant',
          content: `Perfect. I see you're drawn to ${state.destination.name} in ${state.time.month}, seeking ${state.theme.name}.\n\nNow... let me understand the *why* behind this journey.\n\nTell me: What are you hoping to feel when you close your eyes at the end of this experience?`,
          quickReplies: [
            'Peace and relaxation',
            'Deeply connected to my partner',
            'Proud of achieving something special',
            'Free and spontaneous',
          ],
          timestamp: new Date().toISOString(),
        };

        setMessages([welcomeMessage]);
      }
    }
    init();
  }, [router, supabase.auth]);

  // Send message to backend
  const sendMessage = async (content: string) => {
    if (!content.trim() || isLoading || !accountId) return;

    // Add user message
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content,
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      // Get LEXA account from localStorage
      const lexaAccount = loadFromLocalStorage('lexa_account');
      if (!lexaAccount) {
        throw new Error('No LEXA account found');
      }

      // Call real API
      const response = await lexaAPI.converse({
        account_id: lexaAccount.account_id,
        session_id: lexaAccount.session_id,
        message: content,
        conversation_history: formatConversationHistory(messages),
      });

      // Create AIlessia message
      const ailessiaMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: response.ailessia_response,
        timestamp: new Date().toISOString(),
      };

      // Add proactive suggestions as quick replies if available
      if (response.proactive_suggestions && response.proactive_suggestions.length > 0) {
        ailessiaMessage.quickReplies = response.proactive_suggestions.map(
          (suggestion: any) => suggestion.text || suggestion
        );
      }

      setMessages(prev => [...prev, ailessiaMessage]);
      setConversationStage(response.conversation_stage as any);

      // Save conversation to localStorage
      saveToLocalStorage('lexa_conversation', [...messages, userMessage, ailessiaMessage]);

      // If conversation is complete (progress >= 0.9), redirect to script
      if (response.progress >= 0.9 || response.conversation_stage === 'script_ready') {
        setTimeout(() => {
          router.push('/experience/script');
        }, 2000);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: 'I apologize, but I encountered an issue. Could you please try rephrasing that?',
        timestamp: new Date().toISOString(),
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle quick reply
  const handleQuickReply = (reply: string) => {
    sendMessage(reply);
  };

  // Handle form submit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(inputValue);
  };

  return (
    <div className="flex h-screen flex-col bg-gradient-to-br from-zinc-50 via-white to-lexa-cream">
      {/* Header */}
      <header className="relative border-b border-zinc-200/60 bg-white/80 backdrop-blur-lg px-6 py-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              <span className="bg-gradient-to-r from-lexa-navy to-lexa-gold bg-clip-text text-transparent">
                LEXA
              </span>
            </h1>
            <p className="text-xs font-medium text-zinc-400 uppercase tracking-widest mt-0.5">
              Your Emotional Guide
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm font-medium text-zinc-900">{userEmail.split('@')[0]}</p>
              <p className="text-xs text-zinc-500">In conversation</p>
            </div>
          </div>
        </div>
        
        {/* Decorative gradient line */}
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-lexa-gold to-transparent opacity-50" />
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-8 space-y-6">
        <div className="max-w-3xl mx-auto space-y-6">
          {messages.map((message) => (
            <div key={message.id}>
              {/* Message */}
              <div className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-2xl rounded-2xl px-6 py-4 ${
                    message.role === 'user'
                      ? 'bg-lexa-navy text-white'
                      : 'bg-white border-2 border-zinc-100 text-zinc-900 shadow-sm'
                  }`}
                >
                  {message.role === 'assistant' && (
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles className="w-4 h-4 text-lexa-gold" />
                      <span className="text-xs font-semibold text-lexa-gold uppercase tracking-wider">
                        LEXA
                      </span>
                    </div>
                  )}
                  <p className="text-base leading-relaxed whitespace-pre-wrap">{message.content}</p>
                </div>
              </div>

              {/* Quick Replies */}
              {message.role === 'assistant' && message.quickReplies && message.id === messages[messages.length - 1].id && (
                <div className="mt-6 max-w-2xl">
                  <p className="text-sm font-medium text-zinc-500 mb-3">
                    💡 Most frequent answers (or write your own below):
                  </p>
                  <div className="flex flex-wrap gap-2 justify-start">
                    {message.quickReplies.map((reply, index) => (
                      <button
                        key={index}
                        onClick={() => handleQuickReply(reply)}
                        disabled={isLoading}
                        className="quick-reply-button text-sm"
                      >
                        {reply}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* Loading */}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-white border-2 border-zinc-100 rounded-2xl px-6 py-4 shadow-sm">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-lexa-gold animate-pulse" />
                  <span className="text-sm text-zinc-500">AIlessia is thinking...</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Input */}
      <div className="border-t border-zinc-200 bg-white/80 backdrop-blur-lg px-4 py-6">
        <form onSubmit={handleSubmit} className="max-w-3xl mx-auto flex gap-3">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            disabled={isLoading}
            placeholder="Share your thoughts..."
            className="flex-1 rounded-xl border-2 border-zinc-200 px-6 py-4 text-base text-zinc-900 placeholder-zinc-400 focus:border-lexa-gold focus:outline-none focus:ring-2 focus:ring-lexa-gold/20 transition-all disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={isLoading || !inputValue.trim()}
            className="rounded-xl bg-gradient-to-r from-lexa-gold to-yellow-600 px-8 py-4 font-semibold text-zinc-900 transition-all hover:scale-105 hover:shadow-xl hover:shadow-lexa-gold/30 disabled:opacity-50 disabled:hover:scale-100 flex items-center gap-2"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
        
        <p className="text-center text-xs text-zinc-400 mt-3">
          AIlessia listens deeply. Be honest about what you want to feel.
        </p>
      </div>
    </div>
  );
}

