"""
Smart Cypher File Splitter and Importer
Splits large WITH [...] AS statements into smaller chunks
Specifically designed for Neo4j Aura memory limits
"""

import os
import sys
import re
from pathlib import Path
from neo4j import GraphDatabase
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

NEO4J_URI = os.getenv('NEO4J_URI')
NEO4J_USER = os.getenv('NEO4J_USER')
NEO4J_PASSWORD = os.getenv('NEO4J_PASSWORD')

# Configuration
ROWS_PER_CHUNK = 50  # Split large data arrays into chunks of 50 rows each

def connect_neo4j():
    """Establish connection to Neo4j"""
    if not all([NEO4J_URI, NEO4J_USER, NEO4J_PASSWORD]):
        print("[ERROR] Missing Neo4j credentials in .env file")
        sys.exit(1)
    
    try:
        driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD))
        driver.verify_connectivity()
        print("[OK] Connected to Neo4j")
        return driver
    except Exception as e:
        print(f"[ERROR] Failed to connect to Neo4j: {e}")
        sys.exit(1)

def extract_statements(file_path):
    """Extract complete multi-line Cypher statements from file"""
    print(f"[INFO] Reading file: {file_path}")
    
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Remove comment-only lines first
    lines = []
    for line in content.split('\n'):
        stripped = line.strip()
        # Keep the line if it's not a comment-only line
        if not (stripped.startswith('//') and not '{' in line):
            lines.append(line)
    
    content = '\n'.join(lines)
    
    # Split by semicolon + newline or semicolon + end-of-file
    # Add a sentinel to ensure we capture the last statement
    content = content + '\n'
    
    # Split on ; followed by whitespace or newline
    raw_statements = re.split(r';\s*\n', content)
    
    statements = []
    for stmt in raw_statements:
        stmt = stmt.strip()
        # Skip empty statements and pure comment blocks
        if stmt and len(stmt) > 10:
            statements.append(stmt)
    
    print(f"[INFO] Found {len(statements)} complete statements")
    return statements

def split_with_statement(statement, rows_per_chunk):
    """
    Split a large WITH [...] AS statement into smaller chunks
    
    Example input:
    WITH [
        {row1},
        {row2},
        ...
    ] AS data
    UNWIND data AS row
    ...rest of query...
    """
    # Check if this is a WITH statement with an array
    if not statement.strip().startswith('WITH ['):
        # Not a WITH array statement, return as-is
        return [statement]
    
    # Extract the parts
    # Pattern: WITH [ ... ] AS variable_name \n REST_OF_QUERY
    match = re.match(r'WITH\s*\[(.*?)\]\s*AS\s+(\w+)(.*)', statement, re.DOTALL)
    
    if not match:
        print("[WARN] Could not parse WITH statement structure, keeping as-is")
        return [statement]
    
    array_content = match.group(1).strip()
    variable_name = match.group(2)
    rest_of_query = match.group(3).strip()
    
    # Split array content into individual rows (objects)
    # Each row is like: {key: value, key: value},
    # We need to find complete {} blocks
    rows = []
    current_row = []
    brace_count = 0
    
    for char in array_content:
        current_row.append(char)
        if char == '{':
            brace_count += 1
        elif char == '}':
            brace_count -= 1
            if brace_count == 0:
                # Complete row found
                row_str = ''.join(current_row).strip()
                # Remove trailing comma
                if row_str.endswith(','):
                    row_str = row_str[:-1].strip()
                # Remove leading comma (in case there is one)
                if row_str.startswith(','):
                    row_str = row_str[1:].strip()
                if row_str:
                    rows.append(row_str)
                current_row = []
    
    if len(rows) == 0:
        print("[WARN] No rows found in WITH array, keeping statement as-is")
        return [statement]
    
    print(f"[INFO] Statement has {len(rows)} rows, splitting into chunks of {rows_per_chunk}")
    
    # Split rows into chunks
    chunks = []
    for i in range(0, len(rows), rows_per_chunk):
        chunk_rows = rows[i:i + rows_per_chunk]
        
        # Rebuild the statement with this chunk
        chunk_array = ',\n    '.join(chunk_rows)
        new_statement = f"WITH [\n    {chunk_array}\n] AS {variable_name}\n{rest_of_query}"
        chunks.append(new_statement)
    
    print(f"[OK] Split into {len(chunks)} chunks")
    return chunks

def import_statement(driver, statement, stmt_num, chunk_num=None):
    """Import a single statement to Neo4j"""
    label = f"Statement {stmt_num}" + (f" Chunk {chunk_num}" if chunk_num else "")
    print(f"\n[IMPORT] {label}")
    
    try:
        with driver.session() as session:
            result = session.run(statement)
            summary = result.consume()
            
            # Print statistics
            counters = summary.counters
            if counters.nodes_created > 0:
                print(f"  [OK] Nodes created: {counters.nodes_created}")
            if counters.relationships_created > 0:
                print(f"  [OK] Relationships created: {counters.relationships_created}")
            if counters.properties_set > 0:
                print(f"  [OK] Properties set: {counters.properties_set}")
            
            print(f"[OK] {label} completed successfully")
            return True
    except Exception as e:
        error_msg = str(e)
        if len(error_msg) > 200:
            error_msg = error_msg[:200] + "..."
        print(f"[ERROR] {label} failed: {error_msg}")
        return False

def main():
    if len(sys.argv) < 2:
        print("Usage: python smart_split_cypher.py <cypher_file_path>")
        print("Example: python smart_split_cypher.py '../cypher/adriatic_(central)_part001.cypher'")
        sys.exit(1)
    
    cypher_file = sys.argv[1]
    
    if not os.path.exists(cypher_file):
        print(f"[ERROR] File not found: {cypher_file}")
        sys.exit(1)
    
    print("="*70)
    print("SMART CYPHER SPLITTER AND IMPORTER")
    print("="*70)
    print(f"File: {cypher_file}")
    print(f"Rows per chunk: {ROWS_PER_CHUNK}")
    print("="*70)
    
    # Connect to Neo4j
    driver = connect_neo4j()
    
    try:
        # Extract complete statements
        statements = extract_statements(cypher_file)
        
        if len(statements) == 0:
            print("[ERROR] No valid statements found in file")
            return
        
        # Process each statement
        total_success = 0
        total_errors = 0
        
        for stmt_num, statement in enumerate(statements, 1):
            print(f"\n{'='*70}")
            print(f"PROCESSING STATEMENT {stmt_num}/{len(statements)}")
            print(f"{'='*70}")
            
            # Split if it's a large WITH statement
            chunks = split_with_statement(statement, ROWS_PER_CHUNK)
            
            if len(chunks) == 1:
                # Single statement, import directly
                success = import_statement(driver, chunks[0], stmt_num)
                if success:
                    total_success += 1
                else:
                    total_errors += 1
            else:
                # Multiple chunks, import each
                for chunk_num, chunk in enumerate(chunks, 1):
                    success = import_statement(driver, chunk, stmt_num, chunk_num)
                    if success:
                        total_success += 1
                    else:
                        total_errors += 1
        
        # Final summary
        print(f"\n{'='*70}")
        print("IMPORT COMPLETE")
        print(f"{'='*70}")
        print(f"Original statements: {len(statements)}")
        print(f"Total chunks executed: {total_success + total_errors}")
        print(f"Successful: {total_success}")
        print(f"Errors: {total_errors}")
        print(f"{'='*70}")
        
        if total_errors == 0:
            print("\n[SUCCESS] All statements imported successfully!")
        else:
            print(f"\n[WARNING] Import completed with {total_errors} errors")
    
    finally:
        driver.close()
        print("[OK] Neo4j connection closed")

if __name__ == "__main__":
    main()

