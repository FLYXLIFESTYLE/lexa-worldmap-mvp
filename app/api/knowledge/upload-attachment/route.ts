/**
 * Attachment Upload API
 * Upload photos/docs to Supabase Storage for POI enrichment.
 *
 * - Auth required
 * - Captains/Admins only
 * - Stores files in the `public` bucket under `knowledge-files/`
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

const MAX_FILE_BYTES = 25 * 1024 * 1024; // 25MB
const ALLOWED_MIME_PREFIXES = ['image/'];
const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'text/plain',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
]);

function isAllowed(file: File): boolean {
  if (!file?.type) return true; // some browsers omit; allow best-effort
  if (ALLOWED_MIME_PREFIXES.some((p) => file.type.startsWith(p))) return true;
  return ALLOWED_MIME_TYPES.has(file.type);
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('captain_profiles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (!profile || !['admin', 'captain'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden - Captains only' }, { status: 403 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!isAllowed(file)) {
      return NextResponse.json(
        { error: 'Unsupported file type', details: 'Allowed: images, pdf, doc, docx, txt' },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_BYTES) {
      return NextResponse.json({ error: 'File too large', details: 'Max 25MB' }, { status: 400 });
    }

    const fileExt = file.name.split('.').pop() || 'bin';
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80);
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safeName}.${fileExt}`;
    const filePath = `knowledge-files/${user.id}/${fileName}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);

    const { error } = await supabase.storage
      .from('public')
      .upload(filePath, buffer, {
        contentType: file.type || 'application/octet-stream',
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      console.error('Attachment upload failed:', error);
      return NextResponse.json({ error: 'Failed to upload attachment', details: error.message }, { status: 500 });
    }

    const { data: publicData } = supabase.storage.from('public').getPublicUrl(filePath);

    return NextResponse.json({
      success: true,
      url: publicData.publicUrl,
      path: filePath,
      filename: file.name,
      contentType: file.type || null,
      size: file.size,
    });
  } catch (error) {
    console.error('Attachment upload error:', error);
    return NextResponse.json(
      { error: 'Failed to upload attachment', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

