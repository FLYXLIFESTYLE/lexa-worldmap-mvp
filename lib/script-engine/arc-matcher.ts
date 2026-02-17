/**
 * LEXA Script Engine - Arc Matcher
 *
 * Extracts keywords from user input, detects journey type,
 * and scores experience arcs by relevance.
 */

import { matchArcForInput } from "./queries";
import type { ArcMatch, MatchInput } from "./types";

// ============================================================================
// JOURNEY TYPE DETECTION
// ============================================================================

/** Keywords that signal a specific journey type */
const JOURNEY_TYPE_SIGNALS: Record<string, string[]> = {
  COUPLES: [
    "wife", "husband", "partner", "couple", "together", "we",
    "our", "us", "anniversary", "romance", "romantic",
    "reconnect", "relationship", "love", "lover", "lovers",
    "honeymoon", "married", "marriage", "she", "he",
  ],
  FAMILY: [
    "family", "kids", "children", "daughter", "son", "grandchildren",
    "grandparents", "parents", "generations", "siblings",
    "niece", "nephew", "cousins", "all of us", "everyone",
  ],
  GROUP: [
    "friends", "group", "team", "colleagues", "crew",
    "guys", "girls", "bunch", "mates", "gang",
    "bachelor", "bachelorette", "stag", "hen",
  ],
  // INDIVIDUAL is the default — no specific signals needed
};

/**
 * Detect journey type from user text.
 * Returns the best match, or "INDIVIDUAL" as fallback.
 */
export function detectJourneyType(text: string): string {
  const lower = text.toLowerCase();
  const scores: Record<string, number> = {
    COUPLES: 0,
    FAMILY: 0,
    GROUP: 0,
    INDIVIDUAL: 0,
  };

  for (const [journeyType, signals] of Object.entries(JOURNEY_TYPE_SIGNALS)) {
    for (const signal of signals) {
      // Word-boundary matching to avoid false positives
      const regex = new RegExp(`\\b${signal}\\b`, "i");
      if (regex.test(lower)) {
        scores[journeyType]++;
      }
    }
  }

  // Find the type with highest score
  const best = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];

  // Only return detected type if it has at least 1 signal match
  // Otherwise default to INDIVIDUAL
  return best[1] > 0 ? best[0] : "INDIVIDUAL";
}

// ============================================================================
// KEYWORD EXTRACTION
// ============================================================================

/**
 * Extract meaningful keywords from user text for arc matching.
 * Removes common filler words, keeps emotionally relevant words.
 */
export function extractKeywords(text: string): string[] {
  const stopWords = new Set([
    "i", "me", "my", "we", "our", "us", "you", "your", "the", "a", "an",
    "is", "are", "was", "were", "be", "been", "being", "have", "has", "had",
    "do", "does", "did", "will", "would", "could", "should", "shall", "may",
    "might", "can", "to", "of", "in", "for", "on", "with", "at", "by",
    "from", "up", "about", "into", "through", "during", "before", "after",
    "above", "below", "between", "out", "off", "over", "under", "again",
    "further", "then", "once", "here", "there", "when", "where", "why",
    "how", "all", "each", "every", "both", "few", "more", "most", "other",
    "some", "such", "no", "nor", "not", "only", "own", "same", "so",
    "than", "too", "very", "just", "but", "and", "or", "if", "that",
    "this", "these", "those", "it", "its", "what", "which", "who", "whom",
    "am", "been", "get", "got", "also", "really", "think", "want",
    "need", "like", "know", "going", "something", "maybe", "actually",
    "looking", "thing", "things", "kind", "lot", "much", "many",
  ]);

  const words = text
    .toLowerCase()
    .replace(/[^\w\s'-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !stopWords.has(w));

  // Also extract meaningful 2-word phrases
  const phrases = extractPhrases(text);

  return [...new Set([...words, ...phrases])];
}

/**
 * Extract 2-word phrases that are meaningful for matching.
 */
function extractPhrases(text: string): string[] {
  const lower = text.toLowerCase();
  const knownPhrases = [
    "running on empty", "burned out", "need a break", "lost connection",
    "logistics partners", "feel alive", "going through motions",
    "starting over", "new chapter", "life change", "special occasion",
    "family time", "quality time", "off the beaten path",
    "once in a lifetime", "turning 50", "feel numb",
    "stopped being lovers", "co-parents", "business partners",
    "lost myself", "hidden gems", "no time",
  ];

  return knownPhrases.filter((phrase) => lower.includes(phrase));
}

// ============================================================================
// MAIN MATCHING FUNCTION
// ============================================================================

/**
 * Full matching pipeline:
 * 1. Extract keywords from user messages
 * 2. Detect journey type
 * 3. Query Neo4j for arc matches
 * 4. Return ranked results
 */
export async function matchArcsFromText(
  text: string,
  explicitJourneyType?: string
): Promise<{
  journey_type: string;
  keywords: string[];
  matches: ArcMatch[];
}> {
  const keywords = extractKeywords(text);
  const journey_type = explicitJourneyType || detectJourneyType(text);

  // Query Neo4j for matching arcs
  const matches = await matchArcForInput(
    journey_type !== "INDIVIDUAL" ? journey_type : undefined,
    keywords
  );

  return { journey_type, keywords, matches };
}

/**
 * Match arcs from structured input (admin form or pre-processed chat data).
 */
export async function matchArcsFromInput(
  input: MatchInput
): Promise<ArcMatch[]> {
  return matchArcForInput(input.journey_type, input.guest_keywords);
}
