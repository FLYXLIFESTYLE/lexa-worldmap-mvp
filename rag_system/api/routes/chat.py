"""
Chat endpoints for the RAG chatbot.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
import uuid
import structlog

from core.security.safety_checker import safety_checker, SafetyLevel
from core.confidence.scoring import confidence_scorer, AnswerType
from database.neo4j_client import neo4j_client
from database.supabase_vector_client import vector_db_client
from config.settings import settings
from config.prompts import get_system_prompt

logger = structlog.get_logger()

router = APIRouter()


# Request/Response Models
class ChatMessage(BaseModel):
    """A single chat message."""
    role: str = Field(..., description="Role: 'user' or 'assistant'")
    content: str = Field(..., description="Message content")


class ChatRequest(BaseModel):
    """Request body for chat endpoint."""
    message: str = Field(..., description="User's message", min_length=1, max_length=1000)
    session_id: Optional[str] = Field(None, description="Session ID for conversation tracking")
    user_id: Optional[str] = Field(None, description="User ID (if authenticated)")
    conversation_history: List[ChatMessage] = Field(default=[], description="Previous messages in conversation")


class Source(BaseModel):
    """A source used in generating the answer."""
    type: str = Field(..., description="Source type: neo4j or vector_db")
    id: str = Field(..., description="Source identifier")
    title: str = Field(..., description="Source title/name")
    relevance_score: float = Field(..., description="Relevance score 0-1")


class Clarification(BaseModel):
    """A clarification question."""
    question: str = Field(..., description="The clarification question")
    options: List[str] = Field(default=[], description="Suggested options")


class ChatResponse(BaseModel):
    """Response body for chat endpoint."""
    answer: str = Field(..., description="The chatbot's response")
    answer_type: str = Field(..., description="Type: confident, partial, uncertain, or no_info")
    confidence_score: float = Field(..., description="Confidence score 0-1")
    sources: List[Source] = Field(default=[], description="Sources used")
    information_gaps: List[str] = Field(default=[], description="Missing information")
    clarifications: List[Clarification] = Field(default=[], description="Follow-up questions")
    related_suggestions: List[str] = Field(default=[], description="Related topics we can help with")
    session_id: str = Field(..., description="Session ID for this conversation")
    session_terminated: bool = Field(default=False, description="Whether session was terminated")


# Helper Functions
def parse_query_intent(message: str) -> Dict[str, Any]:
    """
    Parse user message to understand intent.
    This is a simple implementation - could be enhanced with NLP.
    
    Args:
        message: User's message
    
    Returns:
        Dictionary with intent information
    """
    message_lower = message.lower()
    
    # Check what the user is asking for
    asks_for = {
        "region": any(word in message_lower for word in ["where", "region", "place", "destination"]),
        "activity": any(word in message_lower for word in ["what", "do", "activity", "activities", "things"]),
        "season": any(word in message_lower for word in ["when", "season", "time", "month"]),
        "details": any(word in message_lower for word in ["how", "details", "information", "about"]),
    }
    
    return {
        "asks_for": asks_for,
        "is_greeting": any(word in message_lower for word in ["hello", "hi", "hey", "good morning"]),
    }


async def retrieve_context(message: str, query_intent: Dict[str, Any]) -> Dict[str, Any]:
    """
    Retrieve relevant context from both databases.
    
    Args:
        message: User's message
        query_intent: Parsed query intent
    
    Returns:
        Dictionary with retrieved results and metadata
    """
    # Search Neo4j for regions and activities
    neo4j_results = []
    
    # Search for regions
    try:
        regions = await neo4j_client.search_regions(message)
        neo4j_results.extend(regions)
    except Exception as e:
        logger.error("Neo4j region search failed", error=str(e))
    
    # Search for activities
    try:
        activities = await neo4j_client.search_activities()
        neo4j_results.extend(activities)
    except Exception as e:
        logger.error("Neo4j activity search failed", error=str(e))
    
    # Search vector database for trends
    vector_results = []
    try:
        trends = await vector_db_client.search_trends(message)
        vector_results.extend(trends)
    except Exception as e:
        logger.error("Vector search failed", error=str(e))
    
    # Determine what data we have
    has_region = any("name" in r and "bundesland" in r for r in neo4j_results)
    has_activity = any("category" in r for r in neo4j_results)
    has_season = any("season" in r for r in neo4j_results)
    has_details = len(neo4j_results) > 0 or len(vector_results) > 0
    
    return {
        "neo4j_results": neo4j_results,
        "vector_results": vector_results,
        "has_region": has_region,
        "has_activity": has_activity,
        "has_season": has_season,
        "has_details": has_details,
    }


def format_context_for_llm(retrieved_data: Dict[str, Any]) -> str:
    """
    Format retrieved data into context string for the LLM.
    
    Args:
        retrieved_data: Retrieved data from databases
    
    Returns:
        Formatted context string
    """
    context_parts = []
    
    # Format Neo4j results
    neo4j_results = retrieved_data.get("neo4j_results", [])
    if neo4j_results:
        context_parts.append("=== Structured Data from Knowledge Graph ===\n")
        for item in neo4j_results:
            if "name" in item and "bundesland" in item:
                # It's a region
                context_parts.append(f"Region: {item['name']}, {item['bundesland']}")
                if "description" in item:
                    context_parts.append(f"Description: {item['description']}")
                context_parts.append("[Source: Region-DB]\n")
            elif "category" in item:
                # It's an activity
                context_parts.append(f"Activity: {item['name']}")
                context_parts.append(f"Category: {item['category']}")
                if "description" in item:
                    context_parts.append(f"Description: {item['description']}")
                if "season" in item:
                    context_parts.append(f"Best seasons: {', '.join(item['season'])}")
                context_parts.append("[Source: Activity-DB]\n")
    
    # Format vector results
    vector_results = retrieved_data.get("vector_results", [])
    if vector_results:
        context_parts.append("\n=== Market Trends and Insights ===\n")
        for item in vector_results:
            context_parts.append(f"Trend (relevance {item['score']:.2f}): {item['text']}")
            if "metadata" in item and "source" in item["metadata"]:
                context_parts.append(f"[Source: {item['metadata']['source']}]\n")
    
    if not context_parts:
        return "No specific data found for this query."
    
    return "\n".join(context_parts)


def generate_answer_with_llm(
    user_message: str,
    context: str,
    answer_type: AnswerType
) -> str:
    """
    Generate answer using LLM (placeholder).
    
    In a real implementation, this would call Claude or GPT-4.
    For Phase 1, we return a template response.
    
    Args:
        user_message: User's message
        context: Formatted context from databases
        answer_type: Type of answer to generate
    
    Returns:
        Generated answer
    """
    # This is a placeholder for Phase 1
    # In Phase 2-3, this will integrate with Claude/GPT-4
    
    if answer_type == AnswerType.NO_INFORMATION:
        return f"I currently don't have verified information about that specific topic. However, I can help you with travel planning in {settings.supported_regions}. Would you like to know about popular destinations or activities in these regions?"
    
    elif answer_type == AnswerType.UNCERTAIN:
        return "I'm not entirely certain about that. Could you provide more details? For example, which region interests you, or what type of activities you're looking for?"
    
    elif answer_type == AnswerType.PARTIAL:
        return f"Based on available data, here's what I found:\n\n{context}\n\nHowever, I'm missing some information. Could you tell me more about what specifically you're interested in?"
    
    else:  # CONFIDENT
        return f"Here's what I found for you:\n\n{context}\n\nWould you like more details about any of these options?"


@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """
    Main chat endpoint - processes user messages with full RAG pipeline.
    
    This endpoint:
    1. Performs security checks
    2. Retrieves relevant context
    3. Calculates confidence
    4. Generates response
    5. Logs interaction
    """
    # Generate or use provided session ID
    session_id = request.session_id or str(uuid.uuid4())
    
    logger.info("Chat request received", 
               session_id=session_id,
               message_length=len(request.message))
    
    try:
        # STEP 1: Security Check
        safety_result = safety_checker.check_input(
            user_input=request.message,
            session_id=session_id,
            conversation_history=[msg.dict() for msg in request.conversation_history]
        )
        
        if not safety_result.is_safe:
            # Log security incident
            if safety_result.log_incident:
                await neo4j_client.log_security_incident(
                    session_id=session_id,
                    user_id=request.user_id,
                    violation_type=safety_result.violation_type,
                    user_input=request.message,
                    severity=safety_result.severity.value,
                    action_taken="blocked_and_redirected"
                )
            
            # Return safety response
            safety_message = safety_checker.get_safety_response(
                safety_result,
                privacy_contact=settings.privacy_contact
            )
            
            return ChatResponse(
                answer=safety_message,
                answer_type="no_info",
                confidence_score=0.0,
                sources=[],
                information_gaps=[],
                clarifications=[],
                related_suggestions=["Tell me about popular destinations", "What activities are available?"],
                session_id=session_id,
                session_terminated=safety_result.should_terminate
            )
        
        # STEP 2: Parse Query Intent
        query_intent = parse_query_intent(request.message)
        
        # Handle greetings separately
        if query_intent["is_greeting"]:
            return ChatResponse(
                answer=f"Hello! I'm your travel assistant for {settings.supported_regions}. I can help you discover amazing destinations, activities, and plan your perfect trip. What would you like to explore?",
                answer_type="confident",
                confidence_score=1.0,
                sources=[],
                information_gaps=[],
                clarifications=[],
                related_suggestions=[
                    "Popular destinations",
                    "Outdoor activities",
                    "Wine tours",
                    "Cultural experiences"
                ],
                session_id=session_id
            )
        
        # STEP 3: Retrieve Context
        retrieved_data = await retrieve_context(request.message, query_intent)
        
        # STEP 4: Calculate Confidence
        confidence_result = confidence_scorer.calculate_confidence(
            query_intent=query_intent,
            neo4j_results=retrieved_data["neo4j_results"],
            vector_results=retrieved_data["vector_results"],
            retrieved_data=retrieved_data
        )
        
        # STEP 5: Format Context
        context_for_llm = format_context_for_llm(retrieved_data)
        
        # STEP 6: Generate Answer
        answer = generate_answer_with_llm(
            user_message=request.message,
            context=context_for_llm,
            answer_type=confidence_result.answer_type
        )
        
        # STEP 7: Prepare Sources
        sources = []
        for neo4j_result in retrieved_data["neo4j_results"][:3]:  # Top 3
            sources.append(Source(
                type="neo4j",
                id=neo4j_result.get("id", "unknown"),
                title=neo4j_result.get("name", "Region/Activity"),
                relevance_score=0.9
            ))
        
        for vector_result in retrieved_data["vector_results"][:3]:  # Top 3
            sources.append(Source(
                type="vector_db",
                id=vector_result.get("id", "unknown"),
                title=vector_result.get("metadata", {}).get("source", "Market Trend"),
                relevance_score=vector_result.get("score", 0.0)
            ))
        
        # STEP 8: Generate Clarifications if needed
        clarifications = []
        if confidence_result.answer_type in [AnswerType.PARTIAL, AnswerType.UNCERTAIN]:
            if "region" in confidence_result.information_gaps:
                clarifications.append(Clarification(
                    question="Which region would you like to explore?",
                    options=settings.regions_list
                ))
            if "activity" in confidence_result.information_gaps:
                clarifications.append(Clarification(
                    question="What type of activities interest you?",
                    options=["Hiking", "Wine Tours", "Cultural", "Wellness", "Family Activities"]
                ))
        
        # STEP 9: Log Interaction
        try:
            await neo4j_client.log_interaction(
                session_id=session_id,
                user_id=request.user_id,
                question=request.message,
                answer=answer,
                confidence_score=confidence_result.overall_score,
                answer_type=confidence_result.answer_type.value,
                sources=[s.dict() for s in sources]
            )
        except Exception as e:
            logger.error("Failed to log interaction", error=str(e))
        
        # STEP 10: Return Response
        return ChatResponse(
            answer=answer,
            answer_type=confidence_result.answer_type.value,
            confidence_score=confidence_result.overall_score,
            sources=sources,
            information_gaps=confidence_result.information_gaps,
            clarifications=clarifications,
            related_suggestions=["Popular regions in Baden-Württemberg", "Winter activities", "Wine tourism"],
            session_id=session_id
        )
        
    except Exception as e:
        logger.error("Chat request failed", error=str(e), session_id=session_id)
        raise HTTPException(
            status_code=500,
            detail={"error": "An error occurred processing your request", "session_id": session_id}
        )

