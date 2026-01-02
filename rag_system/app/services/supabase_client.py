"""
Supabase Client for Captain Portal
"""

import os
from supabase import create_client, Client
from typing import Optional

class SupabaseClient:
    """Singleton Supabase client"""
    
    _instance: Optional[Client] = None
    
    @classmethod
    def get_client(cls) -> Client:
        """Get or create Supabase client"""
        if cls._instance is None:
            supabase_url = os.getenv("SUPABASE_URL")
            supabase_key = os.getenv("SUPABASE_SERVICE_KEY")
            
            if not supabase_url or not supabase_key:
                raise ValueError("SUPABASE_URL and SUPABASE_SERVICE_KEY must be set")
            
            cls._instance = create_client(supabase_url, supabase_key)
        
        return cls._instance


def get_supabase() -> Client:
    """
    Dependency for FastAPI routes
    Returns configured Supabase client
    """
    return SupabaseClient.get_client()
