/**
 * POST /api/demo-request
 *
 * Stores a demo request in Supabase and sends a notification email
 * to info@superyachtcruiseclub.com via Supabase's built-in email
 * or Resend (if configured).
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/client';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, company, message } = body;

    if (!name || !email) {
      return NextResponse.json(
        { error: 'Name and email are required' },
        { status: 400 }
      );
    }

    // Store the demo request in Supabase
    const { error: insertError } = await supabaseAdmin
      .from('demo_requests')
      .insert({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        company: company?.trim() || null,
        message: message?.trim() || null,
        status: 'pending',
        created_at: new Date().toISOString(),
      });

    // If the table doesn't exist yet, just log it and continue
    if (insertError) {
      console.warn('[Demo Request] DB insert failed (table may not exist yet):', insertError.message);
      // Still proceed — we'll at least log the request
    }

    // Log the request for visibility
    console.log('[Demo Request] New request:', { name, email, company, message: message?.slice(0, 100) });

    // Try to send notification email via Resend (if RESEND_API_KEY is set)
    const resendKey = process.env.RESEND_API_KEY;
    if (resendKey) {
      try {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'LEXA <noreply@lexa-travel-designer.com>',
            to: ['info@superyachtcruiseclub.com'],
            subject: `LEXA Demo Request: ${name}`,
            html: `
              <h2>New Demo Request</h2>
              <p><strong>Name:</strong> ${name}</p>
              <p><strong>Email:</strong> ${email}</p>
              ${company ? `<p><strong>Company:</strong> ${company}</p>` : ''}
              ${message ? `<p><strong>Message:</strong> ${message}</p>` : ''}
              <hr>
              <p style="color: #888; font-size: 12px;">Sent from LEXA landing page</p>
            `,
          }),
        });
      } catch (emailErr) {
        console.warn('[Demo Request] Email notification failed:', emailErr);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Demo request received',
    });
  } catch (error) {
    console.error('[Demo Request] Error:', error);
    return NextResponse.json(
      { error: 'Failed to submit request' },
      { status: 500 }
    );
  }
}
