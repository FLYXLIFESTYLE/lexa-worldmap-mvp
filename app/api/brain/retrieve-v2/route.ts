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

