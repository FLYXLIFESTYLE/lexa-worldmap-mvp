"""
Client Synchronization Service - Bridges Supabase & Neo4j
===========================================================
Syncs client accounts from Supabase to Neo4j for:
- Emotional intelligence tracking
- Behavioral pattern analysis
- Marketing campaign targeting
- Hyper-personalized recommendations
"""

from typing import Dict, List, Optional
from datetime import datetime
import structlog

from database.neo4j_client import neo4j_client
from database.account_manager import account_manager

logger = structlog.get_logger()


class ClientSyncService:
    """
    Synchronizes client data between Supabase and Neo4j.
    
    This enables:
    - Marketing campaign queries
    - Behavioral pattern tracking
    - Emotional resonance analysis
    - Hyper-personalized recommendations
    """
    
    def __init__(self, neo4j_client, account_manager):
        """Initialize with database clients."""
        self.neo4j = neo4j_client
        self.accounts = account_manager
    
    async def sync_client_to_neo4j(
        self,
        account_id: str,
        force_update: bool = False
    ) -> bool:
        """
        Sync a Supabase client account to Neo4j ClientProfile.
        
        Args:
            account_id: Supabase account UUID
            force_update: Update even if already synced
        
        Returns:
            True if synced successfully
        """
        try:
            # Get account from Supabase
            account = await self.accounts.get_account(account_id)
            if not account:
                logger.error("Account not found", account_id=account_id)
                return False
            
            # Check if already exists in Neo4j
            exists_query = """
            MATCH (cp:ClientProfile {id: $account_id})
            RETURN cp.id AS id, cp.last_sync AS last_sync
            """
            
            result = await self.neo4j.execute_query(
                exists_query,
                {"account_id": account_id}
            )
            
            if result and len(result) > 0 and not force_update:
                logger.info("Client already synced", account_id=account_id)
                return True
            
            # Create or update ClientProfile in Neo4j
            sync_query = """
            MERGE (cp:ClientProfile {id: $account_id})
            SET cp.email = $email,
                cp.name = $name,
                cp.primary_archetype = $archetype,
                cp.estimated_wealth_tier = $wealth_tier,
                cp.vip_status = $vip_status,
                cp.lifetime_value_eur = $lifetime_value,
                cp.total_conversations = $total_conversations,
                cp.total_scripts_created = $total_scripts,
                cp.total_bookings = $total_bookings,
                cp.engagement_score = $engagement_score,
                cp.last_interaction = datetime($last_interaction),
                cp.supabase_synced = true,
                cp.last_sync = datetime(),
                cp.updated_at = datetime()
            
            // Set created_at only if this is a new node
            ON CREATE SET cp.created_at = datetime(),
                          cp.first_interaction = datetime($last_interaction)
            
            RETURN cp.id AS id
            """
            
            params = {
                "account_id": account["id"],
                "email": account.get("email"),
                "name": account.get("name"),
                "archetype": account.get("personality_archetype"),
                "wealth_tier": account.get("estimated_wealth_tier"),
                "vip_status": account.get("vip_status", "General"),
                "lifetime_value": float(account.get("lifetime_value", 0)),
                "total_conversations": account.get("total_scripts_created", 0),
                "total_scripts": account.get("total_scripts_created", 0),
                "total_bookings": account.get("total_experiences_booked", 0),
                "engagement_score": self._calculate_engagement_score(account),
                "last_interaction": account.get("last_interaction", datetime.now().isoformat())
            }
            
            result = await self.neo4j.execute_query(sync_query, params)
            
            # Sync archetype relationship if detected
            if account.get("personality_archetype"):
                await self._sync_archetype_relationship(
                    account_id,
                    account.get("personality_archetype")
                )
            
            logger.info("Client synced to Neo4j",
                       account_id=account_id,
                       email=account.get("email"))
            
            return True
            
        except Exception as e:
            logger.error("Failed to sync client", error=str(e), account_id=account_id)
            return False
    
    async def track_experience_view(
        self,
        account_id: str,
        experience_id: str,
        context: str,
        emotional_state: Optional[str] = None,
        conversation_id: Optional[str] = None
    ) -> bool:
        """
        Track when a client views an experience.
        
        Args:
            account_id: Client account ID
            experience_id: Experience ID
            context: How they saw it (recommendation, search, etc.)
            emotional_state: Their emotional state at viewing
            conversation_id: Associated conversation session
        
        Returns:
            True if tracked successfully
        """
        try:
            # Ensure client is synced first
            await self.sync_client_to_neo4j(account_id)
            
            query = """
            MATCH (cp:ClientProfile {id: $account_id})
            MATCH (e:Experience {id: $experience_id})
            
            MERGE (cp)-[v:VIEWED {timestamp: datetime()}]->(e)
            SET v.context = $context,
                v.emotional_state = $emotional_state,
                v.conversation_id = $conversation_id
            
            RETURN cp.id AS client_id, e.id AS experience_id
            """
            
            params = {
                "account_id": account_id,
                "experience_id": experience_id,
                "context": context,
                "emotional_state": emotional_state,
                "conversation_id": conversation_id
            }
            
            await self.neo4j.execute_query(query, params)
            
            logger.info("Experience view tracked",
                       account_id=account_id,
                       experience_id=experience_id)
            
            return True
            
        except Exception as e:
            logger.error("Failed to track view", error=str(e))
            return False
    
    async def track_experience_interest(
        self,
        account_id: str,
        experience_id: str,
        confidence: float,
        trigger_words: List[str],
        emotional_resonance: float,
        conversation_id: Optional[str] = None
    ) -> bool:
        """
        Track when a client shows interest in an experience.
        
        Args:
            account_id: Client account ID
            experience_id: Experience ID
            confidence: Interest confidence score (0-1)
            trigger_words: Words that triggered interest
            emotional_resonance: Emotional resonance score (0-1)
            conversation_id: Associated conversation
        
        Returns:
            True if tracked successfully
        """
        try:
            await self.sync_client_to_neo4j(account_id)
            
            query = """
            MATCH (cp:ClientProfile {id: $account_id})
            MATCH (e:Experience {id: $experience_id})
            
            MERGE (cp)-[i:INTERESTED_IN]->(e)
            SET i.timestamp = datetime(),
                i.confidence = $confidence,
                i.trigger_words = $trigger_words,
                i.emotional_resonance = $emotional_resonance,
                i.conversation_id = $conversation_id,
                i.source = 'AIlessia conversation analysis'
            
            RETURN cp.id AS client_id
            """
            
            params = {
                "account_id": account_id,
                "experience_id": experience_id,
                "confidence": confidence,
                "trigger_words": trigger_words,
                "emotional_resonance": emotional_resonance,
                "conversation_id": conversation_id
            }
            
            await self.neo4j.execute_query(query, params)
            
            logger.info("Experience interest tracked",
                       account_id=account_id,
                       experience_id=experience_id,
                       confidence=confidence)
            
            return True
            
        except Exception as e:
            logger.error("Failed to track interest", error=str(e))
            return False
    
    async def track_emotional_resonance(
        self,
        account_id: str,
        emotion_name: str,
        strength: float,
        discovered_through: str,
        manifestations: List[str]
    ) -> bool:
        """
        Track emotional resonance for marketing segmentation.
        
        Args:
            account_id: Client account ID
            emotion_name: Emotional tag name (Romance, Prestige, etc.)
            strength: Resonance strength (0-1)
            discovered_through: How it was discovered
            manifestations: How it manifests
        
        Returns:
            True if tracked successfully
        """
        try:
            await self.sync_client_to_neo4j(account_id)
            
            query = """
            MATCH (cp:ClientProfile {id: $account_id})
            MERGE (et:EmotionalTag {name: $emotion_name})
            
            MERGE (cp)-[r:RESONATES_WITH]->(et)
            SET r.strength = $strength,
                r.discovered_through = $discovered_through,
                r.manifestations = $manifestations,
                r.confidence = $strength,
                r.first_detected = COALESCE(r.first_detected, datetime()),
                r.last_reinforced = datetime(),
                r.reinforced_count = COALESCE(r.reinforced_count, 0) + 1
            
            RETURN cp.id AS client_id
            """
            
            params = {
                "account_id": account_id,
                "emotion_name": emotion_name,
                "strength": strength,
                "discovered_through": discovered_through,
                "manifestations": manifestations
            }
            
            await self.neo4j.execute_query(query, params)
            
            logger.info("Emotional resonance tracked",
                       account_id=account_id,
                       emotion=emotion_name,
                       strength=strength)
            
            return True
            
        except Exception as e:
            logger.error("Failed to track emotional resonance", error=str(e))
            return False
    
    async def get_marketing_segment(
        self,
        archetype: Optional[str] = None,
        emotions: Optional[List[str]] = None,
        wealth_tier: Optional[str] = None,
        min_engagement: float = 0.7,
        limit: int = 100
    ) -> List[Dict]:
        """
        Get clients matching marketing criteria.
        
        Args:
            archetype: Personality archetype filter
            emotions: Emotional resonance filters
            wealth_tier: Wealth tier filter (HNW, UHNW, etc.)
            min_engagement: Minimum engagement score
            limit: Max number of clients
        
        Returns:
            List of client profiles matching criteria
        """
        try:
            where_clauses = ["cp.engagement_score >= $min_engagement"]
            
            if archetype:
                where_clauses.append("cp.primary_archetype = $archetype")
            
            if wealth_tier:
                where_clauses.append("cp.estimated_wealth_tier = $wealth_tier")
            
            emotion_match = ""
            if emotions:
                emotion_match = """
                MATCH (cp)-[r:RESONATES_WITH]->(et:EmotionalTag)
                WHERE et.name IN $emotions AND r.strength > 0.75
                WITH cp, count(et) AS emotion_matches
                WHERE emotion_matches >= $emotion_count
                """
            
            query = f"""
            MATCH (cp:ClientProfile)
            {emotion_match}
            WHERE {' AND '.join(where_clauses)}
            RETURN cp.id AS id,
                   cp.email AS email,
                   cp.name AS name,
                   cp.primary_archetype AS archetype,
                   cp.estimated_wealth_tier AS wealth_tier,
                   cp.vip_status AS vip_status,
                   cp.engagement_score AS engagement_score,
                   cp.lifetime_value_eur AS lifetime_value
            ORDER BY cp.lifetime_value_eur DESC, cp.engagement_score DESC
            LIMIT $limit
            """
            
            params = {
                "archetype": archetype,
                "emotions": emotions or [],
                "emotion_count": len(emotions) if emotions else 0,
                "wealth_tier": wealth_tier,
                "min_engagement": min_engagement,
                "limit": limit
            }
            
            results = await self.neo4j.execute_query(query, params)
            
            logger.info("Marketing segment retrieved",
                       archetype=archetype,
                       emotions=emotions,
                       count=len(results) if results else 0)
            
            return results or []
            
        except Exception as e:
            logger.error("Failed to get marketing segment", error=str(e))
            return []
    
    async def get_interested_clients_for_experience(
        self,
        experience_id: str,
        min_confidence: float = 0.7
    ) -> List[Dict]:
        """
        Get all clients who showed interest in a specific experience.
        Perfect for targeted campaigns!
        
        Args:
            experience_id: Experience ID
            min_confidence: Minimum interest confidence
        
        Returns:
            List of interested clients
        """
        try:
            query = """
            MATCH (cp:ClientProfile)-[i:INTERESTED_IN]->(e:Experience {id: $experience_id})
            WHERE i.confidence >= $min_confidence
            RETURN cp.id AS id,
                   cp.email AS email,
                   cp.name AS name,
                   cp.primary_archetype AS archetype,
                   cp.vip_status AS vip_status,
                   i.confidence AS interest_confidence,
                   i.emotional_resonance AS emotional_resonance,
                   i.timestamp AS interested_at
            ORDER BY i.confidence DESC, cp.lifetime_value_eur DESC
            """
            
            params = {
                "experience_id": experience_id,
                "min_confidence": min_confidence
            }
            
            results = await self.neo4j.execute_query(query, params)
            
            logger.info("Interested clients retrieved",
                       experience_id=experience_id,
                       count=len(results) if results else 0)
            
            return results or []
            
        except Exception as e:
            logger.error("Failed to get interested clients", error=str(e))
            return []
    
    def _calculate_engagement_score(self, account: Dict) -> float:
        """Calculate engagement score from account data."""
        score = 0.0
        
        # Conversation activity
        if account.get("total_scripts_created", 0) > 0:
            score += 0.3
        
        # Booking activity
        if account.get("total_experiences_booked", 0) > 0:
            score += 0.4
        
        # Recent activity
        last_interaction = account.get("last_interaction")
        if last_interaction:
            # Simple recency boost
            score += 0.3
        
        return min(1.0, score)
    
    async def _sync_archetype_relationship(
        self,
        account_id: str,
        archetype_name: str
    ) -> bool:
        """Sync archetype relationship."""
        try:
            query = """
            MATCH (cp:ClientProfile {id: $account_id})
            MERGE (arch:ClientArchetype {name: $archetype_name})
            MERGE (cp)-[r:IDENTIFIES_AS]->(arch)
            SET r.detected_by = 'AIlessia_emotion_analysis',
                r.first_detected = COALESCE(r.first_detected, datetime()),
                r.last_confirmed = datetime()
            RETURN cp.id AS id
            """
            
            params = {
                "account_id": account_id,
                "archetype_name": archetype_name
            }
            
            await self.neo4j.execute_query(query, params)
            return True
            
        except Exception as e:
            logger.error("Failed to sync archetype", error=str(e))
            return False


# Global client sync service (initialized on startup)
client_sync_service = None


def initialize_client_sync_service(neo4j_client, account_manager):
    """Initialize the global client sync service."""
    global client_sync_service
    client_sync_service = ClientSyncService(neo4j_client, account_manager)
    return client_sync_service


