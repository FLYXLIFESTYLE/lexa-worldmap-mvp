"""
Neo4j database client for graph data retrieval.
This handles all connections and queries to the Neo4j knowledge graph.
"""

from typing import List, Dict, Any, Optional
from neo4j import AsyncGraphDatabase, AsyncDriver
from config.settings import settings
import structlog

logger = structlog.get_logger()


class Neo4jClient:
    """Client for Neo4j graph database operations."""
    
    def __init__(self):
        """Initialize Neo4j client (connection is lazy)."""
        self._driver: Optional[AsyncDriver] = None
    
    async def connect(self):
        """Establish connection to Neo4j database."""
        if self._driver is None:
            self._driver = AsyncGraphDatabase.driver(
                settings.neo4j_uri,
                auth=(settings.neo4j_user, settings.neo4j_password)
            )
            logger.info("Connected to Neo4j", uri=settings.neo4j_uri)
    
    async def close(self):
        """Close Neo4j connection."""
        if self._driver:
            await self._driver.close()
            logger.info("Closed Neo4j connection")
    
    async def verify_connection(self) -> bool:
        """
        Verify that the connection to Neo4j is working.
        
        Returns:
            True if connection is successful, False otherwise
        """
        try:
            await self.connect()
            async with self._driver.session(database=settings.neo4j_database) as session:
                result = await session.run("RETURN 1 as num")
                record = await result.single()
                return record["num"] == 1
        except Exception as e:
            logger.error("Neo4j connection failed", error=str(e))
            return False
    
    async def initialize_schema(self, schema_file: str):
        """
        Initialize the Neo4j schema from a Cypher file.
        
        Args:
            schema_file: Path to the .cypher schema file
        """
        try:
            with open(schema_file, 'r') as f:
                schema_queries = f.read()
            
            # Split by semicolon and filter empty queries
            queries = [q.strip() for q in schema_queries.split(';') if q.strip() and not q.strip().startswith('//')]
            
            await self.connect()
            async with self._driver.session(database=settings.neo4j_database) as session:
                for query in queries:
                    if query:
                        await session.run(query)
                        
            logger.info("Neo4j schema initialized successfully")
        except Exception as e:
            logger.error("Failed to initialize schema", error=str(e))
            raise
    
    async def search_regions(
        self,
        query: str,
        bundesland: Optional[str] = None,
        tags: Optional[List[str]] = None
    ) -> List[Dict[str, Any]]:
        """
        Search for regions based on query parameters.
        
        Args:
            query: Search query (name or description)
            bundesland: Filter by state/bundesland
            tags: Filter by tags
        
        Returns:
            List of matching regions with their properties
        """
        await self.connect()
        
        cypher_query = """
        MATCH (r:Region)
        WHERE toLower(r.name) CONTAINS toLower($query)
           OR toLower(r.description) CONTAINS toLower($query)
        """
        
        params = {"query": query}
        
        if bundesland:
            cypher_query += " AND r.bundesland = $bundesland"
            params["bundesland"] = bundesland
        
        if tags:
            cypher_query += """
            WITH r
            MATCH (r)-[:TAGGED_AS]->(t:Tag)
            WHERE t.name IN $tags
            """
            params["tags"] = tags
        
        cypher_query += """
        RETURN r.id as id, r.name as name, r.bundesland as bundesland,
               r.description as description, r.coords as coords
        LIMIT 10
        """
        
        async with self._driver.session(database=settings.neo4j_database) as session:
            result = await session.run(cypher_query, params)
            records = await result.data()
            
        logger.info("Region search", query=query, results=len(records))
        return records
    
    async def search_activities(
        self,
        region_id: Optional[str] = None,
        category: Optional[str] = None,
        season: Optional[str] = None,
        tags: Optional[List[str]] = None
    ) -> List[Dict[str, Any]]:
        """
        Search for activities with filters.
        
        Args:
            region_id: Filter by specific region
            category: Activity category (Outdoor, Culture, Culinary, etc.)
            season: Season filter (Spring, Summer, Fall, Winter)
            tags: Filter by tags
        
        Returns:
            List of matching activities with details
        """
        await self.connect()
        
        cypher_query = "MATCH (a:Activity)"
        where_clauses = []
        params = {}
        
        if region_id:
            cypher_query = """
            MATCH (r:Region {id: $region_id})-[:HAS_ACTIVITY]->(a:Activity)
            """
            params["region_id"] = region_id
        
        if category:
            where_clauses.append("a.category = $category")
            params["category"] = category
        
        if season:
            where_clauses.append("$season IN a.season")
            params["season"] = season
        
        if tags:
            cypher_query += """
            MATCH (a)-[:TAGGED_AS]->(t:Tag)
            WHERE t.name IN $tags
            """
            params["tags"] = tags
        
        if where_clauses:
            cypher_query += " WHERE " + " AND ".join(where_clauses)
        
        cypher_query += """
        WITH DISTINCT a
        OPTIONAL MATCH (r:Region)-[:HAS_ACTIVITY]->(a)
        RETURN a.id as id, a.name as name, a.category as category,
               a.season as season, a.duration_hours as duration,
               a.difficulty as difficulty, a.popularity as popularity,
               a.description as description,
               collect(DISTINCT r.name) as available_in_regions
        ORDER BY a.popularity DESC
        LIMIT 20
        """
        
        async with self._driver.session(database=settings.neo4j_database) as session:
            result = await session.run(cypher_query, params)
            records = await result.data()
        
        logger.info("Activity search", filters=params, results=len(records))
        return records
    
    async def get_activity_details(self, activity_id: str) -> Optional[Dict[str, Any]]:
        """
        Get detailed information about a specific activity.
        
        Args:
            activity_id: Unique activity identifier
        
        Returns:
            Activity details with relationships or None if not found
        """
        await self.connect()
        
        cypher_query = """
        MATCH (a:Activity {id: $activity_id})
        OPTIONAL MATCH (a)-[:TAGGED_AS]->(t:Tag)
        OPTIONAL MATCH (r:Region)-[:HAS_ACTIVITY]->(a)
        RETURN a.id as id, a.name as name, a.category as category,
               a.season as season, a.duration_hours as duration,
               a.difficulty as difficulty, a.popularity as popularity,
               a.description as description,
               collect(DISTINCT t.name) as tags,
               collect(DISTINCT {id: r.id, name: r.name, bundesland: r.bundesland}) as regions
        """
        
        async with self._driver.session(database=settings.neo4j_database) as session:
            result = await session.run(cypher_query, {"activity_id": activity_id})
            record = await result.single()
        
        if record:
            return dict(record)
        return None
    
    # ========================================================================
    # AILESSIA EMOTIONAL INTELLIGENCE QUERIES
    # ========================================================================
    
    async def find_experiences_for_archetype(
        self,
        archetype: str,
        destination: Optional[str] = None,
        min_fit_score: float = 0.8
    ) -> List[Dict[str, Any]]:
        """
        Find experiences ideal for a personality archetype.
        
        Args:
            archetype: Personality archetype (e.g., "The Romantic")
            destination: Optional destination filter
            min_fit_score: Minimum personality fit score
        
        Returns:
            List of experiences with emotional details
        """
        await self.connect()
        
        cypher_query = """
        MATCH (arch:ClientArchetype {name: $archetype})<-[fit:IDEAL_FOR_ARCHETYPE]-(e:Experience)
        WHERE fit.fit_score >= $min_fit_score
        """
        
        if destination:
            cypher_query += """
            MATCH (e)-[:LOCATED_IN]->(d:Destination {name: $destination})
            """
        
        cypher_query += """
        OPTIONAL MATCH (e)-[evokes:EVOKES_EMOTION]->(et:EmotionalTag)
        RETURN e.id as id, e.name as name,
               e.luxury_tier as luxury_tier,
               e.exclusivity_score as exclusivity_score,
               e.price_point_eur as price_point,
               e.primary_emotions as primary_emotions,
               e.emotional_arc as emotional_arc,
               e.cinematic_hook as cinematic_hook,
               e.signature_moment as signature_moment,
               e.transformational_potential as transformational_potential,
               e.memory_intensity as memory_intensity,
               fit.fit_score as archetype_fit_score,
               fit.why_perfect as why_perfect,
               collect(DISTINCT {name: et.name, strength: evokes.strength}) as emotional_tags
        ORDER BY fit.fit_score DESC, e.exclusivity_score DESC
        LIMIT 10
        """
        
        params = {
            "archetype": archetype,
            "min_fit_score": min_fit_score
        }
        if destination:
            params["destination"] = destination
        
        async with self._driver.session(database=settings.neo4j_database) as session:
            result = await session.run(cypher_query, params)
            records = await result.data()
        
        logger.info("Experience search for archetype", 
                   archetype=archetype,
                   results=len(records))
        return records
    
    async def find_complementary_experiences(
        self,
        experience_id: str,
        max_depth: int = 2
    ) -> List[Dict[str, Any]]:
        """
        Find experiences that complement emotionally.
        
        Args:
            experience_id: Starting experience ID
            max_depth: Maximum relationship depth (1-3)
        
        Returns:
            List of complementary experiences with journey details
        """
        await self.connect()
        
        cypher_query = f"""
        MATCH path = (e1:Experience {{id: $experience_id}})-[:COMPLEMENTS_EMOTIONALLY*1..{max_depth}]->(e2:Experience)
        WITH e2, relationships(path) as rels, length(path) as path_length
        UNWIND rels as rel
        WITH e2, path_length,
             collect({{
                journey_type: rel.journey_type,
                emotional_transition: rel.emotional_transition,
                timing: rel.timing,
                combined_impact: rel.combined_emotional_impact,
                why_powerful: rel.why_powerful,
                sequence_order: rel.sequence_order
             }}) as journey_details
        RETURN e2.id as id, e2.name as name,
               e2.cinematic_hook as cinematic_hook,
               e2.emotional_arc as emotional_arc,
               e2.primary_emotions as primary_emotions,
               e2.duration_hours as duration_hours,
               e2.price_point_eur as price_point,
               path_length,
               journey_details
        ORDER BY path_length ASC, journey_details[0].sequence_order ASC
        """
        
        async with self._driver.session(database=settings.neo4j_database) as session:
            result = await session.run(cypher_query, {"experience_id": experience_id})
            records = await result.data()
        
        logger.info("Complementary experiences found",
                   experience_id=experience_id,
                   results=len(records))
        return records
    
    async def find_experiences_by_emotions(
        self,
        desired_emotions: List[str],
        destination: Optional[str] = None,
        min_exclusivity: float = 0.8
    ) -> List[Dict[str, Any]]:
        """
        Find experiences that evoke specific emotions.
        
        Args:
            desired_emotions: List of desired emotional states
            destination: Optional destination filter
            min_exclusivity: Minimum exclusivity score
        
        Returns:
            List of experiences matching emotional profile
        """
        await self.connect()
        
        cypher_query = """
        MATCH (e:Experience)
        WHERE e.exclusivity_score >= $min_exclusivity
          AND any(emotion IN $desired_emotions WHERE emotion IN e.primary_emotions)
        """
        
        if destination:
            cypher_query += """
            MATCH (e)-[:LOCATED_IN]->(d:Destination {name: $destination})
            """
        
        cypher_query += """
        WITH e, 
             size([emotion IN $desired_emotions WHERE emotion IN e.primary_emotions]) as emotion_match_count,
             e.exclusivity_score as exclusivity_score
        OPTIONAL MATCH (e)-[:EVOKES_EMOTION]->(et:EmotionalTag)
        WHERE et.name IN $desired_emotions
        RETURN e.id as id, e.name as name,
               e.luxury_tier as luxury_tier,
               exclusivity_score,
               e.cinematic_hook as cinematic_hook,
               e.primary_emotions as primary_emotions,
               e.emotional_arc as emotional_arc,
               e.transformational_potential as transformational_potential,
               e.sensory_visual as sensory_visual,
               e.sensory_auditory as sensory_auditory,
               e.sensory_olfactory as sensory_olfactory,
               e.signature_moment as signature_moment,
               e.price_point_eur as price_point,
               emotion_match_count,
               collect(et.name) as matched_emotional_tags
        ORDER BY emotion_match_count DESC, exclusivity_score DESC
        LIMIT 15
        """
        
        params = {
            "desired_emotions": desired_emotions,
            "min_exclusivity": min_exclusivity
        }
        if destination:
            params["destination"] = destination
        
        async with self._driver.session(database=settings.neo4j_database) as session:
            result = await session.run(cypher_query, params)
            records = await result.data()
        
        logger.info("Emotion-based experience search",
                   emotions=desired_emotions,
                   results=len(records))
        return records
    
    async def build_emotional_journey(
        self,
        start_experience_id: str,
        desired_arc: str,
        max_experiences: int = 8
    ) -> List[Dict[str, Any]]:
        """
        Build a sequence of experiences following an emotional arc.
        
        Args:
            start_experience_id: Starting experience
            desired_arc: Emotional arc (e.g., "Release → Connection → Integration")
            max_experiences: Maximum number of experiences in journey
        
        Returns:
            Ordered list of experiences with journey narrative
        """
        await self.connect()
        
        cypher_query = """
        MATCH (start:Experience {id: $start_id})
        OPTIONAL MATCH path = (start)-[:COMPLEMENTS_EMOTIONALLY|PART_OF_TRANSFORMATION*1..4]->(e:Experience)
        WITH start, e, path,
             [rel in relationships(path) | rel.sequence_order] as sequence_orders
        WHERE e IS NOT NULL
        WITH start, e, path, sequence_orders,
             reduce(total = 0, order in sequence_orders | total + coalesce(order, 0)) as total_sequence
        RETURN DISTINCT e.id as id, e.name as name,
               e.cinematic_hook as cinematic_hook,
               e.emotional_arc as emotional_arc,
               e.ideal_story_position as story_position,
               e.duration_hours as duration,
               e.price_point_eur as price_point,
               total_sequence as sequence_score,
               length(path) as journey_position
        ORDER BY total_sequence ASC, journey_position ASC
        LIMIT $max_experiences
        
        UNION
        
        MATCH (start:Experience {id: $start_id})
        RETURN start.id as id, start.name as name,
               start.cinematic_hook as cinematic_hook,
               start.emotional_arc as emotional_arc,
               start.ideal_story_position as story_position,
               start.duration_hours as duration,
               start.price_point_eur as price_point,
               0 as sequence_score,
               0 as journey_position
        ORDER BY sequence_score, journey_position
        """
        
        async with self._driver.session(database=settings.neo4j_database) as session:
            result = await session.run(cypher_query, {
                "start_id": start_experience_id,
                "max_experiences": max_experiences - 1
            })
            records = await result.data()
        
        logger.info("Emotional journey built",
                   start_experience=start_experience_id,
                   arc=desired_arc,
                   experiences=len(records))
        return records
    
    async def get_destination_emotional_profile(
        self,
        destination_name: str
    ) -> Optional[Dict[str, Any]]:
        """
        Get emotional profile of a destination.
        
        Args:
            destination_name: Destination name
        
        Returns:
            Destination emotional characteristics or None
        """
        await self.connect()
        
        cypher_query = """
        MATCH (d:Destination {name: $destination})
        OPTIONAL MATCH (d)<-[:LOCATED_IN]-(e:Experience)
        RETURN d.id as id, d.name as name,
               d.luxury_reputation as luxury_reputation,
               d.emotional_character as emotional_character,
               d.dominant_feelings as dominant_feelings,
               d.atmosphere as atmosphere,
               d.signature_scents as signature_scents,
               d.signature_sounds as signature_sounds,
               d.signature_sights as signature_sights,
               d.attracts_personalities as attracts_personalities,
               d.narrative_themes as narrative_themes,
               d.famous_love_stories as famous_love_stories,
               d.cultural_references as cultural_references,
               count(e) as experience_count,
               avg(e.exclusivity_score) as avg_exclusivity
        """
        
        async with self._driver.session(database=settings.neo4j_database) as session:
            result = await session.run(cypher_query, {"destination": destination_name})
            record = await result.single()
        
        if record:
            return dict(record)
        return None
    
    async def log_interaction(
        self,
        session_id: str,
        user_id: Optional[str],
        question: str,
        answer: str,
        confidence_score: float,
        answer_type: str,
        sources: List[Dict[str, Any]]
    ) -> str:
        """
        Log a chat interaction to Neo4j for learning and analytics.
        
        Args:
            session_id: Chat session identifier
            user_id: User identifier (if authenticated)
            question: User's question
            answer: Bot's answer
            confidence_score: Confidence score of the answer
            answer_type: Type of answer (confident, partial, uncertain, no_info)
            sources: List of sources used
        
        Returns:
            Interaction ID
        """
        await self.connect()
        
        cypher_query = """
        MERGE (c:Chat {session_id: $session_id})
        ON CREATE SET c.id = randomUUID(), c.timestamp = datetime()
        
        CREATE (q:Question {
            id: randomUUID(),
            text: $question,
            timestamp: datetime()
        })
        
        CREATE (a:Answer {
            id: randomUUID(),
            text: $answer,
            confidence_score: $confidence_score,
            answer_type: $answer_type,
            timestamp: datetime()
        })
        
        CREATE (c)-[:CONTAINS]->(q)
        CREATE (q)-[:ANSWERED_BY]->(a)
        
        WITH a
        UNWIND $sources as source
        MATCH (n)
        WHERE n.id = source.id
        CREATE (a)-[:RETRIEVED_FROM {relevance: source.relevance_score}]->(n)
        
        RETURN a.id as interaction_id
        """
        
        params = {
            "session_id": session_id,
            "question": question,
            "answer": answer,
            "confidence_score": confidence_score,
            "answer_type": answer_type,
            "sources": sources
        }
        
        async with self._driver.session(database=settings.neo4j_database) as session:
            result = await session.run(cypher_query, params)
            record = await result.single()
        
        interaction_id = record["interaction_id"] if record else None
        logger.info("Logged interaction", interaction_id=interaction_id)
        return interaction_id
    
    async def log_security_incident(
        self,
        session_id: str,
        user_id: Optional[str],
        violation_type: str,
        user_input: str,
        severity: str,
        action_taken: str
    ):
        """
        Log a security incident for monitoring and analysis.
        
        Args:
            session_id: Chat session identifier
            user_id: User identifier (anonymized)
            violation_type: Type of violation
            user_input: The problematic input (anonymized for harmful content)
            severity: Severity level
            action_taken: Action taken by the system
        """
        await self.connect()
        
        # Anonymize harmful content
        if violation_type == "harmful_content":
            user_input = f"[HARMFUL_CONTENT_REDACTED] Length: {len(user_input)} chars"
        
        cypher_query = """
        CREATE (i:SecurityIncident {
            id: randomUUID(),
            timestamp: datetime(),
            session_id: $session_id,
            user_id: $user_id,
            violation_type: $violation_type,
            input: $user_input,
            severity: $severity,
            action_taken: $action_taken
        })
        RETURN i.id as incident_id
        """
        
        params = {
            "session_id": session_id,
            "user_id": user_id or "anonymous",
            "violation_type": violation_type,
            "user_input": user_input,
            "severity": severity,
            "action_taken": action_taken
        }
        
        async with self._driver.session(database=settings.neo4j_database) as session:
            result = await session.run(cypher_query, params)
            record = await result.single()
        
        incident_id = record["incident_id"] if record else None
        logger.warning("Security incident logged", 
                      incident_id=incident_id,
                      violation_type=violation_type,
                      severity=severity)
        return incident_id


# Global Neo4j client instance
neo4j_client = Neo4jClient()

