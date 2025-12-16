#!/usr/bin/env python3
"""
Neo4j Cypher Import Runner

Automatically imports many .cypher files into Neo4j Aura using Python neo4j driver.

Usage:
    python tools/import_runner.py [--directory cypher/] [--resume] [--retries 3] [--env-file .env]

Features:
    - Recursive file discovery
    - State tracking (resume interrupted imports)
    - Retry logic for transient errors
    - Progress reporting
    - Comprehensive logging
"""

import argparse
import json
import os
import sys
import time
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Tuple

try:
    from neo4j import GraphDatabase
except ImportError:
    print("ERROR: neo4j package not installed. Install it with: pip install neo4j")
    sys.exit(1)


# Transient errors that should trigger retries
TRANSIENT_ERRORS = [
    "TransientError",
    "MemoryPoolOutOfMemoryError",
    "ServiceUnavailable",
    "Connection refused",
    "Connection timeout",
    "Temporary failure",
]


class ImportRunner:
    """Manages batch import of Cypher files into Neo4j."""
    
    def __init__(
        self,
        directory: str = "cypher",
        env_file: str = ".env",
        retries: int = 3,
        resume: bool = True,
        state_file: str = "import_state.json",
        log_dir: str = "logs"
    ):
        self.directory = Path(directory)
        self.env_file = Path(env_file)
        self.retries = retries
        self.resume = resume
        self.state_file = Path(state_file)
        self.log_dir = Path(log_dir)
        
        # Connection settings
        self.uri = None
        self.user = None
        self.password = None
        
        # State tracking
        self.state = {"files": {}, "summary": {"total": 0, "success": 0, "failed": 0, "pending": 0}}
        
        # Statistics
        self.stats = {"success": 0, "failed": 0, "skipped": 0}
        self.start_time = None
        
        # Logging
        self.log_file = None
        self.log_path = None
    
    def setup_logging(self):
        """Initialize logging to file."""
        self.log_dir.mkdir(parents=True, exist_ok=True)
        timestamp = datetime.now().strftime("%Y-%m-%d_%H%M")
        self.log_path = self.log_dir / f"import_runner_{timestamp}.log"
        self.log_file = open(self.log_path, "w", encoding="utf-8")
        self.log(f"Import Runner started at {datetime.now().isoformat()}")
        self.log(f"Directory: {self.directory.absolute()}")
        self.log(f"Resume mode: {self.resume}")
        self.log(f"Max retries: {self.retries}")
    
    def log(self, message: str):
        """Write message to log file and stdout."""
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        log_message = f"[{timestamp}] {message}"
        if self.log_file:
            self.log_file.write(log_message + "\n")
            self.log_file.flush()
        print(log_message)
    
    def read_cypher_file(self, file_path: Path) -> List[str]:
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
    
    def create_driver(self):
        """Create a Neo4j driver with optimized settings."""
        return GraphDatabase.driver(
            self.uri,
            auth=(self.user, self.password),
            max_connection_lifetime=30 * 60,  # 30 minutes
            max_connection_pool_size=10,  # Smaller pool
            connection_acquisition_timeout=60  # 60 seconds
        )
    
    def load_env(self) -> bool:
        """Load connection settings from .env file."""
        if not self.env_file.exists():
            self.log(f"ERROR: .env file not found: {self.env_file.absolute()}")
            print(f"\nCreate a .env file with:")
            print("  NEO4J_URI=neo4j+s://<id>.databases.neo4j.io")
            print("  NEO4J_USER=neo4j")
            print("  NEO4J_PASSWORD=your_password")
            print(f"\nSee .env.example for template.\n")
            return False
        
        self.log(f"Loading environment from {self.env_file}")
        
        # Simple .env parser (no external dependencies)
        env_vars = {}
        try:
            with open(self.env_file, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if not line or line.startswith("#"):
                        continue
                    if "=" in line:
                        key, value = line.split("=", 1)
                        env_vars[key.strip()] = value.strip().strip('"').strip("'")
        except Exception as e:
            self.log(f"ERROR: Failed to read .env file: {e}")
            return False
        
        # Extract required variables
        self.uri = env_vars.get("NEO4J_URI")
        self.user = env_vars.get("NEO4J_USER")
        self.password = env_vars.get("NEO4J_PASSWORD")
        
        if not self.uri or not self.user or not self.password:
            missing = []
            if not self.uri:
                missing.append("NEO4J_URI")
            if not self.user:
                missing.append("NEO4J_USER")
            if not self.password:
                missing.append("NEO4J_PASSWORD")
            
            self.log(f"ERROR: Missing required environment variables: {', '.join(missing)}")
            return False
        
        self.log(f"Loaded connection settings: URI={self.uri}, USER={self.user}")
        return True
    
    def find_cypher_files(self) -> List[Path]:
        """Find all .cypher files recursively, sorted by name."""
        if not self.directory.exists():
            self.log(f"ERROR: Directory not found: {self.directory.absolute()}")
            return []
        
        files = sorted(self.directory.rglob("*.cypher"))
        self.log(f"Found {len(files)} .cypher file(s)")
        return files
    
    def load_state(self):
        """Load import state from JSON file."""
        if self.state_file.exists():
            try:
                with open(self.state_file, "r", encoding="utf-8") as f:
                    self.state = json.load(f)
                self.log(f"Loaded state: {len(self.state.get('files', {}))} file(s) tracked")
            except json.JSONDecodeError:
                self.log(f"WARNING: State file corrupted, starting fresh")
                self.state = {"files": {}, "summary": {"total": 0, "success": 0, "failed": 0, "pending": 0}}
            except Exception as e:
                self.log(f"WARNING: Failed to load state: {e}, starting fresh")
                self.state = {"files": {}, "summary": {"total": 0, "success": 0, "failed": 0, "pending": 0}}
        else:
            self.log("No existing state file, starting fresh")
    
    def save_state(self):
        """Save import state to JSON file."""
        try:
            # Update summary
            total = len(self.state["files"])
            success = sum(1 for f in self.state["files"].values() if f["status"] == "success")
            failed = sum(1 for f in self.state["files"].values() if f["status"] == "failed")
            pending = total - success - failed
            
            self.state["summary"] = {
                "total": total,
                "success": success,
                "failed": failed,
                "pending": pending
            }
            
            with open(self.state_file, "w", encoding="utf-8") as f:
                json.dump(self.state, f, indent=2)
        except Exception as e:
            self.log(f"WARNING: Failed to save state: {e}")
    
    def is_transient_error(self, error_text: str) -> bool:
        """Check if error is transient and should be retried."""
        error_lower = error_text.lower()
        return any(transient.lower() in error_lower for transient in TRANSIENT_ERRORS)
    
    def execute_cypher_file(self, file_path: Path) -> Tuple[bool, Optional[str]]:
        """Execute Cypher file using Python neo4j driver. Returns (success, error_message)."""
        self.log(f"Executing: {file_path.name}")
        
        # Read and parse queries from file
        queries = self.read_cypher_file(file_path)
        
        if not queries:
            self.log(f"WARNING: No queries found in {file_path.name}")
            return True, None  # Empty file is considered success
        
        driver = None
        try:
            driver = self.create_driver()
            
            with driver.session() as session:
                for i, query in enumerate(queries, 1):
                    try:
                        result = session.run(query)
                        # Consume results (some queries may return data)
                        records = list(result)
                        
                        if i == 1 and records:
                            # Log first few results for first query
                            self.log(f"Query {i} returned {len(records)} row(s)")
                        
                    except Exception as e:
                        error_msg = str(e)
                        self.log(f"ERROR in query {i}/{len(queries)}: {error_msg[:200]}")
                        
                        # Check if transient error
                        if self.is_transient_error(error_msg):
                            return False, error_msg
                        else:
                            # Non-transient error, fail fast
                            return False, error_msg
                
                # Small delay between queries in same file
                if len(queries) > 1:
                    time.sleep(0.5)
            
            return True, None
            
        except Exception as e:
            error_msg = str(e)
            self.log(f"ERROR executing file: {error_msg[:200]}")
            return False, error_msg
        finally:
            if driver:
                try:
                    driver.close()
                except:
                    pass
    
    def import_file(self, file_path: Path, index: int, total: int) -> bool:
        """Import a single file with retry logic. Returns success status."""
        file_key = str(file_path.relative_to(self.directory))
        
        # Initialize file state if needed
        if file_key not in self.state["files"]:
            self.state["files"][file_key] = {
                "status": "pending",
                "attempts": 0,
                "first_attempt": None,
                "last_attempt": None,
                "completed_at": None,
                "last_error": None
            }
        
        file_state = self.state["files"][file_key]
        
        # Check if already successful (resume mode)
        if self.resume and file_state["status"] == "success":
            self.stats["skipped"] += 1
            self.log(f"Skipping (already successful): {file_path.name}")
            return True
        
        # Reset status if retrying
        if file_state["status"] != "pending":
            file_state["status"] = "pending"
        
        # Attempt import with retries
        success = False
        error_msg = None
        
        for attempt in range(1, self.retries + 1):
            # Update attempt tracking
            if file_state["first_attempt"] is None:
                file_state["first_attempt"] = datetime.now().isoformat()
            file_state["last_attempt"] = datetime.now().isoformat()
            file_state["attempts"] = attempt
            
            # Run import
            success, error_msg = self.execute_cypher_file(file_path)
            
            if success:
                file_state["status"] = "success"
                file_state["completed_at"] = datetime.now().isoformat()
                file_state["last_error"] = None
                self.stats["success"] += 1
                self.save_state()
                return True
            
            # Check if error is transient
            if error_msg and self.is_transient_error(error_msg):
                if attempt < self.retries:
                    # Calculate backoff: 5s, 20s, 60s
                    backoff_times = [5, 20, 60]
                    backoff = backoff_times[min(attempt - 1, len(backoff_times) - 1)]
                    self.log(f"Transient error detected, retrying in {backoff}s (attempt {attempt}/{self.retries})")
                    time.sleep(backoff)
                    continue
                else:
                    # Max retries reached
                    file_state["status"] = "failed"
                    file_state["last_error"] = error_msg[:500]  # Limit error length
                    self.stats["failed"] += 1
                    self.save_state()
                    return False
            else:
                # Non-transient error, fail fast
                file_state["status"] = "failed"
                file_state["last_error"] = error_msg[:500] if error_msg else "Unknown error"
                self.stats["failed"] += 1
                self.save_state()
                self.log(f"Non-transient error, failing fast: {error_msg[:200]}")
                return False
        
        # Should not reach here, but handle it
        file_state["status"] = "failed"
        file_state["last_error"] = error_msg[:500] if error_msg else "Max retries exceeded"
        self.stats["failed"] += 1
        self.save_state()
        return False
    
    def format_elapsed_time(self, seconds: float) -> str:
        """Format elapsed time as human-readable string."""
        if seconds < 60:
            return f"{int(seconds)}s"
        elif seconds < 3600:
            minutes = int(seconds // 60)
            secs = int(seconds % 60)
            return f"{minutes}m {secs}s"
        else:
            hours = int(seconds // 3600)
            minutes = int((seconds % 3600) // 60)
            return f"{hours}h {minutes}m"
    
    def print_progress(self, index: int, total: int, current_file: Path):
        """Print progress line."""
        elapsed = time.time() - self.start_time if self.start_time else 0
        elapsed_str = self.format_elapsed_time(elapsed)
        
        success_count = self.stats["success"]
        failed_count = self.stats["failed"]
        skipped_count = self.stats["skipped"]
        
        # Use simple characters for Windows compatibility
        progress_line = (
            f"[{index}/{total}] "
            f"OK: {success_count}, "
            f"FAIL: {failed_count}, "
            f"SKIP: {skipped_count} | "
            f"Elapsed: {elapsed_str} | "
            f"Processing: {current_file.name}"
        )
        
        print(progress_line)
        self.log(progress_line)
    
    def run(self):
        """Main execution loop."""
        # Pre-flight checks
        if not self.load_env():
            return 1
        
        if not self.directory.exists():
            self.log(f"ERROR: Directory does not exist: {self.directory.absolute()}")
            return 1
        
        # Setup
        self.setup_logging()
        self.load_state()
        
        # Find files
        files = self.find_cypher_files()
        if not files:
            self.log("No .cypher files found")
            return 0
        
        self.log(f"Starting import of {len(files)} file(s)")
        self.start_time = time.time()
        
        # Process each file
        try:
            for index, file_path in enumerate(files, 1):
                self.print_progress(index, len(files), file_path)
                
                success = self.import_file(file_path, index, len(files))
                
                if success:
                    self.log(f"SUCCESS: {file_path.name}")
                else:
                    self.log(f"FAILED: {file_path.name}")
                
                # Save state after each file
                self.save_state()
        
        except KeyboardInterrupt:
            self.log("\nInterrupted by user, saving state...")
            self.save_state()
            return 1
        
        # Final summary
        elapsed = time.time() - self.start_time
        elapsed_str = self.format_elapsed_time(elapsed)
        
        self.log("=" * 70)
        self.log("Import completed!")
        self.log(f"Total files: {len(files)}")
        self.log(f"Successful: {self.stats['success']}")
        self.log(f"Failed: {self.stats['failed']}")
        self.log(f"Skipped: {self.stats['skipped']}")
        self.log(f"Total time: {elapsed_str}")
        self.log(f"State saved to: {self.state_file.absolute()}")
        self.log(f"Log file: {self.log_path.absolute()}")
        self.log("=" * 70)
        
        if self.log_file:
            self.log_file.close()
        
        return 0 if self.stats["failed"] == 0 else 1


def main():
    """CLI entry point."""
    parser = argparse.ArgumentParser(
        description="Import Cypher files into Neo4j Aura using Python neo4j driver",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python tools/import_runner.py
  python tools/import_runner.py --directory cypher/
  python tools/import_runner.py --no-resume --retries 5
  python tools/import_runner.py --env-file .env.production
        """
    )
    
    parser.add_argument(
        "--directory", "-d",
        default="cypher",
        help="Directory containing .cypher files (default: cypher/)"
    )
    
    parser.add_argument(
        "--resume",
        action="store_true",
        default=True,
        help="Resume mode: skip files already marked as successful (default: True)"
    )
    
    parser.add_argument(
        "--no-resume",
        dest="resume",
        action="store_false",
        help="Disable resume mode: re-import all files"
    )
    
    parser.add_argument(
        "--retries",
        type=int,
        default=3,
        help="Maximum retry attempts for transient errors (default: 3)"
    )
    
    parser.add_argument(
        "--env-file",
        default=".env",
        help="Path to .env file (default: .env)"
    )
    
    args = parser.parse_args()
    
    runner = ImportRunner(
        directory=args.directory,
        env_file=args.env_file,
        retries=args.retries,
        resume=args.resume
    )
    
    return runner.run()


if __name__ == "__main__":
    sys.exit(main())
