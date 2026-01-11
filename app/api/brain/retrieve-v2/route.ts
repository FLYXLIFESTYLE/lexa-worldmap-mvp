import { NextResponse } from 'next/server';
import { z } from 'zod';
import { retrieveBrainCandidatesV2 } from '@/lib/brain/retrieve-v2';

export const runtime = 'nodejs';

const BodySchema = z.object({
  destination: z.string().min(1),
  theme: z.string().min(1).optional(),
  themes: z.array(z.string().min(1)).optional(),
  limit: z.number().int().min(1).max(50).default(20),
  includeDrafts: z.boolean().default(true),
});

const QuerySchema = z.object({
  destination: z.string().min(1),
  theme: z.string().min(1).optional(),
  themes: z
    .array(z.string().min(1))
    .optional()
    .transform((v) => (v && v.length ? v : undefined)),
  limit: z.coerce.number().int().min(1).max(50).optional().default(20),
  includeDrafts: z.coerce.boolean().optional().default(true),
});

function parseThemesFromQuery(url: URL): string[] | undefined {
  const repeated = url.searchParams.getAll('themes').map((s) => s.trim()).filter(Boolean);
  if (repeated.length) return repeated;
  const csv = (url.searchParams.get('themes') ?? '').trim();
  if (!csv) return undefined;
  const parsed = csv
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return parsed.length ? parsed : undefined;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const parsed = QuerySchema.safeParse({
    destination: url.searchParams.get('destination') ?? '',
    theme: url.searchParams.get('theme') ?? undefined,
    themes: parseThemesFromQuery(url),
    limit: url.searchParams.get('limit') ?? undefined,
    includeDrafts: url.searchParams.get('includeDrafts') ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: 'Invalid query', details: parsed.error.flatten() }, { status: 400 });
  }

  // Reuse the POST implementation by calling it with a JSON body.
  return POST(
    new Request(req.url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(parsed.data),
    })
  );
}

export async function POST(req: Request) {
  try {
    const json = await req.json().catch(() => null);
    const parsed = BodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: 'Invalid payload', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { destination, theme, themes, limit, includeDrafts } = parsed.data;
    const result = await retrieveBrainCandidatesV2({
      destination,
      theme: theme ?? null,
      themes: themes ?? null,
      limit,
      includeDrafts,
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error('brain/retrieve-v2 error', err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

