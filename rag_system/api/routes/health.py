"""
Health check endpoints.
"""

from fastapi import APIRouter, HTTPException
from database.neo4j_client import neo4j_client
from database.supabase_vector_client import vector_db_client
from config.settings import settings
import structlog

logger = structlog.get_logger()

router = APIRouter()


@router.get("/health")
async def health_check():
    """
    Basic health check endpoint.
    Returns status of the API and its dependencies.
    """
    try:
        # Check Neo4j connection
        neo4j_ok = await neo4j_client.verify_connection()
        
        # Check Supabase connection (simple test)
        supabase_ok = vector_db_client.client is not None
        
        health_status = {
            "status": "healthy" if (neo4j_ok and supabase_ok) else "degraded",
            "neo4j": "connected" if neo4j_ok else "disconnected",
            "supabase": "connected" if supabase_ok else "disconnected",
            "embeddings_enabled": bool(getattr(settings, "enable_embeddings", False)),
        }
        
        if not neo4j_ok or not supabase_ok:
            logger.warning("Health check shows degraded state", **health_status)
            raise HTTPException(status_code=503, detail=health_status)
        
        return health_status
        
    except Exception as e:
        logger.error("Health check failed", error=str(e))
        raise HTTPException(
            status_code=503,
            detail={"status": "unhealthy", "error": str(e)}
        )


@router.get("/health/ready")
async def readiness_check():
    """
    Readiness check for Kubernetes/container orchestration.
    Returns 200 if the service is ready to accept requests.
    """
    try:
        neo4j_ok = await neo4j_client.verify_connection()
        supabase_ok = vector_db_client.client is not None
        
        if neo4j_ok and supabase_ok:
            return {"status": "ready"}
        else:
            raise HTTPException(status_code=503, detail={"status": "not_ready"})
            
    except Exception as e:
        logger.error("Readiness check failed", error=str(e))
        raise HTTPException(status_code=503, detail={"status": "not_ready", "error": str(e)})


@router.get("/health/live")
async def liveness_check():
    """
    Liveness check for Kubernetes/container orchestration.
    Returns 200 if the service is alive (not deadlocked).
    """
    return {"status": "alive"}

