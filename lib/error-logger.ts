/**
 * Client-Side Error Logger
 * Automatically logs errors to the backend
 * Deduplicates and tracks occurrence counts
 */

export async function logError(
  errorType: string,
  errorMessage: string,
  stackTrace?: string,
  severity: 'critical' | 'high' | 'medium' | 'low' = 'medium',
  metadata?: Record<string, any>
) {
  try {
    await fetch('/api/errors/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error_type: errorType,
        error_message: errorMessage,
        stack_trace: stackTrace,
        page_url: window.location.href,
        severity,
        metadata
      })
    });
  } catch (error) {
    // Fail silently to avoid error loops
    console.error('Failed to log error:', error);
  }
}

/**
 * Initialize global error handlers
 * Call this once in your app to automatically capture all errors
 */
export function initErrorLogging() {
  // Capture unhandled errors
  if (typeof window !== 'undefined') {
    window.addEventListener('error', (event) => {
      logError(
        'UncaughtError',
        event.message,
        event.error?.stack,
        'high',
        {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno
        }
      );
    });

    // Capture unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      logError(
        'UnhandledPromiseRejection',
        event.reason?.message || String(event.reason),
        event.reason?.stack,
        'high',
        {
          promise: event.promise
        }
      );
    });

    // Capture React errors (if using React Error Boundary)
    window.addEventListener('reacterror', ((event: CustomEvent) => {
      logError(
        'ReactError',
        event.detail.error.message,
        event.detail.error.stack,
        'high',
        {
          errorInfo: event.detail.errorInfo
        }
      );
    }) as EventListener);
  }
}

/**
 * Manual error logging function
 * Use this in try-catch blocks
 */
export function captureException(error: Error, severity: 'critical' | 'high' | 'medium' | 'low' = 'medium') {
  logError(
    error.name || 'Error',
    error.message,
    error.stack,
    severity
  );
}

