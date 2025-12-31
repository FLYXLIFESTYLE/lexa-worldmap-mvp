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

    // Get user's membership
    const { data: membership, error: membershipError } = await supabase
      .from('user_memberships')
      .select(`
        *,
        tier:membership_tiers(*)
      `)
      .eq('user_id', user.id)
      .single();

    if (membershipError) {
      // If no membership exists, create free tier membership
      if (membershipError.code === 'PGRST116') {
        // Get free tier
        const { data: freeTier } = await supabase
          .from('membership_tiers')
          .select('*')
          .eq('slug', 'free')
          .single();

        if (freeTier) {
          // Create membership
          const { data: newMembership, error: createError } = await supabase
            .from('user_memberships')
            .insert({
              user_id: user.id,
              tier_id: freeTier.id,
              status: 'active'
            })
            .select(`
              *,
              tier:membership_tiers(*)
            `)
            .single();

          if (createError) {
            throw createError;
          }

          return NextResponse.json({
            membership: newMembership,
            tier: freeTier
          });
        }
      }
      throw membershipError;
    }

    return NextResponse.json({
      membership,
      tier: membership.tier
    });

  } catch (error) {
    console.error('Error fetching membership:', error);
    return NextResponse.json(
      { error: 'Failed to fetch membership' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();
    const { tier_slug } = body;

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get target tier
    const { data: targetTier, error: tierError } = await supabase
      .from('membership_tiers')
      .select('*')
      .eq('slug', tier_slug)
      .eq('is_active', true)
      .single();

    if (tierError || !targetTier) {
      return NextResponse.json(
        { error: 'Invalid tier' },
        { status: 400 }
      );
    }

    // Update or create membership
    const { data: membership, error: updateError } = await supabase
      .from('user_memberships')
      .upsert({
        user_id: user.id,
        tier_id: targetTier.id,
        status: 'active',
        started_at: new Date().toISOString()
      })
      .select(`
        *,
        tier:membership_tiers(*)
      `)
      .single();

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({
      membership,
      tier: targetTier
    });

  } catch (error) {
    console.error('Error updating membership:', error);
    return NextResponse.json(
      { error: 'Failed to update membership' },
      { status: 500 }
    );
  }
}
