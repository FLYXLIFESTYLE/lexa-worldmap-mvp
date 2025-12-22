/**
 * Supabase Admin Client
 * For backend operations that need to bypass RLS
 * Use carefully - only for trusted server-side operations
 */

import { createClient } from '@supabase/supabase-js';

// IMPORTANT:
// Do not throw at import-time. Next.js may evaluate server route modules during build.
// We still want production to fail loudly at *runtime* if misconfigured, but not fail the build.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-service-role-key';

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  // eslint-disable-next-line no-console
  console.warn(
    'Supabase admin client is using placeholder credentials (missing NEXT_PUBLIC_SUPABASE_URL and/or SUPABASE_SERVICE_ROLE_KEY). ' +
      'Set these env vars in production to enable server-side Supabase operations.'
  );
}

// Admin client with service role key (bypasses RLS)
// Only use for operations that need admin access
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

