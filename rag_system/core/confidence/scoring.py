"""
Confidence scoring system for RAG responses.
This module calculates how confident we are in our answers.
"""

from typing import List, Dict, Any
from enum import Enum
from dataclasses import dataclass
import structlog

logger = structlog.get_logger()


class AnswerType(Enum):
    """Types of answers based on confidence."""
    CONFIDENT = "confident"          # Score > 0.8, min. 2 sources
    PARTIAL = "partial"              # Score 0.5-0.8, incomplete info
    UNCERTAIN = "uncertain"          # Score < 0.5
    NO_INFORMATION = "no_info"       # No relevant data found


@dataclass
class ConfidenceScore:
    """Confidence score with breakdown."""
    overall_score: float
    answer_type: AnswerType
    retrieval_quality: float
    source_consistency: float
    completeness: float
    num_sources: int
    information_gaps: List[str]


class ConfidenceScorer:
    """Calculates confidence scores for RAG responses."""
    
    def __init__(
        self,
        min_confidence: float = 0.5,
        confident_threshold: float = 0.8
    ):
        """
        Initialize confidence scorer.
        
        Args:
            min_confidence: Minimum score to provide an answer
            confident_threshold: Threshold for confident answers
        """
        self.min_confidence = min_confidence
        self.confident_threshold = confident_threshold
    
    def calculate_retrieval_quality(
        self,
        neo4j_results: List[Dict[str, Any]],
        vector_results: List[Dict[str, Any]]
    ) -> float:
        """
        Calculate quality of retrieved sources.
        
        Args:
            neo4j_results: Results from Neo4j graph search
            vector_results: Results from vector similarity search
        
        Returns:
            Quality score 0-1
        """
        if not neo4j_results and not vector_results:
            return 0.0
        
        # Average similarity scores from vector search
        vector_score = 0.0
        if vector_results:
            scores = [r.get("score", 0.0) for r in vector_results]
            vector_score = sum(scores) / len(scores) if scores else 0.0
        
        # Neo4j results are considered high quality if they exist
        neo4j_score = 1.0 if neo4j_results else 0.0
        
        # Weighted average (Neo4j weighted higher for structured data)
        if neo4j_results and vector_results:
            return 0.6 * neo4j_score + 0.4 * vector_score
        elif neo4j_results:
            return neo4j_score
        else:
            return vector_score
    
    def calculate_source_consistency(
        self,
        sources: List[Dict[str, Any]]
    ) -> float:
        """
        Check if sources tell a consistent story.
        
        For now, this is a simple implementation that checks:
        - Do we have multiple sources?
        - Are they from different types (graph + vector)?
        
        Args:
            sources: List of all sources used
        
        Returns:
            Consistency score 0-1
        """
        if not sources:
            return 0.0
        
        if len(sources) == 1:
            # Single source = lower consistency confidence
            return 0.5
        
        # Check if we have diverse source types
        source_types = set(s.get("type", "unknown") for s in sources)
        has_diverse_types = len(source_types) > 1
        
        # Base consistency on number of sources and diversity
        base_score = min(len(sources) / 4, 1.0)  # Max at 4 sources
        diversity_bonus = 0.2 if has_diverse_types else 0.0
        
        return min(base_score + diversity_bonus, 1.0)
    
    def calculate_completeness(
        self,
        query_intent: Dict[str, Any],
        retrieved_data: Dict[str, Any]
    ) -> tuple[float, List[str]]:
        """
        Check if retrieved data answers the complete query.
        
        Args:
            query_intent: Parsed intent from user query
            retrieved_data: Data retrieved from databases
        
        Returns:
            Tuple of (completeness score, list of information gaps)
        """
        information_gaps = []
        
        # Check for common query components
        required_components = {
            "region": retrieved_data.get("has_region", False),
            "activity": retrieved_data.get("has_activity", False),
            "season": retrieved_data.get("has_season", False),
            "details": retrieved_data.get("has_details", False),
        }
        
        # Identify what was asked for in the query
        query_asks_for = query_intent.get("asks_for", {})
        
        missing_count = 0
        total_asked = 0
        
        for component, is_asked in query_asks_for.items():
            if is_asked:
                total_asked += 1
                if not required_components.get(component, False):
                    missing_count += 1
                    information_gaps.append(component)
        
        # Calculate completeness
        if total_asked == 0:
            # Query didn't ask for specific components, consider it complete
            return 1.0, []
        
        completeness = 1.0 - (missing_count / total_asked)
        
        return completeness, information_gaps
    
    def calculate_confidence(
        self,
        query_intent: Dict[str, Any],
        neo4j_results: List[Dict[str, Any]],
        vector_results: List[Dict[str, Any]],
        retrieved_data: Dict[str, Any]
    ) -> ConfidenceScore:
        """
        Calculate overall confidence score for a response.
        
        Args:
            query_intent: Parsed user query intent
            neo4j_results: Results from Neo4j
            vector_results: Results from vector DB
            retrieved_data: Combined retrieved data
        
        Returns:
            ConfidenceScore object
        """
        # Calculate component scores
        retrieval_quality = self.calculate_retrieval_quality(
            neo4j_results, vector_results
        )
        
        all_sources = (
            [{"type": "neo4j", **r} for r in neo4j_results] +
            [{"type": "vector", **r} for r in vector_results]
        )
        
        source_consistency = self.calculate_source_consistency(all_sources)
        
        completeness, information_gaps = self.calculate_completeness(
            query_intent, retrieved_data
        )
        
        # Calculate overall score (weighted average)
        overall_score = (
            0.4 * retrieval_quality +
            0.3 * source_consistency +
            0.3 * completeness
        )
        
        # Determine answer type
        num_sources = len(all_sources)
        
        if num_sources == 0:
            answer_type = AnswerType.NO_INFORMATION
        elif overall_score >= self.confident_threshold and num_sources >= 2:
            answer_type = AnswerType.CONFIDENT
        elif overall_score >= self.min_confidence:
            answer_type = AnswerType.PARTIAL
        else:
            answer_type = AnswerType.UNCERTAIN
        
        logger.info(
            "Confidence calculated",
            overall_score=overall_score,
            answer_type=answer_type.value,
            num_sources=num_sources,
            retrieval_quality=retrieval_quality,
            source_consistency=source_consistency,
            completeness=completeness
        )
        
        return ConfidenceScore(
            overall_score=overall_score,
            answer_type=answer_type,
            retrieval_quality=retrieval_quality,
            source_consistency=source_consistency,
            completeness=completeness,
            num_sources=num_sources,
            information_gaps=information_gaps
        )


# Global confidence scorer instance
confidence_scorer = ConfidenceScorer()

