"""
AIlessia API Routes - Emotional Intelligence Conversation System.

These endpoints enable the full AIlessia experience: emotional reading,
adaptive conversation, experience composition, and script generation.
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import List, Optional, Dict
from datetime import datetime
import structlog

from core.ailessia.emotion_interpreter import emotion_interpreter, EmotionalReading
from core.ailessia.personality_mirror import personality_mirror
from core.ailessia.weighted_archetype_calculator import weighted_archetype_calculator, ArchetypeWeights
import core.ailessia.script_composer as script_composer_module
import core.aibert.desire_anticipator as desire_anticipator_module
import database.account_manager as account_manager_module
import database.client_sync_service as client_sync_module
from database.neo4j_client import neo4j_client
from core.recommendations.poi_recommendation_service import poi_recommendation_service

logger = structlog.get_logger()

router = APIRouter(prefix="/ailessia", tags=["ailessia"])


# Helper functions to get initialized instances
def get_account_manager():
    """Get the initialized account manager instance."""
    if account_manager_module.account_manager is None:
        raise RuntimeError("Account Manager not initialized. Please check API startup.")
    return account_manager_module.account_manager


def get_desire_anticipator():
    """Get the initialized desire anticipator instance."""
    if desire_anticipator_module.desire_anticipator is None:
        raise RuntimeError("Desire Anticipator not initialized. Please check API startup.")
    return desire_anticipator_module.desire_anticipator


def get_script_composer():
    """Get the initialized script composer instance."""
    if script_composer_module.script_composer is None:
        raise RuntimeError("Script Composer not initialized. Please check API startup.")
    return script_composer_module.script_composer


# ============================================================================
# REQUEST/RESPONSE MODELS
# ============================================================================

class AccountCreateRequest(BaseModel):
    """Request to create a new client account."""
    email: str = Field(..., description="Client email address")
    name: Optional[str] = Field(None, description="Client name")
    phone: Optional[str] = Field(None, description="Client phone number")


class AccountResponse(BaseModel):
    """Client account response."""
    account_id: str
    email: str
    name: Optional[str]
    personality_archetype: Optional[str]
    vip_status: str
    total_scripts_created: int
    session_id: Optional[str] = None
    ailessia_greeting: Optional[str] = None


class ConversationMessage(BaseModel):
    """Single conversation message."""
    role: str = Field(..., description="Message role: user or ailessia")
    content: str = Field(..., description="Message content")
    timestamp: Optional[datetime] = None


class ConverseRequest(BaseModel):
    """Request to converse with AIlessia."""
    account_id: str = Field(..., description="Client account ID")
    session_id: str = Field(..., description="Conversation session ID")
    message: str = Field(..., description="User message")
    conversation_history: Optional[List[ConversationMessage]] = Field(default_factory=list)


class ConverseResponse(BaseModel):
    """AIlessia's response."""
    ailessia_response: str
    tone_used: str
    conversation_stage: str
    progress: float = Field(..., ge=0.0, le=1.0, description="Conversation progress 0-1")
    emotional_reading: Optional[Dict] = None
    proactive_suggestions: Optional[List[Dict]] = None
    key_insight: Optional[str] = None


class ComposeScriptRequest(BaseModel):
    """Request to compose Experience Script."""
    account_id: str
    session_id: str
    selected_choices: Dict = Field(..., description="User selections (destination, theme, etc.)")


class ScriptResponse(BaseModel):
    """Experience Script response."""
    script_id: str
    title: str
    cinematic_hook: str
    emotional_arc: str
    pdf_url: Optional[str]
    preview_narrative: str
    total_investment: float
    duration_days: int
    ailessia_message: str


class FeedbackRequest(BaseModel):
    """Client feedback request."""
    account_id: str
    feedback_type: str = Field(..., description="script_quality, ailessia_interaction, etc.")
    rating: int = Field(..., ge=1, le=5)
    feedback_text: Optional[str] = None
    script_id: Optional[str] = None
    session_id: Optional[str] = None


class POIRecommendationRequest(BaseModel):
    """Request for personalized POI recommendations."""
    account_id: str
    destination: str = Field(default="French Riviera", description="Destination name")
    activity_types: Optional[List[str]] = Field(None, description="Filter by activity types")
    min_luxury_score: float = Field(default=0.7, ge=0.0, le=1.0)
    min_fit_score: float = Field(default=0.75, ge=0.0, le=1.0)
    limit: int = Field(default=20, ge=1, le=50)


class POIRecommendationResponse(BaseModel):
    """Response with personalized POI recommendations."""
    pois: List[Dict]
    client_archetype_weights: Dict[str, float]
    recommendation_strategy: str
    total_found: int


# ============================================================================
# ENDPOINTS
# ============================================================================

@router.post("/account/create", response_model=AccountResponse)
async def create_account(request: AccountCreateRequest):
    """
    Create a new client account and start AIlessia conversation.
    
    This automatically creates the Personal Script Space and initiates
    AIlessia's relationship with the client.
    """
    try:
        # Create account
        account = await get_account_manager().create_account(
            email=request.email,
            name=request.name,
            phone=request.phone
        )
        
        # Start conversation session
        session = await get_account_manager().create_conversation_session(
            account_id=account["id"]
        )
        
        # Generate AIlessia's greeting
        greeting = personality_mirror.generate_greeting(
            client_name=request.name,
            is_returning=False
        )
        
        logger.info("New account created with greeting",
                   account_id=account["id"],
                   email=request.email)
        
        # Sync to Neo4j for marketing & tracking
        if client_sync_module.client_sync_service:
            await client_sync_module.client_sync_service.sync_client_to_neo4j(account["id"])
            logger.info("Client synced to Neo4j for marketing tracking",
                       account_id=account["id"])
        
        return AccountResponse(
            account_id=account["id"],
            email=account["email"],
            name=account.get("name"),
            personality_archetype=account.get("personality_archetype"),
            vip_status=account.get("vip_status", "General"),
            total_scripts_created=account.get("total_scripts_created", 0),
            session_id=session["id"],
            ailessia_greeting=greeting
        )
        
    except Exception as e:
        logger.error("Failed to create account", error=str(e))
        raise HTTPException(status_code=500, detail=f"Failed to create account: {str(e)}")


@router.post("/converse", response_model=ConverseResponse)
async def converse_with_ailessia(request: ConverseRequest):
    """
    Main conversation endpoint with AIlessia.
    
    This is where AIlessia's emotional intelligence comes alive:
    - Reads emotional state
    - Anticipates desires
    - Adapts personality
    - Generates empathetic responses
    """
    try:
        # Get account and session
        account = await get_account_manager().get_account(request.account_id)
        if not account:
            raise HTTPException(status_code=404, detail="Account not found")
        
        # Prepare conversation history
        conversation_history = [
            {"role": msg.role, "content": msg.content}
            for msg in request.conversation_history
        ]
        conversation_history.append({
            "role": "user",
            "content": request.message
        })
        
        # 1. AIlessia reads emotional state
        emotional_reading = await emotion_interpreter.read_emotional_state(
            message=request.message,
            conversation_history=conversation_history
        )
        
        # 2. AIbert anticipates desires
        client_profile = {
            "archetype": account.get("personality_archetype") or emotional_reading.detected_archetype,
            "emotional_profile": account.get("emotional_profile", {}),
            "name": account.get("name")
        }
        
        anticipated_desires = await get_desire_anticipator().anticipate_desires(
            emotional_reading=emotional_reading,
            conversation_history=conversation_history,
            client_profile=client_profile
        )
        
        # 3. Update account archetype if detected and not set
        if not account.get("personality_archetype") and emotional_reading.detected_archetype:
            await get_account_manager().update_account_profile(
                account_id=request.account_id,
                personality_archetype=emotional_reading.detected_archetype
            )
        
        # 3b. Calculate and store weighted archetype scores
        emotional_resonances = {
            emotional_reading.primary_state.value.title(): emotional_reading.confidence_score
        }
        # Add detected emotions from hidden desires
        for desire in emotional_reading.hidden_desires[:3]:
            if "romantic" in desire.lower():
                emotional_resonances["Romance"] = 0.85
            elif "prestige" in desire.lower() or "status" in desire.lower():
                emotional_resonances["Prestige"] = 0.80
            elif "peace" in desire.lower() or "calm" in desire.lower():
                emotional_resonances["Serenity"] = 0.80
            elif "luxury" in desire.lower() or "indulge" in desire.lower():
                emotional_resonances["Indulgence"] = 0.85
        
        # Calculate archetype weights
        archetype_weights = await poi_recommendation_service.calculate_client_weights_from_conversation(
            emotional_resonances=emotional_resonances,
            conversation_history=conversation_history,
            activity_preferences=None  # Could add from account history
        )
        
        # Store in account profile
        await get_account_manager().update_account_profile(
            account_id=request.account_id,
            emotional_profile=emotional_resonances,
            archetype_weights=archetype_weights.as_dict()
        )
        
        logger.info("Archetype weights calculated and stored",
                   account_id=request.account_id,
                   weights=archetype_weights.as_dict())
        
        # 4. Determine conversation stage
        current_stage = await _determine_conversation_stage(
            conversation_history=conversation_history,
            message=request.message
        )
        
        # 5. Select appropriate tone
        tone_name = personality_mirror.select_tone(
            emotional_reading=emotional_reading,
            conversation_stage=current_stage,
            client_archetype=emotional_reading.detected_archetype
        )
        
        # 6. Generate proactive suggestions if appropriate
        proactive_suggestions = []
        if current_stage in ["discovery", "recommendation"]:
            proactive_suggestions = await _generate_proactive_suggestions(
                anticipated_desires=anticipated_desires,
                emotional_reading=emotional_reading,
                client_profile=client_profile
            )
        
        # 7. Build response content
        response_content = await _build_response_content(
            message=request.message,
            emotional_reading=emotional_reading,
            anticipated_desires=anticipated_desires,
            proactive_suggestions=proactive_suggestions,
            conversation_stage=current_stage,
            client_profile=client_profile
        )
        
        # 8. Generate AIlessia's response in adapted tone
        ailessia_response = await personality_mirror.generate_response(
            content=response_content,
            tone_name=tone_name,
            client_name=account.get("name"),
            emotional_context={
                "primary_state": emotional_reading.primary_state.value,
                "energy_level": emotional_reading.energy_level,
                "vulnerability": emotional_reading.vulnerability_shown,
                "hidden_desires": emotional_reading.hidden_desires
            },
            conversation_stage=current_stage
        )
        
        # 9. Calculate progress
        progress = _calculate_conversation_progress(conversation_history, current_stage)
        
        # 10. Update session
        updated_messages = conversation_history + [{
            "role": "ailessia",
            "content": ailessia_response,
            "tone": tone_name,
            "timestamp": datetime.now().isoformat()
        }]
        
        await get_account_manager().update_conversation_session(
            session_id=request.session_id,
            messages=updated_messages,
            detected_emotions=[{
                "state": emotional_reading.primary_state.value,
                "confidence": emotional_reading.confidence_score,
                "timestamp": datetime.now().isoformat()
            }],
            conversation_stage=current_stage,
            tone_used=tone_name
        )
        
        # 11. Extract key insight
        key_insight = None
        if anticipated_desires:
            key_insight = anticipated_desires[0].emotional_fulfillment
        
        logger.info("Conversation turn completed",
                   session_id=request.session_id,
                   stage=current_stage,
                   tone=tone_name,
                   emotion=emotional_reading.primary_state.value)
        
        # Track emotional resonance for marketing
        if client_sync_module.client_sync_service:
            # Track primary emotion
            await client_sync_module.client_sync_service.track_emotional_resonance(
                account_id=request.account_id,
                emotion_name=emotional_reading.primary_state.value.title(),
                strength=emotional_reading.confidence_score,
                discovered_through="AIlessia_conversation",
                manifestations=emotional_reading.hidden_desires[:3]
            )
            
            # If desires detected, track potential experience interest
            if anticipated_desires and proactive_suggestions:
                for suggestion in proactive_suggestions[:2]:
                    if suggestion.get("experience_id"):
                        await client_sync_module.client_sync_service.track_experience_interest(
                            account_id=request.account_id,
                            experience_id=suggestion["experience_id"],
                            confidence=suggestion.get("confidence", 0.7),
                            trigger_words=emotional_reading.hidden_desires[:3],
                            emotional_resonance=emotional_reading.confidence_score,
                            conversation_id=request.session_id
                        )
        
        return ConverseResponse(
            ailessia_response=ailessia_response,
            tone_used=tone_name,
            conversation_stage=current_stage,
            progress=progress,
            emotional_reading={
                "primary_state": emotional_reading.primary_state.value,
                "archetype": emotional_reading.detected_archetype,
                "energy_level": emotional_reading.energy_level,
                "hidden_desires": emotional_reading.hidden_desires[:3]
            },
            proactive_suggestions=proactive_suggestions,
            key_insight=key_insight
        )
        
    except Exception as e:
        logger.error("Conversation failed", error=str(e), session_id=request.session_id)
        raise HTTPException(status_code=500, detail=f"Conversation failed: {str(e)}")


@router.post("/compose-script", response_model=ScriptResponse)
async def compose_experience_script(request: ComposeScriptRequest):
    """
    AIlessia composes the Experience Script.
    
    This is where all the magic comes together—transforming emotional
    intelligence into a story-driven luxury experience.
    """
    try:
        # Get account
        account = await get_account_manager().get_account(request.account_id)
        if not account:
            raise HTTPException(status_code=404, detail="Account not found")
        
        # Get conversation session
        session_result = await get_account_manager().supabase.table("conversation_sessions").select("*").eq("id", request.session_id).execute()
        if not session_result.data:
            raise HTTPException(status_code=404, detail="Session not found")
        
        session = session_result.data[0]
        
        # Reconstruct emotional reading from session
        latest_emotion = session.get("detected_emotions", [{}])[-1] if session.get("detected_emotions") else {}
        emotional_reading_data = {
            "primary_state": latest_emotion.get("state", "contemplative"),
            "energy_level": 0.7,
            "vulnerability_shown": 0.5,
            "openness_to_experience": 0.8,
            "hidden_desires": [],
            "emotional_needs": [],
            "detected_archetype": account.get("personality_archetype", "The Explorer")
        }
        
        # Get anticipated desires (reconstruct from session or re-analyze)
        anticipated_desires = []  # Would re-run desire anticipator here if needed
        
        # Build client profile
        client_profile = {
            "archetype": account.get("personality_archetype", "The Explorer"),
            "name": account.get("name"),
            "emotional_profile": account.get("emotional_profile", {}),
            "communication_preferences": account.get("communication_preferences", {})
        }
        
        # Get signature experiences from Neo4j
        destination = request.selected_choices.get("destination", "French Riviera")
        archetype = client_profile["archetype"]
        
        signature_experiences = await neo4j_client.find_experiences_for_archetype(
            archetype=archetype,
            destination=destination,
            min_fit_score=0.75
        )
        
        if not signature_experiences:
            # Fallback: get by emotions
            signature_experiences = await neo4j_client.find_experiences_by_emotions(
                desired_emotions=["Luxury", "Prestige", "Romance"],
                destination=destination,
                min_exclusivity=0.7
            )
        
        # Create mock EmotionalReading for script composer
        from core.ailessia.emotion_interpreter import EmotionalReading, EmotionalState
        emotional_reading = EmotionalReading(
            primary_state=EmotionalState.CONTEMPLATIVE,
            energy_level=0.7,
            openness_to_experience=0.8,
            vulnerability_shown=0.5,
            detected_archetype=archetype
        )
        
        # Compose the script
        experience_script = await get_script_composer().compose_experience_script(
            client_profile=client_profile,
            emotional_reading=emotional_reading,
            anticipated_desires=anticipated_desires,
            selected_choices=request.selected_choices,
            signature_experiences=signature_experiences
        )
        
        # Save script to Personal Script Space
        saved_script = await get_account_manager().save_experience_script(
            account_id=request.account_id,
            script=experience_script,
            session_id=request.session_id
        )
        
        # Update session stage
        await get_account_manager().update_conversation_session(
            session_id=request.session_id,
            conversation_stage="composition_complete"
        )
        
        # Generate AIlessia's message
        ailessia_message = f"Your Experience Script is ready, {account.get('name', '')}. I've designed something truly special that speaks to who you are and what you're seeking."
        
        logger.info("Experience script composed",
                   script_id=saved_script["id"],
                   account_id=request.account_id,
                   title=experience_script.title)
        
        return ScriptResponse(
            script_id=saved_script["id"],
            title=experience_script.title,
            cinematic_hook=experience_script.cinematic_hook,
            emotional_arc=experience_script.emotional_arc,
            pdf_url=saved_script.get("pdf_url"),
            preview_narrative=experience_script.cinematic_hook,
            total_investment=experience_script.total_investment,
            duration_days=experience_script.duration_days,
            ailessia_message=ailessia_message
        )
        
    except Exception as e:
        logger.error("Script composition failed", error=str(e))
        raise HTTPException(status_code=500, detail=f"Script composition failed: {str(e)}")


@router.get("/script-space/{account_id}")
async def get_personal_script_space(account_id: str):
    """
    Access client's Personal Script Space.
    
    View all scripts, get new suggestions, see upsell opportunities.
    """
    try:
        # Get account
        account = await get_account_manager().get_account(account_id)
        if not account:
            raise HTTPException(status_code=404, detail="Account not found")
        
        # Get scripts
        scripts = await get_account_manager().get_client_scripts(
            account_id=account_id,
            limit=20
        )
        
        # Generate new suggestions based on past scripts
        suggestions = []
        if scripts:
            # Analyze patterns and suggest new experiences
            suggestions.append({
                "type": "new_destination",
                "title": "Similar experiences in new locations",
                "description": "Based on your love of the French Riviera, you might also adore the Amalfi Coast"
            })
        
        logger.info("Script space accessed",
                   account_id=account_id,
                   script_count=len(scripts))
        
        return {
            "account": {
                "id": account["id"],
                "name": account.get("name"),
                "archetype": account.get("personality_archetype"),
                "total_scripts": account.get("total_scripts_created", 0),
                "vip_status": account.get("vip_status")
            },
            "scripts": scripts,
            "ailessia_suggestions": suggestions
        }
        
    except Exception as e:
        logger.error("Failed to get script space", error=str(e))
        raise HTTPException(status_code=500, detail=f"Failed to get script space: {str(e)}")


@router.post("/feedback")
async def submit_feedback(request: FeedbackRequest):
    """
    Submit client feedback for AIlessia's learning loop.
    """
    try:
        feedback = await get_account_manager().save_client_feedback(
            account_id=request.account_id,
            feedback_type=request.feedback_type,
            rating=request.rating,
            feedback_text=request.feedback_text,
            script_id=request.script_id,
            session_id=request.session_id
        )
        
        logger.info("Feedback received",
                   feedback_id=feedback["id"],
                   rating=request.rating)
        
        return {
            "feedback_id": feedback["id"],
            "message": "Thank you for your feedback. AIlessia learns from every interaction."
        }
        
    except Exception as e:
        logger.error("Failed to save feedback", error=str(e))
        raise HTTPException(status_code=500, detail=f"Failed to save feedback: {str(e)}")


@router.post("/recommendations/pois", response_model=POIRecommendationResponse)
async def get_personalized_poi_recommendations(request: POIRecommendationRequest):
    """
    Get ultra-personalized POI recommendations based on client's archetype weights.
    
    Uses multi-dimensional personality matching:
    - Calculates client's 6D archetype weights from emotional profile
    - Matches against POI personality scores in Neo4j
    - Returns POIs with high personality fit + emotional resonance
    """
    try:
        # Get account
        account = await get_account_manager().get_account(request.account_id)
        if not account:
            raise HTTPException(status_code=404, detail="Account not found")
        
        # Get emotional profile from account or latest conversation
        emotional_profile = account.get("emotional_profile", {})
        
        # Calculate archetype weights
        if emotional_profile:
            # Use stored emotional resonances
            client_weights = await poi_recommendation_service.calculate_client_weights_from_conversation(
                emotional_resonances=emotional_profile,
                conversation_history=[],
                activity_preferences=None
            )
        else:
            # Use default balanced weights (first-time user)
            client_weights = ArchetypeWeights(
                romantic=0.6,
                connoisseur=0.6,
                hedonist=0.6,
                contemplative=0.5,
                achiever=0.5,
                adventurer=0.4
            )
            logger.info("Using default archetype weights for new client",
                       account_id=request.account_id)
        
        # Store archetype weights in account if not already stored
        if not account.get("archetype_weights"):
            await get_account_manager().update_account_profile(
                account_id=request.account_id,
                archetype_weights=client_weights.as_dict()
            )
        
        # Get personalized POI recommendations
        pois = await poi_recommendation_service.get_personalized_pois(
            client_weights=client_weights,
            destination=request.destination,
            activity_types=request.activity_types,
            min_luxury_score=request.min_luxury_score,
            min_fit_score=request.min_fit_score,
            limit=request.limit
        )
        
        # Sync to Neo4j: Track POI views for marketing
        if client_sync_module.client_sync_service and pois:
            for poi in pois[:5]:  # Track top 5 viewed POIs
                # Note: This would need POI IDs from Neo4j, currently we have names
                # Will implement after POI ID tracking is added
                pass
        
        logger.info("POI recommendations generated",
                   account_id=request.account_id,
                   destination=request.destination,
                   count=len(pois))
        
        return POIRecommendationResponse(
            pois=pois,
            client_archetype_weights=client_weights.as_dict(),
            recommendation_strategy="6D personality matching + emotional resonance",
            total_found=len(pois)
        )
        
    except Exception as e:
        logger.error("Failed to get POI recommendations", error=str(e))
        raise HTTPException(status_code=500, detail=f"Failed to get recommendations: {str(e)}")


# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

async def _determine_conversation_stage(
    conversation_history: List[Dict],
    message: str
) -> str:
    """Determine current conversation stage."""
    message_lower = message.lower()
    turn_count = len([m for m in conversation_history if m.get("role") == "user"])
    
    # Stage progression logic
    if turn_count <= 2:
        return "opening"
    elif any(word in message_lower for word in ["yes", "sounds good", "perfect", "let's do it"]):
        return "recommendation"
    elif any(word in message_lower for word in ["change", "different", "instead", "prefer"]):
        return "refinement"
    elif turn_count > 8:
        return "closing"
    else:
        return "discovery"


async def _generate_proactive_suggestions(
    anticipated_desires: List,
    emotional_reading,
    client_profile: Dict
) -> List[Dict]:
    """Generate proactive experience suggestions."""
    suggestions = []
    
    if anticipated_desires:
        top_desire = anticipated_desires[0]
        
        # Get experiences matching this desire
        if top_desire.experiences_to_suggest:
            for exp_id in top_desire.experiences_to_suggest[:3]:
                suggestions.append({
                    "experience_id": exp_id,
                    "rationale": top_desire.emotional_fulfillment,
                    "confidence": top_desire.confidence
                })
    
    return suggestions


async def _build_response_content(
    message: str,
    emotional_reading,
    anticipated_desires: List,
    proactive_suggestions: List[Dict],
    conversation_stage: str,
    client_profile: Dict
) -> str:
    """Build core response content before tone adaptation."""
    message_lower = message.lower()
    
    # Opening stage
    if conversation_stage == "opening":
        return "I'm here to create something extraordinary for you. Tell me, what brings you to me today? What kind of experience are you dreaming of?"
    
    # Discovery stage
    elif conversation_stage == "discovery":
        if anticipated_desires:
            desire = anticipated_desires[0]
            return f"I'm sensing that {desire.emotional_fulfillment}. Let me ask you this: {_generate_discovery_question(desire, emotional_reading)}"
        else:
            return "Tell me more about what you're imagining. What emotions do you want to feel during this experience?"
    
    # Recommendation stage
    elif conversation_stage == "recommendation":
        if proactive_suggestions:
            return f"Based on everything you've shared, I have some perfect experiences in mind. {_format_suggestions(proactive_suggestions)}"
        else:
            return "I'm starting to see exactly what you need. Let me curate some experiences that will resonate deeply with you."
    
    # Default
    else:
        return "I'm listening. Tell me more about what you're seeking."


def _generate_discovery_question(desire, emotional_reading) -> str:
    """Generate discovery question based on desire."""
    question_templates = {
        "romantic_partner_anniversary": "When you imagine the perfect moment with your partner, what does it look like?",
        "achievement_celebration": "How do you want to feel when you look back on this celebration?",
        "escape_from_pressure": "If you could release one thing during this experience, what would it be?",
        "identity_transformation": "Who are you becoming, and how can this journey honor that?",
    }
    
    return question_templates.get(desire.desire_type, "What would make this experience truly unforgettable for you?")


def _format_suggestions(suggestions: List[Dict]) -> str:
    """Format suggestions for response."""
    if not suggestions:
        return ""
    
    return f"I have {len(suggestions)} signature experiences that feel perfect for you. Would you like to hear about them?"


def _calculate_conversation_progress(
    conversation_history: List[Dict],
    current_stage: str
) -> float:
    """Calculate conversation progress (0-1)."""
    stage_progress = {
        "opening": 0.1,
        "discovery": 0.4,
        "recommendation": 0.7,
        "refinement": 0.85,
        "closing": 0.95,
        "composition_complete": 1.0
    }
    
    base_progress = stage_progress.get(current_stage, 0.5)
    
    # Adjust based on conversation depth
    user_messages = len([m for m in conversation_history if m.get("role") == "user"])
    depth_bonus = min(0.1, user_messages * 0.01)
    
    return min(1.0, base_progress + depth_bonus)

