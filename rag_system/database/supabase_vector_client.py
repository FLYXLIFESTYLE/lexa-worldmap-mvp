"""
Supabase pgvector client for unstructured data (trends, insights).
This replaces Qdrant and uses your existing Supabase database.
"""

from typing import List, Dict, Any, Optional
from sentence_transformers import SentenceTransformer
from config.settings import settings
import structlog
import uuid

# Supabase client
try:
    from supabase import create_client, Client
except ImportError:
    raise ImportError("Install supabase: pip install supabase")

logger = structlog.get_logger()


class SupabaseVectorClient:
    """Client for Supabase pgvector operations."""
    
    def __init__(self):
        """Initialize Supabase client and embedding model."""
        self.client: Optional[Client] = None
        self.embedding_model: Optional[SentenceTransformer] = None
        self.table_name = "travel_trends"
    
    async def connect(self):
        """Initialize connection to Supabase and load embedding model."""
        if self.client is None:
            # Connect to Supabase (use service key if available, otherwise anon key)
            key = settings.supabase_service_key or settings.supabase_key
            self.client = create_client(
                settings.supabase_url,
                key
            )
            logger.info("Connected to Supabase", url=settings.supabase_url)
        
        if self.embedding_model is None:
            # Load sentence transformer model for embeddings
            self.embedding_model = SentenceTransformer(settings.embedding_model)
            logger.info("Loaded embedding model", model=settings.embedding_model)
    
    def generate_embedding(self, text: str) -> List[float]:
        """
        Generate embedding vector for text.
        
        Args:
            text: Text to embed
        
        Returns:
            Embedding vector as list of floats
        """
        if self.embedding_model is None:
            raise RuntimeError("Embedding model not initialized. Call connect() first.")
        
        embedding = self.embedding_model.encode(text)
        return embedding.tolist()
    
    async def add_trend_data(
        self,
        text: str,
        metadata: Dict[str, Any]
    ) -> str:
        """
        Add trend data to the vector database.
        
        Args:
            text: The trend description/content
            metadata: Associated metadata (date, source, regions, tags, etc.)
        
        Returns:
            ID of the inserted row
        """
        await self.connect()
        
        # Generate embedding
        embedding = self.generate_embedding(text)
        
        # Prepare data
        data = {
            "text": text,
            "embedding": embedding,
            **metadata
        }
        
        # Insert into Supabase
        result = self.client.table(self.table_name).insert(data).execute()
        
        point_id = result.data[0]["id"] if result.data else None
        logger.info("Added trend data", id=point_id, text_length=len(text))
        return point_id
    
    async def search_trends(
        self,
        query: str,
        top_k: int = None,
        score_threshold: float = None,
        filters: Optional[Dict[str, Any]] = None
    ) -> List[Dict[str, Any]]:
        """
        Semantic search for relevant trend data using pgvector.
        
        Args:
            query: Search query
            top_k: Number of results to return (default from settings)
            score_threshold: Minimum similarity score (default from settings)
            filters: Optional metadata filters (regions, tags, etc.)
        
        Returns:
            List of matching trends with scores and metadata
        """
        await self.connect()
        
        if top_k is None:
            top_k = settings.vector_search_top_k
        
        if score_threshold is None:
            score_threshold = settings.vector_similarity_threshold
        
        # Generate query embedding
        query_embedding = self.generate_embedding(query)
        
        # Use Supabase RPC function for vector similarity search
        # We'll create this function in a separate migration
        try:
            result = self.client.rpc(
                'search_travel_trends',
                {
                    'query_embedding': query_embedding,
                    'match_threshold': score_threshold,
                    'match_count': top_k
                }
            ).execute()
            
            # Format results
            formatted_results = []
            for row in result.data:
                formatted_results.append({
                    "id": row["id"],
                    "score": 1 - row["distance"],  # Convert distance to similarity
                    "text": row["text"],
                    "metadata": {
                        "date": row.get("date"),
                        "source": row.get("source"),
                        "regions": row.get("regions", []),
                        "tags": row.get("tags", []),
                        "confidence": row.get("confidence")
                    }
                })
            
            logger.info("Trend search", 
                       query=query[:50],
                       results=len(formatted_results),
                       top_score=formatted_results[0]["score"] if formatted_results else 0)
            
            return formatted_results
            
        except Exception as e:
            # Fallback to simple query if RPC not available yet
            logger.warning("RPC function not available, using fallback", error=str(e))
            
            # Simple query without vector search (temporary)
            result = self.client.table(self.table_name).select("*").limit(top_k).execute()
            
            formatted_results = []
            for row in result.data:
                formatted_results.append({
                    "id": row["id"],
                    "score": 0.7,  # Default score
                    "text": row["text"],
                    "metadata": {
                        "date": row.get("date"),
                        "source": row.get("source"),
                        "regions": row.get("regions", []),
                        "tags": row.get("tags", []),
                        "confidence": row.get("confidence")
                    }
                })
            
            return formatted_results
    
    async def add_sample_data(self):
        """
        Add sample trend data for testing.
        Note: Sample data is already in the migration file.
        This method will update embeddings for existing rows.
        """
        await self.connect()
        
        # Fetch all rows without embeddings
        result = self.client.table(self.table_name).select("*").is_("embedding", "null").execute()
        
        if not result.data:
            logger.info("Sample data already has embeddings or doesn't exist")
            return
        
        # Generate and update embeddings
        for row in result.data:
            embedding = self.generate_embedding(row["text"])
            
            self.client.table(self.table_name).update({
                "embedding": embedding
            }).eq("id", row["id"]).execute()
        
        logger.info("Updated embeddings for sample data", count=len(result.data))


# Global vector DB client instance
vector_db_client = SupabaseVectorClient()

