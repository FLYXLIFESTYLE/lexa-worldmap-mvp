/**
 * GET /api/scripts/arcs/:code
 *
 * Get full details for a specific experience arc,
 * including phases, archetypes, rituals, and journey types.
 */

import { NextRequest, NextResponse } from "next/server";
import { fetchArcData } from "@/lib/script-engine";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;

    if (!code) {
      return NextResponse.json(
        { error: "Arc code is required" },
        { status: 400 }
      );
    }

    const data = await fetchArcData(code.toUpperCase());

    if (!data) {
      return NextResponse.json(
        { error: `Arc not found: ${code}` },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      ...data,
    });
  } catch (error) {
    console.error("[Arc Detail] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch arc details" },
      { status: 500 }
    );
  }
}
