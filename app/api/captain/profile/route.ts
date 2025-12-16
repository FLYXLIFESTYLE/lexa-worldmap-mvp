/**
 * Captain Profile API
 * Endpoints for managing captain profiles
 */

import { NextResponse } from 'next/server';
import { getCaptainProfile, updateCaptainProfile } from '@/lib/auth/get-captain-profile';

/**
 * GET /api/captain/profile
 * Get current user's captain profile
 */
export async function GET() {
  try {
    const profile = await getCaptainProfile();
    
    if (!profile) {
      return NextResponse.json(
        { error: 'Captain profile not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ profile });
  } catch (error) {
    console.error('Error getting captain profile:', error);
    return NextResponse.json(
      { error: 'Failed to get captain profile' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/captain/profile
 * Update current user's captain profile
 */
export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    
    // Only allow updating certain fields
    const allowedUpdates = {
      display_name: body.display_name,
      bank_info: body.bank_info,
    };
    
    // Remove undefined fields
    Object.keys(allowedUpdates).forEach(key => {
      if (allowedUpdates[key as keyof typeof allowedUpdates] === undefined) {
        delete allowedUpdates[key as keyof typeof allowedUpdates];
      }
    });
    
    const profile = await updateCaptainProfile(allowedUpdates);
    
    if (!profile) {
      return NextResponse.json(
        { error: 'Failed to update captain profile' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ profile });
  } catch (error) {
    console.error('Error updating captain profile:', error);
    return NextResponse.json(
      { error: 'Failed to update captain profile' },
      { status: 500 }
    );
  }
}

