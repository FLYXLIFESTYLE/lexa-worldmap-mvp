#!/usr/bin/env python3
"""
Neo4j Cypher Generator - Generates Cypher import scripts from mapped POI data

Usage:
    python scripts/neo4j_cypher_generator.py

Reads all data_mapped/*.jsonl files and generates Cypher import scripts in cypher/.
"""

import json
from pathlib import Path
from datetime import datetime, timezone
from typing import Dict, List, Any


class CypherGenerator:
    """Generates Cypher import scripts for Neo4j."""
    
    def __init__(self, output_dir: str = "cypher", batch_size: int = 2000, mvp_mode: bool = True):
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self.timestamp = datetime.now(timezone.utc).isoformat()
        self.batch_size = batch_size
        self.mvp_mode = mvp_mode
        
        # Destination-specific batch sizes
        self.destination_batch_sizes = {
            "Adriatic (North)": 500,
            "Adriatic (South)": 500,
            "Adriatic (Central)": 500,
            "Adriatic": 500,
        }
    
    def generate_constraint(self) -> str:
        """Generate constraint creation Cypher."""
        # Use single property constraint that works in all Neo4j versions
        # poi_uid is set as source + ':' + source_id in the MERGE query
        cypher = """// Create unique constraint for POI nodes
// Run this ONCE before importing any POI data
CREATE CONSTRAINT poi_uid_unique IF NOT EXISTS
FOR (p:poi) REQUIRE p.poi_uid IS UNIQUE;
"""
        return cypher
    
    def generate_constraints_file(self) -> None:
        """Generate a separate constraints file that should be run once before imports."""
        constraint_content = f"""// Neo4j Constraints Setup
// Generated: {self.timestamp}
// IMPORTANT: Run this file ONCE before importing any POI data
// This ensures constraints are created on an empty database for better performance

{self.generate_constraint().strip()}
"""
        output_path = self.output_dir / "constraints.cypher"
        with open(output_path, "w", encoding="utf-8") as f:
            f.write(constraint_content)
        print(f"Generated constraints file: {output_path}")
    
    def generate_poi_nodes(self, pois_data_literal: str = None) -> str:
        """Generate Cypher to create/update POI nodes."""
        if pois_data_literal:
            unwind_clause = f"WITH {pois_data_literal} AS pois_data\nUNWIND pois_data AS poi_data"
        else:
            unwind_clause = "UNWIND $pois AS poi_data"
        
        cypher = f"""
// Create/Update POI nodes
{unwind_clause}
MERGE (p:poi {{source: poi_data.source, source_id: poi_data.source_id}})
SET p.name = poi_data.name,
    p.lat = poi_data.lat,
    p.lon = poi_data.lon,
    p.destination_name = poi_data.destination_name,
    p.updated_at = poi_data.updated_at,
    p.poi_uid = poi_data.source + ':' + poi_data.source_id;
"""
        return cypher
    
    def generate_located_in(self, pois_data_literal: str = None) -> str:
        """Generate Cypher to create LOCATED_IN relationships to place nodes (region/area/country)."""
        if pois_data_literal:
            unwind_clause = f"WITH {pois_data_literal} AS pois_data\nUNWIND pois_data AS poi_data"
        else:
            unwind_clause = "UNWIND $pois AS poi_data"
        
        cypher = f"""
// Create LOCATED_IN relationships to place nodes
{unwind_clause}
MATCH (p:poi {{source: poi_data.source, source_id: poi_data.source_id}})
MATCH (place)
WHERE place.name = poi_data.destination_name
  AND (place:region OR place:area OR place:country)
MERGE (p)-[:LOCATED_IN]->(place);
"""
        return cypher
    
    def generate_located_in_destination(self, pois_data_literal: str = None) -> str:
        """Generate Cypher to create LOCATED_IN relationships to destination nodes (MVP mode, Aura-safe)."""
        if pois_data_literal:
            unwind_clause = f"WITH {pois_data_literal} AS pois_data\nUNWIND pois_data AS poi_data"
        else:
            unwind_clause = "UNWIND $pois AS poi_data"
        
        cypher = f"""
// Create LOCATED_IN relationships to destination nodes
{unwind_clause}
MATCH (p:poi {{source: poi_data.source, source_id: poi_data.source_id}})
WITH p, poi_data.destination_name AS dest_name
CALL {{
  WITH p, dest_name
  MATCH (d:destination {{name: dest_name}})
  MERGE (p)-[:LOCATED_IN]->(d)
}} IN TRANSACTIONS OF 200 ROWS;
"""
        return cypher
    
    def generate_activity_edges(self, pois_data_literal: str = None) -> str:
        """Generate Cypher to create SUPPORTS_ACTIVITY relationships."""
        if pois_data_literal:
            unwind_clause = f"WITH {pois_data_literal} AS pois_data\nUNWIND pois_data AS poi_data"
        else:
            unwind_clause = "UNWIND $pois AS poi_data"
        
        cypher = f"""
// Create SUPPORTS_ACTIVITY relationships
{unwind_clause}
UNWIND poi_data.supports_activity AS activity
MATCH (p:poi {{source: poi_data.source, source_id: poi_data.source_id}})
MATCH (a:activity_type {{name: activity.activity_name}})
MERGE (p)-[r:SUPPORTS_ACTIVITY]->(a)
SET r.confidence = activity.confidence,
    r.evidence = activity.evidence,
    r.edge_origin = 'OSM_MAPPED',
    r.updated_at = poi_data.updated_at;
"""
        return cypher
    
    def generate_theme_edges(self, pois_data_literal: str = None) -> str:
        """Generate Cypher to create HAS_THEME relationships."""
        if pois_data_literal:
            unwind_clause = f"WITH {pois_data_literal} AS pois_data\nUNWIND pois_data AS poi_data"
        else:
            unwind_clause = "UNWIND $pois AS poi_data"
        
        cypher = f"""
// Create HAS_THEME relationships
{unwind_clause}
UNWIND poi_data.has_theme AS theme
MATCH (p:poi {{source: poi_data.source, source_id: poi_data.source_id}})
MATCH (t:theme_category {{name: theme.theme_name}})
MERGE (p)-[r:HAS_THEME]->(t)
SET r.confidence = theme.confidence,
    r.evidence = theme.evidence,
    r.edge_origin = 'OSM_MAPPED',
    r.updated_at = poi_data.updated_at;
"""
        return cypher
    
    def prepare_poi_data(self, poi: Dict[str, Any]) -> Dict[str, Any]:
        """Prepare POI data for Cypher parameters."""
        return {
            "source": poi.get("source"),
            "source_id": poi.get("source_id"),
            "name": poi.get("name"),
            "lat": poi.get("lat"),
            "lon": poi.get("lon"),
            "destination_name": poi.get("destination_name"),
            "updated_at": self.timestamp,
            "supports_activity": poi.get("supports_activity", []),
            "has_theme": poi.get("has_theme", []),
        }
    
    def generate_cypher_file(self, pois: List[Dict[str, Any]], destination_name: str) -> str:
        """Generate complete Cypher import script."""
        prepared_pois = [self.prepare_poi_data(poi) for poi in pois]
        
        cypher_lines = [
            f"// Neo4j Import Script for {destination_name}",
            f"// Generated: {self.timestamp}",
            f"// POI Count: {len(prepared_pois)}",
            "",
            self.generate_constraint(),
            "",
            "// Prepare POI data parameter",
            "// Execute the following with: CALL apoc.load.jsonParams($jsonData, {}, null) YIELD value",
            "// Or use UNWIND with parameterized query",
            "",
            self.generate_poi_nodes(prepared_pois),
            "",
            self.generate_located_in(prepared_pois),
            "",
            self.generate_activity_edges(prepared_pois),
            "",
            self.generate_theme_edges(prepared_pois),
            "",
            "// Alternative: Execute with parameters",
            "// :param pois => " + json.dumps(prepared_pois, ensure_ascii=False, indent=2),
        ]
        
        return "\n".join(cypher_lines)
    
    def escape_cypher_string(self, value: Any) -> str:
        """Escape string value for Cypher literal."""
        if value is None:
            return "null"
        elif isinstance(value, bool):
            return "true" if value else "false"
        elif isinstance(value, (int, float)):
            return str(value)
        elif isinstance(value, str):
            # Escape single quotes and backslashes
            escaped = value.replace("\\", "\\\\").replace("'", "\\'")
            return f"'{escaped}'"
        elif isinstance(value, list):
            items = [self.escape_cypher_string(item) for item in value]
            return "[" + ", ".join(items) + "]"
        elif isinstance(value, dict):
            pairs = []
            for k, v in value.items():
                # Keys don't need quotes in Cypher maps
                pairs.append(f"{k}: {self.escape_cypher_string(v)}")
            return "{" + ", ".join(pairs) + "}"
        else:
            return str(value)
    
    def generate_parameterized_cypher(self, pois: List[Dict[str, Any]], destination_name: str) -> str:
        """Generate Cypher script with inline data using WITH clause."""
        prepared_pois = [self.prepare_poi_data(poi) for poi in pois]
        
        # Build Cypher literal list
        poi_literals = []
        for poi in prepared_pois:
            poi_literal = "{"
            poi_literal += f"source: {self.escape_cypher_string(poi['source'])}, "
            poi_literal += f"source_id: {self.escape_cypher_string(poi['source_id'])}, "
            poi_literal += f"name: {self.escape_cypher_string(poi['name'])}, "
            poi_literal += f"lat: {poi['lat']}, "
            poi_literal += f"lon: {poi['lon']}, "
            poi_literal += f"destination_name: {self.escape_cypher_string(poi['destination_name'])}, "
            poi_literal += f"updated_at: {self.escape_cypher_string(poi['updated_at'])}, "
            poi_literal += f"supports_activity: {self.escape_cypher_string(poi['supports_activity'])}, "
            poi_literal += f"has_theme: {self.escape_cypher_string(poi['has_theme'])}"
            poi_literal += "}"
            poi_literals.append(poi_literal)
        
        pois_literal = "[\n    " + ",\n    ".join(poi_literals) + "\n]"
        
        # Generate queries with inline data
        constraint_cypher = self.generate_constraint().strip()
        poi_nodes_cypher = self.generate_poi_nodes(pois_literal).strip()
        located_in_cypher = self.generate_located_in(pois_literal).strip()
        activity_edges_cypher = self.generate_activity_edges(pois_literal).strip()
        theme_edges_cypher = self.generate_theme_edges(pois_literal).strip()
        
        cypher_lines = [
            f"// Neo4j Import Script for {destination_name}",
            f"// Generated: {self.timestamp}",
            f"// POI Count: {len(prepared_pois)}",
            "",
            constraint_cypher,
            "",
            poi_nodes_cypher,
            "",
            located_in_cypher,
            "",
            activity_edges_cypher,
            "",
            theme_edges_cypher,
        ]
        
        return "\n".join(cypher_lines)
    
    def generate_chunk_cypher(self, pois_chunk: List[Dict[str, Any]], destination_name: str, chunk_num: int, total_chunks: int, include_constraint: bool = False) -> str:
        """Generate Cypher script for a single chunk."""
        prepared_pois = [self.prepare_poi_data(poi) for poi in pois_chunk]
        
        # Build minimal POI data for node creation (without activities/themes to reduce size)
        poi_node_literals = []
        for poi in prepared_pois:
            poi_literal = "{"
            poi_literal += f"source: {self.escape_cypher_string(poi['source'])}, "
            poi_literal += f"source_id: {self.escape_cypher_string(poi['source_id'])}, "
            poi_literal += f"name: {self.escape_cypher_string(poi['name'])}, "
            poi_literal += f"lat: {poi['lat']}, "
            poi_literal += f"lon: {poi['lon']}, "
            poi_literal += f"destination_name: {self.escape_cypher_string(poi['destination_name'])}, "
            poi_literal += f"updated_at: {self.escape_cypher_string(poi['updated_at'])}"
            poi_literal += "}"
            poi_node_literals.append(poi_literal)
        
        pois_nodes_literal = "[\n    " + ",\n    ".join(poi_node_literals) + "\n]"
        
        # Build minimal data for LOCATED_IN (only source, source_id, destination_name)
        located_in_literals = []
        for poi in prepared_pois:
            poi_literal = "{"
            poi_literal += f"source: {self.escape_cypher_string(poi['source'])}, "
            poi_literal += f"source_id: {self.escape_cypher_string(poi['source_id'])}, "
            poi_literal += f"destination_name: {self.escape_cypher_string(poi['destination_name'])}"
            poi_literal += "}"
            located_in_literals.append(poi_literal)
        
        located_in_literal = "[\n    " + ",\n    ".join(located_in_literals) + "\n]"
        
        # Build data for activities (only source, source_id, supports_activity, updated_at)
        activity_literals = []
        for poi in prepared_pois:
            if poi.get('supports_activity'):  # Only include POIs with activities
                poi_literal = "{"
                poi_literal += f"source: {self.escape_cypher_string(poi['source'])}, "
                poi_literal += f"source_id: {self.escape_cypher_string(poi['source_id'])}, "
                poi_literal += f"supports_activity: {self.escape_cypher_string(poi['supports_activity'])}, "
                poi_literal += f"updated_at: {self.escape_cypher_string(poi['updated_at'])}"
                poi_literal += "}"
                activity_literals.append(poi_literal)
        
        activity_literal = "[\n    " + ",\n    ".join(activity_literals) + "\n]" if activity_literals else "[]"
        
        # Build data for themes (only source, source_id, has_theme, updated_at)
        theme_literals = []
        for poi in prepared_pois:
            if poi.get('has_theme'):  # Only include POIs with themes
                poi_literal = "{"
                poi_literal += f"source: {self.escape_cypher_string(poi['source'])}, "
                poi_literal += f"source_id: {self.escape_cypher_string(poi['source_id'])}, "
                poi_literal += f"has_theme: {self.escape_cypher_string(poi['has_theme'])}, "
                poi_literal += f"updated_at: {self.escape_cypher_string(poi['updated_at'])}"
                poi_literal += "}"
                theme_literals.append(poi_literal)
        
        theme_literal = "[\n    " + ",\n    ".join(theme_literals) + "\n]" if theme_literals else "[]"
        
        # Generate queries with optimized data
        cypher_lines = [
            f"// Neo4j Import Script for {destination_name} - Chunk {chunk_num}/{total_chunks}",
            f"// Generated: {self.timestamp}",
            f"// POI Count: {len(prepared_pois)}",
            f"// NOTE: Ensure constraints.cypher has been run first!",
            "",
        ]
        
        # Create POI nodes (minimal data)
        poi_nodes_cypher = self.generate_poi_nodes(pois_nodes_literal).strip()
        cypher_lines.append(poi_nodes_cypher)
        cypher_lines.append("")
        
        # Create LOCATED_IN relationships
        if self.mvp_mode:
            # MVP mode: only create LOCATED_IN to :destination nodes (skip place nodes)
            located_in_cypher = self.generate_located_in_destination(located_in_literal).strip()
            cypher_lines.append(located_in_cypher)
            cypher_lines.append("")
        else:
            # Full mode: create LOCATED_IN to place nodes (region/area/country)
            located_in_cypher = self.generate_located_in(located_in_literal).strip()
            cypher_lines.append(located_in_cypher)
            cypher_lines.append("")
        
        # Create SUPPORTS_ACTIVITY relationships (only if activities exist)
        if activity_literals:
            activity_edges_cypher = self.generate_activity_edges(activity_literal).strip()
            cypher_lines.append(activity_edges_cypher)
            cypher_lines.append("")
        
        # Create HAS_THEME relationships (only if themes exist)
        if theme_literals:
            theme_edges_cypher = self.generate_theme_edges(theme_literal).strip()
            cypher_lines.append(theme_edges_cypher)
        
        return "\n".join(cypher_lines)
    
    def process_file(self, input_path: Path) -> None:
        """Process a single JSONL file and generate Cypher chunks."""
        pois = []
        
        with open(input_path, "r", encoding="utf-8") as f:
            for line in f:
                if line.strip():
                    poi = json.loads(line)
                    pois.append(poi)
        
        if not pois:
            print(f"No POIs found in {input_path.name}")
            return
        
        # Get destination name from first POI
        destination_name = pois[0].get("destination_name", "unknown")
        
        # Use destination-specific batch size if configured, otherwise use default
        batch_size = self.destination_batch_sizes.get(destination_name, self.batch_size)
        
        # Split POIs into chunks
        total_chunks = (len(pois) + batch_size - 1) // batch_size
        
        for chunk_num in range(total_chunks):
            start_idx = chunk_num * batch_size
            end_idx = min(start_idx + batch_size, len(pois))
            pois_chunk = pois[start_idx:end_idx]
            
            # Generate Cypher script for this chunk (no constraints - use separate file)
            cypher_content = self.generate_chunk_cypher(
                pois_chunk, destination_name, chunk_num + 1, total_chunks, include_constraint=False
            )
            
            # Write Cypher file
            if total_chunks == 1:
                output_filename = input_path.stem + ".cypher"
            else:
                output_filename = f"{input_path.stem}_part{chunk_num + 1:03d}.cypher"
            output_path = self.output_dir / output_filename
            
            with open(output_path, "w", encoding="utf-8") as f:
                f.write(cypher_content)
        
        print(f"Generated {total_chunks} Cypher file(s) for {destination_name}: {len(pois)} POIs")


def main():
    """Main entry point."""
    data_mapped_dir = Path("data_mapped")
    
    if not data_mapped_dir.exists():
        print(f"Error: {data_mapped_dir} directory not found")
        return
    
    generator = CypherGenerator()
    
    # Generate constraints file first (run once before imports)
    generator.generate_constraints_file()
    
    # Process all JSONL files in data_mapped
    jsonl_files = list(data_mapped_dir.glob("*.jsonl"))
    
    if not jsonl_files:
        print(f"No JSONL files found in {data_mapped_dir}")
        return
    
    for input_file in jsonl_files:
        generator.process_file(input_file)
    
    print(f"\nCompleted generating Cypher scripts for {len(jsonl_files)} destination(s)")
    print(f"\nIMPORTANT: Run constraints.cypher ONCE before importing any POI data!")


if __name__ == "__main__":
    main()

