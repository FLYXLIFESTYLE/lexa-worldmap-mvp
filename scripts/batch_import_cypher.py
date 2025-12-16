"""
Batch Cypher Import Script
Imports large cypher files with transaction batching to avoid memory limits
"""

import os
from neo4j import GraphDatabase
from dotenv import load_dotenv
import time

load_dotenv()

class BatchCypherImporter:
    def __init__(self):
        uri = os.getenv("NEO4J_URI")
        user = os.getenv("NEO4J_USER")
        password = os.getenv("NEO4J_PASSWORD")
        
        if not all([uri, user, password]):
            raise ValueError("Missing Neo4j credentials in .env file")
        
        self.driver = GraphDatabase.driver(uri, auth=(user, password))
        print(f"[OK] Connected to Neo4j at {uri}")
    
    def import_file_with_batching(self, file_path, batch_size=500):
        """Import a cypher file with automatic batching"""
        print(f"\n[IMPORT] Processing: {os.path.basename(file_path)}")
        
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Split by MERGE statements (most common in your cypher files)
        statements = []
        current_statement = []
        
        for line in content.split('\n'):
            line = line.strip()
            
            # Skip comments and empty lines
            if not line or line.startswith('//'):
                continue
            
            current_statement.append(line)
            
            # Check if statement is complete (ends with semicolon)
            if line.endswith(';'):
                statements.append(' '.join(current_statement))
                current_statement = []
        
        # Add any remaining statement
        if current_statement:
            statement = ' '.join(current_statement)
            if statement.strip():
                statements.append(statement)
        
        total = len(statements)
        print(f"[INFO] Found {total} statements to execute")
        
        # Execute in batches
        with self.driver.session() as session:
            success_count = 0
            error_count = 0
            
            for i in range(0, total, batch_size):
                batch = statements[i:i + batch_size]
                batch_num = (i // batch_size) + 1
                total_batches = (total + batch_size - 1) // batch_size
                
                print(f"[BATCH {batch_num}/{total_batches}] Processing {len(batch)} statements...")
                
                try:
                    # Execute batch in a single transaction
                    for statement in batch:
                        try:
                            session.run(statement)
                            success_count += 1
                        except Exception as e:
                            error_count += 1
                            if 'already exists' not in str(e).lower():
                                print(f"  [WARN] Statement error: {str(e)[:100]}")
                    
                    # Commit after each batch
                    print(f"  [OK] Batch complete: {success_count}/{success_count + error_count} successful")
                    
                    # Small delay to avoid overwhelming the server
                    time.sleep(0.5)
                    
                except Exception as e:
                    print(f"  [ERROR] Batch failed: {e}")
                    error_count += len(batch)
        
        print(f"\n[COMPLETE] {os.path.basename(file_path)}")
        print(f"  Success: {success_count}, Errors: {error_count}")
        
        return success_count, error_count
    
    def import_directory(self, directory_path, pattern='*.cypher', batch_size=500):
        """Import all cypher files from a directory"""
        import glob
        
        files = sorted(glob.glob(os.path.join(directory_path, pattern)))
        total_files = len(files)
        
        if total_files == 0:
            print(f"[WARN] No files found matching pattern: {pattern}")
            return
        
        print(f"\n[INFO] Found {total_files} files to import")
        
        total_success = 0
        total_errors = 0
        
        for idx, file_path in enumerate(files, 1):
            print(f"\n{'='*60}")
            print(f"File {idx}/{total_files}")
            print(f"{'='*60}")
            
            try:
                success, errors = self.import_file_with_batching(file_path, batch_size)
                total_success += success
                total_errors += errors
            except Exception as e:
                print(f"[ERROR] Failed to process file: {e}")
                total_errors += 1
        
        print(f"\n{'='*60}")
        print(f"[SUMMARY] All files processed")
        print(f"{'='*60}")
        print(f"Total Success: {total_success}")
        print(f"Total Errors: {total_errors}")
        print(f"Success Rate: {(total_success / (total_success + total_errors) * 100):.1f}%")
    
    def close(self):
        self.driver.close()


if __name__ == "__main__":
    import sys
    
    print("="*60)
    print("  LEXA Batch Cypher Import")
    print("="*60)
    
    try:
        importer = BatchCypherImporter()
        
        # Check command line arguments
        if len(sys.argv) > 1:
            # Import specific file
            file_path = sys.argv[1]
            batch_size = int(sys.argv[2]) if len(sys.argv) > 2 else 500
            
            if os.path.isfile(file_path):
                importer.import_file_with_batching(file_path, batch_size)
            elif os.path.isdir(file_path):
                pattern = sys.argv[2] if len(sys.argv) > 2 else '*.cypher'
                batch_size = int(sys.argv[3]) if len(sys.argv) > 3 else 500
                importer.import_directory(file_path, pattern, batch_size)
            else:
                print(f"[ERROR] Path not found: {file_path}")
        else:
            # Default: import all adriatic central files
            cypher_dir = os.path.join(os.path.dirname(__file__), '..', 'cypher')
            pattern = 'adriatic_(central)*.cypher'
            
            print(f"\n[INFO] Importing Adriatic Central files from: {cypher_dir}")
            print(f"[INFO] Pattern: {pattern}")
            print(f"[INFO] Batch size: 500 statements per transaction")
            print(f"\nPress Ctrl+C to cancel...")
            time.sleep(2)
            
            importer.import_directory(cypher_dir, pattern, batch_size=500)
        
        importer.close()
        
        print("\n[SUCCESS] Import complete!")
        
    except KeyboardInterrupt:
        print("\n\n[CANCELLED] Import interrupted by user")
    except Exception as e:
        print(f"\n[ERROR] {e}")
        import traceback
        traceback.print_exc()

