/**
 * LEXA Script Engine - Main Engine
 *
 * Orchestrates arc matching and document generation.
 * Provides methods for chat, admin, and batch generation.
 */

import { v4 as uuid } from "uuid";
import { matchArcsFromText } from "./arc-matcher";
import { fetchArcData } from "./queries";
import { generateStage1 } from "./stages/stage1";
import { generateStage2 } from "./stages/stage2";
import { generateStage3 } from "./stages/stage3";
import { generateStage4 } from "./stages/stage4";
import { generateStage5 } from "./stages/stage5";
import type {
  Stage1Output,
  Stage2Output,
  Stage3Output,
  Stage4Output,
  Stage5Output,
  ChatGenerationInput,
  AdminGenerationInput,
  BatchGenerationInput,
  GenerationJob,
  ScriptStatus,
} from "./types";

// ============================================================================
// SCRIPT ENGINE
// ============================================================================

/**
 * Generate Stage 1 + Stage 5 from a B2C chat conversation.
 *
 * Flow:
 * 1. Extract keywords from conversation messages
 * 2. Detect journey type
 * 3. Match best arc
 * 4. Generate Stage 1 (immediate chat response)
 * 5. Generate Stage 5 (broker teaser, stored for marketplace)
 */
export async function generateForChat(
  input: ChatGenerationInput
): Promise<{
  script_id: string;
  stage1: Stage1Output;
  stage5: Stage5Output;
  matched_arc: string;
  journey_type: string;
}> {
  // Combine all user messages into one text for analysis
  const userText = input.messages
    .filter((m) => m.role === "user")
    .map((m) => m.content)
    .join(" ");

  // Match arcs from conversation text
  const { journey_type, matches } = await matchArcsFromText(
    userText,
    input.journey_type
  );

  if (matches.length === 0) {
    throw new Error(
      "No matching arc found. Please provide more details about what you are looking for."
    );
  }

  const bestMatch = matches[0];
  const script_id = uuid();
  const region = input.region || "French Riviera";
  const duration = input.duration || 8;

  // Generate Stage 1
  const stage1 = await generateStage1({
    arc_code: bestMatch.arc_code,
    journey_type,
    region,
    duration,
    guest_keywords: input.guest_keywords,
  });

  // Generate Stage 5
  const stage5 = await generateStage5({
    stage1,
    arc_code: bestMatch.arc_code,
    region,
    duration,
    script_id,
  });

  return {
    script_id,
    stage1,
    stage5,
    matched_arc: bestMatch.arc_code,
    journey_type,
  };
}

/**
 * Generate from the B2B admin form.
 * Admin selects the arc directly — no matching needed.
 *
 * Returns Stage 1 + Stage 5 always.
 * If generate_full is true, Stage 2 would also be generated (Phase 4).
 */
export async function generateForAdmin(
  input: AdminGenerationInput
): Promise<{
  script_id: string;
  stage1: Stage1Output;
  stage5: Stage5Output;
  status: ScriptStatus;
}> {
  // Verify the arc exists
  const arcData = await fetchArcData(input.arc_code);
  if (!arcData) {
    throw new Error(`Arc not found: ${input.arc_code}`);
  }

  const script_id = uuid();

  // Generate Stage 1
  const stage1 = await generateStage1({
    arc_code: input.arc_code,
    journey_type: input.journey_type,
    region: input.region,
    duration: input.duration,
    custom_name: input.name,
    guest_keywords: input.experience_idea
      ? input.experience_idea.split(/\s+/)
      : undefined,
  });

  // Generate Stage 5
  const stage5 = await generateStage5({
    stage1,
    arc_code: input.arc_code,
    region: input.region,
    duration: input.duration,
    script_id,
  });

  const status: ScriptStatus = input.generate_full
    ? "FULL_READY"
    : "MARKETPLACE_READY";

  return { script_id, stage1, stage5, status };
}

/**
 * Generate a specific stage for an existing script.
 * Used for on-demand generation (e.g., Stage 2 when user saves to account).
 *
 * Stages 2, 3, 4 will be implemented in Phase 4.
 */
export async function generateStage(
  scriptId: string,
  stage: number,
  arcCode: string,
  region: string,
  duration: number,
  journeyType: string,
  options?: {
    guest_names?: string[];
    start_date?: string;
    end_date?: string;
    booking_reference?: string;
    vessel?: string;
  }
): Promise<Stage1Output | Stage2Output | Stage3Output | Stage4Output | Stage5Output> {
  switch (stage) {
    case 1:
      return generateStage1({
        arc_code: arcCode,
        journey_type: journeyType,
        region,
        duration,
      });

    case 2: {
      const s1ForS2 = await generateStage1({
        arc_code: arcCode,
        journey_type: journeyType,
        region,
        duration,
      });
      return generateStage2({
        script_id: scriptId,
        stage1: s1ForS2,
        arc_code: arcCode,
        region,
        duration,
        journey_type: journeyType,
      });
    }

    case 3: {
      const s1ForS3 = await generateStage1({
        arc_code: arcCode,
        journey_type: journeyType,
        region,
        duration,
      });
      const s2ForS3 = await generateStage2({
        script_id: scriptId,
        stage1: s1ForS3,
        arc_code: arcCode,
        region,
        duration,
        journey_type: journeyType,
      });
      return generateStage3({
        script_id: scriptId,
        stage2: s2ForS3,
        arc_code: arcCode,
        region,
        duration,
        booking_reference: options?.booking_reference,
        guest_names: options?.guest_names,
        start_date: options?.start_date,
        vessel: options?.vessel,
      });
    }

    case 4: {
      const s1ForS4 = await generateStage1({
        arc_code: arcCode,
        journey_type: journeyType,
        region,
        duration,
      });
      const s2ForS4 = await generateStage2({
        script_id: scriptId,
        stage1: s1ForS4,
        arc_code: arcCode,
        region,
        duration,
        journey_type: journeyType,
      });
      return generateStage4({
        script_id: scriptId,
        stage2: s2ForS4,
        arc_code: arcCode,
        guest_names: options?.guest_names || ["Guest"],
        start_date: options?.start_date || new Date().toISOString().split("T")[0],
        end_date: options?.end_date || new Date().toISOString().split("T")[0],
      });
    }

    case 5: {
      const stage1 = await generateStage1({
        arc_code: arcCode,
        journey_type: journeyType,
        region,
        duration,
      });
      return generateStage5({
        stage1,
        arc_code: arcCode,
        region,
        duration,
        script_id: scriptId,
      });
    }

    default:
      throw new Error(`Invalid stage: ${stage}. Must be 1-5.`);
  }
}

/**
 * Batch generate experiences from a matrix of combinations.
 * Used for rapidly populating the marketplace.
 *
 * Returns a job with results tracked per combination.
 */
export async function batchGenerate(
  input: BatchGenerationInput
): Promise<GenerationJob> {
  const job: GenerationJob = {
    job_id: uuid(),
    combinations_count: 0,
    completed_count: 0,
    failed_count: 0,
    status: "PROCESSING",
    created_at: new Date().toISOString(),
    results: [],
  };

  // Build valid combinations
  const combinations: {
    region: string;
    journey_type: string;
    arc_code: string;
    duration: number;
  }[] = [];

  for (const region of input.regions) {
    for (const journey_type of input.journey_types) {
      for (const arc_code of input.arc_codes) {
        for (const duration of input.durations) {
          combinations.push({ region, journey_type, arc_code, duration });
        }
      }
    }
  }

  job.combinations_count = combinations.length;

  // Process each combination
  for (const combo of combinations) {
    try {
      // Verify arc supports this journey type
      const arcData = await fetchArcData(combo.arc_code);
      if (!arcData) {
        job.results.push({
          combination: combo,
          status: "failed",
          error: `Arc not found: ${combo.arc_code}`,
        });
        job.failed_count++;
        continue;
      }

      const arcJourneyTypes = arcData.journey_types.map((jt) => jt.code);
      if (!arcJourneyTypes.includes(combo.journey_type)) {
        job.results.push({
          combination: combo,
          status: "failed",
          error: `Arc ${combo.arc_code} does not support journey type ${combo.journey_type}`,
        });
        job.failed_count++;
        continue;
      }

      // Check duration is within arc's range
      if (
        combo.duration < arcData.arc.min_days ||
        combo.duration > arcData.arc.max_days
      ) {
        job.results.push({
          combination: combo,
          status: "failed",
          error: `Duration ${combo.duration} outside arc range ${arcData.arc.min_days}-${arcData.arc.max_days}`,
        });
        job.failed_count++;
        continue;
      }

      // Generate
      const result = await generateForAdmin({
        source: "admin",
        region: combo.region,
        duration: combo.duration,
        journey_type: combo.journey_type,
        arc_code: combo.arc_code,
      });

      job.results.push({
        combination: combo,
        status: "completed",
        script_id: result.script_id,
      });
      job.completed_count++;
    } catch (error) {
      job.results.push({
        combination: combo,
        status: "failed",
        error: error instanceof Error ? error.message : "Unknown error",
      });
      job.failed_count++;
    }
  }

  job.status = job.failed_count === job.combinations_count ? "FAILED" : "COMPLETED";
  return job;
}
