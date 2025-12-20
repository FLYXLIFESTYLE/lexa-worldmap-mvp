"""
Account Manager for AIlessia Personal Script Space.

This module manages ultra-luxury client accounts, experience scripts,
and conversation sessions in Supabase.
"""

from typing import Dict, List, Optional
from datetime import datetime
import structlog
from supabase import Client as SupabaseClient

from config.settings import settings
from core.ailessia.script_composer import ExperienceScript

logger = structlog.get_logger()


class AccountManager:
    """
    Manages client accounts and Personal Script Space in Supabase.
    
    This is where AIlessia stores her emotional intelligence about each client,
    building lasting relationships beyond single transactions.
    """
    
    def __init__(self, supabase_client: SupabaseClient):
        """
        Initialize Account Manager.
        
        Args:
            supabase_client: Authenticated Supabase client
        """
        self.supabase = supabase_client
    
    async def create_account(
        self,
        email: str,
        name: Optional[str] = None,
        phone: Optional[str] = None
    ) -> Dict:
        """
        Create a new client account.
        
        Args:
            email: Client email (required)
            name: Client name
            phone: Client phone number
        
        Returns:
            Created account data
        """
        try:
            # Check if account exists
            existing = self.supabase.table("client_accounts").select("*").eq("email", email).execute()
            
            if existing.data and len(existing.data) > 0:
                logger.info("Account already exists", email=email)
                return existing.data[0]
            
            # Create new account
            account_data = {
                "email": email,
                "name": name,
                "phone": phone,
                "personality_archetype": None,
                "vip_status": "General",
                "total_scripts_created": 0,
                "total_experiences_booked": 0,
                "lifetime_value": 0
            }
            
            result = self.supabase.table("client_accounts").insert(account_data).execute()
            
            if result.data and len(result.data) > 0:
                account = result.data[0]
                logger.info("Client account created",
                           account_id=account["id"],
                           email=email)
                return account
            else:
                raise Exception("Failed to create account")
                
        except Exception as e:
            logger.error("Account creation failed", error=str(e), email=email)
            raise
    
    async def get_account(self, account_id: str) -> Optional[Dict]:
        """Get account by ID."""
        try:
            result = self.supabase.table("client_accounts").select("*").eq("id", account_id).execute()
            
            if result.data and len(result.data) > 0:
                return result.data[0]
            return None
        except Exception as e:
            logger.error("Failed to get account", error=str(e), account_id=account_id)
            return None
    
    async def get_account_by_email(self, email: str) -> Optional[Dict]:
        """Get account by email."""
        try:
            result = self.supabase.table("client_accounts").select("*").eq("email", email).execute()
            
            if result.data and len(result.data) > 0:
                return result.data[0]
            return None
        except Exception as e:
            logger.error("Failed to get account by email", error=str(e), email=email)
            return None
    
    async def update_account_profile(
        self,
        account_id: str,
        personality_archetype: Optional[str] = None,
        emotional_profile: Optional[Dict] = None,
        communication_preferences: Optional[Dict] = None,
        buying_patterns: Optional[Dict] = None
    ) -> Dict:
        """
        Update client's emotional profile (AIlessia's learning).
        
        Args:
            account_id: Client account ID
            personality_archetype: Detected archetype
            emotional_profile: Emotional patterns learned
            communication_preferences: Communication preferences
            buying_patterns: Purchase behavior patterns
        
        Returns:
            Updated account data
        """
        try:
            update_data = {}
            
            if personality_archetype:
                update_data["personality_archetype"] = personality_archetype
            if emotional_profile:
                update_data["emotional_profile"] = emotional_profile
            if communication_preferences:
                update_data["communication_preferences"] = communication_preferences
            if buying_patterns:
                update_data["buying_patterns"] = buying_patterns
            
            result = self.supabase.table("client_accounts").update(update_data).eq("id", account_id).execute()
            
            if result.data and len(result.data) > 0:
                logger.info("Account profile updated",
                           account_id=account_id,
                           archetype=personality_archetype)
                return result.data[0]
            else:
                raise Exception("Failed to update account")
                
        except Exception as e:
            logger.error("Failed to update account profile", error=str(e), account_id=account_id)
            raise
    
    async def create_conversation_session(
        self,
        account_id: str,
        script_id: Optional[str] = None
    ) -> Dict:
        """
        Start a new conversation session.
        
        Args:
            account_id: Client account ID
            script_id: Optional associated script ID
        
        Returns:
            Created session data
        """
        try:
            session_data = {
                "client_id": account_id,
                "script_id": script_id,
                "conversation_stage": "opening",
                "messages": [],
                "detected_emotions": [],
                "key_moments": [],
                "tone_changes": []
            }
            
            result = self.supabase.table("conversation_sessions").insert(session_data).execute()
            
            if result.data and len(result.data) > 0:
                session = result.data[0]
                logger.info("Conversation session created",
                           session_id=session["id"],
                           account_id=account_id)
                return session
            else:
                raise Exception("Failed to create session")
                
        except Exception as e:
            logger.error("Failed to create conversation session", error=str(e), account_id=account_id)
            raise
    
    async def update_conversation_session(
        self,
        session_id: str,
        messages: Optional[List[Dict]] = None,
        detected_emotions: Optional[List[Dict]] = None,
        key_moments: Optional[List[Dict]] = None,
        conversation_stage: Optional[str] = None,
        tone_used: Optional[str] = None,
        tone_changes: Optional[List[Dict]] = None
    ) -> Dict:
        """
        Update conversation session with new data.
        
        Args:
            session_id: Session ID
            messages: Updated messages array
            detected_emotions: Detected emotions
            key_moments: Key breakthrough moments
            conversation_stage: Current stage
            tone_used: Primary tone being used
            tone_changes: Tone adaptation history
        
        Returns:
            Updated session data
        """
        try:
            update_data = {}
            
            if messages is not None:
                update_data["messages"] = messages
            if detected_emotions is not None:
                update_data["detected_emotions"] = detected_emotions
            if key_moments is not None:
                update_data["key_moments"] = key_moments
            if conversation_stage:
                update_data["conversation_stage"] = conversation_stage
            if tone_used:
                update_data["tone_used"] = tone_used
            if tone_changes is not None:
                update_data["tone_changes"] = tone_changes
            
            result = self.supabase.table("conversation_sessions").update(update_data).eq("id", session_id).execute()
            
            if result.data and len(result.data) > 0:
                return result.data[0]
            else:
                raise Exception("Failed to update session")
                
        except Exception as e:
            logger.error("Failed to update conversation session", error=str(e), session_id=session_id)
            raise
    
    async def end_conversation_session(
        self,
        session_id: str,
        emotional_resonance_score: Optional[float] = None
    ) -> Dict:
        """
        End a conversation session.
        
        Args:
            session_id: Session ID
            emotional_resonance_score: AIlessia's assessment of connection quality (0-1)
        
        Returns:
            Updated session data
        """
        try:
            # Get session to calculate duration
            session = self.supabase.table("conversation_sessions").select("started_at").eq("id", session_id).execute()
            
            update_data = {
                "ended_at": datetime.now().isoformat()
            }
            
            if emotional_resonance_score is not None:
                update_data["emotional_resonance_score"] = emotional_resonance_score
            
            if session.data and len(session.data) > 0:
                started = datetime.fromisoformat(session.data[0]["started_at"].replace('Z', '+00:00'))
                duration = (datetime.now() - started).total_seconds() / 60
                update_data["duration_minutes"] = int(duration)
            
            result = self.supabase.table("conversation_sessions").update(update_data).eq("id", session_id).execute()
            
            if result.data and len(result.data) > 0:
                logger.info("Conversation session ended",
                           session_id=session_id,
                           duration_minutes=update_data.get("duration_minutes"))
                return result.data[0]
            else:
                raise Exception("Failed to end session")
                
        except Exception as e:
            logger.error("Failed to end conversation session", error=str(e), session_id=session_id)
            raise
    
    async def save_experience_script(
        self,
        account_id: str,
        script: ExperienceScript,
        session_id: Optional[str] = None
    ) -> Dict:
        """
        Save an Experience Script to Personal Script Space.
        
        Args:
            account_id: Client account ID
            script: ExperienceScript object
            session_id: Optional conversation session ID
        
        Returns:
            Saved script data
        """
        try:
            script_data = {
                "client_id": account_id,
                "title": script.title,
                "cinematic_hook": script.cinematic_hook,
                "emotional_arc": script.emotional_arc,
                "story_theme": script.story_theme,
                "transformational_promise": script.transformational_promise,
                "signature_experiences": script.signature_experiences,
                "sensory_journey": script.sensory_journey,
                "anticipation_moments": script.anticipation_moments,
                "personalized_rituals": script.personalized_rituals,
                "destination": script.destination,
                "duration_days": script.duration_days,
                "total_investment": float(script.total_investment),
                "included_elements": script.included_elements,
                "status": "draft",
                "client_archetype": script.client_archetype,
                "primary_emotions_addressed": script.primary_emotions_addressed,
                "hidden_desires_fulfilled": script.hidden_desires_fulfilled,
                "full_narrative": script.full_narrative
            }
            
            result = self.supabase.table("experience_scripts").insert(script_data).execute()
            
            if result.data and len(result.data) > 0:
                saved_script = result.data[0]
                
                # Update session with script_id if provided
                if session_id:
                    self.supabase.table("conversation_sessions").update({
                        "script_id": saved_script["id"]
                    }).eq("id", session_id).execute()
                
                logger.info("Experience script saved",
                           script_id=saved_script["id"],
                           account_id=account_id,
                           title=script.title)
                return saved_script
            else:
                raise Exception("Failed to save script")
                
        except Exception as e:
            logger.error("Failed to save experience script", error=str(e), account_id=account_id)
            raise
    
    async def get_client_scripts(
        self,
        account_id: str,
        status: Optional[str] = None,
        limit: int = 10
    ) -> List[Dict]:
        """
        Get client's Experience Scripts.
        
        Args:
            account_id: Client account ID
            status: Optional status filter
            limit: Number of scripts to return
        
        Returns:
            List of scripts
        """
        try:
            query = self.supabase.table("experience_scripts").select("*").eq("client_id", account_id)
            
            if status:
                query = query.eq("status", status)
            
            query = query.order("created_at", desc=True).limit(limit)
            
            result = query.execute()
            
            return result.data if result.data else []
                
        except Exception as e:
            logger.error("Failed to get client scripts", error=str(e), account_id=account_id)
            return []
    
    async def update_script_status(
        self,
        script_id: str,
        status: str,
        pdf_url: Optional[str] = None
    ) -> Dict:
        """
        Update script status.
        
        Args:
            script_id: Script ID
            status: New status (draft, finalized, booked, completed, archived)
            pdf_url: Optional PDF URL if generated
        
        Returns:
            Updated script data
        """
        try:
            update_data = {"status": status}
            
            if status == "finalized":
                update_data["finalized_at"] = datetime.now().isoformat()
            
            if pdf_url:
                update_data["pdf_url"] = pdf_url
                update_data["pdf_generated_at"] = datetime.now().isoformat()
            
            result = self.supabase.table("experience_scripts").update(update_data).eq("id", script_id).execute()
            
            if result.data and len(result.data) > 0:
                logger.info("Script status updated",
                           script_id=script_id,
                           status=status)
                return result.data[0]
            else:
                raise Exception("Failed to update script status")
                
        except Exception as e:
            logger.error("Failed to update script status", error=str(e), script_id=script_id)
            raise
    
    async def create_script_upsell(
        self,
        script_id: str,
        experience_id: str,
        experience_name: str,
        upsell_type: str,
        emotional_rationale: str,
        confidence_score: float,
        additional_value: float
    ) -> Dict:
        """
        Create an intelligent upsell suggestion.
        
        Args:
            script_id: Script ID
            experience_id: Neo4j experience ID
            experience_name: Experience name
            upsell_type: Type (complementary, upgrade, enhancement, extension)
            emotional_rationale: Why this enhances emotional journey
            confidence_score: AIlessia's confidence (0-1)
            additional_value: Additional investment amount
        
        Returns:
            Created upsell data
        """
        try:
            upsell_data = {
                "script_id": script_id,
                "experience_id": experience_id,
                "experience_name": experience_name,
                "upsell_type": upsell_type,
                "emotional_rationale": emotional_rationale,
                "confidence_score": confidence_score,
                "additional_value": additional_value,
                "client_response": "not_presented"
            }
            
            result = self.supabase.table("script_upsells").insert(upsell_data).execute()
            
            if result.data and len(result.data) > 0:
                logger.info("Script upsell created",
                           upsell_id=result.data[0]["id"],
                           script_id=script_id)
                return result.data[0]
            else:
                raise Exception("Failed to create upsell")
                
        except Exception as e:
            logger.error("Failed to create script upsell", error=str(e), script_id=script_id)
            raise
    
    async def record_upsell_response(
        self,
        upsell_id: str,
        response: str,
        reason: Optional[str] = None
    ) -> Dict:
        """
        Record client's response to upsell.
        
        Args:
            upsell_id: Upsell ID
            response: Response (accepted, rejected, considering)
            reason: Why accepted or rejected
        
        Returns:
            Updated upsell data
        """
        try:
            update_data = {
                "client_response": response,
                "response_at": datetime.now().isoformat()
            }
            
            if reason:
                if response == "accepted":
                    update_data["why_accepted"] = reason
                elif response == "rejected":
                    update_data["why_rejected"] = reason
            
            result = self.supabase.table("script_upsells").update(update_data).eq("id", upsell_id).execute()
            
            if result.data and len(result.data) > 0:
                logger.info("Upsell response recorded",
                           upsell_id=upsell_id,
                           response=response)
                return result.data[0]
            else:
                raise Exception("Failed to record upsell response")
                
        except Exception as e:
            logger.error("Failed to record upsell response", error=str(e), upsell_id=upsell_id)
            raise
    
    async def save_client_feedback(
        self,
        account_id: str,
        feedback_type: str,
        rating: int,
        feedback_text: Optional[str] = None,
        script_id: Optional[str] = None,
        session_id: Optional[str] = None,
        emotional_resonance_rating: Optional[int] = None,
        personalization_rating: Optional[int] = None,
        value_rating: Optional[int] = None
    ) -> Dict:
        """
        Save client feedback for learning loop.
        
        Args:
            account_id: Client account ID
            feedback_type: Type (script_quality, ailessia_interaction, experience_outcome, general)
            rating: Overall rating (1-5)
            feedback_text: Written feedback
            script_id: Optional script ID
            session_id: Optional session ID
            emotional_resonance_rating: Emotional resonance rating (1-5)
            personalization_rating: Personalization rating (1-5)
            value_rating: Value rating (1-5)
        
        Returns:
            Saved feedback data
        """
        try:
            feedback_data = {
                "client_id": account_id,
                "feedback_type": feedback_type,
                "rating": rating,
                "feedback_text": feedback_text,
                "script_id": script_id,
                "session_id": session_id,
                "emotional_resonance_rating": emotional_resonance_rating,
                "personalization_rating": personalization_rating,
                "value_rating": value_rating
            }
            
            result = self.supabase.table("client_feedback").insert(feedback_data).execute()
            
            if result.data and len(result.data) > 0:
                logger.info("Client feedback saved",
                           feedback_id=result.data[0]["id"],
                           account_id=account_id,
                           rating=rating)
                return result.data[0]
            else:
                raise Exception("Failed to save feedback")
                
        except Exception as e:
            logger.error("Failed to save client feedback", error=str(e), account_id=account_id)
            raise


# Global account manager instance placeholder
account_manager = None


def initialize_account_manager(supabase_client: SupabaseClient):
    """Initialize global account manager with Supabase client."""
    global account_manager
    account_manager = AccountManager(supabase_client)
    return account_manager

