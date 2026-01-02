"""
Captain Portal - File Upload & Intelligence Extraction API
"""

from fastapi import APIRouter, UploadFile, File, HTTPException, Depends, Form
from pydantic import BaseModel
from typing import List, Optional
import uuid
from datetime import datetime
import os

from app.services.file_processor import process_file
from app.services.intelligence_extractor import intelligence_extractor
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


@router.post("/", response_model=UploadResponse)
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
        extracted_text, metadata = await process_file(temp_path)
        
        # Clean up temp file
        if os.path.exists(temp_path):
            os.remove(temp_path)
        
        if not extracted_text or len(extracted_text) < 50:
            raise HTTPException(
                status_code=400,
                detail="Could not extract meaningful text from file"
            )
        
        # Extract intelligence with Claude AI
        intelligence = intelligence_extractor.extract_comprehensive_intelligence(
            extracted_text
        )
        
        # Save to database
        save_intelligence_to_db(
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
        
        return UploadResponse(
            upload_id=upload_id,
            filename=file.filename,
            status="completed",
            extracted_pois=len(intelligence.get("pois", [])),
            extracted_experiences=len(intelligence.get("experiences", [])),
            file_size_kb=file_size / 1024,
            message="File processed successfully"
        )
        
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Processing failed: {str(e)}")


@router.post("/text", response_model=UploadResponse)
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
        
        # Extract intelligence
        intelligence = intelligence_extractor.extract_comprehensive_intelligence(
            request.text
        )
        
        # Save to database
        save_intelligence_to_db(
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
        
        return UploadResponse(
            upload_id=upload_id,
            filename=f"{request.title}.txt",
            status="completed",
            extracted_pois=len(intelligence.get("pois", [])),
            extracted_experiences=len(intelligence.get("experiences", [])),
            file_size_kb=len(request.text.encode('utf-8')) / 1024,
            message="Text processed successfully"
        )
        
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
