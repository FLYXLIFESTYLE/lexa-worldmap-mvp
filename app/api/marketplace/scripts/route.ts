/**
 * GET /api/marketplace/scripts
 *
 * Public marketplace listing endpoint.
 * Returns Stage 5 (Broker Teaser) data for all marketplace-ready scripts.
 * No authentication required — this is the public-facing API.
 *
 * Query params:
 * - region: Filter by region
 * - journey_type: Filter by journey type (INDIVIDUAL, COUPLES, FAMILY, GROUP)
 * - arc: Filter by arc code
 * - theme: Filter by theme
 * - duration: Filter by duration (days)
 */

import { NextRequest, NextResponse } from "next/server";
import { fetchAllArcs } from "@/lib/script-engine";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const regionFilter = searchParams.get("region");
    const journeyTypeFilter = searchParams.get("journey_type");
    const arcFilter = searchParams.get("arc");

    // For now, return available arcs as marketplace listings.
    // In a full implementation, this would query stored generated scripts
    // from a database (Supabase or Neo4j) with status = MARKETPLACE_READY.
    const arcs = await fetchAllArcs();

    let listings = arcs.map((arc) => ({
      arc_code: arc.code,
      experience_name: arc.name,
      tagline: arc.tagline,
      hook_short: arc.hook.split(". ").slice(0, 2).join(". ") + ".",
      description_preview: arc.description.slice(0, 200) + "...",
      core_transformation: arc.core_transformation,
      journey_types: arc.journey_types,
      min_days: arc.min_days,
      max_days: arc.max_days,
      color_primary: arc.color_primary,
      color_accent: arc.color_accent,
      color_bg: arc.color_bg,
    }));

    // Apply filters
    if (regionFilter) {
      // Region filtering would require stored scripts with region data.
      // For now, all arcs are available in all regions.
    }

    if (journeyTypeFilter) {
      listings = listings.filter((l) =>
        l.journey_types.includes(journeyTypeFilter.toUpperCase())
      );
    }

    if (arcFilter) {
      listings = listings.filter(
        (l) => l.arc_code === arcFilter.toUpperCase()
      );
    }

    return NextResponse.json({
      success: true,
      count: listings.length,
      listings,
    });
  } catch (error) {
    console.error("[Marketplace] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch marketplace listings" },
      { status: 500 }
    );
  }
}
