/**
 * Chat Input - Text Input + Send Button + Push-to-Talk Voice
 *
 * Users can type OR hold the microphone button to speak.
 * Voice input is transcribed in real-time and placed into the text field.
 */

'use client';

import { useState, useEffect, KeyboardEvent } from 'react';
import { Mic, MicOff, Send } from 'lucide-react';
import { useSpeechRecognition } from '@/hooks/use-speech-recognition';

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
}

export default function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [input, setInput] = useState('');
  const {
    isListening,
    transcript,
    startListening,
    stopListening,
    resetTranscript,
    isSupported: voiceSupported,
  } = useSpeechRecognition();

  // When voice transcript arrives, put it in the text field
  useEffect(() => {
    if (transcript) {
      setInput(transcript);
    }
  }, [transcript]);

  // When user releases the mic button and we have a transcript, auto-send
  useEffect(() => {
    if (!isListening && transcript && transcript.trim().length > 0) {
      // Small delay so the user sees the transcribed text before it sends
      const timer = setTimeout(() => {
        onSend(transcript.trim());
        setInput('');
        resetTranscript();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isListening, transcript, onSend, resetTranscript]);

  const handleSend = () => {
    if (input.trim() && !disabled) {
      onSend(input);
      setInput('');
      resetTranscript();
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleMicDown = () => {
    if (!disabled && voiceSupported) {
      resetTranscript();
      setInput('');
      startListening();
    }
  };

  const handleMicUp = () => {
    if (isListening) {
      stopListening();
    }
  };

  return (
    <div className="relative border-t border-white/10 bg-black/20 backdrop-blur-xl p-4 sm:p-6">
      {/* Decorative gradient line */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-lexa-gold to-transparent opacity-50" />

      {/* Voice listening indicator */}
      {isListening && (
        <div className="mx-auto mb-3 flex w-full max-w-3xl items-center justify-center gap-2">
          <div className="flex items-center gap-2 rounded-full bg-red-500/20 border border-red-400/30 px-4 py-2">
            <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-sm text-red-300 font-medium">
              Listening... release to send
            </span>
          </div>
        </div>
      )}

      <div className="mx-auto flex w-full max-w-3xl flex-col items-stretch gap-3 sm:flex-row sm:items-end">
        {/* Text input */}
        <div className="relative flex-1">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isListening ? 'Listening...' : 'Share what you want, in your own words...'}
            disabled={disabled || isListening}
            className="w-full resize-none rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-zinc-100 placeholder-zinc-400 focus:border-lexa-gold focus:outline-none focus:ring-2 focus:ring-lexa-gold/20 disabled:opacity-50 transition-all shadow-sm backdrop-blur-md sm:px-5 sm:py-4"
            rows={1}
            style={{ minHeight: '52px', maxHeight: '200px' }}
          />
        </div>

        {/* Microphone button (push-to-talk) */}
        {voiceSupported && (
          <button
            onMouseDown={handleMicDown}
            onMouseUp={handleMicUp}
            onMouseLeave={handleMicUp}
            onTouchStart={handleMicDown}
            onTouchEnd={handleMicUp}
            disabled={disabled}
            className={`group relative h-[52px] w-[52px] flex-shrink-0 overflow-hidden rounded-2xl transition-all sm:h-[60px] sm:w-[60px] ${
              isListening
                ? 'bg-red-500 shadow-lg shadow-red-500/30 scale-110'
                : 'bg-white/10 border border-white/10 hover:bg-white/15 hover:border-lexa-gold/30'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            title="Hold to speak"
          >
            {isListening ? (
              <Mic className="h-5 w-5 text-white mx-auto animate-pulse" />
            ) : (
              <MicOff className="h-5 w-5 text-zinc-400 mx-auto group-hover:text-lexa-gold transition-colors" />
            )}
          </button>
        )}

        {/* Send button */}
        <button
          onClick={handleSend}
          disabled={disabled || !input.trim()}
          className="group relative h-[52px] w-full overflow-hidden rounded-2xl bg-gradient-to-r from-lexa-gold to-yellow-600 px-6 py-3 font-semibold text-zinc-900 transition-all hover:shadow-xl hover:shadow-lexa-gold/30 hover:scale-[1.01] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 sm:h-[60px] sm:w-auto sm:px-8 sm:py-4 sm:hover:scale-105"
        >
          <span className="relative z-10 flex items-center justify-center gap-2">
            <Send className="h-4 w-4" />
            <span className="sm:inline">Send</span>
          </span>
          <div className="absolute inset-0 bg-gradient-to-r from-yellow-400 to-lexa-gold opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        </button>
      </div>

      {/* Helpful hints */}
      <div className="mx-auto mt-3 flex w-full max-w-3xl flex-col gap-1 text-[11px] text-zinc-400 sm:flex-row sm:items-center sm:justify-between sm:text-xs">
        <span>
          Press Enter to send, Shift+Enter for new line
          {voiceSupported && ' · Hold mic to speak'}
        </span>
        <span className="text-lexa-gold">Powered by Claude Sonnet 4.5</span>
      </div>
    </div>
  );
}
