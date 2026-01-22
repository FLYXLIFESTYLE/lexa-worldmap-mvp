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
    <div className="relative border-t border-white/10 bg-black/20 backdrop-blur-xl p-4 sm:p-6">
      {/* Decorative gradient line */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-lexa-gold to-transparent opacity-50" />
      
      <div className="mx-auto flex w-full max-w-3xl flex-col items-stretch gap-3 sm:flex-row sm:items-end">
        <div className="relative flex-1">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Share what you want, in your own words..."
            disabled={disabled}
            className="w-full resize-none rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-zinc-100 placeholder-zinc-400 focus:border-lexa-gold focus:outline-none focus:ring-2 focus:ring-lexa-gold/20 disabled:opacity-50 transition-all shadow-sm backdrop-blur-md sm:px-5 sm:py-4"
            rows={1}
            style={{ minHeight: '52px', maxHeight: '200px' }}
          />
          <div className="absolute bottom-3 right-3 text-xs text-zinc-400">
            {input.length > 0 && `${input.length} characters`}
          </div>
        </div>
        
        <button
          onClick={handleSend}
          disabled={disabled || !input.trim()}
          className="group relative h-[52px] w-full overflow-hidden rounded-2xl bg-gradient-to-r from-lexa-gold to-yellow-600 px-6 py-3 font-semibold text-zinc-900 transition-all hover:shadow-xl hover:shadow-lexa-gold/30 hover:scale-[1.01] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 sm:h-[60px] sm:w-auto sm:px-8 sm:py-4 sm:hover:scale-105"
        >
          <span className="relative z-10">Send</span>
          <div className="absolute inset-0 bg-gradient-to-r from-yellow-400 to-lexa-gold opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        </button>
      </div>
      
      {/* Helpful hint */}
      <div className="mx-auto mt-3 flex w-full max-w-3xl flex-col gap-1 text-[11px] text-zinc-400 sm:flex-row sm:items-center sm:justify-between sm:text-xs">
        <span>Press Enter to send, Shift+Enter for new line</span>
        <span className="text-lexa-gold">Powered by Claude Sonnet 4.5</span>
      </div>
    </div>
  );
}

