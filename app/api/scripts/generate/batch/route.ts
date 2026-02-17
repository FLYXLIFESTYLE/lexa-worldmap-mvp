/**
 * POST /api/scripts/generate/batch
 *
 * Batch generate experiences from a matrix of combinations.
 * Used for rapidly populating the marketplace.
 */

import { NextRequest, NextResponse } from "next/server";
import { batchGenerate } from "@/lib/script-engine";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { regions, journey_types, arc_codes, durations } = body;
    if (!regions?.length || !journey_types?.length || !arc_codes?.length || !durations?.length) {
      return NextResponse.json(
        {
          error:
            "Missing required fields: regions[], journey_types[], arc_codes[], durations[]",
        },
        { status: 400 }
      );
    }

    const result = await batchGenerate({
      regions,
      journey_types,
      arc_codes,
      durations: durations.map(Number),
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("[Batch Generate] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Batch generation failed" },
      { status: 500 }
    );
  }
}
