#!/usr/bin/env python3
"""
Simple test script to verify Neo4j connection.
"""

from neo4j import GraphDatabase

# Your connection details
URI = "neo4j+s://c8824672.databases.neo4j.io"
USER = "neo4j"
PASSWORD = "DvM2PcdNamRoq65p4P-ZBNnWCq_dqimJrKE-HOujeoY"

print("Testing Neo4j connection...")
print(f"URI: {URI}")
print(f"User: {USER}")
print("-" * 60)

try:
    # Try to create a driver
    print("Creating driver...")
    driver = GraphDatabase.driver(URI, auth=(USER, PASSWORD))
    
    # Try a simple query
    print("Testing connection with a simple query...")
    with driver.session() as session:
        result = session.run("RETURN 1 AS test")
        record = result.single()
        print(f"[OK] Connection successful! Test result: {record['test']}")
        
        # Try to get database info
        print("\nGetting database information...")
        result = session.run("CALL dbms.components() YIELD name, versions, edition")
        components = list(result)
        if components:
            print("Database components:")
            for comp in components[:3]:
                print(f"  - {comp['name']}: {comp['edition']}")
    
    driver.close()
    print("\n[OK] Connection test completed successfully!")
    
except Exception as e:
    print(f"\n[ERROR] Connection failed!")
    print(f"Error: {str(e)}")
    print(f"Error type: {type(e).__name__}")
    
    # Additional troubleshooting info
    print("\nTroubleshooting tips:")
    print("1. Check if your Neo4j Aura instance is running")
    print("2. Verify your IP address is whitelisted in Aura")
    print("3. Check if the password is correct")
    print("4. Try accessing the database via Neo4j Browser in Aura dashboard")
