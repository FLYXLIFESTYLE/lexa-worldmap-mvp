"""
Captain Portal - File Upload & Intelligence Extraction API
"""

from fastapi import APIRouter, UploadFile, File, HTTPException, Depends, Form
from pydantic import BaseModel
from typing import List, Optional
import uuid
from datetime import datetime
import os

from app.services.file_processor import process_file_auto
from app.services.multipass_extractor import run_multipass_extraction
from app.services.intelligence_storage import save_intelligence_to_db
from app.services.supabase_client import get_supabase

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
            "experience_title": exp.get("title"),
            "experience_type": exp.get("category"),
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
            "client_segment": archetype.get("name"),
            "insight_description": archetype.get("description"),
            "emotional_drivers": archetype.get("emotional_drivers"),
            "pain_points": archetype.get("pain_points"),
            "confidence": archetype.get("confidence"),
        })

    service_providers = []
    for provider in _safe_list(intel_package.get("service_providers")):
        service_providers.append({
            "name": provider.get("name"),
            "service_type": provider.get("kind"),
            "description": provider.get("description"),
            "website": provider.get("website"),
            "notes": provider.get("notes"),
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
        
        # Process file
        print(f"=== PROCESSING FILE ===")
        print(f"Temp path: {temp_path}")
        extracted_text, metadata = await process_file_auto(temp_path)
        
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
        # Note: uploaded_by and uploaded_by_email are required, using placeholder for now
        try:
            upload_record = {
                "id": upload_id,
                "filename": file.filename,
                "file_type": metadata.get("file_type", "unknown"),
                "file_size": file_size,
                "processing_status": "processing",
                "confidence_score": 80,  # Default 80% for uploads
                # uploaded_by and uploaded_by_email are nullable until auth is implemented
                "metadata": {
                    "filename": file.filename,
                    "file_size": file_size,
                    "file_type": metadata.get("file_type"),
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
            extraction_contract = await run_multipass_extraction(extracted_text, source_meta)
            final_package = extraction_contract.get("final_package", {}) or {}
            intelligence = _package_to_legacy(final_package)

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
                uploaded_by=None  # TODO: Get from auth when implemented
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
                "trends_extracted": trends_count
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
        
        upload_id = str(uuid.uuid4())
        
        # Extract intelligence via multipass
        source_meta = {
            "upload_id": upload_id,
            "filename": request.title,
            "file_type": "text",
            "text_length": len(request.text)
        }
        extraction_contract = await run_multipass_extraction(request.text, source_meta)
        final_package = extraction_contract.get("final_package", {}) or {}
        intelligence = _package_to_legacy(final_package)
        
        # Save to database
        await save_intelligence_to_db(
            supabase=supabase,
            intelligence=intelligence,
            source_type="text_paste",
            source_id=upload_id,
            source_metadata={
                "title": request.title,
                "description": request.source_description,
                "text_length": len(request.text)
            },
            uploaded_by=None  # TODO: Get from auth when implemented
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
            "file_size_kb": len(request.text.encode('utf-8')) / 1024,
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
        # Get uploads from captain_uploads table
        response = supabase.table("captain_uploads")\
            .select("*")\
            .order("uploaded_at", desc=True)\
            .range(offset, offset + limit - 1)\
            .execute()
        
        # Get total count
        count_response = supabase.table("captain_uploads")\
            .select("id", count="exact")\
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
