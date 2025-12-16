"""
Split Large Cypher Files and Import to Neo4j
Splits large .cypher files into smaller chunks and imports them sequentially.
"""

import os
import sys
from pathlib import Path
from neo4j import GraphDatabase
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

NEO4J_URI = os.getenv('NEO4J_URI')
NEO4J_USER = os.getenv('NEO4J_USER')
NEO4J_PASSWORD = os.getenv('NEO4J_PASSWORD')

# Configuration
STATEMENTS_PER_FILE = 250  # Split into files with max 250 statements each
TEMP_DIR = Path('cypher/temp_chunks')

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

def parse_cypher_file(file_path):
    """Parse Cypher file and extract statements"""
    print(f"[INFO] Reading file: {file_path}")
    
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Split by semicolons to get individual statements
    statements = []
    for line in content.split('\n'):
        line = line.strip()
        
        # Skip empty lines and comments
        if not line or line.startswith('//'):
            continue
        
        statements.append(line)
    
    print(f"[INFO] Found {len(statements)} statements")
    return statements

def split_into_chunks(statements, chunk_size):
    """Split statements into chunks"""
    chunks = []
    for i in range(0, len(statements), chunk_size):
        chunks.append(statements[i:i + chunk_size])
    return chunks

def save_chunks_to_files(chunks, original_filename, temp_dir):
    """Save chunks as separate temporary files"""
    temp_dir.mkdir(parents=True, exist_ok=True)
    
    base_name = Path(original_filename).stem
    chunk_files = []
    
    for i, chunk in enumerate(chunks, 1):
        chunk_filename = temp_dir / f"{base_name}_chunk{i:03d}.cypher"
        
        with open(chunk_filename, 'w', encoding='utf-8') as f:
            f.write('\n'.join(chunk))
        
        chunk_files.append(chunk_filename)
        print(f"[OK] Created chunk {i}/{len(chunks)}: {chunk_filename.name} ({len(chunk)} statements)")
    
    return chunk_files

def import_chunk_file(driver, chunk_file):
    """Import a single chunk file to Neo4j"""
    print(f"\n[IMPORT] Processing: {chunk_file.name}")
    
    with open(chunk_file, 'r', encoding='utf-8') as f:
        statements = [line.strip() for line in f if line.strip() and not line.strip().startswith('//')]
    
    success_count = 0
    error_count = 0
    
    with driver.session() as session:
        for idx, statement in enumerate(statements, 1):
            try:
                session.run(statement)
                success_count += 1
                
                # Progress indicator every 50 statements
                if idx % 50 == 0:
                    print(f"[PROGRESS] {idx}/{len(statements)} statements processed...")
                
            except Exception as e:
                error_count += 1
                error_msg = str(e)
                if len(error_msg) > 100:
                    error_msg = error_msg[:100] + "..."
                print(f"[WARN] Statement {idx} error: {error_msg}")
    
    print(f"[OK] Chunk complete: {success_count}/{len(statements)} successful, {error_count} errors")
    return success_count, error_count

def cleanup_temp_files(temp_dir):
    """Remove temporary chunk files"""
    if temp_dir.exists():
        for chunk_file in temp_dir.glob('*.cypher'):
            chunk_file.unlink()
        temp_dir.rmdir()
        print(f"\n[OK] Cleaned up temporary files")

def main():
    if len(sys.argv) < 2:
        print("Usage: python split_and_import_cypher.py <cypher_file_path>")
        print("Example: python split_and_import_cypher.py '../cypher/adriatic_(central)_part001.cypher'")
        sys.exit(1)
    
    cypher_file = sys.argv[1]
    
    if not os.path.exists(cypher_file):
        print(f"[ERROR] File not found: {cypher_file}")
        sys.exit(1)
    
    print("="*70)
    print("NEO4J CYPHER FILE SPLITTER AND IMPORTER")
    print("="*70)
    print(f"File: {cypher_file}")
    print(f"Chunk size: {STATEMENTS_PER_FILE} statements per file")
    print("="*70)
    
    # Connect to Neo4j
    driver = connect_neo4j()
    
    try:
        # Parse the file
        statements = parse_cypher_file(cypher_file)
        
        if len(statements) == 0:
            print("[ERROR] No valid statements found in file")
            return
        
        # Split into chunks
        print(f"\n[INFO] Splitting into chunks of {STATEMENTS_PER_FILE} statements...")
        chunks = split_into_chunks(statements, STATEMENTS_PER_FILE)
        print(f"[OK] Created {len(chunks)} chunks")
        
        # Save chunks to temporary files
        print(f"\n[INFO] Saving chunks to temporary files...")
        chunk_files = save_chunks_to_files(chunks, cypher_file, TEMP_DIR)
        
        # Import each chunk
        print(f"\n[INFO] Starting import of {len(chunk_files)} chunk files...")
        total_success = 0
        total_errors = 0
        
        for i, chunk_file in enumerate(chunk_files, 1):
            print(f"\n{'='*70}")
            print(f"CHUNK {i}/{len(chunk_files)}")
            print(f"{'='*70}")
            
            success, errors = import_chunk_file(driver, chunk_file)
            total_success += success
            total_errors += errors
        
        # Final summary
        print(f"\n{'='*70}")
        print("IMPORT COMPLETE")
        print(f"{'='*70}")
        print(f"Total statements processed: {len(statements)}")
        print(f"Successful: {total_success}")
        print(f"Errors: {total_errors}")
        print(f"Success rate: {(total_success/len(statements)*100):.1f}%")
        print(f"{'='*70}")
        
        # Cleanup
        cleanup_temp_files(TEMP_DIR)
        
        if total_errors == 0:
            print("\n[SUCCESS] All statements imported successfully!")
        else:
            print(f"\n[WARNING] Import completed with {total_errors} errors")
    
    finally:
        driver.close()
        print("[OK] Neo4j connection closed")

if __name__ == "__main__":
    main()

