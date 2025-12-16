/**
 * Scoring System Validation Tests
 * 
 * Tests luxury scoring and confidence scoring with sample POIs
 */

import { 
  calculateLuxuryScore, 
  calculateRelationshipConfidence 
} from '@/lib/neo4j/scoring-engine';

// ============================================================================
// Test Data
// ============================================================================

const testPOIs = [
  {
    name: 'Test: Ultra-Luxury Michelin 3-Star',
    data: {
      name: 'Le Louis XV - Alain Ducasse',
      type: 'michelin_restaurant',
      michelin_stars: 3,
      price_level: 5,
      rating: 4.9,
      review_count: 2847,
      description: 'Legendary three Michelin-starred restaurant in Monte Carlo with exclusive fine dining experience',
      amenities: ['private dining', 'wine cellar', 'sommelier'],
      destination_luxury_score: 95
    },
    expectedRange: [95, 100]
  },
  {
    name: 'Test: High Luxury Resort',
    data: {
      name: 'Hotel du Cap-Eden-Roc',
      type: 'luxury_resort',
      price_level: 5,
      rating: 4.8,
      review_count: 1523,
      description: 'Iconic luxury resort on the French Riviera with private beach, infinity pool, and Michelin-starred restaurant',
      amenities: ['spa', 'private beach', 'michelin restaurant', 'infinity pool', 'concierge'],
      forbes_stars: 5,
      destination_luxury_score: 92
    },
    expectedRange: [90, 100]
  },
  {
    name: 'Test: Upscale Boutique Hotel',
    data: {
      name: 'Villa Dubrovnik',
      type: 'boutique_hotel',
      price_level: 4,
      rating: 4.7,
      review_count: 892,
      description: 'Exclusive boutique hotel with stunning Adriatic views and premium amenities',
      amenities: ['spa', 'pool', 'fine dining', 'rooftop'],
      destination_luxury_score: 78
    },
    expectedRange: [75, 85]
  },
  {
    name: 'Test: Mid-Range Restaurant',
    data: {
      name: 'Konoba Dalmatino',
      type: 'restaurant',
      price_level: 2,
      rating: 4.5,
      review_count: 456,
      description: 'Traditional Croatian restaurant with fresh seafood and local wines',
      amenities: ['outdoor seating', 'wine list']
    },
    expectedRange: [45, 60]
  },
  {
    name: 'Test: Budget Beach',
    data: {
      name: 'Public Beach',
      type: 'beach',
      rating: 4.2,
      review_count: 234,
      description: 'Popular public beach with crystal clear water'
    },
    expectedRange: [20, 40]
  },
  {
    name: 'Test: No Data POI',
    data: {
      name: 'Unknown Attraction',
      type: 'attraction'
    },
    expectedRange: [5, 20]
  }
];

const testRelationships = [
  {
    name: 'Import Source (Human Curated)',
    params: {
      source: 'import' as const,
      evidence: 'manually curated data from trusted source',
      agreementCount: 1
    },
    expectedRange: [0.85, 0.95]
  },
  {
    name: 'API Enrichment',
    params: {
      source: 'enrichment' as const,
      evidence: 'google_places_api_category',
      agreementCount: 1
    },
    expectedRange: [0.75, 0.85]
  },
  {
    name: 'AI Explicit (User Stated)',
    params: {
      source: 'ai_explicit' as const,
      evidence: 'user explicitly stated feeling peaceful',
      agreementCount: 1
    },
    expectedRange: [0.85, 0.95]
  },
  {
    name: 'AI Implicit (Inferred)',
    params: {
      source: 'ai_implicit' as const,
      evidence: 'inferred from secluded beach context',
      agreementCount: 1
    },
    expectedRange: [0.60, 0.75]
  },
  {
    name: 'Multiple Sources Agreement (3 sources)',
    params: {
      source: 'enrichment' as const,
      evidence: 'confirmed by google, wikipedia, and user',
      agreementCount: 3
    },
    expectedRange: [0.90, 1.0]
  },
  {
    name: 'Old Data Penalty',
    params: {
      source: 'enrichment' as const,
      evidence: 'data from 2 years ago',
      agreementCount: 1,
      dataAge: 730 // 2 years
    },
    expectedRange: [0.70, 0.80]
  }
];

// ============================================================================
// Test Runner
// ============================================================================

async function runLuxuryScoreTests() {
  console.log('\n========================================');
  console.log('LUXURY SCORE VALIDATION TESTS');
  console.log('========================================\n');

  let passed = 0;
  let failed = 0;

  for (const test of testPOIs) {
    try {
      const result = await calculateLuxuryScore(test.data);
      const inRange = 
        result.luxury_score >= test.expectedRange[0] && 
        result.luxury_score <= test.expectedRange[1];

      if (inRange) {
        console.log(`✅ PASS: ${test.name}`);
        console.log(`   Score: ${result.luxury_score} (expected: ${test.expectedRange[0]}-${test.expectedRange[1]})`);
        console.log(`   Confidence: ${result.confidence}`);
        console.log(`   Evidence: ${result.evidence.slice(0, 2).join(', ')}...`);
        passed++;
      } else {
        console.log(`❌ FAIL: ${test.name}`);
        console.log(`   Score: ${result.luxury_score} (expected: ${test.expectedRange[0]}-${test.expectedRange[1]})`);
        console.log(`   Evidence: ${result.evidence.join(', ')}`);
        failed++;
      }
      console.log('');
    } catch (error) {
      console.log(`❌ ERROR: ${test.name}`);
      console.log(`   ${error}`);
      failed++;
      console.log('');
    }
  }

  console.log(`\nResults: ${passed} passed, ${failed} failed\n`);
  return { passed, failed };
}

function runConfidenceScoreTests() {
  console.log('\n========================================');
  console.log('CONFIDENCE SCORE VALIDATION TESTS');
  console.log('========================================\n');

  let passed = 0;
  let failed = 0;

  for (const test of testRelationships) {
    try {
      const confidence = calculateRelationshipConfidence(test.params);
      const inRange = 
        confidence >= test.expectedRange[0] && 
        confidence <= test.expectedRange[1];

      if (inRange) {
        console.log(`✅ PASS: ${test.name}`);
        console.log(`   Confidence: ${confidence.toFixed(2)} (expected: ${test.expectedRange[0]}-${test.expectedRange[1]})`);
        console.log(`   Source: ${test.params.source}`);
        passed++;
      } else {
        console.log(`❌ FAIL: ${test.name}`);
        console.log(`   Confidence: ${confidence.toFixed(2)} (expected: ${test.expectedRange[0]}-${test.expectedRange[1]})`);
        console.log(`   Source: ${test.params.source}`);
        failed++;
      }
      console.log('');
    } catch (error) {
      console.log(`❌ ERROR: ${test.name}`);
      console.log(`   ${error}`);
      failed++;
      console.log('');
    }
  }

  console.log(`\nResults: ${passed} passed, ${failed} failed\n`);
  return { passed, failed };
}

// ============================================================================
// Main Test Suite
// ============================================================================

export async function runAllScoringTests() {
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║   LEXA SCORING VALIDATION TEST SUITE  ║');
  console.log('╚════════════════════════════════════════╝\n');

  const luxuryResults = await runLuxuryScoreTests();
  const confidenceResults = runConfidenceScoreTests();

  const totalPassed = luxuryResults.passed + confidenceResults.passed;
  const totalFailed = luxuryResults.failed + confidenceResults.failed;
  const totalTests = totalPassed + totalFailed;

  console.log('\n========================================');
  console.log('FINAL RESULTS');
  console.log('========================================');
  console.log(`Total Tests: ${totalTests}`);
  console.log(`Passed: ${totalPassed} (${Math.round(totalPassed/totalTests*100)}%)`);
  console.log(`Failed: ${totalFailed} (${Math.round(totalFailed/totalTests*100)}%)`);
  console.log('========================================\n');

  return {
    totalTests,
    passed: totalPassed,
    failed: totalFailed,
    success: totalFailed === 0
  };
}

// Run tests if executed directly
if (require.main === module) {
  runAllScoringTests()
    .then(results => {
      process.exit(results.success ? 0 : 1);
    })
    .catch(error => {
      console.error('Test suite failed:', error);
      process.exit(1);
    });
}

export default runAllScoringTests;

