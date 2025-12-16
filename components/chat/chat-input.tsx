/**
 * Chat Input - Text Input + Send Button
 */

'use client';

import { useState, KeyboardEvent } from 'react';

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
}

export default function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [input, setInput] = useState('');
  
  const handleSend = () => {
    if (input.trim() && !disabled) {
      onSend(input);
      setInput('');
    }
  };
  
  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };
  
  return (
    <div className="relative border-t border-zinc-200/60 bg-white/80 backdrop-blur-lg p-6 shadow-lg">
      {/* Decorative gradient line */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-lexa-gold to-transparent opacity-50" />
      
      <div className="mx-auto max-w-3xl flex items-end space-x-3">
        <div className="flex-1 relative">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Share your thoughts..."
            disabled={disabled}
            className="w-full resize-none rounded-xl border-2 border-zinc-200 bg-white px-5 py-4 text-zinc-900 placeholder-zinc-400 focus:border-lexa-gold focus:outline-none focus:ring-2 focus:ring-lexa-gold/20 disabled:opacity-50 transition-all shadow-sm"
            rows={1}
            style={{ minHeight: '60px', maxHeight: '200px' }}
          />
          <div className="absolute bottom-3 right-3 text-xs text-zinc-400">
            {input.length > 0 && `${input.length} characters`}
          </div>
        </div>
        
        <button
          onClick={handleSend}
          disabled={disabled || !input.trim()}
          className="group relative overflow-hidden rounded-xl bg-gradient-to-r from-lexa-navy to-zinc-900 px-8 py-4 font-semibold text-white transition-all hover:shadow-xl hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          style={{ height: '60px' }}
        >
          <span className="relative z-10">Send</span>
          <div className="absolute inset-0 bg-gradient-to-r from-lexa-gold to-lexa-navy opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        </button>
      </div>
      
      {/* Helpful hint */}
      <div className="mx-auto max-w-3xl mt-3 flex items-center justify-between text-xs text-zinc-400">
        <span>Press Enter to send, Shift+Enter for new line</span>
        <span className="text-lexa-gold">✨ Powered by Claude Sonnet 4.5</span>
      </div>
    </div>
  );
}

