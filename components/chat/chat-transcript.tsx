/**
 * Chat Transcript - Message List
 */

'use client';

import { useEffect, useRef, useState } from 'react';
import QuickReplyPanel from './quick-reply-panel';
import type { LexaUiPayload } from '@/lib/lexa/types';
import { ThumbsDown, ThumbsUp } from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  created_at: string;
  ui?: LexaUiPayload | null;
}

interface ChatTranscriptProps {
  messages: Message[];
  isLoading: boolean;
  onQuickReply?: (value: string) => void;
}

export default function ChatTranscript({ messages, isLoading, onQuickReply }: ChatTranscriptProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  
  // Auto-scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const lastMsg = messages[messages.length - 1];
  const ui = lastMsg?.role === 'assistant' ? lastMsg.ui : null;
  
  return (
    <div className="flex-1 overflow-y-auto px-4 py-6">
      <div className="mx-auto max-w-3xl space-y-6">
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}
        
        {isLoading && (
          <div className="flex items-center space-x-2 text-zinc-500">
            <div className="h-2 w-2 animate-bounce rounded-full bg-zinc-400" style={{ animationDelay: '0ms' }} />
            <div className="h-2 w-2 animate-bounce rounded-full bg-zinc-400" style={{ animationDelay: '150ms' }} />
            <div className="h-2 w-2 animate-bounce rounded-full bg-zinc-400" style={{ animationDelay: '300ms' }} />
          </div>
        )}
        
        {/* Server-driven quick replies */}
        {ui && onQuickReply && !isLoading ? <QuickReplyPanel ui={ui} onSend={onQuickReply} /> : null}
        
        <div ref={bottomRef} />
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';
  const isAssistant = message.role === 'assistant';

  const sendFeedback = async (rating: 1 | -1) => {
    // Only works when message.id is a real UUID from Supabase (we now return assistantMessageId from API)
    try {
      await fetch('/api/lexa/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageId: message.id, rating }),
      });
    } catch {
      // ignore
    }
  };
  
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} group`}>
      <div
        className={`max-w-[85%] rounded-2xl px-6 py-4 transition-all ${
          isUser
            ? 'bg-gradient-to-br from-lexa-gold/90 to-yellow-600/90 text-zinc-900 shadow-lg shadow-black/20'
            : isSystem
            ? 'bg-red-50 text-red-900 border border-red-200'
            : 'bg-white/5 text-zinc-100 shadow-md border border-white/10 hover:shadow-lg backdrop-blur-md'
        }`}
      >
        {/* Feedback actions (assistant messages only) */}
        {isAssistant && (
          <div className="mb-2 flex items-center justify-end gap-2 opacity-0 transition-opacity group-hover:opacity-100">
            <button
              onClick={() => sendFeedback(1)}
              className="rounded-full border border-white/10 bg-white/5 p-2 text-zinc-200 hover:border-lexa-gold/30 hover:bg-white/10"
              aria-label="Thumbs up"
            >
              <ThumbsUp className="h-4 w-4" />
            </button>
            <button
              onClick={() => sendFeedback(-1)}
              className="rounded-full border border-white/10 bg-white/5 p-2 text-zinc-200 hover:border-lexa-gold/30 hover:bg-white/10"
              aria-label="Thumbs down"
            >
              <ThumbsDown className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Render content with line breaks and formatting */}
        <div className="prose prose-sm max-w-none prose-invert">
          {message.content.split('\n').map((line, i) => {
            // Detect if line is a heading (starts with **)
            const isHeading = line.startsWith('**') && line.endsWith('**');
            const isBullet = line.trim().startsWith('-');
            
            if (isHeading) {
              const headingText = line.replace(/\*\*/g, '');
              return (
                <h3 key={i} className={`font-bold text-lexa-gold ${i > 0 ? 'mt-4' : ''}`}>
                  {headingText}
                </h3>
              );
            }
            
            if (isBullet) {
              return (
                <p key={i} className={`${i > 0 ? 'mt-2' : ''} pl-3`}>
                  <span className="text-lexa-gold mr-2">•</span>
                  {line.replace(/^-\s*/, '')}
                </p>
              );
            }
            
            // Handle bold text inline
            const parts = line.split(/(\*\*.*?\*\*)/g);
            return (
              <p key={i} className={i > 0 ? 'mt-2' : ''}>
                {parts.map((part, j) => {
                  if (part.startsWith('**') && part.endsWith('**')) {
                    return (
                      <strong key={j} className="font-semibold">
                        {part.replace(/\*\*/g, '')}
                      </strong>
                    );
                  }
                  return <span key={j}>{part}</span>;
                })}
              </p>
            );
          })}
        </div>
        
        {/* Timestamp */}
        <div className={`mt-2 text-xs text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity`}>
          {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    </div>
  );
}

