/**
 * Next.js Instrumentation
 * Called once when the server starts
 */

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Only run on the server side
    const { initializeServices } = await import('./lib/services/init');
    initializeServices();
  }
}

