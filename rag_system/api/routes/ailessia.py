"""
LEXA API Routes - Emotional Intelligence Conversation System.

Note: this module is still named `ailessia.py` for backwards compatibility.
User-facing naming and aliases should be LEXA.
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import List, Optional, Dict
from datetime import datetime
import structlog
from config.settings import settings

from core.ailessia.emotion_interpreter import emotion_interpreter, EmotionalReading
from core.ailessia.personality_mirror import personality_mirror
from core.ailessia.weighted_archetype_calculator import weighted_archetype_calculator, ArchetypeWeights
from core.ailessia.context_extractor import get_or_create_context_extractor
from core.ailessia.conversation_os import next_intake_question, is_intake_complete, build_question_with_examples
import core.ailessia.script_composer as script_composer_module
import core.aibert.desire_anticipator as desire_anticipator_module
import database.account_manager as account_manager_module
import database.client_sync_service as client_sync_module
from database.neo4j_client import neo4j_client
from core.recommendations.poi_recommendation_service import poi_recommendation_service

logger = structlog.get_logger()

# IMPORTANT:
# Keep this router prefix-less so `api/main.py` can mount it under BOTH:
# - /api/ailessia  (backwards compatible for the current frontend client)
# - /api/lexa      (brand-correct alias)
router = APIRouter()


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
    rag_payload: Optional[Dict] = None


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

        # Load session (we use key_moments to persist intake state without schema changes)
        session_result = (
            get_account_manager()
            .supabase.table("conversation_sessions")
            .select("id,key_moments,conversation_stage")
            .eq("id", request.session_id)
            .execute()
        )
        if not session_result.data:
            raise HTTPException(status_code=404, detail="Session not found")
        session = session_result.data[0]
        key_moments = session.get("key_moments") or []
        intake_state, last_q_key = _load_intake_state_from_key_moments(key_moments)
        
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

        # 1b. Update intake state from message (constraints + small behavioral signals)
        extractor = get_or_create_context_extractor()
        extraction = await extractor.extract(
            message=request.message,
            conversation_history=conversation_history,
            intake_state=intake_state,
            last_question_key=last_q_key
        )
        intake_state = extraction.updated_intake or intake_state
        extracted = extraction.extracted or {}

        # If the user is answering the last asked intake question, store the raw answer.
        if last_q_key:
            intake_state = _capture_last_question_answer(
                intake_state=intake_state,
                last_question_key=last_q_key,
                answer_text=request.message
            )
        
        # 2. Build client profile
        client_profile = {
            "archetype": account.get("personality_archetype") or emotional_reading.detected_archetype,
            "emotional_profile": account.get("emotional_profile", {}),
            "name": account.get("name")
        }

        # Decide whether we are still in intake or ready to generate a full WOW script.
        # (We keep the promise: ≤6 questions, only what's needed to materially change the script.)
        rag_payload: Optional[Dict] = None
        if not is_intake_complete(intake_state):
            nxt = next_intake_question(intake_state)
            if nxt:
                q_key, q_text = nxt
                response_content = _build_intake_turn_response(
                    user_message=request.message,
                    emotional_reading=emotional_reading,
                    question_text=build_question_with_examples(q_key, q_text)
                )
                current_stage = "intake"
                last_q_key = q_key
            else:
                # Edge case: intake looks incomplete but we can't find a question; proceed anyway.
                response_content, rag_payload = await _generate_wow_script_and_payload(
                    account=account,
                    client_profile=client_profile,
                    emotional_reading=emotional_reading,
                    intake=intake_state,
                    extracted=extracted
                )
                current_stage = "composition"
                last_q_key = None

            # Tone selection still uses the emotional reading (keeps it "listening")
            tone_name = personality_mirror.select_tone(
                emotional_reading=emotional_reading,
                conversation_stage="discovery",
                client_archetype=emotional_reading.detected_archetype
            )

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
                conversation_stage="discovery"
            )

            # Persist intake state into key_moments
            key_moments = _upsert_intake_state_key_moment(
                key_moments=key_moments,
                intake_state=intake_state,
                last_question_key=last_q_key,
                extracted=extracted
            )

            updated_messages = conversation_history + [{
                "role": "ailessia",
                "content": ailessia_response,
                "tone": tone_name,
                "timestamp": datetime.now().isoformat()
            }]

            progress = _calculate_intake_progress(intake_state)

            await get_account_manager().update_conversation_session(
                session_id=request.session_id,
                messages=updated_messages,
                detected_emotions=[{
                    "state": emotional_reading.primary_state.value,
                    "confidence": emotional_reading.confidence_score,
                    "timestamp": datetime.now().isoformat()
                }],
                key_moments=key_moments,
                conversation_stage=current_stage,
                tone_used=tone_name
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
                proactive_suggestions=[],
                key_insight=None,
                rag_payload=None
            )
        
        # Intake complete → proceed with full intelligence
        last_q_key = None

        # 3. AIbert anticipates desires
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
        
        # Store in account profile (emotional_profile only - archetype_weights column to be added later)
        await get_account_manager().update_account_profile(
            account_id=request.account_id,
            emotional_profile=emotional_resonances
            # archetype_weights=archetype_weights.as_dict()  # TODO: Add this column to Supabase schema
        )
        
        logger.info("Archetype weights calculated (stored in memory for this session)",
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
            client_profile=client_profile,
            conversation_history=conversation_history
        )

        # If we have enough intake, we can generate the WOW script + payload immediately
        # and present it as the response content.
        if is_intake_complete(intake_state):
            response_content, rag_payload = await _generate_wow_script_and_payload(
                account=account,
                client_profile=client_profile,
                emotional_reading=emotional_reading,
                intake=intake_state,
                extracted=extracted
            )
            current_stage = "script_ready"
        
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
            key_moments=_upsert_intake_state_key_moment(
                key_moments=key_moments,
                intake_state=intake_state,
                last_question_key=last_q_key,
                extracted=extracted
            ),
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
            key_insight=key_insight,
            rag_payload=rag_payload
        )
        
    except Exception as e:
        import traceback
        tb = traceback.format_exc()
        logger.error("Conversation failed", error=str(e), session_id=request.session_id, traceback=tb)
        # Developer-friendly error details (only in development)
        if getattr(settings, "environment", "development") == "development":
            raise HTTPException(status_code=500, detail=f"Conversation failed: {str(e)}\n\n{tb}")
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
        session_result = get_account_manager().supabase.table("conversation_sessions").select("*").eq("id", request.session_id).execute()
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

def _load_intake_state_from_key_moments(key_moments: List[Dict]) -> (Dict, Optional[str]):
    """
    Persist intake without DB migrations by storing the latest snapshot in conversation_sessions.key_moments.

    We store a single "intake_state_v1" entry and keep replacing it.
    """
    intake_state: Dict = {}
    last_question_key: Optional[str] = None

    if not isinstance(key_moments, list):
        return intake_state, last_question_key

    for km in reversed(key_moments):
        if isinstance(km, dict) and km.get("type") == "intake_state_v1":
            intake_state = km.get("intake_state") or {}
            last_question_key = km.get("last_question_key")
            return intake_state, last_question_key

    return intake_state, last_question_key


def _upsert_intake_state_key_moment(
    key_moments: List[Dict],
    intake_state: Dict,
    last_question_key: Optional[str],
    extracted: Optional[Dict] = None
) -> List[Dict]:
    """Insert or replace the latest intake snapshot key moment."""
    km_list = list(key_moments or [])

    snapshot = {
        "type": "intake_state_v1",
        "timestamp": datetime.now().isoformat(),
        "intake_state": intake_state,
        "last_question_key": last_question_key,
        "latest_extracted": extracted or {}
    }

    for i in range(len(km_list) - 1, -1, -1):
        if isinstance(km_list[i], dict) and km_list[i].get("type") == "intake_state_v1":
            km_list[i] = snapshot
            return km_list

    km_list.append(snapshot)
    return km_list


def _capture_last_question_answer(intake_state: Dict, last_question_key: str, answer_text: str) -> Dict:
    """
    Store a raw answer for the last asked intake key (minimal, non-hallucinating).
    """
    s = dict(intake_state or {})
    ans = (answer_text or "").strip()
    if not ans:
        return s

    if last_question_key == "red_lines":
        s.setdefault("red_lines", [])
        if isinstance(s.get("red_lines"), list):
            s["red_lines"].append(ans)
        else:
            s["red_lines"] = [str(s.get("red_lines")), ans]
        return s

    if last_question_key == "energy_rhythm":
        # store as dict to keep room for structured fields later
        if not s.get("energy_rhythm"):
            s["energy_rhythm"] = {"raw": ans}
        return s

    if last_question_key == "constraints":
        s.setdefault("constraints", {})
        if isinstance(s.get("constraints"), dict):
            s["constraints"].setdefault("raw", ans)
        else:
            s["constraints"] = {"raw": ans}
        return s

    # default string keys
    if not s.get(last_question_key):
        s[last_question_key] = ans
    return s


def _calculate_intake_progress(intake_state: Dict) -> float:
    """Map intake completeness to a progress number for the UI (0..1)."""
    s = intake_state or {}
    answered = 0
    total = 6

    if s.get("primary_emotion_goal"):
        answered += 1
    if s.get("social_appetite"):
        answered += 1
    if s.get("meaning_anchor"):
        answered += 1

    red = s.get("red_lines")
    if (isinstance(red, list) and len(red) > 0) or (isinstance(red, str) and red.strip()):
        answered += 1

    er = s.get("energy_rhythm")
    if (isinstance(er, dict) and er.get("raw")) or (isinstance(er, str) and er.strip()):
        answered += 1

    c = s.get("constraints")
    if (isinstance(c, dict) and len(c) > 0) or (isinstance(c, str) and c.strip()):
        answered += 1

    # Intake is the first ~60% of the journey.
    return min(0.6, (answered / total) * 0.6)


def _build_intake_turn_response(user_message: str, emotional_reading: EmotionalReading, question_text: str) -> str:
    """
    Gentle "I heard you" + exactly one question (with examples).
    No markdown fences.
    """
    primary = (emotional_reading.primary_state.value or "present").replace("_", " ")

    # Keep it short and confident—one reflection, one question.
    return (
        f"I hear you. Under the surface, this feels {primary}.\n\n"
        f"One question — so I can design the feeling (not just the logistics):\n"
        f"{question_text}"
    )


async def _generate_wow_script_and_payload(
    account: Dict,
    client_profile: Dict,
    emotional_reading: EmotionalReading,
    intake: Dict,
    extracted: Optional[Dict] = None
) -> (str, Dict):
    """
    Produce Stage 0–4 + strict rag_payload dict.

    This is deterministic and does not rely on an LLM to return JSON correctly.
    """

    extracted = extracted or {}
    constraints = (intake or {}).get("constraints") or (extracted.get("constraints") or {})

    destination = (
        constraints.get("destination")
        or constraints.get("destination_hint")
        or "French Riviera"
    )
    duration_days = constraints.get("duration_days") or 4
    month = constraints.get("month")
    budget = constraints.get("budget")

    archetype = client_profile.get("archetype") or emotional_reading.detected_archetype or "The Explorer"

    # Pull signature experiences
    signature_experiences = await neo4j_client.find_experiences_for_archetype(
        archetype=archetype,
        destination=destination,
        min_fit_score=0.75
    )
    if not signature_experiences:
        signature_experiences = await neo4j_client.find_experiences_by_emotions(
            desired_emotions=["Prestige", "Indulgence", "Romance"],
            destination=destination,
            min_exclusivity=0.7
        )

    selected_choices = {
        "destination": destination,
        "time": month,
        "budget": budget.get("amount") if isinstance(budget, dict) else budget,
        "duration": duration_days,
    }

    # Compose a base script (used for title/hook + experience list)
    experience_script = await get_script_composer().compose_experience_script(
        client_profile=client_profile,
        emotional_reading=emotional_reading,
        anticipated_desires=[],
        selected_choices=selected_choices,
        signature_experiences=signature_experiences
    )

    # Stage 0: Emotional profile (from intake)
    primary_emotion_goal = intake.get("primary_emotion_goal") or "a feeling you can’t quite name yet"
    social = intake.get("social_appetite") or "balanced"
    meaning = intake.get("meaning_anchor") or "meaning"
    red_lines = intake.get("red_lines") or []
    energy = intake.get("energy_rhythm") or {}
    signals = (intake.get("_signals") or {})

    stage0 = (
        "STAGE 0 — Emotional Profile\n"
        f"Identity archetype (working): {archetype}\n"
        f"Primary emotion goal: {primary_emotion_goal}\n"
        f"Social appetite: {social}\n"
        f"Energy rhythm: {energy.get('raw') if isinstance(energy, dict) else energy}\n"
        f"Meaning anchor: {meaning}\n"
        f"Red lines: {', '.join(red_lines) if isinstance(red_lines, list) else red_lines}\n"
        f"Signals noticed: short answers={bool(signals.get('is_short_answer'))}, urgency={bool(signals.get('has_urgency'))}\n"
        "\n"
    )

    # Stage 1: Concept Script 1.0
    highlights = []
    for exp in (experience_script.signature_experiences or [])[:8]:
        name = exp.get("name") or exp.get("title") or "Signature moment"
        feeling = exp.get("emotional_promise") or "a clean, quiet kind of luxury"
        verify = exp.get("verification_needed") or "Verify availability, privacy, and timing."
        highlights.append(f"- {name}: {feeling}. ({verify})")

    if not highlights:
        highlights = [
            f"- A discreet arrival that makes you exhale: private transfer, no friction. (Verify best routing.)",
            f"- One “money-can’t-buy” access moment: behind-the-scenes or after-hours. (Verify access.)",
            f"- A signature sunset scene designed for your primary feeling. (Verify weather + location.)",
            f"- A culinary peak chosen for atmosphere, not just ratings. (Verify chef/table.)",
            f"- A final-night closing ritual that locks in the memory. (Verify setting.)",
        ]

    stage1 = (
        "STAGE 1 — Concept Script 1.0\n"
        f"Theme Title: {experience_script.title}\n"
        f"One-line Hook: {experience_script.cinematic_hook}\n"
        f"Emotional Description: This is a {destination} story built around {primary_emotion_goal} — with pacing that protects your energy and a finale that lands.\n"
        "Signature Highlights:\n"
        + "\n".join(highlights[: (8 if duration_days >= 5 else 5)])
        + "\n\n"
    )

    # Stage 2: Day-by-day flow (cap long trips to a “pattern” to keep chat readable)
    days_to_render = min(int(duration_days) if isinstance(duration_days, int) else 4, 7)
    stage2_lines = ["STAGE 2 — Day-by-Day Flow 2.0"]
    for d in range(1, days_to_render + 1):
        stage2_lines.append(
            f"Day {d}: Purpose — deepen {primary_emotion_goal}\n"
            "Morning: Slow start, protected privacy.\n"
            "Afternoon: A curated peak moment (designed, not crowded).\n"
            "Evening: Elegant atmosphere; one sensory anchor.\n"
            "Micro-surprise: A small detail that feels like it was waiting for you.\n"
            "Sensory cue: Scent / sound / texture to lock the memory.\n"
            "Plan B: A beautiful indoor alternative with the same feeling.\n"
            "Concierge notes: Verify timing, access, privacy, and weather.\n"
        )

    if isinstance(duration_days, int) and duration_days > days_to_render:
        stage2_lines.append(
            f"(For {duration_days} days total: the remaining days follow the same rhythm, with 2–3 major peaks spaced for recovery.)"
        )
    stage2 = "\n".join(stage2_lines) + "\n\n"

    # Stage 3: Storyline & emotional journey
    stage3 = (
        "STAGE 3 — Storyline & Emotional Journey 3.0\n"
        f"BEFORE: A pre-trip message that gives you permission to slow down — and sets one symbol for {primary_emotion_goal}.\n"
        "DURING: Opening scene → rising action → named peak moments → integration → finale designed as a clean ending.\n"
        "AFTER: A memory artifact package (photos, notes, a small physical cue) + a future trigger to bring the feeling back.\n\n"
    )

    # Stage 4: Onboard concierge playbook
    stage4 = (
        "STAGE 4 — Onboard Concierge Playbook 4.0\n"
        "Client in one minute: High standards, wants emotional precision, not generic luxury.\n"
        "Language guide: Use calm certainty. Offer 2–3 options, never overwhelm.\n"
        "Thought of the day: Protect energy first; peaks only when they matter.\n"
        "Staging: Quiet excellence, discreet timing, no visible friction.\n"
        "Surprise protocol: Small, personal, and plausible — always verifiable.\n"
        "Recovery protocol: If energy dips, simplify instantly and restore comfort.\n"
        "Endgame: A finale that feels inevitable — the story closes cleanly.\n"
    )

    script_text = stage0 + stage1 + stage2 + stage3 + stage4

    rag_payload = {
        "version": "rag_payload_v1",
        "account_id": account.get("id"),
        "session_hint": None,
        "client_profile": {
            "name": account.get("name"),
            "email": account.get("email"),
            "archetype": archetype,
        },
        "emotion_model": {
            "primary_emotion_goal": primary_emotion_goal,
            "secondary_emotion_goal": None,
            "social_appetite": social,
            "energy_rhythm": energy,
            "meaning_anchor": meaning,
            "red_lines": red_lines,
            "signals": signals,
        },
        "constraints": {
            "destination": destination,
            "month": month,
            "duration_days": duration_days,
            "budget": budget,
            "raw": constraints.get("raw"),
        },
        "script": {
            "title": experience_script.title,
            "cinematic_hook": experience_script.cinematic_hook,
            "stages_included": ["0", "1", "2", "3", "4"],
            "duration_days_rendered": days_to_render,
        },
        "retrieval_keys": {
            "destination": destination,
            "archetype": archetype,
            "primary_state": emotional_reading.primary_state.value,
            "keywords": [primary_emotion_goal, meaning, social],
        },
        "quality_checks": {
            "no_availability_claims": True,
            "verification_needed": True,
            "max_intake_questions": 6,
        },
    }

    return script_text, rag_payload

async def _determine_conversation_stage(
    conversation_history: List[Dict],
    message: str
) -> str:
    """Determine current conversation stage based on conversation depth and content."""
    message_lower = message.lower()
    turn_count = len([m for m in conversation_history if m.get("role") == "user"])
    
    # Stage progression logic
    if turn_count <= 1:
        return "opening"  # First user message = opening
    elif turn_count == 2:
        return "deepening"  # Second turn = deepen understanding
    elif turn_count == 3:
        return "discovery"  # Third turn = discover specifics
    elif any(word in message_lower for word in ["yes", "sounds good", "perfect", "let's do it", "that's right"]):
        return "recommendation"
    elif any(word in message_lower for word in ["change", "different", "instead", "prefer", "actually"]):
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
    client_profile: Dict,
    conversation_history: List[Dict] = None
) -> str:
    """Build core response content with gentle, empathetic listening."""
    message_lower = message.lower()
    
    # Opening stage - acknowledge their answer gently and dig deeper
    if conversation_stage == "opening":
        # They've answered the initial question, respond to what they said
        if "peace" in message_lower or "relax" in message_lower or "calm" in message_lower:
            return (
                "Peace and serenity... I hear that. Sometimes we all need that deep exhale, don't we? "
                "When you think of 'peace of mind,' what does it look like for you? "
                "Maybe it's absolute silence under the stars, or perhaps the gentle rhythm of waves on a shore, "
                "or even the soft sounds of nature around you. What calls to you?"
            )
        elif "connect" in message_lower or "partner" in message_lower or "love" in message_lower:
            return (
                "Connection with your partner... that's beautiful. The moments that bring us closest to someone we love "
                "are so precious. I'm curious—what kind of moments make you two feel most connected? "
                "Is it quiet intimacy over a private dinner, or maybe shared adventure and discovery together? "
                "Tell me what 'together' feels like at its best for you both."
            )
        elif "proud" in message_lower or "achiev" in message_lower or "special" in message_lower:
            return (
                "You want to feel genuinely proud of this achievement—I love that. "
                "This isn't just about *doing* something; it's about creating a moment that lives in your memory forever. "
                "What would make this truly extraordinary for you? Is it a pinnacle moment—like reaching a summit, "
                "or maybe something more intimate, like a private celebration in a place that takes your breath away? "
                "What's the feeling you want to carry with you afterward?"
            )
        elif "free" in message_lower or "spontaneous" in message_lower:
            return (
                "Freedom and spontaneity... yes, I sense you're craving escape from the usual structure. "
                "Sometimes we need to just *be*, without schedules or expectations. "
                "Tell me—what constraints are you hoping to leave behind, even if just for a while? "
                "And when you imagine yourself completely free, what are you doing? Are you wandering, "
                "exploring, or maybe just sitting somewhere stunning without a care in the world?"
            )
        elif "present" in message_lower or "apologize" in message_lower or "missing" in message_lower or "fomo" in message_lower:
            return (
                "Being fully present, without that nagging fear of missing out or the weight of apologies... "
                "that's profound. It sounds like you're seeking permission to just *be* in the moment, guilt-free. "
                "I'm imagining you somewhere where time slows down, where there's nothing pulling at your attention. "
                "What kind of environment makes you feel most at ease? Is it the openness of the sea, "
                "the intimacy of a hidden villa, or perhaps something entirely different?"
            )
        else:
            # Generic but gentle response
            return (
                f"I hear what you're seeking. Let me understand you better. "
                f"When you imagine closing your eyes at the very end of this experience—after everything—"
                f"what specific feeling do you want to have? Maybe it's contentment, maybe joy, "
                f"maybe something deeper. There's no wrong answer—just what's true for you."
            )
    
    # Deepening stage - acknowledge their answer and ask about specifics
    elif conversation_stage == "deepening":
        # Extract what they mentioned from their message
        location_mentioned = None
        if "monaco" in message_lower:
            location_mentioned = "Monaco"
        elif "france" in message_lower or "french" in message_lower or "riviera" in message_lower:
            location_mentioned = "the French Riviera"
        elif "italy" in message_lower or "italian" in message_lower or "amalfi" in message_lower:
            location_mentioned = "the Amalfi Coast"
        
        # Check if they mentioned specifics or kept it vague
        if "same" in message_lower or "similar" in message_lower or "like that" in message_lower:
            # They're confirming what was already said
            if location_mentioned:
                return (
                    f"Wonderful. So you're drawn to {location_mentioned}—that makes perfect sense for what you're seeking. "
                    f"Now, tell me about timing. When are you imagining this experience? "
                    f"Is it soon, within the next few months, or are you dreaming a bit further ahead?"
                )
            else:
                return (
                    f"I understand. So we're looking for that same feeling—sustained and deep. "
                    f"Let me ask you this: when you picture yourself in that state, where are you? "
                    f"Are you by the ocean, in the mountains, or perhaps in an intimate city setting?"
                )
        elif location_mentioned:
            return (
                f"Ah, {location_mentioned}—excellent choice. There's something truly special about that area. "
                f"And you want to feel that sense of {_extract_emotion_from_history(conversation_history)} there. "
                f"Tell me, are you imagining yourself staying in one beautiful place, "
                f"or would you prefer to explore and move between a few carefully chosen spots?"
            )
        else:
            # They gave more emotional detail
            return (
                f"I'm really hearing you now. {_acknowledge_emotion(message_lower)} "
                f"So we're creating an experience where you can truly {_extract_main_desire(message_lower)}. "
                f"Last question for now: who's joining you on this journey? "
                f"Is this for you alone, with your partner, or perhaps a small group of close friends or family?"
            )
    
    # Discovery stage - build on what they've shared
    elif conversation_stage == "discovery":
        if anticipated_desires:
            desire = anticipated_desires[0]
            return (
                f"I think I'm getting the full picture now. Based on everything you've told me, "
                f"I'm sensing that {desire.emotional_fulfillment}. "
                f"Before I show you what I have in mind, let me confirm one thing: {_generate_discovery_question(desire, emotional_reading)}"
            )
        else:
            return (
                "I'm building a clear picture of what matters to you. "
                "One more thing—what emotions do you want to feel during this experience? "
                "For example, do you want to feel adventurous and alive, peaceful and restored, "
                "or maybe deeply connected to the world around you?"
            )
    
    # Recommendation stage
    elif conversation_stage == "recommendation":
        if proactive_suggestions:
            return (
                f"Perfect. I believe I have exactly what you're looking for. "
                f"Based on everything you've shared—your desire for {_extract_main_emotion_from_history(conversation_history)}, "
                f"the setting you've described, and the feeling you want to carry with you—"
                f"here's what I'm seeing for you: {_format_suggestions(proactive_suggestions)}"
            )
        else:
            return (
                "I have it now. Give me just a moment—"
                "I'm curating something that I believe will resonate deeply with everything you've told me."
            )
    
    # Default
    else:
        return (
            "I'm listening. Tell me more about what you're seeking, and I'll help you find it."
        )


def _extract_emotion_from_history(conversation_history: List[Dict]) -> str:
    """Extract the main emotion mentioned in the conversation."""
    if not conversation_history:
        return "peace"
    
    first_user_msg = next((m["content"].lower() for m in conversation_history if m["role"] == "user"), "")
    if "peace" in first_user_msg or "relax" in first_user_msg:
        return "peace and serenity"
    elif "connect" in first_user_msg or "partner" in first_user_msg:
        return "deep connection"
    elif "proud" in first_user_msg or "achiev" in first_user_msg:
        return "pride and accomplishment"
    elif "free" in first_user_msg or "spontaneous" in first_user_msg:
        return "freedom and spontaneity"
    else:
        return "tranquility"


def _acknowledge_emotion(message: str) -> str:
    """Acknowledge the emotion in their message."""
    if "present" in message or "moment" in message:
        return "Being fully present is such a gift to yourself."
    elif "relax" in message or "calm" in message:
        return "That deep relaxation you're craving—I understand completely."
    elif "escape" in message or "away" in message:
        return "Sometimes we need to step away from it all."
    else:
        return "I hear the longing in what you're describing."


def _extract_main_desire(message: str) -> str:
    """Extract what they want to do/feel."""
    if "relax" in message:
        return "let go and truly relax"
    elif "present" in message or "be" in message:
        return "be fully present"
    elif "connect" in message:
        return "connect deeply"
    elif "explore" in message or "discover" in message:
        return "explore and discover"
    else:
        return "experience something meaningful"


def _extract_main_emotion_from_history(conversation_history: List[Dict]) -> str:
    """Get a summary of what they're seeking from the full conversation."""
    if not conversation_history:
        return "peace and connection"
    
    all_text = " ".join([m["content"].lower() for m in conversation_history if m["role"] == "user"])
    
    emotions = []
    if "peace" in all_text or "relax" in all_text or "calm" in all_text:
        emotions.append("peace")
    if "present" in all_text or "moment" in all_text:
        emotions.append("presence")
    if "connect" in all_text:
        emotions.append("connection")
    if "free" in all_text or "spontaneous" in all_text:
        emotions.append("freedom")
    
    if len(emotions) >= 2:
        return f"{emotions[0]} and {emotions[1]}"
    elif emotions:
        return emotions[0]
    else:
        return "tranquility and meaning"


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
        "intake": 0.25,
        "discovery": 0.4,
        "recommendation": 0.7,
        "refinement": 0.85,
        "closing": 0.95,
        "script_ready": 1.0,
        "composition_complete": 1.0
    }
    
    base_progress = stage_progress.get(current_stage, 0.5)
    
    # Adjust based on conversation depth
    user_messages = len([m for m in conversation_history if m.get("role") == "user"])
    depth_bonus = min(0.1, user_messages * 0.01)
    
    return min(1.0, base_progress + depth_bonus)

