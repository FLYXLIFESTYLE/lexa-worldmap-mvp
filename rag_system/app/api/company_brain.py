"""
Company Brain API - Historical conversation analysis
"""

from fastapi import APIRouter, UploadFile, File, HTTPException, Depends, Request
from pydantic import BaseModel
from typing import List, Optional
import uuid

from app.services.company_brain_agent import (
    analyze_historical_conversation,
    synthesize_company_brain
)
from app.services.supabase_auth import get_current_user

router = APIRouter(prefix="/api/company-brain", tags=["Company Brain"])


class AnalysisResponse(BaseModel):
    """Response model for conversation analysis"""
    success: bool
    analysis_id: str
    summary: str
    script_examples_count: int
    features_worth_discussing_count: int
    knowledge_category: str


@router.post("/analyze-conversation", response_model=AnalysisResponse)
async def analyze_conversation(
    file: UploadFile = File(...),
    conversation_date: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """
    Analyze a single exported ChatGPT conversation (Word document).
    
    Extracts:
    - Experience script examples (for AIlessia training)
    - Feature ideas (built vs. worth discussing)
    - Design philosophy
    - Company DNA
    - Training insights
    
    Does NOT store the document (only insights extracted).
    """
    
    try:
        # Read file content
        content = await file.read()
        
        # Analyze conversation
        analysis = await analyze_historical_conversation(
            file_path=file.filename or "unknown.docx",
            file_content=content,
            conversation_date=conversation_date
        )
        
        # Save insights (not the document)
        from app.services.company_brain_agent import get_company_brain_agent
        agent = get_company_brain_agent()
        insight_id = await agent.save_company_brain_insights(analysis)
        
        return AnalysisResponse(
            success=True,
            analysis_id=insight_id,
            summary=analysis.get('summary', ''),
            script_examples_count=len(analysis.get('script_examples', [])),
            features_worth_discussing_count=len(analysis.get('features_worth_discussing', [])),
            knowledge_category=analysis.get('knowledge_category', 'general')
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to analyze conversation: {str(e)}"
        )


@router.post("/synthesize")
async def synthesize_all(
    analysis_ids: List[str],
    current_user: dict = Depends(get_current_user)
):
    """
    Synthesize multiple conversation analyses into unified Company Brain.
    
    This creates:
    - Unified script training corpus for AIlessia
    - Consolidated feature roadmap
    - Design philosophy handbook
    - Business strategy playbook
    """
    
    try:
        # Retrieve all analyses from database
        from app.services.company_brain_agent import get_company_brain_agent
        agent = get_company_brain_agent()
        
        # Get all insights from Supabase
        result = agent.supabase.table('company_brain_insights').select('*').in_('id', analysis_ids).execute()
        
        all_analyses = []
        for row in result.data:
            all_analyses.append({
                'summary': row.get('summary'),
                'script_examples': json.loads(row.get('script_examples') or '[]'),
                'features_worth_discussing': json.loads(row.get('features_worth_discussing') or '[]'),
                'design_philosophy': json.loads(row.get('design_philosophy') or '[]'),
                'company_dna': json.loads(row.get('company_dna') or '{}'),
                'training_insights': json.loads(row.get('training_insights') or '[]'),
            })
        
        # Synthesize
        company_brain = await synthesize_company_brain(all_analyses)
        
        return {
            "success": True,
            "company_brain": company_brain,
            "conversations_synthesized": len(all_analyses)
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to synthesize Company Brain: {str(e)}"
        )


@router.get("/insights")
async def get_insights(
    category: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """
    Get all Company Brain insights.
    
    Query params:
    - category: Filter by knowledge category
    """
    
    try:
        from app.services.company_brain_agent import get_company_brain_agent
        agent = get_company_brain_agent()
        
        query = agent.supabase.table('company_brain_insights').select('*')
        
        if category:
            query = query.eq('knowledge_category', category)
        
        result = query.order('analyzed_at', desc=True).execute()
        
        return {
            "success": True,
            "insights": result.data or [],
            "total": len(result.data or [])
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve insights: {str(e)}"
        )


@router.get("/health")
async def health_check():
    """Health check for Company Brain Agent"""
    return {
        "status": "healthy",
        "agent": "Company Brain Agent",
        "purpose": "Extract company DNA from 5 years of historical ChatGPT conversations",
        "capabilities": {
            "analyze_conversation": "Extract scripts, features, philosophy from single conversation",
            "synthesize_brain": "Consolidate all analyses into unified Company Brain",
            "training_corpus": "Build AIlessia script training data",
            "feature_archaeology": "Discover valuable ideas from history"
        }
    }
