/**
 * Stages Module - Barrel Export
 */

export { getWelcomeSystemPrompt } from './welcome';
export { getInitialQuestionsSystemPrompt, processInitialQuestionsStage } from './initial-questions';
export { getDisarmSystemPrompt } from './disarm';
export { getMirrorSystemPrompt } from './mirror';
export { getMicroWowSystemPrompt } from './micro-wow';
export { getCommitSystemPrompt } from './commit';
export { getBriefingCollectSystemPrompt } from './briefing-collect';
export { getScriptDraftSystemPrompt } from './script-draft';
export { getRefineSystemPrompt } from './refine';
export { getHandoffSystemPrompt, createExperienceBriefFromState } from './handoff';
export { getFollowupSystemPrompt } from './followup';

