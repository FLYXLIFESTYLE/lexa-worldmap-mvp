/**
 * POST /api/scripts/generate/stage1
 *
 * Generate Stage 1 (Discovery Output) only.
 * Used for quick chat responses.
 */

import { NextRequest, NextResponse } from "next/server";
import { generateStage1 } from "@/lib/script-engine";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { arc_code, journey_type, region, duration } = body;
    if (!arc_code || !journey_type || !region || !duration) {
      return NextResponse.json(
        {
          error: "Missing required fields: arc_code, journey_type, region, duration",
        },
        { status: 400 }
      );
    }

    const stage1 = await generateStage1({
      arc_code,
      journey_type,
      region,
      duration: Number(duration),
      guest_keywords: body.guest_keywords,
      custom_name: body.custom_name,
      season: body.season,
    });

    return NextResponse.json({
      success: true,
      stage1,
    });
  } catch (error) {
    console.error("[Stage 1 Generate] Error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Generation failed",
      },
      { status: 500 }
    );
  }
}
