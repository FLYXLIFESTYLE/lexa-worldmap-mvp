/**
 * Push-to-Talk Button
 * Hold to record voice input
 */

'use client';

import { useSpeechRecognition } from '@/hooks/use-speech-recognition';
import { useEffect } from 'react';

interface PushToTalkProps {
  onTranscript: (text: string) => void;
}

export default function PushToTalk({ onTranscript }: PushToTalkProps) {
  const {
    isListening,
    transcript,
    startListening,
    stopListening,
    resetTranscript,
    isSupported,
    error,
  } = useSpeechRecognition();
  
  useEffect(() => {
    if (transcript && !isListening) {
      // Speech has stopped, send transcript
      onTranscript(transcript);
      resetTranscript();
    }
  }, [isListening, transcript, onTranscript, resetTranscript]);
  
  if (!isSupported) {
    return (
      <div className="text-sm text-zinc-500">
        Voice input not supported in this browser
      </div>
    );
  }
  
  return (
    <div className="flex flex-col items-center space-y-2">
      <button
        onMouseDown={startListening}
        onMouseUp={stopListening}
        onTouchStart={startListening}
        onTouchEnd={stopListening}
        className={`flex h-16 w-16 items-center justify-center rounded-full transition-all ${
          isListening
            ? 'animate-pulse bg-red-500 text-white'
            : 'bg-zinc-900 text-white hover:bg-zinc-800'
        }`}
      >
        <svg
          className="h-8 w-8"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
          />
        </svg>
      </button>
      
      {isListening && (
        <p className="text-sm text-zinc-600">Listening...</p>
      )}
      
      {transcript && !isListening && (
        <p className="text-sm text-zinc-600 italic">"{transcript}"</p>
      )}
      
      {error && (
        <p className="text-sm text-red-500">{error}</p>
      )}
    </div>
  );
}

