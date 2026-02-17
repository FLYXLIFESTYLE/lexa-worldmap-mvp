/**
 * GET /api/scripts/journey-types
 *
 * List all journey types (Individual, Couples, Family, Group).
 */

import { NextResponse } from "next/server";
import { fetchAllJourneyTypes } from "@/lib/script-engine";

export async function GET() {
  try {
    const journeyTypes = await fetchAllJourneyTypes();

    return NextResponse.json({
      success: true,
      journey_types: journeyTypes,
    });
  } catch (error) {
    console.error("[Journey Types] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch journey types" },
      { status: 500 }
    );
  }
}
