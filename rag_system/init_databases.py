"""
Database initialization script.
Run this once after setup to initialize Neo4j schema and Qdrant data.
"""

import asyncio
import sys

# Color codes
GREEN = '\033[92m'
RED = '\033[91m'
BLUE = '\033[94m'
RESET = '\033[0m'


async def initialize():
    """Initialize both databases."""
    print(f"\n{BLUE}{'='*60}{RESET}")
    print(f"{BLUE}LEXA RAG SYSTEM - Database Initialization{RESET}")
    print(f"{BLUE}{'='*60}{RESET}\n")
    
    # Step 1: Initialize Neo4j
    print(f"{BLUE}[1/3] Initializing Neo4j schema...{RESET}")
    try:
        from database.neo4j_client import neo4j_client
        await neo4j_client.initialize_schema('database/schemas/neo4j_schema.cypher')
        print(f"{GREEN}✓ Neo4j schema initialized successfully{RESET}")
        print(f"  - Created constraints and indexes")
        print(f"  - Added sample regions (Stuttgart, Munich, Black Forest)")
        print(f"  - Added sample activities (Hiking, Wine Tours, Museums, Christmas Markets)")
        print(f"  - Created relationships and tags\n")
    except Exception as e:
        print(f"{RED}✗ Failed to initialize Neo4j: {e}{RESET}")
        print(f"\n{RED}Make sure Neo4j is running and credentials in .env are correct{RESET}\n")
        sys.exit(1)
    
    # Step 2: Initialize Qdrant
    print(f"{BLUE}[2/3] Initializing Qdrant collection...{RESET}")
    try:
        from database.supabase_vector_client import vector_db_client
        await vector_db_client.connect()
        await vector_db_client.create_collection()
        print(f"{GREEN}✓ Qdrant collection created successfully{RESET}")
        print(f"  - Collection name: travel_trends")
        print(f"  - Vector size: 384 (sentence-transformers)\n")
    except Exception as e:
        print(f"{RED}✗ Failed to initialize Qdrant: {e}{RESET}")
        print(f"\n{RED}Make sure Qdrant is running (docker run -p 6333:6333 qdrant/qdrant){RESET}\n")
        sys.exit(1)
    
    # Step 3: Add sample data to Qdrant
    print(f"{BLUE}[3/3] Adding sample trend data...{RESET}")
    try:
        await vector_db_client.add_sample_data()
        print(f"{GREEN}✓ Sample trend data added successfully{RESET}")
        print(f"  - Christmas markets in Bavaria")
        print(f"  - Wine tourism trends")
        print(f"  - Black Forest hiking data")
        print(f"  - Cultural museum insights\n")
    except Exception as e:
        print(f"{RED}✗ Failed to add sample data: {e}{RESET}\n")
        sys.exit(1)
    
    # Success
    print(f"{GREEN}{'='*60}{RESET}")
    print(f"{GREEN}✓ Database initialization complete!{RESET}")
    print(f"{GREEN}{'='*60}{RESET}\n")
    
    print("Next steps:")
    print(f"  1. Run tests: {BLUE}python test_system.py{RESET}")
    print(f"  2. Start server: {BLUE}python api/main.py{RESET}")
    print()


if __name__ == "__main__":
    try:
        asyncio.run(initialize())
    except KeyboardInterrupt:
        print(f"\n{RED}Initialization interrupted by user{RESET}")
        sys.exit(1)
    except Exception as e:
        print(f"\n{RED}Fatal error: {e}{RESET}")
        sys.exit(1)

