"""
Captain Portal - File Upload & Intelligence Extraction API
"""

from fastapi import APIRouter, UploadFile, File, HTTPException, Depends, Form, Request
from pydantic import BaseModel
from typing import List, Optional
import uuid
from datetime import datetime
import os

from app.services.file_processor import process_file_auto
from app.services.multipass_extractor import run_multipass_extraction, run_fast_extraction
from app.services.intelligence_storage import save_intelligence_to_db
from app.services.pii_redactor import redact_pii
from app.services.supabase_client import get_supabase
from app.services.supabase_auth import get_current_user

router = APIRouter(prefix="/api/captain/upload", tags=["Upload"])

# Max file size (10MB for free tier)
MAX_FILE_SIZE = 10 * 1024 * 1024


class UploadTextRequest(BaseModel):
    """Request model for text paste upload"""
    text: str
    title: str = "Pasted Content"
    source_description: Optional[str] = None


class UploadResponse(BaseModel):
    """Response model for file upload"""
    upload_id: str
    filename: str
    status: str
    extracted_pois: int
    extracted_experiences: int
    file_size_kb: float
    message: str


class UpdateUploadRequest(BaseModel):
    keep_file: Optional[bool] = None
    metadata: Optional[dict] = None


def _package_to_legacy(intel_package: dict) -> dict:
    """
    Convert multipass final_package into the legacy intelligence shape
    expected by save_intelligence_to_db.
    """
    if not intel_package:
        return {
            "pois": [],
            "experiences": [],
            "trends": [],
            "client_insights": [],
            "price_intelligence": {},
            "competitor_analysis": [],
            "operational_learnings": [],
            "metadata": {},
        }

    def _safe_list(value):
        return value if isinstance(value, list) else []

    pois = []
    for venue in _safe_list(intel_package.get("venues")):
        pois.append({
            "name": venue.get("name"),
            "type": venue.get("kind") or venue.get("type"),
            "location": venue.get("location"),
            "description": venue.get("description"),
            "category": ", ".join(venue.get("tags", [])) if venue.get("tags") else None,
            "address": None,
            "coordinates": venue.get("coordinates") or {"lat": None, "lng": None},
            "confidence": venue.get("confidence"),
        })
    for dest in _safe_list(intel_package.get("destinations")):
        pois.append({
            "name": dest.get("name"),
            "type": dest.get("kind") or "destination",
            "location": dest.get("location"),
            "description": dest.get("description"),
            "category": ", ".join(dest.get("tags", [])) if dest.get("tags") else None,
            "address": None,
            "coordinates": dest.get("coordinates") or {"lat": None, "lng": None},
            "confidence": dest.get("confidence"),
        })

    experiences = []
    for exp in _safe_list(intel_package.get("sub_experiences")):
        experiences.append({
            "experience_title": exp.get("title") or exp.get("moment") or exp.get("name"),
            "experience_type": exp.get("category") or exp.get("type"),
            "description": exp.get("description"),
            "location": exp.get("location"),
            "duration": exp.get("duration"),
            "unique_elements": ", ".join(exp.get("highlights", [])) if exp.get("highlights") else None,
            "emotional_goal": exp.get("emotional_goal"),
            "target_audience": exp.get("target_audience"),
            "estimated_budget": exp.get("estimated_budget"),
            "confidence": exp.get("confidence"),
        })

    client_insights = []
    for archetype in _safe_list(intel_package.get("client_archetypes")):
        client_insights.append({
            "insight_category": "client_archetype",
            "client_segment": archetype.get("name") or archetype.get("archetype"),
            "insight_description": archetype.get("description") or archetype.get("source"),
            "emotional_drivers": archetype.get("emotional_drivers") or archetype.get("drivers"),
            "pain_points": archetype.get("pain_points"),
            "confidence": archetype.get("confidence"),
        })

    service_providers = []
    for provider in _safe_list(intel_package.get("service_providers")):
        service_providers.append({
            "name": provider.get("name") or provider.get("provider"),
            "service_type": provider.get("kind") or provider.get("type") or provider.get("category"),
            "description": provider.get("description") or provider.get("role") or provider.get("context") or provider.get("service"),
            "website": provider.get("website"),
            "notes": provider.get("notes") or (", ".join(provider.get("services", [])) if provider.get("services") else None),
            "confidence": provider.get("confidence"),
        })

    return {
        "pois": pois,
        "experiences": experiences,
        "trends": [],
        "client_insights": client_insights,
        "price_intelligence": {},
        "competitor_analysis": [],  # service providers are no longer forced into competitors
        "operational_learnings": [],
        "service_providers": service_providers,
        "emotional_map": intel_package.get("emotional_map", []),
        "metadata": intel_package.get("metadata", {}),
    }


@router.post("/")
async def upload_file(
    file: UploadFile = File(...),
    request: Request = None,
    supabase = Depends(get_supabase)
):
    """
    Upload and process a file
    
    **Supported formats:**
    - PDF documents
    - Word documents (.docx)
    - Excel spreadsheets (.xlsx)
    - Images (PNG, JPEG) - OCR extraction
    - Plain text files
    
    **What it does:**
    1. Validates file type and size
    2. Extracts text and metadata
    3. Uses Claude AI to extract 7 types of intelligence
    4. Saves everything to Supabase
    
    **Returns:**
    - Upload ID for tracking
    - Number of POIs and experiences extracted
    - Processing status
    """
    print(f"=== UPLOAD REQUEST RECEIVED ===")
    print(f"Filename: {file.filename}")
    print(f"Content-Type: {file.content_type}")
    print(f"Size: {file.size if hasattr(file, 'size') else 'unknown'}")
    
    try:
        # Read file content
        content = await file.read()
        file_size = len(content)
        
        # Check file size
        if file_size > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=413,
                detail=f"File too large ({file_size / 1024 / 1024:.1f}MB). Max 10MB."
            )
        
        # Save to temp file
        upload_id = str(uuid.uuid4())
        temp_path = f"/tmp/{upload_id}_{file.filename}"
        
        with open(temp_path, 'wb') as f:
            f.write(content)
        
        # Resolve user (required - personal uploads/history)
        user = await get_current_user(request)
        user_id = user.get("id")
        user_email = (user.get("email") or "").lower()

        # Process file
        print(f"=== PROCESSING FILE ===")
        print(f"Temp path: {temp_path}")
        extracted_text, metadata = await process_file_auto(temp_path)

        # Redact common personal data BEFORE sending to LLM
        extracted_text, pii_stats = redact_pii(extracted_text)
        
        # Clean up temp file
        if os.path.exists(temp_path):
            os.remove(temp_path)
        
        # Log extracted text for debugging
        print(f"=== TEXT EXTRACTION COMPLETE ===")
        print(f"Extracted text length: {len(extracted_text) if extracted_text else 0}")
        print(f"Metadata: {metadata}")
        if extracted_text:
            print(f"Extracted text preview (first 1000 chars):\n{extracted_text[:1000]}")
        else:
            print("ERROR: No text extracted from file!")
        
        if not extracted_text or len(extracted_text) < 50:
            raise HTTPException(
                status_code=400,
                detail=f"Could not extract meaningful text from file. Extracted length: {len(extracted_text) if extracted_text else 0}"
            )
        
        # Create upload record FIRST with default confidence_score=80
        try:
            upload_record = {
                "id": upload_id,
                "uploaded_by": user_id,
                "uploaded_by_email": user_email,
                "filename": file.filename,
                "file_type": metadata.get("file_type", "unknown"),
                "file_size": file_size,
                "processing_status": "processing",
                "confidence_score": 80,  # Default 80% for uploads
                "metadata": {
                    "filename": file.filename,
                    "file_size": file_size,
                    "file_type": metadata.get("file_type"),
                    "pii_redaction": pii_stats,
                    **metadata
                }
            }
            supabase.table("captain_uploads").insert(upload_record).execute()
        except Exception as e:
            print(f"Failed to create upload record: {str(e)}")
            import traceback
            traceback.print_exc()
            # Continue anyway - we'll update the record later
        
        # Extract intelligence with multipass pipeline
        print(f"=== STARTING MULTIPASS INTELLIGENCE EXTRACTION ===")
        print(f"Text length to analyze: {len(extracted_text)}")
        print(f"First 500 chars of text:\n{extracted_text[:500]}")
        
        try:
            source_meta = {
                "upload_id": upload_id,
                "filename": file.filename,
                "file_type": metadata.get("file_type"),
                "file_size": file_size,
            }
            # Production reliability: default to fast (single-pass) to avoid HTTP timeouts.
            # Enable multi-pass explicitly in non-production via LEXA_MULTIPASS=1.
            env = (os.getenv("ENVIRONMENT") or "").lower()
            multipass_enabled = (os.getenv("LEXA_MULTIPASS") or "").strip().lower() in {"1", "true", "yes"}
            if env == "production" or not multipass_enabled:
                extraction_contract = await run_fast_extraction(extracted_text, source_meta)
            else:
                extraction_contract = await run_multipass_extraction(extracted_text, source_meta)
            final_package = extraction_contract.get("final_package", {}) or {}
            intelligence = _package_to_legacy(final_package)
            pkg_meta = (final_package.get("metadata", {}) if isinstance(final_package, dict) else {}) or {}

            print(f"=== MULTIPASS EXTRACTION RETURNED ===")
            print(f"Passes: {len(extraction_contract.get('passes', []))}")
            print(f"Legacy POIs: {len(intelligence.get('pois', []))}")
            print(f"Legacy Experiences: {len(intelligence.get('experiences', []))}")
            
            total_items = (
                len(intelligence.get('pois', [])) +
                len(intelligence.get('experiences', [])) +
                len(intelligence.get('trends', [])) +
                len(intelligence.get('competitor_analysis', []))
            )
            
            if total_items == 0:
                error_msg = "Multipass extraction returned ZERO items. Possible causes: Claude API empty, JSON parse failure, or unextractable content."
                print(f"⚠️ WARNING: {error_msg}")
                try:
                    supabase.table("captain_uploads").update({
                        "processing_status": "failed",
                        "error_message": error_msg
                    }).eq("id", upload_id).execute()
                except:
                    pass
        except Exception as e:
            print(f"❌ ERROR: Multipass extraction failed: {str(e)}")
            import traceback
            traceback.print_exc()
            # Update upload record to failed status
            try:
                supabase.table("captain_uploads").update({
                    "processing_status": "failed",
                    "error_message": str(e)
                }).eq("id", upload_id).execute()
            except:
                pass
            raise HTTPException(
                status_code=500,
                detail=f"Intelligence extraction failed: {str(e)}"
            )
        
        # Save extracted intelligence to database
        try:
            await save_intelligence_to_db(
                supabase=supabase,
                intelligence=intelligence,
                source_type="file_upload",
                source_id=upload_id,
                source_metadata={
                    "filename": file.filename,
                    "file_size": file_size,
                    "file_type": metadata.get("file_type"),
                    **metadata
                },
                uploaded_by=user_id
            )
        except Exception as e:
            print(f"Database save failed: {str(e)}")
            import traceback
            traceback.print_exc()
            # Update upload record to failed status
            try:
                supabase.table("captain_uploads").update({
                    "processing_status": "failed",
                    "error_message": f"Database save failed: {str(e)}"
                }).eq("id", upload_id).execute()
            except:
                pass
            raise HTTPException(
                status_code=500,
                detail=f"Database save failed: {str(e)}"
            )
        
        # Update upload record with extraction results
        pois_count = len(intelligence.get("pois", []))
        experiences_count = len(intelligence.get("experiences", []))
        trends_count = len(intelligence.get("trends", []))
        insights_count = len(intelligence.get("client_insights", []))
        prices_count = len(intelligence.get("price_intelligence", {}).keys()) if isinstance(intelligence.get("price_intelligence"), dict) else 0
        competitors_count = len(intelligence.get("competitor_analysis", []))
        learnings_count = len(intelligence.get("operational_learnings", []))
        providers_count = len(intelligence.get("service_providers", []))
        counts_meta = (final_package.get("counts", {}) if isinstance(final_package, dict) else {}) or {}
        real_counts = counts_meta.get("real_extracted", {}) if isinstance(counts_meta, dict) else {}
        estimated_counts = counts_meta.get("estimated_potential", {}) if isinstance(counts_meta, dict) else {}
        
        try:
            supabase.table("captain_uploads").update({
                "processing_status": "completed",
                "pois_extracted": pois_count,
                "experiences_extracted": experiences_count,
                "trends_extracted": trends_count,
                "metadata": {
                    **(upload_record.get("metadata", {}) if isinstance(upload_record, dict) else {}),
                    "pii_redaction": pii_stats,
                    # Persist for history + open-from-history
                    "extraction_contract": extraction_contract,
                    "extracted_data": intelligence,
                    "captain_summary": pkg_meta.get("captain_summary"),
                    "report_markdown": pkg_meta.get("report_markdown"),
                },
            }).eq("id", upload_id).execute()
        except Exception as e:
            print(f"Failed to update upload record: {str(e)}")
        
        # Return response WITH extracted data for frontend editing
        return {
            "success": True,
            "upload_id": upload_id,
            "filename": file.filename,
            "status": "completed",
            "confidence_score": 80,
            "pois_extracted": pois_count,
            "intelligence_extracted": {
                "pois": pois_count,
                "experiences": experiences_count,
                "trends": trends_count,
                "insights": insights_count,
                "prices": prices_count,
                "competitors": competitors_count,
                "learnings": learnings_count,
                "service_providers": providers_count,
            },
            "counts_real": real_counts,
            "counts_estimated": estimated_counts,
            "extracted_data": intelligence,  # Return full intelligence for editing
            "extraction_contract": extraction_contract,
            "file_size_kb": file_size / 1024,
            "message": "File processed successfully"
        }
        
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Processing failed: {str(e)}")


@router.post("/text")
async def upload_text(
    request: UploadTextRequest,
    http_request: Request,
    supabase = Depends(get_supabase)
):
    """
    Process pasted text directly
    
    **What it does:**
    1. Validates text length
    2. Extracts intelligence with Claude AI
    3. Saves to database
    
    **Use cases:**
    - Paste travel guides
    - Paste destination descriptions
    - Paste activity recommendations
    - Manual POI entry
    """
    try:
        if len(request.text) < 50:
            raise HTTPException(
                status_code=400,
                detail="Text too short (minimum 50 characters)"
            )
        
        user = await get_current_user(http_request)
        user_id = user.get("id")
        user_email = (user.get("email") or "").lower()

        upload_id = str(uuid.uuid4())
        text_redacted, pii_stats = redact_pii(request.text)

        # Create upload record (paste)
        try:
            supabase.table("captain_uploads").insert({
                "id": upload_id,
                "uploaded_by": user_id,
                "uploaded_by_email": user_email,
                "filename": f"{request.title}.txt",
                "file_type": "paste",
                "file_size": len(text_redacted.encode("utf-8")),
                "processing_status": "processing",
                "confidence_score": 80,
                "extracted_text_length": len(text_redacted),
                "metadata": {
                    "title": request.title,
                    "description": request.source_description,
                    "text_length": len(text_redacted),
                    "pii_redaction": pii_stats,
                },
            }).execute()
        except Exception:
            pass
        
        # Extract intelligence via multipass
        source_meta = {
            "upload_id": upload_id,
            "filename": request.title,
            "file_type": "text",
            "text_length": len(text_redacted)
        }
        env = (os.getenv("ENVIRONMENT") or "").lower()
        multipass_enabled = (os.getenv("LEXA_MULTIPASS") or "").strip().lower() in {"1", "true", "yes"}
        if env == "production" or not multipass_enabled:
            extraction_contract = await run_fast_extraction(text_redacted, source_meta)
        else:
            extraction_contract = await run_multipass_extraction(text_redacted, source_meta)
        final_package = extraction_contract.get("final_package", {}) or {}
        intelligence = _package_to_legacy(final_package)
        pkg_meta = (final_package.get("metadata", {}) if isinstance(final_package, dict) else {}) or {}
        
        # Save to database
        await save_intelligence_to_db(
            supabase=supabase,
            intelligence=intelligence,
            source_type="text_paste",
            source_id=upload_id,
            source_metadata={
                "title": request.title,
                "description": request.source_description,
                "text_length": len(text_redacted)
            },
            uploaded_by=user_id
        )
        
        # Map to frontend-expected format
        pois_count = len(intelligence.get("pois", []))
        experiences_count = len(intelligence.get("experiences", []))
        trends_count = len(intelligence.get("trends", []))
        insights_count = len(intelligence.get("client_insights", []))
        prices_count = len(intelligence.get("price_intelligence", {}).keys()) if isinstance(intelligence.get("price_intelligence"), dict) else 0
        competitors_count = len(intelligence.get("competitor_analysis", []))
        learnings_count = len(intelligence.get("operational_learnings", []))
        providers_count = len(intelligence.get("service_providers", []))
        counts_meta = (final_package.get("counts", {}) if isinstance(final_package, dict) else {}) or {}
        real_counts = counts_meta.get("real_extracted", {}) if isinstance(counts_meta, dict) else {}
        estimated_counts = counts_meta.get("estimated_potential", {}) if isinstance(counts_meta, dict) else {}
        
        # Update upload record with final status + cached extraction for history
        try:
            supabase.table("captain_uploads").update({
                "processing_status": "completed",
                "pois_extracted": pois_count,
                "experiences_extracted": experiences_count,
                "trends_extracted": trends_count,
                "metadata": {
                    "title": request.title,
                    "description": request.source_description,
                    "text_length": len(text_redacted),
                    "pii_redaction": pii_stats,
                    "extraction_contract": extraction_contract,
                    "extracted_data": intelligence,
                    "captain_summary": pkg_meta.get("captain_summary"),
                    "report_markdown": pkg_meta.get("report_markdown"),
                },
            }).eq("id", upload_id).execute()
        except Exception:
            pass

        return {
            "success": True,
            "upload_id": upload_id,
            "filename": f"{request.title}.txt",
            "status": "completed",
            "pois_extracted": pois_count,
            "intelligence_extracted": {
                "pois": pois_count,
                "experiences": experiences_count,
                "trends": trends_count,
                "insights": insights_count,
                "prices": prices_count,
                "competitors": competitors_count,
                "learnings": learnings_count,
                "service_providers": providers_count,
            },
            "counts_real": real_counts,
            "counts_estimated": estimated_counts,
            "extraction_contract": extraction_contract,
            "file_size_kb": len(text_redacted.encode('utf-8')) / 1024,
            "message": "Text processed successfully"
        }
        
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Processing failed: {str(e)}")


@router.get("/history")
async def get_upload_history(
    limit: int = 50,
    offset: int = 0,
    request: Request = None,
    supabase = Depends(get_supabase)
):
    """
    Get upload history
    
    **Query Parameters:**
    - limit: Number of results (default: 50)
    - offset: Pagination offset (default: 0)
    
    **Returns:**
    - List of all uploads with stats
    - Total count for pagination
    """
    try:
        user = await get_current_user(request)
        user_id = user.get("id")

        # Get uploads from captain_uploads table (only this user's uploads)
        response = supabase.table("captain_uploads")\
            .select("*")\
            .eq("uploaded_by", user_id)\
            .order("uploaded_at", desc=True)\
            .range(offset, offset + limit - 1)\
            .execute()
        
        # Get total count
        count_response = supabase.table("captain_uploads")\
            .select("id", count="exact")\
            .eq("uploaded_by", user_id)\
            .execute()
        
        total_count = count_response.count if hasattr(count_response, 'count') else len(count_response.data)
        
        return {
            "uploads": response.data,
            "total": total_count,
            "limit": limit,
            "offset": offset
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch history: {str(e)}")


@router.get("/id/{upload_id}")
async def get_upload_detail(
    upload_id: uuid.UUID,
    request: Request,
    supabase = Depends(get_supabase),
):
    """
    Fetch one upload (owned by current user) including cached extraction data in metadata.
    """
    user = await get_current_user(request)
    user_id = user.get("id")

    resp = supabase.table("captain_uploads")\
        .select("*")\
        .eq("id", str(upload_id))\
        .eq("uploaded_by", user_id)\
        .limit(1)\
        .execute()

    if not resp.data:
        raise HTTPException(status_code=404, detail="Upload not found")

    return {"upload": resp.data[0]}


@router.delete("/id/{upload_id}")
async def delete_upload(
    upload_id: uuid.UUID,
    request: Request,
    supabase = Depends(get_supabase),
):
    """
    Delete one upload record (owned by current user).
    NOTE: Extracted knowledge may remain in other tables depending on DB config.
    """
    user = await get_current_user(request)
    user_id = user.get("id")

    # Ensure ownership
    existing = supabase.table("captain_uploads")\
        .select("id")\
        .eq("id", str(upload_id))\
        .eq("uploaded_by", user_id)\
        .limit(1)\
        .execute()

    if not existing.data:
        raise HTTPException(status_code=404, detail="Upload not found")

    supabase.table("captain_uploads").delete().eq("id", str(upload_id)).execute()
    return {"success": True, "deleted": str(upload_id)}


@router.put("/id/{upload_id}")
async def update_upload(
    upload_id: uuid.UUID,
    body: UpdateUploadRequest,
    request: Request,
    supabase = Depends(get_supabase),
):
    """
    Update an upload record (owned by current user).
    Used to persist keep/dump decisions and edited extracted data (cached in metadata).
    """
    user = await get_current_user(request)
    user_id = user.get("id")

    existing = supabase.table("captain_uploads")\
        .select("id, metadata")\
        .eq("id", str(upload_id))\
        .eq("uploaded_by", user_id)\
        .limit(1)\
        .execute()

    if not existing.data:
        raise HTTPException(status_code=404, detail="Upload not found")

    updates = {}
    if body.keep_file is not None:
        updates["keep_file"] = body.keep_file
    if body.metadata is not None and isinstance(body.metadata, dict):
        # Merge metadata shallowly
        current_meta = existing.data[0].get("metadata") or {}
        if not isinstance(current_meta, dict):
            current_meta = {}
        updates["metadata"] = {**current_meta, **body.metadata}

    if not updates:
        return {"success": True, "upload_id": str(upload_id)}

    supabase.table("captain_uploads").update(updates).eq("id", str(upload_id)).execute()
    return {"success": True, "upload_id": str(upload_id)}


@router.get("/health")
async def upload_health_check():
    """Health check for upload service"""
    return {
        "status": "healthy",
        "service": "File Upload & Processing",
        "features": {
            "file_upload": "available",
            "text_paste": "available",
            "supported_formats": ["PDF", "Word", "Excel", "Images", "Text"],
            "intelligence_extraction": "available",
            "max_file_size_mb": MAX_FILE_SIZE / 1024 / 1024
        }
    }
