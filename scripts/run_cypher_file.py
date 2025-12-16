#!/usr/bin/env python3
"""
Run a Cypher file against Neo4j database.

Usage:
    python scripts/run_cypher_file.py <cypher_file_path> [--uri URI] [--user USER] [--password PASSWORD]
    
Example:
    python scripts/run_cypher_file.py cypher/link_pois_to_destinations.cypher
"""

import sys
import argparse
import time
from pathlib import Path
from neo4j import GraphDatabase

def read_cypher_file(file_path: Path) -> str:
    """Read and parse Cypher file, splitting by semicolons."""
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()
    
    # Split by semicolons and filter out comments/empty lines
    queries = []
    current_query = []
    
    for line in content.split("\n"):
        # Skip comment-only lines
        stripped = line.strip()
        if stripped.startswith("//") or not stripped:
            continue
        
        current_query.append(line)
        
        # Check if line ends with semicolon
        if ";" in line:
            query = "\n".join(current_query).strip()
            if query:
                queries.append(query)
            current_query = []
    
    # Add any remaining query
    if current_query:
        query = "\n".join(current_query).strip()
        if query:
            queries.append(query)
    
    return queries

def create_driver(uri: str, user: str, password: str):
    """Create a Neo4j driver with optimized settings."""
    return GraphDatabase.driver(
        uri, 
        auth=(user, password),
        max_connection_lifetime=30 * 60,  # 30 minutes
        max_connection_pool_size=10,  # Smaller pool
        connection_acquisition_timeout=60  # 60 seconds
    )

def run_query_with_retry(uri: str, user: str, password: str, query: str, max_retries: int = 3):
    """Execute a query with retry logic for connection issues."""
    for attempt in range(max_retries):
        driver = None
        try:
            # Create a fresh driver for each attempt
            driver = create_driver(uri, user, password)
            with driver.session() as session:
                result = session.run(query)
                records = list(result)
                driver.close()
                return records, None
        except Exception as e:
            error_msg = str(e)
            if driver:
                try:
                    driver.close()
                except:
                    pass
            if attempt < max_retries - 1:
                wait_time = 3 * (attempt + 1)  # 3s, 6s, 9s
                print(f"  Connection error (attempt {attempt + 1}/{max_retries}), retrying in {wait_time}s...")
                time.sleep(wait_time)
            else:
                return None, error_msg
    return None, "Max retries exceeded"

def run_cypher_file(uri: str, user: str, password: str, file_path: Path):
    """Execute Cypher file against Neo4j database."""
    queries = read_cypher_file(file_path)
    
    print(f"Found {len(queries)} query/queries in {file_path}")
    print("-" * 60)
    
    for i, query in enumerate(queries, 1):
        print(f"\nExecuting query {i}/{len(queries)}...")
        print("-" * 60)
        
        # Add a small delay between queries to avoid overwhelming the connection
        if i > 1:
            time.sleep(1)
        
        records, error = run_query_with_retry(uri, user, password, query)
        
        if error:
            print(f"ERROR executing query {i}:")
            print(f"  {error}")
            print(f"\nQuery was:\n{query[:200]}...")
            continue
        
        if records:
            print(f"Results ({len(records)} rows):")
            for record in records[:10]:  # Show first 10 rows
                print(f"  {dict(record)}")
            if len(records) > 10:
                print(f"  ... and {len(records) - 10} more rows")
        else:
            print("Query executed successfully (no rows returned)")
    
    print("\n" + "=" * 60)
    print("All queries completed!")

def main():
    parser = argparse.ArgumentParser(description="Run Cypher file against Neo4j")
    parser.add_argument("file", type=Path, help="Path to Cypher file")
    parser.add_argument("--uri", default="neo4j+s://c8824672.databases.neo4j.io", 
                       help="Neo4j URI (default: neo4j+s://c8824672.databases.neo4j.io)")
    parser.add_argument("--user", default="neo4j", help="Neo4j username (default: neo4j)")
    parser.add_argument("--password", help="Neo4j password (will prompt if not provided)")
    
    args = parser.parse_args()
    
    if not args.file.exists():
        print(f"Error: File not found: {args.file}")
        sys.exit(1)
    
    password = args.password
    if not password:
        import getpass
        password = getpass.getpass("Neo4j password: ")
    
    run_cypher_file(args.uri, args.user, password, args.file)

if __name__ == "__main__":
    main()


