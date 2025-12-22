"""
Main FastAPI application for the RAG chatbot system.
This is the entry point for the API.
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import structlog
import sys

from config.settings import settings
from database.neo4j_client import neo4j_client
from database.supabase_vector_client import vector_db_client
from database.account_manager import initialize_account_manager
from database.client_sync_service import initialize_client_sync_service
from core.ailessia.script_composer import initialize_script_composer
from core.aibert.desire_anticipator import initialize_desire_anticipator
from core.ailessia.personality_mirror import initialize_personality_mirror
from core.ailessia.emotion_interpreter import initialize_emotion_interpreter
from core.ailessia.context_extractor import initialize_context_extractor
from api.routes import chat, health

# Configure structured logging
structlog.configure(
    processors=[
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.add_log_level,
        structlog.processors.JSONRenderer()
    ]
)

logger = structlog.get_logger()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Lifecycle manager for the FastAPI application.
    Handles startup and shutdown events.
    """
    # Startup
    logger.info("Starting RAG System API", environment=settings.environment)
    
    try:
        # Connect to databases
        await neo4j_client.connect()
        logger.info("Neo4j connected")
        
        await vector_db_client.connect()
        logger.info(
            "Supabase connected",
            embeddings_enabled=bool(getattr(settings, "enable_embeddings", False))
        )
        
        # Initialize Account Manager with Supabase client
        initialize_account_manager(vector_db_client.client)
        logger.info("Account Manager initialized")
        
        # Initialize AIlessia components
        initialize_desire_anticipator(neo4j_client)
        logger.info("Desire Anticipator initialized")
        
        # Initialize Script Composer (optionally with Claude client)
        claude_client = None
        if settings.anthropic_api_key:
            try:
                from anthropic import Anthropic
                claude_client = Anthropic(api_key=settings.anthropic_api_key)
                logger.info("Claude client initialized")
            except ImportError:
                logger.warning("Anthropic library not available, script composer will use templates only")
        
        initialize_script_composer(neo4j_client, claude_client)
        logger.info("Script Composer initialized")

        # Initialize conversational intelligence modules with Claude (if available)
        initialize_personality_mirror(claude_client)
        logger.info("Personality Mirror initialized")

        initialize_emotion_interpreter(claude_client)
        logger.info("Emotion Interpreter initialized")

        initialize_context_extractor(claude_client)
        logger.info("Context Extractor initialized")
        
        # Initialize Client Sync Service (for marketing & tracking)
        from database.account_manager import account_manager
        initialize_client_sync_service(neo4j_client, account_manager)
        logger.info("Client Sync Service initialized (Marketing enabled)")
        
        # Verify connections
        neo4j_ok = await neo4j_client.verify_connection()
        if not neo4j_ok:
            logger.error("Neo4j connection verification failed")
            sys.exit(1)
        
        logger.info("All databases ready, LEXA fully initialized")
        
    except Exception as e:
        logger.error("Startup failed", error=str(e))
        sys.exit(1)
    
    yield
    
    # Shutdown
    logger.info("Shutting down RAG System API")
    await neo4j_client.close()
    logger.info("Databases closed")


# Create FastAPI app
app = FastAPI(
    title="LEXA RAG System API",
    description="Retrieval Augmented Generation system for travel chatbot with security and anti-hallucination features",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_allow_origins_list,  # In production, set CORS_ALLOW_ORIGINS to your Vercel domain(s)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(health.router, prefix="/api", tags=["Health"])
app.include_router(chat.router, prefix="/api", tags=["Chat"])

# Import LEXA router (module name kept as `ailessia` for compatibility)
try:
    from api.routes import ailessia
    # Backwards compatible path used by the current frontend client:
    app.include_router(ailessia.router, prefix="/api/ailessia", tags=["LEXA"])
    # Brand-correct alias:
    app.include_router(ailessia.router, prefix="/api/lexa", tags=["LEXA"])
    logger.info("LEXA routes loaded (aliases: /api/ailessia and /api/lexa)")
except ImportError as e:
    logger.warning("LEXA routes not loaded", error=str(e))


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "message": "LEXA RAG System API",
        "version": "1.0.0",
        "status": "running",
        "environment": settings.environment
    }


if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(
        "api.main:app",
        host=settings.api_host,
        port=settings.api_port,
        reload=settings.environment == "development"
    )

