/**
 * LEXA Script Engine - Public API
 *
 * Usage:
 *   import { generateForChat, generateForAdmin, batchGenerate } from "@/lib/script-engine";
 *   import { matchArcsFromText } from "@/lib/script-engine";
 *   import type { Stage1Output, Stage5Output } from "@/lib/script-engine";
 */

// Engine functions
export {
  generateForChat,
  generateForAdmin,
  generateStage,
  batchGenerate,
} from "./engine";

// Arc matching
export {
  matchArcsFromText,
  matchArcsFromInput,
  detectJourneyType,
  extractKeywords,
} from "./arc-matcher";

// Stage generators
export { generateStage1 } from "./stages/stage1";
export { generateStage2 } from "./stages/stage2";
export { generateStage3 } from "./stages/stage3";
export { generateStage4 } from "./stages/stage4";
export { generateStage5 } from "./stages/stage5";

// Access control
export {
  canAccessStage,
  getAccessLevelLabel,
  getAccessLevelColor,
  getStage2Visibility,
  getAvailableStages,
} from "./access-control";

// Neo4j queries
export {
  matchArcForInput,
  fetchArcData,
  fetchArcPhases,
  fetchGuestArchetypes,
  fetchRitualTemplates,
  fetchAllArcs,
  fetchAllJourneyTypes,
  fetchAllArchetypes,
  fetchSignaturePOIs,
} from "./queries";

// Types
export type {
  // Neo4j node types
  ExperienceArc,
  ArcPhase,
  GuestArchetype,
  JourneyType,
  RitualTemplate,
  // Matching
  ArcMatch,
  MatchInput,
  // Generation inputs
  ChatGenerationInput,
  AdminGenerationInput,
  BatchGenerationInput,
  ScriptGenerationInput,
  // Stage outputs
  Stage1Output,
  Stage2Output,
  Stage3Output,
  Stage4Output,
  Stage5Output,
  // Marketplace
  MarketplaceListing,
  // Status
  ScriptStatus,
  AccessLevel,
  GenerationJob,
  GenerationJobStatus,
  GuestProfile,
} from "./types";
