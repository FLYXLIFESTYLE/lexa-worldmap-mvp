/**
 * POST /api/scripts/generate/admin
 *
 * Generate experience script from admin form.
 * Same as main generate but explicitly for admin use.
 */

import { NextRequest, NextResponse } from "next/server";
import { generateForAdmin } from "@/lib/script-engine";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { arc_code, journey_type, region, duration } = body;
    if (!arc_code || !journey_type || !region || !duration) {
      return NextResponse.json(
        { error: "Missing required fields: arc_code, journey_type, region, duration" },
        { status: 400 }
      );
    }

    const result = await generateForAdmin({
      source: "admin",
      name: body.name,
      region,
      duration: Number(duration),
      journey_type,
      arc_code,
      experience_idea: body.experience_idea,
      must_include_pois: body.must_include_pois,
      exclude_pois: body.exclude_pois,
      themes: body.themes,
      generate_full: body.generate_full || false,
    });

    return NextResponse.json({
      success: true,
      script_id: result.script_id,
      stage1: result.stage1,
      stage5: result.stage5,
      status: result.status,
    });
  } catch (error) {
    console.error("[Admin Generate] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Generation failed" },
      { status: 500 }
    );
  }
}
