/**
 * GET /api/scripts/arcs
 *
 * List all available experience arcs.
 * Used for admin dropdowns and arc selection.
 */

import { NextResponse } from "next/server";
import { fetchAllArcs } from "@/lib/script-engine";

export async function GET() {
  try {
    const arcs = await fetchAllArcs();

    return NextResponse.json({
      success: true,
      arcs: arcs.map((arc) => ({
        code: arc.code,
        name: arc.name,
        tagline: arc.tagline,
        description: arc.description,
        core_transformation: arc.core_transformation,
        min_days: arc.min_days,
        max_days: arc.max_days,
        journey_types: arc.journey_types,
        color_primary: arc.color_primary,
        color_accent: arc.color_accent,
        color_bg: arc.color_bg,
      })),
    });
  } catch (error) {
    console.error("[Arcs List] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch arcs" },
      { status: 500 }
    );
  }
}
