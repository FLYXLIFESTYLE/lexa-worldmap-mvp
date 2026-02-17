/**
 * LEXA Script Engine - Access Control
 *
 * Manages what content users can see based on their access level.
 * Levels: BROWSE → INTERESTED → SAVED → PREMIUM → BOOKED → POST_CRUISE
 */

import type { AccessLevel } from "./types";

/**
 * Access level hierarchy (higher number = more access).
 */
const ACCESS_HIERARCHY: Record<AccessLevel, number> = {
  BROWSE: 0,
  INTERESTED: 1,
  SAVED: 2,
  PREMIUM: 3,
  BOOKED: 4,
  POST_CRUISE: 5,
};

/**
 * What each stage requires to be accessed.
 */
const STAGE_ACCESS_REQUIREMENTS: Record<number, AccessLevel> = {
  5: "BROWSE",       // Broker Teaser — always public
  1: "INTERESTED",   // Chat Output — after sign up
  2: "PREMIUM",      // Full Script — premium or booked
  3: "BOOKED",       // Booking Assets — booked only
  4: "BOOKED",       // Concierge Playbook — booked only
};

/**
 * Check if a user has sufficient access for a stage.
 */
export function canAccessStage(
  userLevel: AccessLevel,
  stage: number
): boolean {
  const required = STAGE_ACCESS_REQUIREMENTS[stage];
  if (!required) return false;

  return ACCESS_HIERARCHY[userLevel] >= ACCESS_HIERARCHY[required];
}

/**
 * Get the access level label for display.
 */
export function getAccessLevelLabel(level: AccessLevel): string {
  const labels: Record<AccessLevel, string> = {
    BROWSE: "Browse",
    INTERESTED: "Interested",
    SAVED: "Saved",
    PREMIUM: "Premium",
    BOOKED: "Booked",
    POST_CRUISE: "Post-Cruise",
  };
  return labels[level] || level;
}

/**
 * Get the badge color for an access level.
 */
export function getAccessLevelColor(level: AccessLevel): string {
  const colors: Record<AccessLevel, string> = {
    BROWSE: "bg-zinc-100 text-zinc-600",
    INTERESTED: "bg-blue-100 text-blue-700",
    SAVED: "bg-amber-100 text-amber-700",
    PREMIUM: "bg-purple-100 text-purple-700",
    BOOKED: "bg-green-100 text-green-700",
    POST_CRUISE: "bg-lexa-gold/20 text-lexa-navy",
  };
  return colors[level] || "bg-zinc-100 text-zinc-600";
}

/**
 * Determine what content to show for Stage 2 based on access level.
 *
 * - SAVED: Day titles only, narratives blurred/hidden
 * - PREMIUM: Full narratives visible
 * - BOOKED: Full narratives + experiences + POI details
 */
export function getStage2Visibility(userLevel: AccessLevel): {
  showDayTitles: boolean;
  showNarratives: boolean;
  showExperiences: boolean;
  showPOIDetails: boolean;
  showKit: boolean;
} {
  const level = ACCESS_HIERARCHY[userLevel];

  return {
    showDayTitles: level >= ACCESS_HIERARCHY.SAVED,
    showNarratives: level >= ACCESS_HIERARCHY.PREMIUM,
    showExperiences: level >= ACCESS_HIERARCHY.PREMIUM,
    showPOIDetails: level >= ACCESS_HIERARCHY.BOOKED,
    showKit: level >= ACCESS_HIERARCHY.PREMIUM,
  };
}

/**
 * Determine what stages are available for a given access level.
 */
export function getAvailableStages(userLevel: AccessLevel): number[] {
  const stages: number[] = [];
  for (const [stage, required] of Object.entries(STAGE_ACCESS_REQUIREMENTS)) {
    if (ACCESS_HIERARCHY[userLevel] >= ACCESS_HIERARCHY[required]) {
      stages.push(Number(stage));
    }
  }
  return stages.sort();
}
