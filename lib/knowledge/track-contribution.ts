/**
 * Track Contribution
 * Functions to tag knowledge contributions with user attribution for commission tracking
 */

import { getCaptainProfile } from '@/lib/auth/get-captain-profile';

export interface ContributionAttribution {
  contributedBy: string;
  contributorName: string;
  contributionType: 'upload' | 'manual' | 'scraped';
  sourceTitle?: string;
  sourceType?: string;
}

/**
 * Get current user's contribution attribution
 */
export async function getCurrentUserAttribution(
  contributionType: 'upload' | 'manual' | 'scraped',
  sourceTitle?: string,
  sourceType?: string
): Promise<ContributionAttribution | null> {
  const profile = await getCaptainProfile();
  
  if (!profile) {
    console.error('No captain profile found for current user');
    return null;
  }
  
  return {
    contributedBy: profile.user_id,
    contributorName: profile.display_name,
    contributionType,
    sourceTitle,
    sourceType,
  };
}

/**
 * Add attribution to Neo4j node properties
 * This function returns the properties to be added to any Neo4j node
 */
export function buildAttributionProperties(attribution: ContributionAttribution) {
  return {
    contributed_by: attribution.contributedBy,
    contributor_name: attribution.contributorName,
    contribution_type: attribution.contributionType,
    source_title: attribution.sourceTitle || null,
    source_type: attribution.sourceType || null,
    contributed_at: new Date().toISOString(),
  };
}

/**
 * Track a POI contribution in Neo4j
 */
export async function trackPOIContribution(
  poiId: string,
  attribution: ContributionAttribution
): Promise<void> {
  // This will be implemented when we integrate with Neo4j
  // For now, we just log it
  console.log(`POI ${poiId} contributed by ${attribution.contributorName}`);
}

/**
 * Track a Knowledge node contribution in Neo4j
 */
export async function trackKnowledgeContribution(
  knowledgeId: string,
  attribution: ContributionAttribution
): Promise<void> {
  // This will be implemented when we integrate with Neo4j
  // For now, we just log it
  console.log(`Knowledge ${knowledgeId} contributed by ${attribution.contributorName}`);
}

