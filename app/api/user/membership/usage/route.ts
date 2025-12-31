import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get current period (start of month to now)
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    // Get user's membership tier for limits
    const { data: membership } = await supabase
      .from('user_memberships')
      .select(`
        *,
        tier:membership_tiers(*)
      `)
      .eq('user_id', user.id)
      .single();

    // Count scripts created this month
    const { count: scriptsCreated } = await supabase
      .from('experience_briefs')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('created_at', periodStart.toISOString())
      .lte('created_at', periodEnd.toISOString());

    // Count conversations this month
    const { count: conversationsCount } = await supabase
      .from('lexa_sessions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('created_at', periodStart.toISOString())
      .lte('created_at', periodEnd.toISOString());

    // Get or create usage tracking record
    const { data: usageData, error: usageError } = await supabase
      .from('membership_usage_tracking')
      .select('*')
      .eq('user_id', user.id)
      .eq('period_start', periodStart.toISOString())
      .single();

    if (usageError && usageError.code === 'PGRST116') {
      // Create new usage record
      await supabase
        .from('membership_usage_tracking')
        .insert({
          user_id: user.id,
          period_start: periodStart.toISOString(),
          period_end: periodEnd.toISOString(),
          scripts_created: scriptsCreated || 0
        });
    }

    // Get limits from tier
    const tier = membership?.tier as any;
    const limits = tier?.limits || {};
    const scriptsLimit = limits.scripts_per_month === -1 ? -1 : (limits.scripts_per_month || 3);
    const conversationsLimit = limits.conversations_per_month === -1 ? -1 : (limits.conversations_per_month || 10);

    return NextResponse.json({
      period: {
        start: periodStart.toISOString(),
        end: periodEnd.toISOString()
      },
      usage: {
        scripts_created: scriptsCreated || 0,
        scripts_limit: scriptsLimit,
        scripts_remaining: scriptsLimit === -1 ? -1 : Math.max(0, scriptsLimit - (scriptsCreated || 0)),
        conversations_count: conversationsCount || 0,
        conversations_limit: conversationsLimit,
        conversations_remaining: conversationsLimit === -1 ? -1 : Math.max(0, conversationsLimit - (conversationsCount || 0))
      },
      tier: {
        name: tier?.name || 'Free',
        slug: tier?.slug || 'free',
        limits: limits
      }
    });

  } catch (error) {
    console.error('Error fetching usage:', error);
    return NextResponse.json(
      { error: 'Failed to fetch usage data' },
      { status: 500 }
    );
  }
}
