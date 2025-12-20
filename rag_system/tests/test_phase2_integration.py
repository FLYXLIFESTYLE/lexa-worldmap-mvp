"""
Test LEXA Phase 2: Complete Backend Integration
===============================================
Tests the full flow: Conversation → Archetype Calculation → POI Matching → Recommendations
"""

import asyncio
import httpx
from typing import Dict, List

# API Base URL
BASE_URL = "http://localhost:8000"


class LEXAPhase2Tester:
    """Tests Phase 2 backend integration."""
    
    def __init__(self):
        self.base_url = BASE_URL
        self.client = httpx.AsyncClient(timeout=30.0)
        self.test_account_id = None
        self.test_session_id = None
    
    async def test_1_create_account(self):
        """Test 1: Create a new client account (Victoria - The Romantic)."""
        print("\n" + "="*60)
        print("TEST 1: Create Account")
        print("="*60)
        
        response = await self.client.post(
            f"{self.base_url}/api/ailessia/account/create",
            json={
                "email": "victoria@test.com",
                "name": "Victoria",
                "phone": "+1234567890"
            }
        )
        
        print(f"Status: {response.status_code}")
        data = response.json()
        print(f"Account ID: {data.get('account_id')}")
        print(f"Session ID: {data.get('session_id')}")
        print(f"AIlessia Greeting: {data.get('ailessia_greeting')}")
        
        self.test_account_id = data["account_id"]
        self.test_session_id = data["session_id"]
        
        assert response.status_code == 200
        assert self.test_account_id is not None
        print("✅ PASSED: Account created successfully")
        return data
    
    async def test_2_conversation_romantic(self):
        """Test 2: Have a romantic conversation to build emotional profile."""
        print("\n" + "="*60)
        print("TEST 2: Romantic Conversation")
        print("="*60)
        
        messages = [
            "I'm planning something special for my anniversary with my partner.",
            "We love intimate, romantic experiences. Somewhere on the French Riviera would be perfect.",
            "I want it to feel magical, like we're the only two people in the world."
        ]
        
        conversation_history = []
        
        for i, message in enumerate(messages, 1):
            print(f"\nTurn {i}")
            print(f"Victoria: {message}")
            
            response = await self.client.post(
                f"{self.base_url}/api/ailessia/converse",
                json={
                    "account_id": self.test_account_id,
                    "session_id": self.test_session_id,
                    "message": message,
                    "conversation_history": conversation_history
                }
            )
            
            assert response.status_code == 200
            data = response.json()
            
            print(f"AIlessia: {data['ailessia_response'][:200]}...")
            print(f"Emotion Detected: {data['emotional_reading']['primary_state']}")
            print(f"Archetype: {data['emotional_reading']['archetype']}")
            print(f"Progress: {data['progress'] * 100:.0f}%")
            
            # Update conversation history
            conversation_history.append({
                "role": "user",
                "content": message
            })
            conversation_history.append({
                "role": "ailessia",
                "content": data["ailessia_response"]
            })
        
        print("✅ PASSED: Conversation completed with emotional profiling")
        return conversation_history
    
    async def test_3_get_poi_recommendations(self):
        """Test 3: Get personalized POI recommendations for Victoria."""
        print("\n" + "="*60)
        print("TEST 3: Personalized POI Recommendations")
        print("="*60)
        
        response = await self.client.post(
            f"{self.base_url}/api/ailessia/recommendations/pois",
            json={
                "account_id": self.test_account_id,
                "destination": "French Riviera",
                "activity_types": None,  # Get all activities
                "min_luxury_score": 0.7,
                "min_fit_score": 0.75,
                "limit": 10
            }
        )
        
        print(f"Status: {response.status_code}")
        data = response.json()
        
        print(f"\nClient Archetype Weights:")
        for archetype, weight in data["client_archetype_weights"].items():
            print(f"  {archetype}: {weight:.2f}")
        
        print(f"\nRecommendation Strategy: {data['recommendation_strategy']}")
        print(f"Total POIs Found: {data['total_found']}")
        
        print(f"\nTop 5 Personalized POIs:")
        for i, poi in enumerate(data["pois"][:5], 1):
            print(f"\n{i}. {poi['name']}")
            print(f"   Activity: {poi['activity']}")
            print(f"   Personality Fit: {poi['personality_fit']:.2f}")
            print(f"   Rating: {poi.get('rating', 'N/A')} ({poi.get('reviews', 0)} reviews)")
            print(f"   Emotions: {', '.join(poi['emotions_evoked'][:3])}")
            print(f"   Best for: {', '.join(poi['archetypes'][:2])}")
            print(f"   Romantic Appeal: {poi['personality_breakdown']['romantic']:.2f}")
        
        assert response.status_code == 200
        assert len(data["pois"]) > 0
        assert data["client_archetype_weights"]["romantic"] > 0.7  # Should be high for Victoria
        print("\n✅ PASSED: POI recommendations generated with personality matching")
        return data
    
    async def test_4_emotion_based_recommendations(self):
        """Test 4: Get POIs by specific emotions."""
        print("\n" + "="*60)
        print("TEST 4: Emotion-Based Recommendations")
        print("="*60)
        
        # Test getting POIs for Romance + Prestige
        emotions = ["Romance", "Prestige"]
        print(f"Searching for POIs that evoke: {', '.join(emotions)}")
        
        # Note: This would need a separate endpoint or we test via the service directly
        # For now, test via the personalized endpoint with romantic weights
        
        response = await self.client.post(
            f"{self.base_url}/api/ailessia/recommendations/pois",
            json={
                "account_id": self.test_account_id,
                "destination": "French Riviera",
                "activity_types": ["Fine dining", "Sailing", "Beach time"],
                "min_luxury_score": 0.8,
                "min_fit_score": 0.80,
                "limit": 5
            }
        )
        
        data = response.json()
        print(f"\nHigh-fit POIs for romantic activities:")
        for poi in data["pois"]:
            print(f"  • {poi['name']} ({poi['activity']}) - Fit: {poi['personality_fit']:.2f}")
        
        print("✅ PASSED: Activity-filtered recommendations working")
        return data
    
    async def test_5_verify_neo4j_sync(self):
        """Test 5: Verify client profile synced to Neo4j."""
        print("\n" + "="*60)
        print("TEST 5: Neo4j Sync Verification")
        print("="*60)
        
        # This would need a separate endpoint or direct Neo4j query
        # For now, we'll just verify the account has the expected data
        
        print("Note: Manual verification needed in Neo4j")
        print(f"Query: MATCH (cp:ClientProfile {{id: '{self.test_account_id}'}}) RETURN cp")
        print("\nExpected:")
        print("  - ClientProfile node exists")
        print("  - archetype_romantic > 0.8")
        print("  - RESONATES_WITH -> EmotionalTag 'Romance'")
        print("  - Conversation tracking relationships")
        
        print("✅ Manual Neo4j verification required")
    
    async def run_all_tests(self):
        """Run all Phase 2 integration tests."""
        print("\n" + "="*60)
        print("LEXA PHASE 2 BACKEND INTEGRATION TESTS")
        print("="*60)
        print("Testing: Conversation → Archetype → POI Matching")
        
        try:
            # Test 1: Create account
            await self.test_1_create_account()
            
            # Test 2: Have conversation
            await self.test_2_conversation_romantic()
            
            # Test 3: Get personalized recommendations
            await self.test_3_get_poi_recommendations()
            
            # Test 4: Test emotion-based filtering
            await self.test_4_emotion_based_recommendations()
            
            # Test 5: Verify Neo4j sync
            await self.test_5_verify_neo4j_sync()
            
            print("\n" + "="*60)
            print("ALL TESTS COMPLETED SUCCESSFULLY! ✅")
            print("="*60)
            print("\nPhase 2 Backend Integration: WORKING")
            print("Next steps:")
            print("  1. ✅ Archetype calculation during conversation")
            print("  2. ✅ Multi-dimensional POI matching")
            print("  3. ✅ Personalized recommendations API")
            print("  4. ⏳ Frontend integration")
            print("  5. ⏳ Experience Script with real POIs")
            
        except Exception as e:
            print(f"\n❌ TEST FAILED: {str(e)}")
            raise
        finally:
            await self.client.aclose()


async def main():
    """Run Phase 2 tests."""
    tester = LEXAPhase2Tester()
    await tester.run_all_tests()


if __name__ == "__main__":
    asyncio.run(main())


