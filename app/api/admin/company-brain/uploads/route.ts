import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/server-auth';
import { supabaseAdmin } from '@/lib/supabase/client';

export const runtime = 'nodejs';

function buildPublicUrl(bucket: string, path: string): string | null {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
  if (!base) return null;
  return `${base.replace(/\/$/, '')}/storage/v1/object/public/${bucket}/${encodeURI(path).replace(/%2F/g, '/')}`;
}

export async function GET() {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) return NextResponse.json({ error: 'Unauthorized' }, { status: auth.status });

    const { data: uploads, error } = await supabaseAdmin
      .from('company_brain_uploads')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch uploads', details: error.message }, { status: 500 });
    }

    const normalized = (uploads || []).map((u: any) => {
      const meta = u.metadata || {};
      const storage = meta.file_storage || {};
      const bucket = storage.bucket || 'public';
      const path = storage.path || null;
      const fileUrl = storage.url || (bucket && path ? buildPublicUrl(bucket, path) : null);
      return {
        ...u,
        file_url: fileUrl,
      };
    });

    return NextResponse.json({ success: true, uploads: normalized });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch uploads', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
