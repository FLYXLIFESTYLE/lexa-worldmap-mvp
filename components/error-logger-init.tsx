'use client';

import { useEffect } from 'react';
import { initErrorLogging } from '@/lib/error-logger';

/**
 * ErrorLoggerInit Component
 * Initializes global error logging on mount
 */
export default function ErrorLoggerInit() {
  useEffect(() => {
    initErrorLogging();
  }, []);

  return null; // This component doesn't render anything
}

