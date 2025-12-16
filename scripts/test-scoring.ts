/**
 * Simple script to run scoring validation tests
 * 
 * Usage: npx ts-node scripts/test-scoring.ts
 */

import runAllScoringTests from '../tests/scoring-validation.test';

console.log('Starting scoring validation tests...\n');

runAllScoringTests()
  .then(results => {
    if (results.success) {
      console.log('🎉 All tests passed!');
      process.exit(0);
    } else {
      console.log('⚠️  Some tests failed. Please review the results above.');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('❌ Test suite encountered an error:', error);
    process.exit(1);
  });

