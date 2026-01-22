"""
Company Brain API - Historical conversation analysis
"""

from fastapi import APIRouter, UploadFile, File, HTTPException, Depends, Request
from pydantic import BaseModel
from typing import List, Optional
import uuid
import os
import json
import re
from datetime import datetime
from urllib.parse import quote

from app.services.company_brain_agent import (
    analyze_historical_conversation,
    synthesize_company_brain
)
from app.services.supabase_auth import get_current_user
from app.services.supabase_client import get_supabase

router = APIRouter(prefix="/api/company-brain", tags=["Company Brain"])

# Upload hardening:
# - Keep predictable costs and avoid timeouts on huge files.
# - Captain uploads use 25MB; company brain tends to be larger, so allow more.
MAX_FILE_SIZE = 60 * 1024 * 1024  # 60MB
ALLOWED_EXTENSIONS = {"pdf", "txt", "md", "docx", "doc"}

# Supabase Storage (keep original uploads)
COMPANY_BRAIN_BUCKET = os.getenv("COMPANY_BRAIN_BUCKET", "public").strip() or "public"
COMPANY_BRAIN_FOLDER = os.getenv("COMPANY_BRAIN_FOLDER", "company-brain-uploads").strip() or "company-brain-uploads"


def _safe_storage_filename(name: str) -> str:
    base = os.path.basename(name or "").strip() or "upload"
    base = re.sub(r"[^a-zA-Z0-9._-]+", "_", base).strip("_")
    return (base or "upload")[:120]


def _build_public_url(bucket: str, path: str) -> Optional[str]:
    supabase_url = (os.getenv("SUPABASE_URL") or "").rstrip("/")
    if not supabase_url or not bucket or not path:
        return None
    return f"{supabase_url}/storage/v1/object/public/{bucket}/{quote(path, safe='/')}"


def _try_upload_original_file(
    supabase,
    *,
    user_id: str,
    upload_id: str,
    filename: str,
    content: bytes,
    content_type: Optional[str],
) -> dict:
    safe_name = _safe_storage_filename(filename)
    storage_path = f"{COMPANY_BRAIN_FOLDER}/{user_id}/{upload_id}/{safe_name}"
    try:
        supabase.storage.from_(COMPANY_BRAIN_BUCKET).upload(  # type: ignore
            storage_path,
            content,
            {"content-type": content_type or "application/octet-stream", "upsert": False},
        )
        return {
            "bucket": COMPANY_BRAIN_BUCKET,
            "path": storage_path,
            "url": _build_public_url(COMPANY_BRAIN_BUCKET, storage_path),
            "stored": True,
            "error": None,
        }
    except Exception as e:
        return {
            "bucket": COMPANY_BRAIN_BUCKET,
            "path": storage_path,
            "url": None,
            "stored": False,
            "error": str(e),
        }


def _clamp_confidence(value: Optional[float]) -> float:
    try:
        v = float(value) if value is not None else 0.8
    except Exception:
        v = 0.8
    if v > 1:
        v = v / 100.0
    return max(0.0, min(1.0, v))


def _safe_text(value: Optional[str], limit: int = 5000) -> str:
    text = (value or "").strip()
    if len(text) > limit:
        text = text[:limit]
    return text


def _build_company_brain_sections(analysis: dict, upload_id: str, conversation_date: Optional[str]) -> List[dict]:
    sections: List[dict] = []

    def add_section(section_type: str, title: str, content: str, tags: Optional[List[str]] = None, confidence: Optional[float] = None):
        title = _safe_text(title or "Untitled", 200)
        content = _safe_text(content or "")
        if not content:
            return
        sections.append({
            "upload_id": upload_id,
            "section_type": section_type,
            "title": title,
            "content": content,
            "tags": tags or [],
            "date_context": conversation_date,
            "status": "needs_review",
            "confidence": _clamp_confidence(confidence),
            "created_at": datetime.utcnow().isoformat(),
        })

    for script in (analysis.get("script_examples") or []):
        if not isinstance(script, dict):
            continue
        title = script.get("script_title") or "Script Example"
        content = "\n".join([
            f"Theme: {script.get('theme') or 'n/a'}",
            f"Destination: {script.get('destination') or 'n/a'}",
            f"Emotional arc: {script.get('emotional_arc') or 'n/a'}",
            f"Signature moments: {', '.join(script.get('signature_moments') or []) or 'n/a'}",
            f"Narrative style: {script.get('narrative_style') or 'n/a'}",
            f"What makes it special: {script.get('what_makes_it_special') or 'n/a'}",
        ])
        tags = [t for t in [script.get("theme"), script.get("destination")] if t]
        add_section("script_example", title, content, tags)

    for feature in (analysis.get("features_worth_discussing") or []):
        if not isinstance(feature, dict):
            continue
        title = feature.get("feature_idea") or feature.get("idea") or "Feature Idea"
        content = "\n".join([
            f"Why valuable: {feature.get('why_valuable') or feature.get('value') or 'n/a'}",
            f"Effort: {feature.get('effort') or 'n/a'}",
            f"Priority: {feature.get('priority') or 'n/a'}",
        ])
        add_section("feature_idea", title, content)

    for principle in (analysis.get("design_philosophy") or []):
        if not isinstance(principle, dict):
            continue
        title = principle.get("principle") or principle.get("title") or "Design Principle"
        content = principle.get("rationale") or principle.get("description") or json.dumps(principle)
        add_section("design_principle", title, content)

    for insight in (analysis.get("training_insights") or []):
        if not isinstance(insight, dict):
            continue
        title = insight.get("title") or "Training Insight"
        content = insight.get("insight") or insight.get("content") or json.dumps(insight)
        add_section("client_insight", title, content)

    company_dna = analysis.get("company_dna")
    if isinstance(company_dna, dict) and company_dna:
        add_section("design_principle", "Company DNA", json.dumps(company_dna, indent=2))

    if not sections:
        summary = analysis.get("summary") or "Conversation summary"
        add_section("conversation_example", "Conversation Summary", summary)

    return sections


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
        filename = (file.filename or "").strip()
        ext = os.path.splitext(filename)[1].lower().lstrip(".")
        if ext and ext not in ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported file type: .{ext}. Please upload: {', '.join(sorted(ALLOWED_EXTENSIONS))}."
            )

        # Read file content
        content = await file.read()

        if content and len(content) > MAX_FILE_SIZE:
            mb = round(len(content) / (1024 * 1024), 1)
            limit_mb = round(MAX_FILE_SIZE / (1024 * 1024), 0)
            raise HTTPException(
                status_code=413,
                detail=f"File too large ({mb}MB). Please upload a file under {limit_mb}MB or split it into smaller parts."
            )
        
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

        # Best-effort: store original file + sections for review history
        try:
            supabase = get_supabase()
            user_id = current_user.get("id")
            upload_id = str(uuid.uuid4())
            storage_meta = _try_upload_original_file(
                supabase,
                user_id=str(user_id),
                upload_id=upload_id,
                filename=filename or "company-brain-upload",
                content=content,
                content_type=file.content_type,
            )

            sections = _build_company_brain_sections(analysis, upload_id, conversation_date)

            upload_record = {
                "id": upload_id,
                "user_id": user_id,
                "filename": filename or "company-brain-upload",
                "file_size": len(content or b""),
                "document_type": "historic_chat",
                "extraction_summary": analysis.get("summary", ""),
                "total_sections": len(sections),
                "metadata": {
                    "analysis_id": insight_id,
                    "knowledge_category": analysis.get("knowledge_category"),
                    "conversation_date": conversation_date,
                    "file_storage": storage_meta,
                },
                "created_at": datetime.utcnow().isoformat(),
            }
            supabase.table("company_brain_uploads").insert(upload_record).execute()

            if sections:
                supabase.table("company_brain_sections").insert(sections).execute()
        except Exception:
            pass
        
        return AnalysisResponse(
            success=True,
            analysis_id=insight_id,
            summary=analysis.get('summary', ''),
            script_examples_count=len(analysis.get('script_examples', [])),
            features_worth_discussing_count=len(analysis.get('features_worth_discussing', [])),
            knowledge_category=analysis.get('knowledge_category', 'general')
        )
        
    except Exception as e:
        # Convert common "old Word" error into a helpful 400 for beginners.
        msg = str(e) if e is not None else ""
        if ".doc" in (file.filename or "").lower() and "Unsupported Word format: .doc" in msg:
            raise HTTPException(status_code=400, detail=msg)
        raise HTTPException(status_code=500, detail=f"Failed to analyze conversation: {msg}")


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
