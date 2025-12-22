"""
Configuration settings for the RAG system.
This file loads all environment variables and provides them to the application.
"""

from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List
from pathlib import Path

# Get the directory where this settings.py file is located
BASE_DIR = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # Pydantic Settings v2 configuration:
    # - `extra="ignore"` makes the backend robust when the environment contains
    #   unrelated variables (e.g. Next.js `NEXT_PUBLIC_*`).
    model_config = SettingsConfigDict(
        env_file=str(BASE_DIR / ".env"),
        case_sensitive=False,
        env_file_encoding="utf-8",
        extra="ignore",
    )
    
    # API Configuration
    api_host: str = "0.0.0.0"
    api_port: int = 8000
    environment: str = "development"
    log_level: str = "INFO"

    # CORS (comma-separated list). Use "*" for MVP or set to your Vercel domain(s) in production.
    cors_allow_origins: str = "*"
    
    # Neo4j Configuration
    neo4j_uri: str
    neo4j_user: str
    neo4j_password: str
    neo4j_database: str = "neo4j"
    
    # Supabase Configuration (Vector Database with pgvector)
    supabase_url: str
    supabase_key: str  # Can be anon key or service role key
    supabase_service_key: str = ""  # Optional: for admin operations
    
    # LLM Configuration
    anthropic_api_key: str = ""
    openai_api_key: str = ""
    default_llm: str = "anthropic"
    model_name: str = "claude-3-sonnet-20240229"
    
    # Embedding Model
    embedding_model: str = "sentence-transformers/all-MiniLM-L6-v2"
    enable_embeddings: bool = False
    
    # Security
    session_secret: str = "dev-secret-key-change-in-production"
    max_violations_per_session: int = 3
    
    # RAG Configuration
    vector_search_top_k: int = 5
    vector_similarity_threshold: float = 0.7
    min_confidence_score: float = 0.5
    confident_threshold: float = 0.8
    
    # Privacy Contact
    privacy_email: str = "privacy@lexa.com"
    privacy_contact: str = "privacy@lexa.com"
    
    # Regions
    supported_regions: str = "Baden-Württemberg,Bavaria,North Rhine-Westphalia"
    
    @property
    def regions_list(self) -> List[str]:
        """Returns supported regions as a list."""
        return [r.strip() for r in self.supported_regions.split(",")]

    @property
    def cors_allow_origins_list(self) -> List[str]:
        v = (self.cors_allow_origins or "*").strip()
        if v == "*":
            return ["*"]
        return [x.strip() for x in v.split(",") if x.strip()]
    
# Global settings instance
settings = Settings()

