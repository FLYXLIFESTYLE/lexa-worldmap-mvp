"""
Captain POI Management API
Browse, edit, verify, and promote POIs
"""

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel
from typing import List, Optional, Dict
from app.services.supabase_client import get_supabase
from app.services.supabase_auth import get_current_user

router = APIRouter(prefix="/api/captain/pois", tags=["POIs"])


def _get_role(supabase, user_id: str) -> Optional[str]:
    """
    Resolve captain role from captain_profiles (best-effort).
    """
    try:
        resp = supabase.table("captain_profiles").select("role").eq("user_id", user_id).limit(1).execute()
        if resp.data and isinstance(resp.data, list) and resp.data[0]:
            return resp.data[0].get("role")
    except Exception:
        pass
    return None


def _is_admin_role(role: Optional[str]) -> bool:
    return (role or "").lower() == "admin"


class POIUpdateRequest(BaseModel):
    """Request to update a POI"""
    name: Optional[str] = None
    destination: Optional[str] = None
    category: Optional[str] = None
    description: Optional[str] = None
    address: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    confidence_score: Optional[int] = None
    luxury_score: Optional[int] = None
    price_level: Optional[int] = None
    themes: Optional[List[str]] = None
    keywords: Optional[List[str]] = None
    luxury_indicators: Optional[List[str]] = None
    insider_tips: Optional[str] = None
    best_time: Optional[str] = None
    booking_info: Optional[str] = None
    yacht_accessible: Optional[bool] = None
    marina_distance: Optional[str] = None
    verified: Optional[bool] = None
    enhanced: Optional[bool] = None


class POIVerifyRequest(BaseModel):
    """Request to verify a POI"""
    verified: bool = True
    confidence_score: Optional[int] = None


class POIPromoteRequest(BaseModel):
    """Request to promote POI to main database"""
    promote: bool = True


@router.get("/")
async def get_pois(
    request: Request,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    destination: Optional[str] = None,
    category: Optional[str] = None,
    verified: Optional[bool] = None,
    enhanced: Optional[bool] = None,
    promoted: Optional[bool] = None,
    search: Optional[str] = None,
    supabase = Depends(get_supabase)
):
    """
    Get list of extracted POIs with filters
    
    Captains see only their own POIs unless they're admins
    """
    try:
        # Auth required (so we can enforce ownership + audit trail)
        user = await get_current_user(request)
        user_id = user.get("id")
        role = _get_role(supabase, user_id)
        is_admin = _is_admin_role(role)

        # Start query
        query = supabase.table('extracted_pois').select('*', count='exact')

        # Ownership: non-admins see only their own extracted POIs
        if not is_admin:
            query = query.eq("created_by", user_id)
        
        # Apply filters
        if destination:
            query = query.ilike('destination', f'%{destination}%')
        if category:
            query = query.eq('category', category)
        if verified is not None:
            query = query.eq('verified', verified)
        if enhanced is not None:
            query = query.eq('enhanced', enhanced)
        if promoted is not None:
            query = query.eq('promoted_to_main', promoted)
        if search:
            query = query.or_(
                f'name.ilike.%{search}%,'
                f'description.ilike.%{search}%,'
                f'destination.ilike.%{search}%'
            )
        
        # Order and paginate
        query = query.order('created_at', desc=True)
        query = query.range(skip, skip + limit - 1)
        
        result = query.execute()
        
        return {
            "pois": result.data,
            "total": result.count,
            "skip": skip,
            "limit": limit
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching POIs: {str(e)}")


@router.get("/{poi_id}")
async def get_poi(poi_id: str, request: Request, supabase = Depends(get_supabase)):
    """Get a single POI by ID"""
    try:
        user = await get_current_user(request)
        user_id = user.get("id")
        role = _get_role(supabase, user_id)
        is_admin = _is_admin_role(role)

        result = supabase.table('extracted_pois')\
            .select('*')\
            .eq('id', poi_id)\
            .single()\
            .execute()
        
        if not result.data:
            raise HTTPException(status_code=404, detail="POI not found")

        if (not is_admin) and result.data.get("created_by") != user_id:
            raise HTTPException(status_code=404, detail="POI not found")
        
        return result.data
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching POI: {str(e)}")


@router.put("/{poi_id}")
async def update_poi(
    poi_id: str,
    update: POIUpdateRequest,
    request: Request,
    supabase = Depends(get_supabase)
):
    """
    Update a POI
    
    Captains can only update their own POIs unless they're admins
    """
    try:
        user = await get_current_user(request)
        user_id = user.get("id")
        role = _get_role(supabase, user_id)
        is_admin = _is_admin_role(role)

        # Build update dict (only non-None values)
        update_data = {k: v for k, v in update.dict().items() if v is not None}
        
        if not update_data:
            raise HTTPException(status_code=400, detail="No fields to update")
        
        # Add updated timestamp
        update_data['updated_at'] = 'now()'
        
        # Perform update (enforce ownership for non-admin)
        q = supabase.table('extracted_pois').update(update_data).eq('id', poi_id)
        if not is_admin:
            q = q.eq("created_by", user_id)
        result = q.execute()
        
        if not result.data:
            raise HTTPException(status_code=404, detail="POI not found or you don't have permission")
        
        return {
            "success": True,
            "message": "POI updated successfully",
            "poi": result.data[0]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating POI: {str(e)}")


@router.post("/{poi_id}/verify")
async def verify_poi(
    poi_id: str,
    verify_request: POIVerifyRequest,
    request: Request,
    supabase = Depends(get_supabase)
):
    """
    Verify a POI
    
    Only captains can verify POIs
    Verification allows increasing confidence score above 80%
    """
    try:
        user = await get_current_user(request)
        user_id = user.get("id")
        role = _get_role(supabase, user_id)
        is_admin = _is_admin_role(role)

        update_data = {
            'verified': verify_request.verified,
            'verified_at': 'now()' if verify_request.verified else None,
            'verified_by': user_id if verify_request.verified else None,
            'updated_at': 'now()'
        }
        
        # If confidence score provided and POI is being verified, allow it
        if verify_request.confidence_score is not None and verify_request.verified:
            if verify_request.confidence_score < 0 or verify_request.confidence_score > 100:
                raise HTTPException(status_code=400, detail="Confidence score must be between 0 and 100")
            update_data['confidence_score'] = verify_request.confidence_score
        
        q = supabase.table('extracted_pois').update(update_data).eq('id', poi_id)
        if not is_admin:
            q = q.eq("created_by", user_id)
        result = q.execute()
        
        if not result.data:
            raise HTTPException(status_code=404, detail="POI not found")
        
        return {
            "success": True,
            "message": f"POI {'verified' if verify_request.verified else 'unverified'} successfully",
            "poi": result.data[0]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error verifying POI: {str(e)}")


@router.post("/{poi_id}/promote")
async def promote_poi(
    poi_id: str,
    promote_request: POIPromoteRequest,
    request: Request,
    supabase = Depends(get_supabase)
):
    """
    Promote POI to main POI database and Neo4j
    
    Only verified POIs can be promoted
    This marks the POI as ready for production use by LEXA
    """
    try:
        user = await get_current_user(request)
        user_id = user.get("id")
        role = _get_role(supabase, user_id)
        is_admin = _is_admin_role(role)

        # Get the POI
        q = supabase.table('extracted_pois').select('*').eq('id', poi_id)
        if not is_admin:
            q = q.eq("created_by", user_id)
        poi_result = q.single().execute()
        
        if not poi_result.data:
            raise HTTPException(status_code=404, detail="POI not found")
        
        poi = poi_result.data
        
        # Check if verified
        if not poi.get('verified'):
            raise HTTPException(
                status_code=400,
                detail="POI must be verified before promotion"
            )
        
        # NOTE: The actual "promote into Neo4j" is performed by the Next.js API
        # route (node runtime). This endpoint marks the record as promoted.
        current_meta = poi.get("metadata") or {}
        if not isinstance(current_meta, dict):
            current_meta = {}

        result = supabase.table('extracted_pois')\
            .update({
                'promoted_to_main': promote_request.promote,
                'metadata': {
                    **current_meta,
                    'promoted_by': user_id if promote_request.promote else None,
                    'promoted_at': 'now()' if promote_request.promote else None,
                },
                'updated_at': 'now()',
            })\
            .eq('id', poi_id)\
            .execute()
        
        return {
            "success": True,
            "message": "POI promoted successfully. It will now be available to LEXA.",
            "poi": result.data[0]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error promoting POI: {str(e)}")


@router.delete("/{poi_id}")
async def delete_poi(poi_id: str, request: Request, supabase = Depends(get_supabase)):
    """
    Delete a POI
    
    Captains can only delete their own POIs unless they're admins
    """
    try:
        user = await get_current_user(request)
        user_id = user.get("id")
        role = _get_role(supabase, user_id)
        is_admin = _is_admin_role(role)

        q = supabase.table('extracted_pois').delete().eq('id', poi_id)
        if not is_admin:
            q = q.eq("created_by", user_id)
        result = q.execute()
        
        if not result.data:
            raise HTTPException(status_code=404, detail="POI not found or you don't have permission")
        
        return {
            "success": True,
            "message": "POI deleted successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting POI: {str(e)}")


@router.get("/health")
async def pois_health_check():
    """Health check for POI management"""
    return {
        "status": "healthy",
        "service": "POI Management",
        "features": {
            "browse": "available",
            "edit": "available",
            "verify": "available",
            "promote": "available",
            "delete": "available"
        }
    }
