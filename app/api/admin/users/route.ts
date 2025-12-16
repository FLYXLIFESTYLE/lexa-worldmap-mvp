/**
 * Admin User Management API
 * Create and manage captain users
 */

import { NextResponse } from 'next/server';
import { createCaptainUser, listCaptainUsers, deactivateCaptainUser } from '@/lib/auth/create-captain-user';

/**
 * GET /api/admin/users
 * List all captain users
 */
export async function GET() {
  try {
    // TODO: Add admin authentication check
    const users = await listCaptainUsers();
    return NextResponse.json({ users });
  } catch (error) {
    console.error('Error listing users:', error);
    return NextResponse.json(
      { error: 'Failed to list users' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/users
 * Create a new captain user
 */
export async function POST(req: Request) {
  try {
    // TODO: Add admin authentication check
    const body = await req.json();
    const { email, displayName, role, commissionRate } = body;

    if (!email || !displayName || !role) {
      return NextResponse.json(
        { error: 'Email, display name, and role are required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Validate role
    const validRoles = ['internal', 'external_captain', 'yacht_crew', 'expert'];
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role' },
        { status: 400 }
      );
    }

    const result = await createCaptainUser({
      email,
      displayName,
      role,
      commissionRate: parseFloat(commissionRate) || 0.00,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to create user' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      userId: result.userId,
      message: 'User created successfully. Password setup email sent.',
    });
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json(
      { error: 'Failed to create user' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/users/:id
 * Deactivate a captain user
 */
export async function DELETE(req: Request) {
  try {
    // TODO: Add admin authentication check
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    const success = await deactivateCaptainUser(userId);

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to deactivate user' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'User deactivated successfully',
    });
  } catch (error) {
    console.error('Error deactivating user:', error);
    return NextResponse.json(
      { error: 'Failed to deactivate user' },
      { status: 500 }
    );
  }
}

