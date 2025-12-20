"""
Multi-layer security system for the chatbot.
This module checks every user input for violations BEFORE processing.
"""

from enum import Enum
from typing import List, Dict, Optional, Any
from dataclasses import dataclass
from datetime import datetime
import re
import structlog

logger = structlog.get_logger()


class QueryCategory(Enum):
    """Categories of user queries."""
    TRAVEL_PLANNING = "travel"
    SMALL_TALK = "small_talk"
    TECHNICAL_INQUIRY = "technical"
    HARMFUL_CONTENT = "harmful"
    OUT_OF_SCOPE = "out_of_scope"
    JAILBREAK_ATTEMPT = "jailbreak"


class SafetyLevel(Enum):
    """Severity levels for responses."""
    SAFE = "safe"
    REDIRECT = "redirect"
    HARD_DECLINE = "hard_decline"
    TERMINATE_SESSION = "terminate"


@dataclass
class SafetyCheckResult:
    """Result of a safety check."""
    is_safe: bool
    category: QueryCategory
    severity: SafetyLevel
    response_template: Optional[str] = None
    should_terminate: bool = False
    log_incident: bool = False
    notify_admin: bool = False
    violation_type: Optional[str] = None


class ViolationTracker:
    """Tracks violations per session for escalation."""
    
    def __init__(self):
        """Initialize violation tracker."""
        self.violations: Dict[str, List[Dict[str, Any]]] = {}
    
    def add_violation(self, session_id: str, violation_type: str) -> int:
        """
        Add a violation for a session.
        
        Args:
            session_id: Session identifier
            violation_type: Type of violation
        
        Returns:
            Total number of violations for this session
        """
        if session_id not in self.violations:
            self.violations[session_id] = []
        
        self.violations[session_id].append({
            "type": violation_type,
            "timestamp": datetime.utcnow()
        })
        
        return len(self.violations[session_id])
    
    def get_violation_count(self, session_id: str) -> int:
        """Get total violation count for a session."""
        return len(self.violations.get(session_id, []))
    
    def should_escalate(self, session_id: str, max_violations: int = 3) -> bool:
        """Check if violations should be escalated."""
        return self.get_violation_count(session_id) >= max_violations


class SafetyChecker:
    """Multi-layer security checker for user inputs."""
    
    # Forbidden patterns (regex)
    JAILBREAK_PATTERNS = [
        r"ignore\s+(all\s+)?(previous|prior|above)\s+instructions?",
        r"you\s+are\s+now",
        r"pretend\s+(you\s+are|to\s+be)",
        r"simulate\s+(being|a)",
        r"act\s+as\s+(if\s+)?you",
        r"DAN\s+mode",
        r"developer\s+mode",
        r"system\s+prompt",
        r"what\s+(are|is)\s+your\s+(instructions?|prompts?|rules?)",
        r"show\s+me\s+your\s+(prompt|instructions?|system)",
        r"bypass\s+your",
        r"override\s+your",
    ]
    
    TECHNICAL_INQUIRY_PATTERNS = [
        r"\b(database|db|neo4j|qdrant|vector\s*db|graph\s*database)\b",
        r"\b(architecture|system\s*design|infrastructure)\b",
        r"\b(api|endpoint|backend|server)\b",
        r"\b(code|programming|implementation|algorithm)\b",
        r"\b(how\s+(were\s+you|are\s+you)\s+(built|programmed|trained|created))\b",
        r"\b(model|llm|ai\s*model|gpt|claude)\b",
        r"\b(training\s*data|dataset)\b",
        r"\bSQL\b",
        r"\bCypher\b",
    ]
    
    HARMFUL_CONTENT_PATTERNS = [
        r"\b(hate|racist?|racism|discrimination)\b",
        r"\b(nazi|fascist)\b",
        r"\b(kill|murder|violence)\b",
        r"\b(offensive\s+slurs?)\b",
        # Add more patterns as needed, but be careful with false positives
    ]
    
    DATA_FISHING_PATTERNS = [
        r"what\s+data\s+do\s+you\s+(have|store|collect)",
        r"show\s+me\s+the\s+database",
        r"what\s+information\s+(do\s+you\s+have\s+)?about\s+me",
        r"access\s+my\s+data",
        r"privacy\s+policy",
        r"gdpr",
        r"data\s+protection",
    ]
    
    # Forbidden topics
    FORBIDDEN_TOPICS = {
        "medical": ["diagnosis", "medication", "treatment", "symptoms", "disease", "doctor"],
        "legal": ["lawsuit", "legal advice", "contract", "lawyer", "sue"],
        "financial": ["investment", "stocks", "financial advice", "buy shares", "trading"],
        "politics": ["election", "political party", "vote for", "government policy"],
        "religion": ["religious beliefs", "which religion", "convert to"],
    }
    
    # Allowed travel-related keywords
    ALLOWED_KEYWORDS = [
        "travel", "trip", "vacation", "holiday", "destination", "region",
        "activity", "activities", "hiking", "wine", "tour", "museum",
        "hotel", "accommodation", "restaurant", "food", "dining",
        "weather", "season", "summer", "winter", "spring", "fall", "autumn",
        "booking", "reservation", "when", "where", "what", "how",
        "family", "romantic", "adventure", "culture", "outdoor", "indoor",
        "stuttgart", "munich", "bavaria", "baden-württemberg", "black forest"
    ]
    
    def __init__(self):
        """Initialize safety checker."""
        self.violation_tracker = ViolationTracker()
        
        # Compile regex patterns for performance
        self.jailbreak_regex = [re.compile(p, re.IGNORECASE) for p in self.JAILBREAK_PATTERNS]
        self.technical_regex = [re.compile(p, re.IGNORECASE) for p in self.TECHNICAL_INQUIRY_PATTERNS]
        self.harmful_regex = [re.compile(p, re.IGNORECASE) for p in self.HARMFUL_CONTENT_PATTERNS]
        self.data_fishing_regex = [re.compile(p, re.IGNORECASE) for p in self.DATA_FISHING_PATTERNS]
    
    def _check_patterns(self, text: str, patterns: List[re.Pattern]) -> bool:
        """Check if text matches any of the regex patterns."""
        return any(pattern.search(text) for pattern in patterns)
    
    def _check_forbidden_topics(self, text: str) -> Optional[str]:
        """
        Check if text contains forbidden topics.
        
        Returns:
            Topic category if found, None otherwise
        """
        text_lower = text.lower()
        for topic, keywords in self.FORBIDDEN_TOPICS.items():
            if any(keyword in text_lower for keyword in keywords):
                return topic
        return None
    
    def _is_travel_related(self, text: str) -> bool:
        """Check if text contains travel-related keywords."""
        text_lower = text.lower()
        return any(keyword in text_lower for keyword in self.ALLOWED_KEYWORDS)
    
    def check_input(
        self,
        user_input: str,
        session_id: str,
        conversation_history: Optional[List[Dict[str, str]]] = None
    ) -> SafetyCheckResult:
        """
        Perform comprehensive safety check on user input.
        
        Args:
            user_input: The user's message
            session_id: Current session ID
            conversation_history: Previous messages in the conversation
        
        Returns:
            SafetyCheckResult with decision and metadata
        """
        # Layer 1: Jailbreak Attempts
        if self._check_patterns(user_input, self.jailbreak_regex):
            self.violation_tracker.add_violation(session_id, "jailbreak")
            
            return SafetyCheckResult(
                is_safe=False,
                category=QueryCategory.JAILBREAK_ATTEMPT,
                severity=SafetyLevel.HARD_DECLINE,
                violation_type="jailbreak_attempt",
                log_incident=True,
                should_terminate=self.violation_tracker.should_escalate(session_id)
            )
        
        # Layer 2: Harmful Content
        if self._check_patterns(user_input, self.harmful_regex):
            self.violation_tracker.add_violation(session_id, "harmful_content")
            
            return SafetyCheckResult(
                is_safe=False,
                category=QueryCategory.HARMFUL_CONTENT,
                severity=SafetyLevel.TERMINATE_SESSION,
                violation_type="harmful_content",
                should_terminate=True,
                log_incident=True,
                notify_admin=True
            )
        
        # Layer 3: Technical Inquiries
        if self._check_patterns(user_input, self.technical_regex):
            self.violation_tracker.add_violation(session_id, "technical_inquiry")
            
            severity = SafetyLevel.REDIRECT
            should_terminate = False
            
            # Escalate if repeated violations
            violation_count = self.violation_tracker.get_violation_count(session_id)
            if violation_count >= 2:
                severity = SafetyLevel.HARD_DECLINE
            if violation_count >= 3:
                should_terminate = True
                severity = SafetyLevel.TERMINATE_SESSION
            
            return SafetyCheckResult(
                is_safe=False,
                category=QueryCategory.TECHNICAL_INQUIRY,
                severity=severity,
                violation_type="technical_inquiry",
                should_terminate=should_terminate,
                log_incident=True
            )
        
        # Layer 4: Data Fishing
        if self._check_patterns(user_input, self.data_fishing_regex):
            self.violation_tracker.add_violation(session_id, "data_fishing")
            
            return SafetyCheckResult(
                is_safe=False,
                category=QueryCategory.TECHNICAL_INQUIRY,
                severity=SafetyLevel.REDIRECT,
                violation_type="data_fishing",
                log_incident=True
            )
        
        # Layer 5: Out-of-Scope Topics
        forbidden_topic = self._check_forbidden_topics(user_input)
        if forbidden_topic:
            self.violation_tracker.add_violation(session_id, f"out_of_scope_{forbidden_topic}")
            
            return SafetyCheckResult(
                is_safe=False,
                category=QueryCategory.OUT_OF_SCOPE,
                severity=SafetyLevel.REDIRECT,
                violation_type=f"out_of_scope_{forbidden_topic}"
            )
        
        # Layer 6: Travel Relevance Check
        # If input doesn't contain any travel-related keywords and is not a greeting,
        # it might be out of scope
        greetings = ["hello", "hi", "hey", "good morning", "good afternoon", "good evening"]
        is_greeting = any(greeting in user_input.lower() for greeting in greetings)
        
        if not self._is_travel_related(user_input) and not is_greeting and len(user_input.split()) > 3:
            # Only flag if it's a substantial message
            return SafetyCheckResult(
                is_safe=False,
                category=QueryCategory.OUT_OF_SCOPE,
                severity=SafetyLevel.REDIRECT,
                violation_type="out_of_scope_general"
            )
        
        # All checks passed - input is safe
        return SafetyCheckResult(
            is_safe=True,
            category=QueryCategory.TRAVEL_PLANNING if not is_greeting else QueryCategory.SMALL_TALK,
            severity=SafetyLevel.SAFE
        )
    
    def get_safety_response(
        self,
        check_result: SafetyCheckResult,
        privacy_contact: str = "privacy@example.com"
    ) -> str:
        """
        Get the appropriate safety response message.
        
        Args:
            check_result: Result from safety check
            privacy_contact: Privacy contact email
        
        Returns:
            Response message to send to user
        """
        from config.prompts import SAFETY_RESPONSES
        
        if check_result.violation_type == "data_fishing":
            response = SAFETY_RESPONSES["data_fishing"]["response"]
            return response.format(privacy_contact=privacy_contact)
        
        response_key = {
            QueryCategory.JAILBREAK_ATTEMPT: "jailbreak_attempt",
            QueryCategory.HARMFUL_CONTENT: "harmful_content",
            QueryCategory.TECHNICAL_INQUIRY: "technical_inquiry",
            QueryCategory.OUT_OF_SCOPE: "out_of_scope",
        }.get(check_result.category)
        
        if response_key and response_key in SAFETY_RESPONSES:
            return SAFETY_RESPONSES[response_key]["response"]
        
        # Default fallback
        return "I specialize in helping you with travel planning. How can I help you plan your next trip?"


# Global safety checker instance
safety_checker = SafetyChecker()

