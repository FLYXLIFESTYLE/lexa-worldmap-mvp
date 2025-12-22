"""
Qdrant vector database client for unstructured data (trends, insights).
This handles semantic search over market trends and booking behavior.
"""

from typing import List, Dict, Any, Optional
from qdrant_client import QdrantClient, models
from qdrant_client.http.models import Distance, VectorParams, PointStruct
from config.settings import settings
import structlog
import uuid

logger = structlog.get_logger()


class VectorDBClient:
    """Client for Qdrant vector database operations."""
    
    def __init__(self):
        """Initialize Qdrant client and embedding model."""
        self.client: Optional[QdrantClient] = None
        # Embeddings are optional. Lazy-import sentence-transformers only when enabled to
        # avoid torch memory overhead on small instances.
        self.embedding_model = None
        self.collection_name = settings.qdrant_collection_name
    
    async def connect(self):
        """Initialize connection to Qdrant and load embedding model."""
        if self.client is None:
            # Connect to Qdrant
            if settings.qdrant_api_key:
                self.client = QdrantClient(
                    host=settings.qdrant_host,
                    port=settings.qdrant_port,
                    api_key=settings.qdrant_api_key
                )
            else:
                self.client = QdrantClient(
                    host=settings.qdrant_host,
                    port=settings.qdrant_port
                )
            
            logger.info("Connected to Qdrant", 
                       host=settings.qdrant_host,
                       port=settings.qdrant_port)
        
        if self.embedding_model is None and getattr(settings, "enable_embeddings", False):
            # Load sentence transformer model for embeddings
            from sentence_transformers import SentenceTransformer  # type: ignore
            self.embedding_model = SentenceTransformer(settings.embedding_model)
            logger.info("Loaded embedding model", model=settings.embedding_model)
    
    async def create_collection(self):
        """
        Create the Qdrant collection if it doesn't exist.
        Uses the embedding model's vector size.
        """
        await self.connect()
        
        # Get vector size from embedding model
        sample_embedding = self.embedding_model.encode("test")
        vector_size = len(sample_embedding)
        
        try:
            # Check if collection exists
            collections = self.client.get_collections().collections
            collection_names = [c.name for c in collections]
            
            if self.collection_name not in collection_names:
                # Create collection
                self.client.create_collection(
                    collection_name=self.collection_name,
                    vectors_config=VectorParams(
                        size=vector_size,
                        distance=Distance.COSINE
                    )
                )
                logger.info("Created Qdrant collection", 
                           collection=self.collection_name,
                           vector_size=vector_size)
            else:
                logger.info("Qdrant collection already exists", 
                           collection=self.collection_name)
        except Exception as e:
            logger.error("Failed to create collection", error=str(e))
            raise
    
    def generate_embedding(self, text: str) -> List[float]:
        """
        Generate embedding vector for text.
        
        Args:
            text: Text to embed
        
        Returns:
            Embedding vector as list of floats
        """
        if self.embedding_model is None:
            raise RuntimeError("Embeddings are disabled or not initialized. Set ENABLE_EMBEDDINGS=true and restart.")
        
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
            ID of the inserted point
        """
        await self.connect()
        
        # Generate embedding
        embedding = self.generate_embedding(text)
        
        # Generate unique ID
        point_id = str(uuid.uuid4())
        
        # Create point
        point = PointStruct(
            id=point_id,
            vector=embedding,
            payload={
                "text": text,
                **metadata
            }
        )
        
        # Insert into Qdrant
        self.client.upsert(
            collection_name=self.collection_name,
            points=[point]
        )
        
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
        Semantic search for relevant trend data.
        
        Args:
            query: Search query
            top_k: Number of results to return (default from settings)
            score_threshold: Minimum similarity score (default from settings)
            filters: Optional metadata filters
        
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
        
        # Build filter if provided
        search_filter = None
        if filters:
            conditions = []
            for key, value in filters.items():
                if isinstance(value, list):
                    conditions.append(
                        models.FieldCondition(
                            key=key,
                            match=models.MatchAny(any=value)
                        )
                    )
                else:
                    conditions.append(
                        models.FieldCondition(
                            key=key,
                            match=models.MatchValue(value=value)
                        )
                    )
            
            if conditions:
                search_filter = models.Filter(must=conditions)
        
        # Search
        results = self.client.search(
            collection_name=self.collection_name,
            query_vector=query_embedding,
            limit=top_k,
            score_threshold=score_threshold,
            query_filter=search_filter
        )
        
        # Format results
        formatted_results = []
        for result in results:
            formatted_results.append({
                "id": result.id,
                "score": result.score,
                "text": result.payload.get("text", ""),
                "metadata": {k: v for k, v in result.payload.items() if k != "text"}
            })
        
        logger.info("Trend search", 
                   query=query[:50],
                   results=len(formatted_results),
                   top_score=formatted_results[0]["score"] if formatted_results else 0)
        
        return formatted_results
    
    async def add_sample_data(self):
        """Add sample trend data for testing."""
        await self.connect()
        await self.create_collection()
        
        sample_trends = [
            {
                "text": "Christmas markets in Bavaria see 30% increase in bookings for Winter 2024. Munich and Nuremberg are the most popular destinations, with average stay duration of 3 days.",
                "metadata": {
                    "date": "2024-12-01",
                    "source": "Booking Analytics Q4 2024",
                    "regions": ["Munich", "Bavaria"],
                    "tags": ["Winter Activities", "Christmas Markets"],
                    "confidence": 0.89
                }
            },
            {
                "text": "Wine tourism in Baden-Württemberg peaks in September and October. Stuttgart region vineyards report 45% occupancy increase during harvest season.",
                "metadata": {
                    "date": "2024-09-15",
                    "source": "Tourism Board Q3 2024",
                    "regions": ["Stuttgart", "Baden-Württemberg"],
                    "tags": ["Wine Tourism", "Culinary"],
                    "confidence": 0.92
                }
            },
            {
                "text": "Black Forest hiking trails experience highest traffic in July and August. Family-friendly routes are booked 2 months in advance on average.",
                "metadata": {
                    "date": "2024-07-20",
                    "source": "Outdoor Activity Report Summer 2024",
                    "regions": ["Black Forest", "Baden-Württemberg"],
                    "tags": ["Hiking", "Outdoor", "Family Friendly"],
                    "confidence": 0.87
                }
            },
            {
                "text": "Cultural museum visits in Stuttgart increase by 20% during winter months. Indoor activities show strong correlation with rainy weather patterns.",
                "metadata": {
                    "date": "2024-11-10",
                    "source": "Culture Tourism Analysis 2024",
                    "regions": ["Stuttgart", "Baden-Württemberg"],
                    "tags": ["Culture", "Museums", "Indoor Activities"],
                    "confidence": 0.85
                }
            }
        ]
        
        for trend in sample_trends:
            await self.add_trend_data(
                text=trend["text"],
                metadata=trend["metadata"]
            )
        
        logger.info("Added sample trend data", count=len(sample_trends))


# Global vector DB client instance
vector_db_client = VectorDBClient()

