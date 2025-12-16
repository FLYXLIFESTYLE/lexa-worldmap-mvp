/**
 * Application Initialization
 * Initializes services when the app starts
 */

import { initializeScheduler } from './scheduler';

let initialized = false;

export function initializeServices(): void {
  if (initialized) {
    return;
  }

  console.log('[Init] Initializing application services...');
  
  try {
    // Initialize the scheduler
    initializeScheduler();
    
    initialized = true;
    console.log('[Init] All services initialized successfully');
  } catch (error) {
    console.error('[Init] Failed to initialize services:', error);
    throw error;
  }
}

export function isInitialized(): boolean {
  return initialized;
}

