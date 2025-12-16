// Neo4j Integration Exports
export { getNeo4jDriver, closeNeo4jDriver } from './client';
export * from './queries';
export {
  runFullCheck,
  findAndMergeDuplicates,
  removeUnnamedPOIs,
  ensureRelations,
  verifyScoring,
  enrichPOIData,
  getLastRunResults,
  isAgentRunning,
} from './data-quality-agent';
export {
  inferRelationshipsFromText,
  createInferredRelationships,
  inferAndCreateRelationships,
  addSeasonalAvailability,
} from './relationship-inference';
export {
  calculateLuxuryScore,
  aiLuxuryScoring,
  calculateRelationshipConfidence,
  scoreAllUnscored,
  recalculateRelationshipConfidence,
} from './scoring-engine';

export type {
  DuplicateStats,
  UnnamedPOIStats,
  RelationStats,
  ScoringStats,
  EnrichmentStats,
  QualityCheckResults,
} from './data-quality-agent';
