"""
Configuration settings for the RAG system using existing environment variables.
This version reuses your current .env variables from the main project.
"""

from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    # API Configuration
    api_host: str = "0.0.0.0"
    api_port: int = 8000
    environment: str = "development"
    
    # Neo4j Configuration (REUSE EXISTING)
    # These should already be in your .env:
    # NEO4J_URI, NEO4J_USER, NEO4J_PASSWORD
    neo4j_uri: str
    neo4j_user: str
    neo4j_password: str
    neo4j_database: str = "neo4j"  # Can use same database or create "lexa-rag"
    
    # Supabase Configuration (REUSE EXISTING)
    # These should already be in your .env:
    # NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY
    # SUPABASE_SERVICE_ROLE_KEY (backend only)
    supabase_url: str
    supabase_anon_key: str
    supabase_service_key: str  # For backend operations
    
    # LLM Configuration (REUSE EXISTING)
    # ANTHROPIC_API_KEY should already be in your .env
    anthropic_api_key: str = ""
    openai_api_key: str = ""
    default_llm: str = "anthropic"
    model_name: str = "claude-3-sonnet-20240229"
    
    # Embedding Model
    embedding_model: str = "sentence-transformers/all-MiniLM-L6-v2"
    
    # Security
    session_secret: str
    max_violations_per_session: int = 3
    
    # RAG Configuration
    vector_search_top_k: int = 5
    vector_similarity_threshold: float = 0.7
    min_confidence_score: float = 0.5
    confident_threshold: float = 0.8
    
    # Privacy Contact
    privacy_email: str = "privacy@example.com"
    privacy_contact: str = "privacy@example.com"
    
    # Regions
    supported_regions: str = "Baden-Württemberg,Bavaria,North Rhine-Westphalia"
    
    @property
    def regions_list(self) -> List[str]:
        """Returns supported regions as a list."""
        return [r.strip() for r in self.supported_regions.split(",")]
    
    class Config:
        env_file = ".env"
        case_sensitive = False
        # Allow reading from NEXT_PUBLIC_ prefixed vars
        extra = "allow"


# Global settings instance
settings = Settings()

