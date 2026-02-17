/**
 * GET /api/scripts/:id/documents/:stage
 *
 * Generate and download a document for a specific stage.
 * Supports JSON (default) and DOCX format.
 *
 * Query params:
 * - format: "json" | "docx" (default: "json")
 * - arc_code: Required - the arc code
 * - region: Required - the region
 * - duration: Required - duration in days
 * - journey_type: Required - journey type code
 */

import { NextRequest, NextResponse } from "next/server";
import { generateStage } from "@/lib/script-engine";
import type { Stage2Output, Stage5Output } from "@/lib/script-engine/types";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; stage: string }> }
) {
  try {
    const { id: scriptId, stage: stageStr } = await params;
    const stageNum = parseInt(stageStr, 10);

    if (isNaN(stageNum) || stageNum < 1 || stageNum > 5) {
      return NextResponse.json(
        { error: "Stage must be between 1 and 5" },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(request.url);
    const format = searchParams.get("format") || "json";
    const arcCode = searchParams.get("arc_code");
    const region = searchParams.get("region");
    const duration = searchParams.get("duration");
    const journeyType = searchParams.get("journey_type");

    if (!arcCode || !region || !duration || !journeyType) {
      return NextResponse.json(
        {
          error: "Missing required query params: arc_code, region, duration, journey_type",
        },
        { status: 400 }
      );
    }

    // Generate the stage
    const result = await generateStage(
      scriptId,
      stageNum,
      arcCode,
      region,
      parseInt(duration, 10),
      journeyType,
      {
        guest_names: searchParams.get("guest_names")?.split(","),
        start_date: searchParams.get("start_date") || undefined,
      }
    );

    // Return JSON by default
    if (format === "json") {
      return NextResponse.json({
        success: true,
        stage: stageNum,
        data: result,
      });
    }

    // DOCX format
    if (format === "docx") {
      try {
        const { generateStage2Docx, generateStage5Docx } = await import(
          "@/lib/script-engine/formats/docx"
        );

        let buffer: Buffer;
        let filename: string;

        if (stageNum === 2) {
          buffer = await generateStage2Docx(result as Stage2Output);
          filename = `LEXA-Experience-Script-${scriptId.slice(0, 8)}.docx`;
        } else if (stageNum === 5) {
          buffer = await generateStage5Docx(result as Stage5Output);
          filename = `LEXA-Broker-Teaser-${scriptId.slice(0, 8)}.docx`;
        } else {
          return NextResponse.json(
            { error: `DOCX generation not supported for Stage ${stageNum}. Use JSON format.` },
            { status: 400 }
          );
        }

        return new NextResponse(buffer, {
          headers: {
            "Content-Type":
              "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "Content-Disposition": `attachment; filename="${filename}"`,
          },
        });
      } catch (docxError) {
        console.error("[DOCX] Error:", docxError);
        return NextResponse.json(
          {
            error:
              "DOCX generation failed. Make sure the 'docx' package is installed: npm install docx",
          },
          { status: 500 }
        );
      }
    }

    return NextResponse.json(
      { error: `Unsupported format: ${format}. Use "json" or "docx".` },
      { status: 400 }
    );
  } catch (error) {
    console.error("[Document] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Document generation failed" },
      { status: 500 }
    );
  }
}
