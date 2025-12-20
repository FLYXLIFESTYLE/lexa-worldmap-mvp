"""
Configuration settings for the RAG system.
This file loads all environment variables and provides them to the application.
"""

from pydantic_settings import BaseSettings
from typing import List
from pathlib import Path

# Get the directory where this settings.py file is located
BASE_DIR = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    # API Configuration
    api_host: str = "0.0.0.0"
    api_port: int = 8000
    environment: str = "development"
    log_level: str = "INFO"
    
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
    
    class Config:
        env_file = str(BASE_DIR / ".env")
        case_sensitive = False
        env_file_encoding = 'utf-8'


# Global settings instance
settings = Settings()

