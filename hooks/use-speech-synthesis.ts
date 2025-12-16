/**
 * Speech Synthesis Hook
 * Wraps Web Speech API for voice output
 */

'use client';

import { useState, useEffect, useRef } from 'react';

interface UseSpeechSynthesisResult {
  speak: (text: string, options?: SpeechSynthesisOptions) => void;
  stop: () => void;
  isSpeaking: boolean;
  isSupported: boolean;
}

interface SpeechSynthesisOptions {
  rate?: number;  // 0.1 to 10
  pitch?: number; // 0 to 2
  volume?: number; // 0 to 1
  voice?: SpeechSynthesisVoice;
}

export function useSpeechSynthesis(): UseSpeechSynthesisResult {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  
  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      setIsSupported(true);
      
      // Monitor speaking state
      const checkSpeaking = setInterval(() => {
        setIsSpeaking(window.speechSynthesis.speaking);
      }, 100);
      
      return () => {
        clearInterval(checkSpeaking);
        window.speechSynthesis.cancel();
      };
    } else {
      setIsSupported(false);
    }
  }, []);
  
  const speak = (text: string, options: SpeechSynthesisOptions = {}) => {
    if (!isSupported) {
      console.warn('Speech synthesis not supported');
      return;
    }
    
    // Stop any ongoing speech
    window.speechSynthesis.cancel();
    
    // Create utterance
    const utterance = new SpeechSynthesisUtterance(text);
    
    // Apply options
    if (options.rate !== undefined) utterance.rate = options.rate;
    if (options.pitch !== undefined) utterance.pitch = options.pitch;
    if (options.volume !== undefined) utterance.volume = options.volume;
    if (options.voice) utterance.voice = options.voice;
    
    // Event listeners
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    
    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  };
  
  const stop = () => {
    if (isSupported && isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  };
  
  return {
    speak,
    stop,
    isSpeaking,
    isSupported,
  };
}

