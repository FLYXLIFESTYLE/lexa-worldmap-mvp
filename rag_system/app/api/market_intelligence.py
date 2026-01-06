"""
Market Intelligence API
Provides strategic insights for business decisions
"""

from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

from app.services.market_intelligence_agent import (
    answer_strategic_question,
    get_cruise_recommendations,
    analyze_archetype_distribution
)
from app.services.supabase_auth import get_current_user

router = APIRouter(prefix="/api/market-intelligence", tags=["Market Intelligence"])


class QuestionRequest(BaseModel):
    """Request model for strategic questions"""
    question: str
    time_period: Optional[str] = "last_90_days"


class QuestionResponse(BaseModel):
    """Response model for strategic questions"""
    question: str
    answer: str
    data_summary: dict
    recommendations: List[dict]
    confidence: float
    generated_at: str


@router.post("/ask", response_model=QuestionResponse)
async def ask_strategic_question(
    request: QuestionRequest,
    req: Request,
    current_user: dict = Depends(get_current_user)
):
    """
    Ask a strategic question to the Market Intelligence Agent.
    
    Examples:
    - "How many of our users are Cultural Connoisseur archetype?"
    - "What would be a great destination for Art & Culinary cruise besides French Riviera?"
    - "What theme should we create a SYCC cruise for that matches most users?"
    
    Requires admin/founder access.
    """
    
    # Check if user is admin/founder (you can add founder check here)
    # For now, any authenticated user can ask (you may want to restrict this)
    
    try:
        result = await answer_strategic_question(
            question=request.question,
            time_period=request.time_period
        )
        
        return QuestionResponse(**result)
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to answer question: {str(e)}"
        )


@router.get("/cruise-recommendations")
async def get_cruise_recs(
    focus: Optional[str] = None,
    min_users: int = 50,
    current_user: dict = Depends(get_current_user)
):
    """
    Get SYCC cruise recommendations based on demand analysis.
    
    Query params:
    - focus: "archetype_gaps", "high_demand", "emerging_trends"
    - min_users: Minimum user count to consider (default: 50)
    
    Returns prioritized cruise recommendations with ROI projections.
    """
    
    try:
        recommendations = await get_cruise_recommendations(focus, min_users)
        
        return {
            "success": True,
            "recommendations": recommendations,
            "generated_at": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate recommendations: {str(e)}"
        )


@router.get("/archetype-distribution")
async def get_archetype_dist(
    current_user: dict = Depends(get_current_user)
):
    """
    Get client archetype distribution analysis.
    
    Returns:
    - Total users
    - Archetype counts and percentages
    - Top emotions
    - Gap analysis
    """
    
    try:
        distribution = await analyze_archetype_distribution()
        
        return {
            "success": True,
            **distribution,
            "generated_at": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to analyze archetypes: {str(e)}"
        )


@router.get("/health")
async def health_check():
    """Health check for Market Intelligence Agent"""
    return {
        "status": "healthy",
        "agent": "Market Intelligence Agent",
        "capabilities": {
            "strategic_qa": "Answer business questions",
            "cruise_recommendations": "Recommend SYCC cruises to create",
            "archetype_analysis": "Analyze client distribution",
            "demand_patterns": "Identify trending destinations/themes",
            "pricing_optimization": "Recommend pricing changes"
        }
    }
