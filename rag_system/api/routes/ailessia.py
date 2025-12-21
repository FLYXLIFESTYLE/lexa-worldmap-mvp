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
from core.ailessia.emotional_profile_builder import (
    build_profile_snapshot,
    merge_account_json,
    upsert_emotional_profile_key_moment,
    apply_micro_feedback_to_communication_preferences,
    upsert_micro_feedback_key_moment,
)
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
    role: str = Field(..., description="Message role: user or lexa")
    content: str = Field(..., description="Message content")
    timestamp: Optional[datetime] = None


class ConverseRequest(BaseModel):
    """Request to converse with LEXA."""
    account_id: str = Field(..., description="Client account ID")
    session_id: str = Field(..., description="Conversation session ID")
    message: str = Field(..., description="User message")
    conversation_history: Optional[List[ConversationMessage]] = Field(default_factory=list)


class ConverseResponse(BaseModel):
    """LEXA's response."""
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
    feedback_type: str = Field(..., description="script_quality, lexa_interaction, etc.")
    rating: int = Field(..., ge=1, le=5)
    feedback_text: Optional[str] = None
    script_id: Optional[str] = None
    session_id: Optional[str] = None
    emotional_resonance_rating: Optional[int] = Field(None, ge=1, le=5)
    personalization_rating: Optional[int] = Field(None, ge=1, le=5)
    value_rating: Optional[int] = Field(None, ge=1, le=5)


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
# UNSTRUCTURED INTAKE (MVP)
# ============================================================================

class UnstructuredUploadRequest(BaseModel):
    """Upload raw unstructured text for later extraction and RAG usage."""
    account_id: Optional[str] = Field(None, description="Client account ID (optional)")
    session_id: Optional[str] = Field(None, description="Conversation session ID (optional)")
    source_type: str = Field(default="text", description="text|zoom_transcript|menu|itinerary|email|note|other")
    source_name: Optional[str] = None
    title: Optional[str] = None
    text: str = Field(..., min_length=1, description="Raw text content")
    metadata: Optional[Dict] = None


class UnstructuredUploadResponse(BaseModel):
    document_id: str
    extracted: Dict
    message: str


@router.post("/intake/upload-text", response_model=UnstructuredUploadResponse)
async def upload_unstructured_text(request: UnstructuredUploadRequest):
    """
    Store raw unstructured text in Supabase for later use.

    MVP extraction:
    - Reuse ContextExtractor heuristics to pull budget/month/duration/destination hints.
    """
    try:
        # Lightweight extraction (heuristics)
        extractor = get_or_create_context_extractor()
        extraction = await extractor.extract(
            message=request.text,
            conversation_history=[],
            intake_state={},
            last_question_key=None
        )

        extracted = extraction.extracted or {}

        doc = {
            "client_id": request.account_id,
            "session_id": request.session_id,
            "source_type": request.source_type or "text",
            "source_name": request.source_name,
            "title": request.title,
            "raw_text": request.text,
            "extracted": extracted,
            "metadata": request.metadata or {},
        }

        result = get_account_manager().supabase.table("unstructured_documents").insert(doc).execute()
        if not result.data:
            raise Exception("Insert returned no data")

        return UnstructuredUploadResponse(
            document_id=result.data[0]["id"],
            extracted=extracted,
            message="Saved. LEXA will use this as background context for future scripts."
        )

    except Exception as e:
        logger.error("Unstructured upload failed", error=str(e))
        raise HTTPException(status_code=500, detail=f"Unstructured upload failed: {str(e)}")


@router.get("/intake/documents/{account_id}")
async def list_unstructured_documents(account_id: str, limit: int = 20):
    """List recent unstructured documents uploaded for an account."""
    try:
        limit = max(1, min(int(limit), 50))
        result = (
            get_account_manager()
            .supabase.table("unstructured_documents")
            .select("id,source_type,source_name,title,created_at,extracted,metadata")
            .eq("client_id", account_id)
            .order("created_at", desc=True)
            .limit(limit)
            .execute()
        )
        return {"documents": result.data or []}
    except Exception as e:
        logger.error("List unstructured documents failed", error=str(e), account_id=account_id)
        raise HTTPException(status_code=500, detail=f"List documents failed: {str(e)}")

# ============================================================================
# ENDPOINTS
# ============================================================================

@router.post("/account/create", response_model=AccountResponse)
async def create_account(request: AccountCreateRequest):
    """
    Create a new client account and start LEXA conversation.
    
    This automatically creates the Personal Script Space and initiates
    LEXA's relationship with the client.
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
            ok = await client_sync_module.client_sync_service.sync_client_to_neo4j(account["id"])
            if ok:
                logger.info("Client synced to Neo4j for marketing tracking", account_id=account["id"])
            else:
                logger.warning("Client sync to Neo4j failed (non-fatal)", account_id=account["id"])
        
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
        signals = extraction.signals or {}

        # If the user is answering the last asked intake question, store the raw answer.
        if last_q_key:
            intake_state = _capture_last_question_answer(
                intake_state=intake_state,
                last_question_key=last_q_key,
                answer_text=request.message
            )

        # 1c. Build & persist a stable emotional profile snapshot (MVP memory)
        profile_snapshot = build_profile_snapshot(
            account_id=request.account_id,
            session_id=request.session_id,
            emotional_reading=emotional_reading,
            intake_state=intake_state,
            extracted=extracted,
            signals=signals,
        )

        # Merge small stable signals into Supabase client_accounts JSONB blobs
        merged_comm_prefs, merged_buying_patterns = merge_account_json(
            existing_communication_preferences=account.get("communication_preferences") or {},
            existing_buying_patterns=account.get("buying_patterns") or {},
            snapshot=profile_snapshot,
        )

        # Persist to Supabase (safe: does not touch emotional_profile resonance map)
        try:
            await get_account_manager().update_account_profile(
                account_id=request.account_id,
                communication_preferences=merged_comm_prefs,
                buying_patterns=merged_buying_patterns,
            )
        except Exception as _e:
            # Non-fatal: we can still answer even if memory persistence fails.
            logger.warning("Profile persistence to Supabase failed", error=str(_e), account_id=request.account_id)

        # Optional: project durable signals into Neo4j properties for graph queries
        if client_sync_module.client_sync_service:
            try:
                await client_sync_module.client_sync_service.sync_profile_signals(
                    account_id=request.account_id,
                    profile_snapshot=profile_snapshot
                )
            except Exception as _e:
                logger.warning("Profile signal projection to Neo4j failed", error=str(_e), account_id=request.account_id)
        
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
            key_moments = upsert_emotional_profile_key_moment(
                key_moments=key_moments,
                snapshot=profile_snapshot
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
        # If we learned a preferred tone earlier, respect it unless the current emotional reading
        # suggests a stronger need (e.g., high vulnerability).
        preferred_tone = None
        comm = account.get("communication_preferences") or {}
        if isinstance(comm, dict) and isinstance(comm.get("lexa"), dict):
            preferred_tone = comm["lexa"].get("preferred_tone")

        tone_name = personality_mirror.select_tone(
            emotional_reading=emotional_reading,
            conversation_stage=current_stage,
            client_archetype=emotional_reading.detected_archetype
        )
        if preferred_tone and tone_name in (None, "", "sophisticated_friend"):
            tone_name = preferred_tone
        
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

            # Persist artifacts for later reuse (optional; requires migration 005)
            try:
                if rag_payload:
                    get_account_manager().supabase.table("conversation_artifacts").insert({
                        "client_id": request.account_id,
                        "session_id": request.session_id,
                        "artifact_type": "rag_payload",
                        "payload": rag_payload
                    }).execute()
                get_account_manager().supabase.table("conversation_artifacts").insert({
                    "client_id": request.account_id,
                    "session_id": request.session_id,
                    "artifact_type": "wow_script",
                    "payload": {"text": response_content}
                }).execute()
                if extracted:
                    get_account_manager().supabase.table("conversation_artifacts").insert({
                        "client_id": request.account_id,
                        "session_id": request.session_id,
                        "artifact_type": "context_extraction",
                        "payload": extracted
                    }).execute()
            except Exception as _e:
                logger.warning("Artifact persistence failed (migration may not be applied yet)", error=str(_e))

            # Always include a tiny micro-feedback prompt after delivering the script.
            proactive_suggestions = proactive_suggestions or []
            proactive_suggestions.append({
                "type": "micro_feedback_prompt",
                "title": "One-minute refinement",
                "description": "Rate this script (1–5) so I can refine it: emotional resonance, personalization, and value. Add one sentence on what to dial up/down.",
                "endpoint": "/api/lexa/feedback",
                "payload_example": {
                    "feedback_type": "general",
                    "rating": 5,
                    "emotional_resonance_rating": 5,
                    "personalization_rating": 5,
                    "value_rating": 5,
                    "feedback_text": "Dial up: romance. Dial down: nightlife."
                }
            })
        
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
            key_moments=upsert_emotional_profile_key_moment(
                key_moments=_upsert_intake_state_key_moment(
                    key_moments=key_moments,
                    intake_state=intake_state,
                    last_question_key=last_q_key,
                    extracted=extracted
                ),
                snapshot=profile_snapshot
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
    Submit client feedback for LEXA's learning loop.
    """
    try:
        allowed_feedback_types = {"script_quality", "ailessia_interaction", "experience_outcome", "general"}
        feedback_type_db = request.feedback_type if request.feedback_type in allowed_feedback_types else "general"

        feedback = await get_account_manager().save_client_feedback(
            account_id=request.account_id,
            feedback_type=feedback_type_db,
            rating=request.rating,
            feedback_text=request.feedback_text,
            script_id=request.script_id,
            session_id=request.session_id,
            emotional_resonance_rating=request.emotional_resonance_rating,
            personalization_rating=request.personalization_rating,
            value_rating=request.value_rating
        )

        # If this is micro-feedback, also update the account's comm prefs and session key_moments.
        is_micro_feedback = (
            request.feedback_type == "micro_feedback"
            or request.emotional_resonance_rating is not None
            or request.personalization_rating is not None
            or request.value_rating is not None
        )
        if is_micro_feedback:
            try:
                account = await get_account_manager().get_account(request.account_id)
                comm = apply_micro_feedback_to_communication_preferences(
                    existing_communication_preferences=account.get("communication_preferences") if account else {},
                    feedback_text=request.feedback_text,
                    emotional_resonance_rating=request.emotional_resonance_rating,
                    personalization_rating=request.personalization_rating,
                    value_rating=request.value_rating,
                )
                await get_account_manager().update_account_profile(
                    account_id=request.account_id,
                    communication_preferences=comm
                )
            except Exception as _e:
                logger.warning("Failed to apply micro-feedback to account profile", error=str(_e), account_id=request.account_id)

            if request.session_id:
                try:
                    session_result = (
                        get_account_manager()
                        .supabase.table("conversation_sessions")
                        .select("id,key_moments")
                        .eq("id", request.session_id)
                        .execute()
                    )
                    if session_result.data:
                        session = session_result.data[0]
                        key_moments = session.get("key_moments") or []
                        key_moments = upsert_micro_feedback_key_moment(
                            key_moments=key_moments,
                            feedback={
                                "feedback_id": feedback.get("id"),
                                "rating": request.rating,
                                "emotional_resonance_rating": request.emotional_resonance_rating,
                                "personalization_rating": request.personalization_rating,
                                "value_rating": request.value_rating,
                                "feedback_text": request.feedback_text,
                            }
                        )
                        await get_account_manager().update_conversation_session(
                            session_id=request.session_id,
                            key_moments=key_moments
                        )
                except Exception as _e:
                    logger.warning("Failed to persist micro-feedback key moment", error=str(_e), session_id=request.session_id)
        
        logger.info("Feedback received",
                   feedback_id=feedback["id"],
                   rating=request.rating)
        
        return {
            "feedback_id": feedback["id"],
            "message": "Thank you for your feedback. LEXA learns from every interaction."
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


@router.get("/admin/neo4j/quality-report")
async def neo4j_quality_report(destination: str = "French Riviera", limit: int = 15):
    """
    Lightweight Neo4j data quality report for POIs.

    Beginner-friendly purpose:
    - Shows which destinations have enough data to demo (counts + coverage)
    - Shows what's missing for a chosen destination (so we can fix/enrich next)
    """
    try:
        limit = max(1, min(int(limit), 50))

        # 1) Destination overview
        destinations = await neo4j_client.execute_query(
            """
            MATCH (poi:poi)
            WHERE poi.destination_name IS NOT NULL
            RETURN poi.destination_name AS destination,
                   count(poi) AS total_pois,
                   sum(CASE WHEN poi.luxury_score >= 0.5 THEN 1 ELSE 0 END) AS luxury_pois,
                   sum(CASE WHEN poi.google_place_id IS NOT NULL THEN 1 ELSE 0 END) AS google_enriched,
                   sum(CASE WHEN poi.google_rating IS NOT NULL THEN 1 ELSE 0 END) AS with_ratings
            ORDER BY luxury_pois DESC
            LIMIT $limit
            """,
            {"limit": limit},
        )

        # 2) Missing/coverage metrics for a specific destination
        coverage = await neo4j_client.execute_query(
            """
            MATCH (poi:poi)
            WHERE poi.destination_name = $destination
            WITH count(poi) AS total,
                 sum(CASE WHEN poi.luxury_score >= 0.5 THEN 1 ELSE 0 END) AS luxury_pois,
                 sum(CASE WHEN poi.google_place_id IS NULL THEN 1 ELSE 0 END) AS missing_google_place_id,
                 sum(CASE WHEN poi.google_rating IS NULL THEN 1 ELSE 0 END) AS missing_google_rating,
                 sum(CASE WHEN poi.personality_romantic IS NULL THEN 1 ELSE 0 END) AS missing_personality_scores
            RETURN total,
                   luxury_pois,
                   missing_google_place_id,
                   missing_google_rating,
                   missing_personality_scores
            """,
            {"destination": destination},
        )

        # 3) Link coverage: activities/emotions/archetypes
        link_coverage = await neo4j_client.execute_query(
            """
            MATCH (poi:poi)
            WHERE poi.destination_name = $destination
            OPTIONAL MATCH (poi)-[:OFFERS]->(a:activity_type)
            OPTIONAL MATCH (a)-[:EVOKES]->(e:EmotionalTag)
            OPTIONAL MATCH (a)-[:APPEALS_TO]->(ca:ClientArchetype)
            WITH poi,
                 count(DISTINCT a) AS activity_links,
                 count(DISTINCT e) AS emotion_links,
                 count(DISTINCT ca) AS archetype_links
            RETURN
              count(poi) AS pois_checked,
              sum(CASE WHEN activity_links = 0 THEN 1 ELSE 0 END) AS pois_missing_activity_links,
              sum(CASE WHEN emotion_links = 0 THEN 1 ELSE 0 END) AS pois_missing_emotion_links,
              sum(CASE WHEN archetype_links = 0 THEN 1 ELSE 0 END) AS pois_missing_archetype_links
            """,
            {"destination": destination},
        )

        # 4) Simple duplicate-name scan (often indicates ingestion issues)
        duplicates = await neo4j_client.execute_query(
            """
            MATCH (poi:poi)
            WHERE poi.destination_name = $destination AND poi.name IS NOT NULL
            WITH toLower(trim(poi.name)) AS norm_name, count(*) AS c
            WHERE c > 1
            RETURN norm_name AS name, c AS count
            ORDER BY c DESC, name ASC
            LIMIT 50
            """,
            {"destination": destination},
        )

        return {
            "destination_overview": destinations or [],
            "destination": destination,
            "coverage": (coverage[0] if coverage else {}),
            "link_coverage": (link_coverage[0] if link_coverage else {}),
            "duplicate_names": duplicates or [],
        }

    except Exception as e:
        logger.error("Neo4j quality report failed", error=str(e), destination=destination)
        raise HTTPException(status_code=500, detail=f"Neo4j quality report failed: {str(e)}")


@router.post("/admin/neo4j/fix-archetype-links")
async def neo4j_fix_archetype_links(
    destination: Optional[str] = None,
    min_luxury_score: float = 0.5,
    min_fit: float = 0.65,
    max_links_per_activity: int = 2,
):
    """
    Auto-create missing (activity_type)-[:APPEALS_TO]->(ClientArchetype) links.

    Why this matters:
    Many POIs have activities, but those activities don't connect to archetypes,
    which breaks the chain: POI -> activity -> archetype.

    Strategy (deterministic):
    - For each activity_type with zero APPEALS_TO links:
      compute average POI personality_* scores of POIs offering that activity
      (optionally filtered to one destination and luxury_score >= min_luxury_score)
    - Link the activity to the top archetypes above min_fit.
    - If still none, link a safe default (Achiever + Hedonist) so the chain isn't broken.
    """
    try:
        # Treat empty string as "all destinations"
        if isinstance(destination, str) and destination.strip() == "":
            destination = None

        # Clamp inputs (safety)
        min_luxury_score = float(max(0.0, min(min_luxury_score, 1.0)))
        min_fit = float(max(0.0, min(min_fit, 1.0)))
        max_links_per_activity = int(max(1, min(max_links_per_activity, 4)))

        dest_filter = ""
        params: Dict = {
            "min_luxury_score": min_luxury_score,
            "min_fit": min_fit,
            "max_links": max_links_per_activity,
        }
        if destination:
            dest_filter = "AND poi.destination_name = $destination"
            params["destination"] = destination

        # 0) Ensure the 6 archetype nodes exist
        await neo4j_client.execute_query(
            """
            UNWIND [
              'The Romantic',
              'The Connoisseur',
              'The Hedonist',
              'The Contemplative',
              'The Achiever',
              'The Adventurer'
            ] AS name
            MERGE (:ClientArchetype {name: name})
            """,
            {},
        )

        # 1) How many activity types are currently missing APPEALS_TO?
        missing_before = await neo4j_client.execute_query(
            """
            MATCH (a:activity_type)
            OPTIONAL MATCH (a)-[:APPEALS_TO]->(ca:ClientArchetype)
            WITH a, count(ca) AS c
            WHERE c = 0
            RETURN count(a) AS missing
            """,
            {},
        )

        # 2) Main fill: infer archetypes from POI personality score averages
        created_rows = await neo4j_client.execute_query(
            f"""
            MATCH (a:activity_type)
            OPTIONAL MATCH (a)-[:APPEALS_TO]->(ca0:ClientArchetype)
            WITH a, count(ca0) AS c
            WHERE c = 0

            MATCH (poi:poi)-[:OFFERS]->(a)
            WHERE poi.luxury_score >= $min_luxury_score
              {dest_filter}

            WITH a,
                 avg(poi.personality_romantic) AS romantic,
                 avg(poi.personality_connoisseur) AS connoisseur,
                 avg(poi.personality_hedonist) AS hedonist,
                 avg(poi.personality_contemplative) AS contemplative,
                 avg(poi.personality_achiever) AS achiever,
                 avg(poi.personality_adventurer) AS adventurer

            WITH a, [
              {{name:'The Romantic', score: romantic}},
              {{name:'The Connoisseur', score: connoisseur}},
              {{name:'The Hedonist', score: hedonist}},
              {{name:'The Contemplative', score: contemplative}},
              {{name:'The Achiever', score: achiever}},
              {{name:'The Adventurer', score: adventurer}}
            ] AS scores

            UNWIND scores AS s
            WITH a, s
            WHERE s.score IS NOT NULL AND s.score >= $min_fit
            ORDER BY a.name, s.score DESC

            WITH a, collect(s) AS ranked
            WITH a, ranked[0..$max_links] AS top
            UNWIND top AS t
            MATCH (ca:ClientArchetype {{name: t.name}})
            MERGE (a)-[r:APPEALS_TO]->(ca)
            ON CREATE SET
              r.fit_score = t.score,
              r.discovered_through = 'poi_personality_averages',
              r.updated_at = datetime()
            RETURN count(r) AS links_created
            """,
            params,
        )

        links_created = int((created_rows[0].get("links_created") if created_rows else 0) or 0)

        # 3) Fallback: any remaining activity types get a safe default link
        await neo4j_client.execute_query(
            """
            MATCH (a:activity_type)
            OPTIONAL MATCH (a)-[:APPEALS_TO]->(ca0:ClientArchetype)
            WITH a, count(ca0) AS c
            WHERE c = 0
            MATCH (ca:ClientArchetype)
            WHERE ca.name IN ['The Achiever', 'The Hedonist']
            MERGE (a)-[r:APPEALS_TO]->(ca)
            ON CREATE SET r.fit_score = 0.60, r.discovered_through = 'fallback_default', r.updated_at = datetime()
            RETURN count(r) AS fallback_links_created
            """,
            {},
        )

        missing_after = await neo4j_client.execute_query(
            """
            MATCH (a:activity_type)
            OPTIONAL MATCH (a)-[:APPEALS_TO]->(ca:ClientArchetype)
            WITH a, count(ca) AS c
            WHERE c = 0
            RETURN count(a) AS missing
            """,
            {},
        )

        return {
            "destination": destination,
            "min_luxury_score": min_luxury_score,
            "min_fit": min_fit,
            "max_links_per_activity": max_links_per_activity,
            "missing_activities_before": int((missing_before[0].get("missing") if missing_before else 0) or 0),
            "links_created": links_created,
            "missing_activities_after": int((missing_after[0].get("missing") if missing_after else 0) or 0),
            "next": "Call /api/lexa/admin/neo4j/quality-report again to see POI chain coverage improve.",
        }

    except Exception as e:
        logger.error("Neo4j fix-archetype-links failed", error=str(e), destination=destination)
        raise HTTPException(status_code=500, detail=f"Neo4j fix-archetype-links failed: {str(e)}")


@router.post("/admin/neo4j/fix-emotion-links")
async def neo4j_fix_emotion_links(
    destination: Optional[str] = None,
    min_luxury_score: float = 0.5,
    min_fit: float = 0.65,
    max_links_per_activity: int = 2,
):
    """
    Auto-create missing (activity_type)-[:EVOKES]->(EmotionalTag) links.

    This fixes the chain: POI -> activity -> emotion (which powers emotion-driven discovery).

    Strategy (deterministic):
    - For each activity_type with zero EVOKES links:
      compute average POI personality_* scores of POIs offering that activity
      (optional destination filter, luxury_score >= min_luxury_score)
    - Map those personality averages into a ranked list of emotions.
    - Link the activity to the top emotions above min_fit (up to max_links_per_activity).
    - If still none, attach a safe default emotion (Discovery).
    """
    try:
        # Treat empty string as "all destinations"
        if isinstance(destination, str) and destination.strip() == "":
            destination = None

        # Clamp inputs (safety)
        min_luxury_score = float(max(0.0, min(min_luxury_score, 1.0)))
        min_fit = float(max(0.0, min(min_fit, 1.0)))
        max_links_per_activity = int(max(1, min(max_links_per_activity, 4)))

        dest_filter = ""
        params: Dict = {
            "min_luxury_score": min_luxury_score,
            "min_fit": min_fit,
            "max_links": max_links_per_activity,
        }
        if destination:
            dest_filter = "AND poi.destination_name = $destination"
            params["destination"] = destination

        # 0) Ensure the core emotion tags exist
        await neo4j_client.execute_query(
            """
            UNWIND [
              'Romance',
              'Intimacy',
              'Prestige',
              'Indulgence',
              'Serenity',
              'Renewal',
              'Discovery',
              'Freedom',
              'Achievement',
              'Sophistication'
            ] AS name
            MERGE (:EmotionalTag {name: name})
            """,
            {},
        )

        # 1) How many activity types are currently missing EVOKES?
        missing_before = await neo4j_client.execute_query(
            """
            MATCH (a:activity_type)
            OPTIONAL MATCH (a)-[:EVOKES]->(e:EmotionalTag)
            WITH a, count(e) AS c
            WHERE c = 0
            RETURN count(a) AS missing
            """,
            {},
        )

        # 2) Main fill: infer emotions from POI personality score averages
        created_rows = await neo4j_client.execute_query(
            f"""
            MATCH (a:activity_type)
            OPTIONAL MATCH (a)-[:EVOKES]->(e0:EmotionalTag)
            WITH a, count(e0) AS c
            WHERE c = 0

            MATCH (poi:poi)-[:OFFERS]->(a)
            WHERE poi.luxury_score >= $min_luxury_score
              {dest_filter}

            WITH a,
                 avg(poi.personality_romantic) AS romantic,
                 avg(poi.personality_connoisseur) AS connoisseur,
                 avg(poi.personality_hedonist) AS hedonist,
                 avg(poi.personality_contemplative) AS contemplative,
                 avg(poi.personality_achiever) AS achiever,
                 avg(poi.personality_adventurer) AS adventurer

            // Map personality -> emotions (simple, deterministic)
            WITH a, [
              {{name:'Romance', score: romantic}},
              {{name:'Intimacy', score: romantic}},
              {{name:'Sophistication', score: connoisseur}},
              {{name:'Discovery', score: (coalesce(connoisseur,0) + coalesce(adventurer,0)) / 2.0}},
              {{name:'Indulgence', score: hedonist}},
              {{name:'Serenity', score: contemplative}},
              {{name:'Renewal', score: contemplative}},
              {{name:'Prestige', score: achiever}},
              {{name:'Achievement', score: achiever}},
              {{name:'Freedom', score: adventurer}}
            ] AS scores

            UNWIND scores AS s
            WITH a, s
            WHERE s.score IS NOT NULL AND s.score >= $min_fit
            ORDER BY a.name, s.score DESC

            WITH a, collect(s) AS ranked
            WITH a, ranked[0..$max_links] AS top
            UNWIND top AS t
            MATCH (et:EmotionalTag {{name: t.name}})
            MERGE (a)-[r:EVOKES]->(et)
            ON CREATE SET
              r.strength = t.score,
              r.discovered_through = 'poi_personality_averages',
              r.updated_at = datetime()
            MERGE (et)-[:EVOKED_BY_ACTIVITY]->(a)
            RETURN count(r) AS links_created
            """,
            params,
        )

        links_created = int((created_rows[0].get("links_created") if created_rows else 0) or 0)

        # 3) Fallback: remaining activity types get Discovery
        await neo4j_client.execute_query(
            """
            MATCH (a:activity_type)
            OPTIONAL MATCH (a)-[:EVOKES]->(e0:EmotionalTag)
            WITH a, count(e0) AS c
            WHERE c = 0
            MATCH (et:EmotionalTag {name: 'Discovery'})
            MERGE (a)-[r:EVOKES]->(et)
            ON CREATE SET r.strength = 0.55, r.discovered_through = 'fallback_default', r.updated_at = datetime()
            MERGE (et)-[:EVOKED_BY_ACTIVITY]->(a)
            RETURN count(r) AS fallback_links_created
            """,
            {},
        )

        missing_after = await neo4j_client.execute_query(
            """
            MATCH (a:activity_type)
            OPTIONAL MATCH (a)-[:EVOKES]->(e:EmotionalTag)
            WITH a, count(e) AS c
            WHERE c = 0
            RETURN count(a) AS missing
            """,
            {},
        )

        return {
            "destination": destination,
            "min_luxury_score": min_luxury_score,
            "min_fit": min_fit,
            "max_links_per_activity": max_links_per_activity,
            "missing_activities_before": int((missing_before[0].get("missing") if missing_before else 0) or 0),
            "links_created": links_created,
            "missing_activities_after": int((missing_after[0].get("missing") if missing_after else 0) or 0),
            "next": "Re-run /api/lexa/admin/neo4j/quality-report to see pois_missing_emotion_links improve.",
        }

    except Exception as e:
        logger.error("Neo4j fix-emotion-links failed", error=str(e), destination=destination)
        raise HTTPException(status_code=500, detail=f"Neo4j fix-emotion-links failed: {str(e)}")


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
        f"One question - so I can design the feeling (not just the logistics):\n"
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

