"""
Captain Portal API: File Upload & Processing
Handles multi-format file uploads (PDF, Word, Excel, images, text)
"""

from fastapi import APIRouter, UploadFile, File, HTTPException, Depends, Form
from fastapi.responses import JSONResponse
from typing import List, Optional
import os
import uuid
from datetime import datetime
import mimetypes

# Import processing modules
from app.services.file_processor import process_pdf, process_word, process_excel, process_image, process_text
from app.services.poi_extractor import extract_pois_from_text
from app.services.supabase_client import get_supabase_client
from app.middleware.auth import get_current_user

router = APIRouter(prefix="/api/captain/upload", tags=["captain-upload"])

# Allowed file types
ALLOWED_EXTENSIONS = {
    'pdf': ['application/pdf'],
    'word': ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', 
             'application/msword'],
    'excel': ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
              'application/vnd.ms-excel'],
    'image': ['image/png', 'image/jpeg', 'image/jpg'],
    'text': ['text/plain']
}

MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB


def get_file_category(content_type: str) -> Optional[str]:
    """Determine file category from content type"""
    for category, mime_types in ALLOWED_EXTENSIONS.items():
        if content_type in mime_types:
            return category
    return None


@router.post("/files")
async def upload_files(
    files: List[UploadFile] = File(...),
    keep_file: bool = Form(True),
    confidence_score: int = Form(80),
    current_user: dict = Depends(get_current_user)
):
    """
    Upload and process multiple files
    
    - Supports: PDF, Word, Excel, images (PNG, JPEG), text files
    - Extracts POI data from file content
    - Stores in Supabase with processing status
    - Optional: Keep original file in cloud storage
    - Default confidence score: 80% (captain can adjust)
    """
    
    if not current_user.get('is_captain') and not current_user.get('is_admin'):
        raise HTTPException(status_code=403, detail="Captain access required")
    
    supabase = get_supabase_client()
    results = []
    
    for file in files:
        try:
            # Validate file size
            file_size = 0
            file_content = await file.read()
            file_size = len(file_content)
            
            if file_size > MAX_FILE_SIZE:
                results.append({
                    "filename": file.filename,
                    "status": "error",
                    "message": f"File too large ({file_size / 1024 / 1024:.1f}MB). Max 50MB."
                })
                continue
            
            # Validate file type
            content_type = file.content_type or mimetypes.guess_type(file.filename)[0]
            file_category = get_file_category(content_type)
            
            if not file_category:
                results.append({
                    "filename": file.filename,
                    "status": "error",
                    "message": f"Unsupported file type: {content_type}"
                })
                continue
            
            # Generate unique upload ID
            upload_id = str(uuid.uuid4())
            upload_timestamp = datetime.utcnow().isoformat()
            
            # Save file to temporary storage for processing
            temp_path = f"/tmp/uploads/{upload_id}_{file.filename}"
            os.makedirs(os.path.dirname(temp_path), exist_ok=True)
            with open(temp_path, 'wb') as f:
                f.write(file_content)
            
            # Process file based on type
            extracted_text = ""
            metadata = {}
            
            if file_category == 'pdf':
                extracted_text, metadata = await process_pdf(temp_path)
            elif file_category == 'word':
                extracted_text, metadata = await process_word(temp_path)
            elif file_category == 'excel':
                extracted_text, metadata = await process_excel(temp_path)
            elif file_category == 'image':
                extracted_text, metadata = await process_image(temp_path)  # OCR
            elif file_category == 'text':
                extracted_text, metadata = await process_text(temp_path)
            
            # Extract POI data from text
            extracted_pois = await extract_pois_from_text(
                extracted_text,
                confidence_score=confidence_score,
                source_file=file.filename
            )
            
            # Upload file to cloud storage if keeping
            file_url = None
            if keep_file:
                # Upload to Supabase Storage
                storage_path = f"uploads/{current_user['id']}/{upload_id}/{file.filename}"
                upload_result = supabase.storage.from_('captain-uploads').upload(
                    storage_path,
                    file_content,
                    file_options={"content-type": content_type}
                )
                file_url = supabase.storage.from_('captain-uploads').get_public_url(storage_path)
            
            # Store upload record in database
            upload_record = {
                "id": upload_id,
                "uploaded_by": current_user['id'],
                "uploaded_by_email": current_user['email'],
                "filename": file.filename,
                "file_type": file_category,
                "file_size": file_size,
                "file_url": file_url if keep_file else None,
                "keep_file": keep_file,
                "uploaded_at": upload_timestamp,
                "processing_status": "completed",
                "extracted_text_length": len(extracted_text),
                "pois_discovered": len(extracted_pois),
                "confidence_score": confidence_score,
                "metadata": {
                    **metadata,
                    "destinations": list(set([poi.get('destination') for poi in extracted_pois if poi.get('destination')])),
                    "categories": list(set([poi.get('category') for poi in extracted_pois if poi.get('category')])),
                }
            }
            
            # Insert upload record
            supabase.table('captain_uploads').insert(upload_record).execute()
            
            # Insert extracted POIs
            for poi in extracted_pois:
                poi['upload_id'] = upload_id
                poi['created_by'] = current_user['id']
                poi['created_at'] = datetime.utcnow().isoformat()
            
            if extracted_pois:
                supabase.table('extracted_pois').insert(extracted_pois).execute()
            
            # Clean up temp file
            if os.path.exists(temp_path):
                os.remove(temp_path)
            
            results.append({
                "upload_id": upload_id,
                "filename": file.filename,
                "status": "success",
                "pois_discovered": len(extracted_pois),
                "file_size": f"{file_size / 1024:.1f}KB",
                "extracted_text_length": len(extracted_text),
                "kept_file": keep_file
            })
            
        except Exception as e:
            results.append({
                "filename": file.filename,
                "status": "error",
                "message": str(e)
            })
    
    return JSONResponse(content={
        "results": results,
        "total_files": len(files),
        "successful": len([r for r in results if r['status'] == 'success']),
        "failed": len([r for r in results if r['status'] == 'error'])
    })


@router.post("/paste")
async def upload_pasted_text(
    text: str = Form(...),
    title: str = Form("Pasted Content"),
    confidence_score: int = Form(80),
    current_user: dict = Depends(get_current_user)
):
    """
    Process pasted text content
    
    - For quick manual entries without file upload
    - Captain can paste travel guides, descriptions, recommendations
    - Same extraction process as file uploads
    """
    
    if not current_user.get('is_captain') and not current_user.get('is_admin'):
        raise HTTPException(status_code=403, detail="Captain access required")
    
    if len(text) < 50:
        raise HTTPException(status_code=400, detail="Text too short (minimum 50 characters)")
    
    supabase = get_supabase_client()
    
    try:
        upload_id = str(uuid.uuid4())
        upload_timestamp = datetime.utcnow().isoformat()
        
        # Extract POI data from text
        extracted_pois = await extract_pois_from_text(
            text,
            confidence_score=confidence_score,
            source_file=f"Paste: {title}"
        )
        
        # Store upload record
        upload_record = {
            "id": upload_id,
            "uploaded_by": current_user['id'],
            "uploaded_by_email": current_user['email'],
            "filename": f"{title}.txt",
            "file_type": "paste",
            "file_size": len(text.encode('utf-8')),
            "file_url": None,
            "keep_file": False,
            "uploaded_at": upload_timestamp,
            "processing_status": "completed",
            "extracted_text_length": len(text),
            "pois_discovered": len(extracted_pois),
            "confidence_score": confidence_score,
            "metadata": {
                "title": title,
                "source": "paste",
                "destinations": list(set([poi.get('destination') for poi in extracted_pois if poi.get('destination')])),
                "categories": list(set([poi.get('category') for poi in extracted_pois if poi.get('category')])),
            }
        }
        
        supabase.table('captain_uploads').insert(upload_record).execute()
        
        # Insert extracted POIs
        for poi in extracted_pois:
            poi['upload_id'] = upload_id
            poi['created_by'] = current_user['id']
            poi['created_at'] = datetime.utcnow().isoformat()
        
        if extracted_pois:
            supabase.table('extracted_pois').insert(extracted_pois).execute()
        
        return JSONResponse(content={
            "upload_id": upload_id,
            "status": "success",
            "pois_discovered": len(extracted_pois),
            "text_length": len(text),
            "destinations": list(set([poi.get('destination') for poi in extracted_pois if poi.get('destination')])),
            "categories": list(set([poi.get('category') for poi in extracted_pois if poi.get('category')]))
        })
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Processing failed: {str(e)}")


@router.get("/history")
async def get_upload_history(
    limit: int = 50,
    offset: int = 0,
    status: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """
    Get captain's personal upload history
    
    - Only shows uploads by current captain
    - Filterable by status (completed, processing, failed)
    - Paginated results
    """
    
    if not current_user.get('is_captain') and not current_user.get('is_admin'):
        raise HTTPException(status_code=403, detail="Captain access required")
    
    supabase = get_supabase_client()
    
    try:
        query = supabase.table('captain_uploads') \
            .select('*') \
            .eq('uploaded_by', current_user['id']) \
            .order('uploaded_at', desc=True) \
            .limit(limit) \
            .offset(offset)
        
        if status:
            query = query.eq('processing_status', status)
        
        result = query.execute()
        
        # Get total count
        count_query = supabase.table('captain_uploads') \
            .select('id', count='exact') \
            .eq('uploaded_by', current_user['id'])
        
        if status:
            count_query = count_query.eq('processing_status', status)
        
        count_result = count_query.execute()
        total_count = count_result.count if hasattr(count_result, 'count') else len(count_result.data)
        
        return JSONResponse(content={
            "uploads": result.data,
            "total": total_count,
            "limit": limit,
            "offset": offset
        })
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch history: {str(e)}")


@router.delete("/{upload_id}")
async def delete_upload(
    upload_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Delete an upload and associated POIs
    
    - Captain can only delete own uploads
    - Admin can delete any upload
    - Removes file from storage if kept
    - Removes extracted POIs from database
    """
    
    if not current_user.get('is_captain') and not current_user.get('is_admin'):
        raise HTTPException(status_code=403, detail="Captain access required")
    
    supabase = get_supabase_client()
    
    try:
        # Get upload record
        upload_result = supabase.table('captain_uploads') \
            .select('*') \
            .eq('id', upload_id) \
            .single() \
            .execute()
        
        if not upload_result.data:
            raise HTTPException(status_code=404, detail="Upload not found")
        
        upload = upload_result.data
        
        # Check ownership
        if not current_user.get('is_admin') and upload['uploaded_by'] != current_user['id']:
            raise HTTPException(status_code=403, detail="Can only delete your own uploads")
        
        # Delete file from storage if it exists
        if upload.get('file_url') and upload.get('keep_file'):
            storage_path = f"uploads/{upload['uploaded_by']}/{upload_id}/{upload['filename']}"
            supabase.storage.from_('captain-uploads').remove([storage_path])
        
        # Delete extracted POIs
        supabase.table('extracted_pois').delete().eq('upload_id', upload_id).execute()
        
        # Delete upload record
        supabase.table('captain_uploads').delete().eq('id', upload_id).execute()
        
        return JSONResponse(content={
            "status": "success",
            "message": f"Upload {upload_id} deleted",
            "filename": upload['filename']
        })
        
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Delete failed: {str(e)}")
