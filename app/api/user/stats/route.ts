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

    // Get current month stats
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    // Count scripts created this month
    const { count: scriptsThisMonth } = await supabase
      .from('experience_briefs')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('created_at', monthStart.toISOString())
      .lte('created_at', monthEnd.toISOString());

    // Count total scripts
    const { count: totalScripts } = await supabase
      .from('experience_briefs')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    // Count conversations
    const { count: totalConversations } = await supabase
      .from('lexa_sessions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    // Count favorite scripts
    const { count: favoriteScripts } = await supabase
      .from('user_script_library')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_favorite', true);

    // Count shared scripts
    const { count: sharedScripts } = await supabase
      .from('community_scripts')
      .select('*', { count: 'exact', head: true })
      .eq('creator_id', user.id);

    // Get most used themes
    const { data: scripts } = await supabase
      .from('experience_briefs')
      .select('theme')
      .eq('user_id', user.id);

    const themeCounts = (scripts || []).reduce((acc: any, script) => {
      if (script.theme) {
        acc[script.theme] = (acc[script.theme] || 0) + 1;
      }
      return acc;
    }, {});

    const topThemes = Object.entries(themeCounts)
      .sort((a: any, b: any) => b[1] - a[1])
      .slice(0, 5)
      .map(([theme, count]) => ({ theme, count }));

    return NextResponse.json({
      stats: {
        scripts_this_month: scriptsThisMonth || 0,
        total_scripts: totalScripts || 0,
        total_conversations: totalConversations || 0,
        favorite_scripts: favoriteScripts || 0,
        shared_scripts: sharedScripts || 0
      },
      insights: {
        top_themes: topThemes,
        average_scripts_per_month: totalScripts ? Math.round((totalScripts / 12) * 10) / 10 : 0
      }
    });

  } catch (error) {
    console.error('Error fetching stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stats' },
      { status: 500 }
    );
  }
}
