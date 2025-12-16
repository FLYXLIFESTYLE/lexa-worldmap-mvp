/**
 * Chat Transcript - Message List
 */

'use client';

import { useEffect, useRef, useState } from 'react';
import QuickReplies from './quick-replies';
import dynamic from 'next/dynamic';

// Dynamically import WorldMap to avoid SSR issues with Leaflet
const WorldMap = dynamic(() => import('../map/world-map'), {
  ssr: false,
  loading: () => <div className="h-96 bg-zinc-100 rounded-2xl flex items-center justify-center">Loading map...</div>
});

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  created_at: string;
}

interface ChatTranscriptProps {
  messages: Message[];
  isLoading: boolean;
  stage: string;
  onQuickReply?: (value: string) => void;
}

export default function ChatTranscript({ messages, isLoading, stage, onQuickReply }: ChatTranscriptProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const [showQuickReplies, setShowQuickReplies] = useState(true);
  const [showMap, setShowMap] = useState(false);
  
  // Auto-scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);
  
  // Determine which quick replies to show based on stage
  const getQuickReplyTypes = () => {
    if (stage === 'WELCOME') return ['text-voice'];
    if (stage === 'INITIAL_QUESTIONS') {
      // Show all three button types for the 3 questions
      return ['months', 'destinations', 'themes'];
    }
    return [];
  };
  
  const quickReplyTypes = getQuickReplyTypes();
  const shouldShowQuickReplies = showQuickReplies && quickReplyTypes.length > 0 && !isLoading;
  
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
        
        {/* Quick Reply Buttons */}
        {shouldShowQuickReplies && onQuickReply && (
          <div className="mt-4 space-y-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
                Quick Replies
              </span>
              <button
                onClick={() => setShowQuickReplies(false)}
                className="text-xs text-zinc-400 hover:text-zinc-600 transition-colors"
                aria-label="Hide quick replies"
              >
                Hide
              </button>
            </div>
            
            {/* Render each button type */}
            {quickReplyTypes.map((type) => (
              <div key={type} className="space-y-2">
                {type === 'months' && (
                  <p className="text-xs font-semibold text-lexa-navy uppercase tracking-wider">
                    When do you want to travel?
                  </p>
                )}
                {type === 'destinations' && (
                  <>
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-lexa-navy uppercase tracking-wider">
                        Where are you drawn to?
                      </p>
                      <button
                        onClick={() => setShowMap(!showMap)}
                        className="text-xs font-medium text-lexa-gold hover:text-lexa-navy transition-colors flex items-center gap-1"
                      >
                        {showMap ? '📍 Hide Map' : '🗺️ Show Map'}
                      </button>
                    </div>
                    {showMap && (
                      <div className="my-4">
                        <WorldMap
                          height="400px"
                          zoom={2}
                          onDestinationSelect={(dest) => {
                            onQuickReply(dest.name);
                            setShowMap(false);
                          }}
                        />
                      </div>
                    )}
                  </>
                )}
                {type === 'themes' && (
                  <p className="text-xs font-semibold text-lexa-navy uppercase tracking-wider">
                    What experience are you seeking?
                  </p>
                )}
                <QuickReplies
                  type={type as any}
                  onSelect={onQuickReply}
                  disabled={isLoading}
                />
              </div>
            ))}
          </div>
        )}
        
        {/* Show Quick Replies button if hidden */}
        {!showQuickReplies && quickReplyTypes.length > 0 && !isLoading && (
          <button
            onClick={() => setShowQuickReplies(true)}
            className="text-sm text-lexa-gold hover:text-lexa-navy transition-colors font-medium"
          >
            + Show Quick Replies
          </button>
        )}
        
        <div ref={bottomRef} />
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';
  
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} group`}>
      <div
        className={`max-w-[85%] rounded-2xl px-6 py-4 transition-all ${
          isUser
            ? 'bg-gradient-to-br from-lexa-navy to-zinc-900 text-white shadow-lg'
            : isSystem
            ? 'bg-red-50 text-red-900 border border-red-200'
            : 'bg-white text-zinc-900 shadow-md border border-zinc-100 hover:shadow-lg'
        }`}
      >
        {/* Render content with line breaks and formatting */}
        <div className="prose prose-sm max-w-none">
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
        <div className={`mt-2 text-xs ${isUser ? 'text-zinc-400' : 'text-zinc-400'} opacity-0 group-hover:opacity-100 transition-opacity`}>
          {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    </div>
  );
}

