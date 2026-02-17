/**
 * Auth Callback Route
 * Handles OAuth callbacks and email confirmations.
 * Also saves the user's name to lexa_user_profiles.
 */

import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const origin = requestUrl.origin;

  if (code) {
    const supabase = await createClient();
    await supabase.auth.exchangeCodeForSession(code);

    // Save user name from auth metadata to lexa_user_profiles
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const fullName = user.user_metadata?.full_name;
        const firstName = fullName ? String(fullName).split(' ')[0] : null;

        if (fullName) {
          await supabase
            .from('lexa_user_profiles')
            .upsert(
              {
                user_id: user.id,
                full_name: fullName,
                first_name: firstName,
                updated_at: new Date().toISOString(),
              },
              { onConflict: 'user_id' }
            );
        }
      }
    } catch {
      // Don't block auth callback if profile update fails
    }
  }

  return NextResponse.redirect(`${origin}/app`);
}
