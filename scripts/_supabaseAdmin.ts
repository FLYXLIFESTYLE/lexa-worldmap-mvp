import { createClient } from '@supabase/supabase-js';

export function createSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error(
      'Missing env vars for scripts. Expected NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY. ' +
        'Tip: put them in .env.local in the project root.'
    );
  }

  if (supabaseUrl.includes('placeholder.supabase.co') || supabaseUrl.includes('placeholder')) {
    throw new Error(
      'Your NEXT_PUBLIC_SUPABASE_URL looks like a placeholder. ' +
        'Put the real Supabase Project URL into .env.local (project root).'
    );
  }

  if (supabaseServiceKey.includes('placeholder')) {
    throw new Error(
      'Your SUPABASE_SERVICE_ROLE_KEY looks like a placeholder. ' +
        'Put the real Supabase service role key into .env.local (project root).'
    );
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}


