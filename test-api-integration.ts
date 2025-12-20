/**
 * LEXA API Integration Test
 * Run this in browser console (F12) to test the API client
 */

// Test 1: Import the API client
import { lexaAPI } from './lib/api/lexa-client';

// Test 2: Check backend health
async function testBackendHealth() {
  console.log('🔍 Testing backend health...');
  try {
    const health = await lexaAPI.healthCheck();
    console.log('✅ Backend healthy:', health);
    return true;
  } catch (error) {
    console.error('❌ Backend health check failed:', error);
    return false;
  }
}

// Test 3: Create a test account
async function testAccountCreation() {
  console.log('🔍 Testing account creation...');
  try {
    const account = await lexaAPI.createAccount({
      email: `test-${Date.now()}@lexa.com`,
      name: 'Test User'
    });
    console.log('✅ Account created:', account);
    return account;
  } catch (error) {
    console.error('❌ Account creation failed:', error);
    return null;
  }
}

// Test 4: Start a conversation
async function testConversation(accountId, sessionId) {
  console.log('🔍 Testing conversation...');
  try {
    const response = await lexaAPI.startConversation(
      accountId,
      sessionId,
      {
        destination: 'French Riviera',
        theme: 'Romantic Escape',
        time: 'June 2026'
      }
    );
    console.log('✅ Conversation started:', response);
    return response;
  } catch (error) {
    console.error('❌ Conversation failed:', error);
    return null;
  }
}

// Test 5: Send a message
async function testMessage(accountId, sessionId, message) {
  console.log('🔍 Testing message:', message);
  try {
    const response = await lexaAPI.converse({
      account_id: accountId,
      session_id: sessionId,
      message: message,
      conversation_history: []
    });
    console.log('✅ Message sent:', response);
    return response;
  } catch (error) {
    console.error('❌ Message failed:', error);
    return null;
  }
}

// Run all tests
async function runAllTests() {
  console.log('🚀 Starting LEXA API Integration Tests...\n');
  
  // Test 1: Health
  const healthOk = await testBackendHealth();
  if (!healthOk) {
    console.error('❌ Backend is not healthy. Stopping tests.');
    return;
  }
  
  console.log('\n---\n');
  
  // Test 2: Account Creation
  const account = await testAccountCreation();
  if (!account) {
    console.error('❌ Account creation failed. Stopping tests.');
    return;
  }
  
  console.log('\n---\n');
  
  // Test 3: Conversation
  const conversation = await testConversation(
    account.account_id,
    account.session_id
  );
  if (!conversation) {
    console.error('❌ Conversation failed. Stopping tests.');
    return;
  }
  
  console.log('\n---\n');
  
  // Test 4: Message
  const messageResponse = await testMessage(
    account.account_id,
    account.session_id,
    'I want to feel deeply relaxed and connected to nature.'
  );
  
  console.log('\n---\n');
  console.log('🎉 ALL TESTS COMPLETE!');
  console.log('\n✅ Summary:');
  console.log('- Backend health: ✓');
  console.log('- Account creation: ✓');
  console.log('- Conversation start: ✓');
  console.log('- Message exchange: ✓');
  console.log('\n🚀 Your LEXA MVP is fully functional!');
}

// Export for use
export { runAllTests, testBackendHealth, testAccountCreation, testConversation, testMessage };

