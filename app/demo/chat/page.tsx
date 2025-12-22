/**
 * Admin Demo Chat - Test LEXA Conversation Flow
 * Requires admin authentication
 */

'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client-browser';
import { useRouter } from 'next/navigation';
import { Send, Sparkles, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { lexaAPI, loadFromLocalStorage, saveToLocalStorage } from '@/lib/api/lexa-client';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  quickReplies?: string[];
  timestamp: string;
}

export default function AdminDemoChatPage() {
  const router = useRouter();
  const supabase = createClient();
  const [userEmail, setUserEmail] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [authChecking, setAuthChecking] = useState(true);
  const [initError, setInitError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);

  // Check admin auth
  useEffect(() => {
    async function checkAuth() {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push('/auth/signin?redirectTo=/demo/chat');
        return;
      }

      // Check if user is admin (you can customize this check)
      // For now, any authenticated user can access (change this later)
      setUserEmail(user.email || '');
      setIsAdmin(true);
      setAuthChecking(false);

      // Initialize demo session
      initializeDemoSession(user.email || 'demo@admin');
    }

    checkAuth();
  }, [router, supabase.auth]);

  async function initializeDemoSession(email: string) {
    setIsInitializing(true);
    setInitError(null);
    
    try {
      console.log('[Demo Chat] Initializing session for:', email);
      
      // Try to load existing session from localStorage
      const stored = loadFromLocalStorage('lexa_account');
      console.log('[Demo Chat] Stored session:', stored);
      
      if (stored?.account_id && stored?.session_id) {
        console.log('[Demo Chat] Restoring session:', stored.session_id);
        setAccountId(stored.account_id);
        setSessionId(stored.session_id);
        
        // Load conversation history if exists
        if (stored.conversation_history && stored.conversation_history.length > 0) {
          const formattedMessages: Message[] = stored.conversation_history.map((msg: any, idx: number) => ({
            id: `msg-${idx}`,
            role: msg.role,
            content: msg.content,
            timestamp: new Date().toISOString()
          }));
          setMessages(formattedMessages);
        } else {
          // Add welcome message if no history
          addWelcomeMessage();
        }
      } else {
        // Create new demo account
        console.log('[Demo Chat] Creating new account...');
        const account = await lexaAPI.createAccount({
          email,
          name: 'Admin Demo User',
        });
        
        console.log('[Demo Chat] Account created:', account);
        setAccountId(account.account_id || null);
        setSessionId(account.session_id || null);
        
        // Add welcome message
        addWelcomeMessage();
      }
    } catch (error: any) {
      console.error('[Demo Chat] Failed to initialize demo session:', error);
      setInitError(error.message || 'Failed to initialize session');
      
      // Show error message in chat
      const errorMsg: Message = {
        id: 'error-init',
        role: 'assistant',
        content: `⚠️ Session initialization failed: ${error.message || 'Unknown error'}\n\nThis might be because the backend API is not running. Please check the admin dashboard or try again later.`,
        timestamp: new Date().toISOString()
      };
      setMessages([errorMsg]);
    } finally {
      setIsInitializing(false);
    }
  }

  function addWelcomeMessage() {
    const welcomeMsg: Message = {
      id: 'welcome',
      role: 'assistant',
      content: '✨ Welcome to the LEXA Demo Chat! This is a testing environment where you can experience the full conversation flow.\n\nI\'m LEXA, your Luxury Experience Assistant. I design travel experiences based on emotional intelligence.\n\nWhat kind of experience are you dreaming of?',
      quickReplies: [
        'A relaxing beach escape',
        'An adventurous mountain retreat',
        'A cultural city experience',
        'Something completely unique'
      ],
      timestamp: new Date().toISOString()
    };
    setMessages([welcomeMsg]);
  }

  async function handleSendMessage(content: string) {
    if (!content.trim() || isLoading) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      // Call LEXA API
      const response = await lexaAPI.converse({
        message: content,
        account_id: accountId!,
        session_id: sessionId!,
      });

      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: response.ailessia_response,
        timestamp: new Date().toISOString()
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: '😔 I apologize, but I encountered a connection issue. This is a demo environment, so there might be temporary connectivity problems. Please try again or check the admin dashboard for system status.',
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }

  function handleQuickReply(reply: string) {
    handleSendMessage(reply);
  }

  function handleResetChat() {
    if (confirm('Reset this demo chat? This will clear all messages and start fresh.')) {
      localStorage.removeItem('lexa_account');
      setMessages([]);
      setAccountId(null);
      setSessionId(null);
      setInitError(null);
      initializeDemoSession(userEmail);
    }
  }

  if (authChecking) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-lexa-gold mx-auto mb-4"></div>
          <p className="text-gray-600">Checking authorization...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">⚠️ Admin access required</p>
          <Link href="/admin/dashboard" className="text-lexa-gold hover:underline">
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen transition-colors ${isDarkMode ? 'bg-zinc-900' : 'bg-gray-50'}`}>
      {/* Header */}
      <div className={`border-b ${isDarkMode ? 'bg-zinc-800 border-zinc-700' : 'bg-white border-gray-200'}`}>
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link 
              href="/admin/dashboard"
              className={`flex items-center gap-2 ${isDarkMode ? 'text-zinc-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'} transition-colors`}
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Dashboard</span>
            </Link>
            <div className={`h-6 w-px ${isDarkMode ? 'bg-zinc-700' : 'bg-gray-300'}`} />
            <div className="flex items-center gap-3">
              <div className="relative">
                <Sparkles className="w-6 h-6 text-lexa-gold" />
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full"></span>
              </div>
              <div>
                <h1 className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  LEXA Demo Chat
                </h1>
                <p className="text-xs text-lexa-gold">Admin Testing Environment</p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                isDarkMode 
                  ? 'bg-zinc-700 text-white hover:bg-zinc-600' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {isDarkMode ? '☀️ Light' : '🌙 Dark'}
            </button>
            <button
              onClick={handleResetChat}
              className="px-3 py-1.5 text-sm rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors"
            >
              🔄 Reset
            </button>
          </div>
        </div>
      </div>

      {/* Chat Container */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className={`rounded-2xl shadow-lg overflow-hidden ${isDarkMode ? 'bg-zinc-800' : 'bg-white'}`}>
          {/* Messages */}
          <div className="h-[calc(100vh-280px)] overflow-y-auto p-6 space-y-6">
            {isInitializing && messages.length === 0 && (
              <div className="text-center py-12">
                <Sparkles className="w-12 h-12 text-lexa-gold mx-auto mb-4 animate-pulse" />
                <p className={`${isDarkMode ? 'text-zinc-400' : 'text-gray-600'}`}>
                  Initializing demo session...
                </p>
                <p className={`text-xs mt-2 ${isDarkMode ? 'text-zinc-500' : 'text-gray-500'}`}>
                  Creating your LEXA account and session
                </p>
              </div>
            )}
            
            {initError && messages.length === 0 && (
              <div className="text-center py-12">
                <div className="text-5xl mb-4">⚠️</div>
                <p className="text-red-500 font-semibold mb-2">Session Initialization Failed</p>
                <p className={`text-sm mb-4 ${isDarkMode ? 'text-zinc-400' : 'text-gray-600'}`}>
                  {initError}
                </p>
                <button
                  onClick={() => initializeDemoSession(userEmail)}
                  className="px-6 py-3 bg-lexa-gold text-zinc-900 rounded-lg hover:bg-yellow-600 transition-colors"
                >
                  Retry Initialization
                </button>
              </div>
            )}
            
            {!isInitializing && messages.length === 0 && !initError && (
              <div className="text-center py-12">
                <Sparkles className="w-12 h-12 text-lexa-gold mx-auto mb-4" />
                <p className={`${isDarkMode ? 'text-zinc-400' : 'text-gray-600'}`}>
                  Session ready. Start chatting below!
                </p>
              </div>
            )}
            
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[80%] ${message.role === 'user' ? 'order-2' : 'order-1'}`}>
                  <div
                    className={`rounded-2xl px-6 py-4 ${
                      message.role === 'user'
                        ? 'bg-lexa-gold text-zinc-900'
                        : isDarkMode
                        ? 'bg-zinc-700 text-white'
                        : 'bg-gray-100 text-gray-900'
                    }`}
                  >
                    <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
                  </div>
                  
                  {/* Quick Replies */}
                  {message.role === 'assistant' && message.quickReplies && message.quickReplies.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {message.quickReplies.map((reply, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleQuickReply(reply)}
                          disabled={isLoading}
                          className={`px-4 py-2 text-sm rounded-full transition-all ${
                            isDarkMode
                              ? 'bg-zinc-600 text-white hover:bg-zinc-500'
                              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                          } disabled:opacity-50`}
                        >
                          {reply}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className={`rounded-2xl px-6 py-4 ${isDarkMode ? 'bg-zinc-700' : 'bg-gray-100'}`}>
                  <div className="flex items-center gap-2">
                    <div className="flex space-x-2">
                      <div className="w-2 h-2 bg-lexa-gold rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-2 h-2 bg-lexa-gold rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-2 h-2 bg-lexa-gold rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                    <span className={`text-sm ${isDarkMode ? 'text-zinc-400' : 'text-gray-500'}`}>
                      LEXA is thinking...
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className={`border-t p-4 ${isDarkMode ? 'border-zinc-700 bg-zinc-800' : 'border-gray-200 bg-gray-50'}`}>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage(inputValue);
              }}
              className="flex gap-3"
            >
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                disabled={isLoading}
                placeholder="Share your thoughts with LEXA..."
                className={`flex-1 rounded-xl px-6 py-4 focus:outline-none focus:ring-2 focus:ring-lexa-gold transition-all ${
                  isDarkMode
                    ? 'bg-zinc-700 text-white placeholder-zinc-400'
                    : 'bg-white text-gray-900 placeholder-gray-400 border border-gray-300'
                } disabled:opacity-50`}
              />
              <button
                type="submit"
                disabled={isLoading || !inputValue.trim()}
                className="px-6 py-4 bg-gradient-to-r from-lexa-gold to-yellow-600 text-zinc-900 rounded-xl font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Send className="w-5 h-5" />
                <span className="hidden sm:inline">Send</span>
              </button>
            </form>
            
            <p className={`text-xs mt-3 text-center ${isDarkMode ? 'text-zinc-500' : 'text-gray-500'}`}>
              👨‍💼 Admin Demo Mode • Session: {sessionId?.substring(0, 8) || 'Initializing...'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

