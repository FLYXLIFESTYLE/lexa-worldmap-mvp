#!/usr/bin/env python3
"""
OpenStreetMap POI Collector using Overpass API

Usage:
    python scripts/osm_collector.py config.json

Example config.json:
{
    "destinations": [
        {
            "name": "French Riviera",
            "bbox": [6.5, 43.2, 7.5, 43.8]
        }
    ]
}
"""

import json
import sys
import time
import requests
from pathlib import Path
from typing import Dict, List, Any, Optional
from collections import defaultdict


class OverpassCollector:
    """Collects POIs from OpenStreetMap using Overpass API."""
    
    OVERPASS_URL = "https://overpass-api.de/api/interpreter"
    RETRY_DELAY = 5
    MAX_RETRIES = 3
    
    # Tags to query
    TOURISM_TAGS = ["hotel", "museum", "attraction", "viewpoint"]
    AMENITY_TAGS = ["restaurant", "bar", "cafe", "spa", "nightclub"]
    LEISURE_TAGS = ["marina", "beach_resort", "park"]
    NATURAL_TAGS = ["beach", "reef", "bay", "peak"]
    AEROWAY_TAGS = ["heliport", "aerodrome"]
    MAN_MADE_TAGS = ["pier"]
    SHOP_TAGS = ["luxury", "jewelry", "fashion", "watches"]
    
    def __init__(self, output_dir: str = "data_raw"):
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)
    
    def build_overpass_query(self, bbox: List[float]) -> str:
        """Build Overpass QL query for all required tags."""
        min_lon, min_lat, max_lon, max_lat = bbox
        
        query_parts = []
        
        # Tourism tags
        for tag in self.TOURISM_TAGS:
            query_parts.append(f'node["tourism"="{tag}"]({min_lat},{min_lon},{max_lat},{max_lon});')
            query_parts.append(f'way["tourism"="{tag}"]({min_lat},{min_lon},{max_lat},{max_lon});')
            query_parts.append(f'relation["tourism"="{tag}"]({min_lat},{min_lon},{max_lat},{max_lon});')
        
        # Amenity tags
        for tag in self.AMENITY_TAGS:
            query_parts.append(f'node["amenity"="{tag}"]({min_lat},{min_lon},{max_lat},{max_lon});')
            query_parts.append(f'way["amenity"="{tag}"]({min_lat},{min_lon},{max_lat},{max_lon});')
            query_parts.append(f'relation["amenity"="{tag}"]({min_lat},{min_lon},{max_lat},{max_lon});')
        
        # Leisure tags
        for tag in self.LEISURE_TAGS:
            query_parts.append(f'node["leisure"="{tag}"]({min_lat},{min_lon},{max_lat},{max_lon});')
            query_parts.append(f'way["leisure"="{tag}"]({min_lat},{min_lon},{max_lat},{max_lon});')
            query_parts.append(f'relation["leisure"="{tag}"]({min_lat},{min_lon},{max_lat},{max_lon});')
        
        # Natural tags
        for tag in self.NATURAL_TAGS:
            query_parts.append(f'node["natural"="{tag}"]({min_lat},{min_lon},{max_lat},{max_lon});')
            query_parts.append(f'way["natural"="{tag}"]({min_lat},{min_lon},{max_lat},{max_lon});')
            query_parts.append(f'relation["natural"="{tag}"]({min_lat},{min_lon},{max_lat},{max_lon});')
        
        # Sport tags (all)
        query_parts.append(f'node["sport"]({min_lat},{min_lon},{max_lat},{max_lon});')
        query_parts.append(f'way["sport"]({min_lat},{min_lon},{max_lat},{max_lon});')
        query_parts.append(f'relation["sport"]({min_lat},{min_lon},{max_lat},{max_lon});')
        
        # Aeroway tags
        for tag in self.AEROWAY_TAGS:
            query_parts.append(f'node["aeroway"="{tag}"]({min_lat},{min_lon},{max_lat},{max_lon});')
            query_parts.append(f'way["aeroway"="{tag}"]({min_lat},{min_lon},{max_lat},{max_lon});')
            query_parts.append(f'relation["aeroway"="{tag}"]({min_lat},{min_lon},{max_lat},{max_lon});')
        
        # Man made tags
        for tag in self.MAN_MADE_TAGS:
            query_parts.append(f'node["man_made"="{tag}"]({min_lat},{min_lon},{max_lat},{max_lon});')
            query_parts.append(f'way["man_made"="{tag}"]({min_lat},{min_lon},{max_lat},{max_lon});')
            query_parts.append(f'relation["man_made"="{tag}"]({min_lat},{min_lon},{max_lat},{max_lon});')
        
        # Harbour tags (all)
        query_parts.append(f'node["harbour"]({min_lat},{min_lon},{max_lat},{max_lon});')
        query_parts.append(f'way["harbour"]({min_lat},{min_lon},{max_lat},{max_lon});')
        query_parts.append(f'relation["harbour"]({min_lat},{min_lon},{max_lat},{max_lon});')
        
        # Shop tags
        for tag in self.SHOP_TAGS:
            query_parts.append(f'node["shop"="{tag}"]({min_lat},{min_lon},{max_lat},{max_lon});')
            query_parts.append(f'way["shop"="{tag}"]({min_lat},{min_lon},{max_lat},{max_lon});')
            query_parts.append(f'relation["shop"="{tag}"]({min_lat},{min_lon},{max_lat},{max_lon});')
        
        query = f"""
[out:json][timeout:180];
(
{''.join(query_parts)}
);
out center meta;
"""
        return query
    
    def query_overpass(self, query: str) -> Dict[str, Any]:
        """Query Overpass API with retry logic."""
        for attempt in range(self.MAX_RETRIES):
            try:
                response = requests.post(
                    self.OVERPASS_URL,
                    data={"data": query},
                    timeout=300,
                    headers={"User-Agent": "OSM-POI-Collector/1.0"}
                )
                response.raise_for_status()
                return response.json()
            except requests.exceptions.RequestException as e:
                if attempt < self.MAX_RETRIES - 1:
                    wait_time = self.RETRY_DELAY * (attempt + 1)
                    print(f"Query failed, retrying in {wait_time}s... (attempt {attempt + 1}/{self.MAX_RETRIES})")
                    time.sleep(wait_time)
                else:
                    raise Exception(f"Overpass API query failed after {self.MAX_RETRIES} attempts: {e}")
    
    def extract_coordinates(self, element: Dict[str, Any]) -> Optional[tuple]:
        """Extract lat/lon from OSM element."""
        if element.get("type") == "node":
            return (element.get("lat"), element.get("lon"))
        elif element.get("type") in ["way", "relation"]:
            # Use center if available
            if "center" in element:
                return (element["center"].get("lat"), element["center"].get("lon"))
            # Fallback to geometry if available
            if "geometry" in element and element["geometry"]:
                coords = element["geometry"][0]
                return (coords.get("lat"), coords.get("lon"))
        return None
    
    def process_elements(self, data: Dict[str, Any], destination_name: str) -> List[Dict[str, Any]]:
        """Process OSM elements and convert to output format."""
        seen_ids = set()
        results = []
        
        for element in data.get("elements", []):
            osm_type = element.get("type")
            osm_id = element.get("id")
            source_id = f"osm_{osm_type}_{osm_id}"
            
            # Deduplicate by source_id
            if source_id in seen_ids:
                continue
            seen_ids.add(source_id)
            
            # Extract coordinates
            coords = self.extract_coordinates(element)
            if not coords:
                continue
            
            lat, lon = coords
            
            # Extract tags
            tags = element.get("tags", {})
            
            # Extract name
            name = tags.get("name", tags.get("name:en", ""))
            
            # Build result
            result = {
                "source": "osm",
                "source_id": source_id,
                "name": name,
                "lat": lat,
                "lon": lon,
                "tags": tags,
                "destination_name": destination_name,
                "osm_type": osm_type
            }
            
            results.append(result)
        
        return results
    
    def collect_destination(self, destination: Dict[str, Any]) -> None:
        """Collect POIs for a single destination."""
        name = destination["name"]
        bbox = destination["bbox"]
        
        print(f"Collecting POIs for {name}...")
        
        query = self.build_overpass_query(bbox)
        data = self.query_overpass(query)
        
        results = self.process_elements(data, name)
        
        # Write JSONL file
        output_file = self.output_dir / f"{name.replace(' ', '_').lower()}.jsonl"
        with open(output_file, "w", encoding="utf-8") as f:
            for result in results:
                f.write(json.dumps(result, ensure_ascii=False) + "\n")
        
        print(f"Collected {len(results)} POIs for {name} -> {output_file}")
    
    def collect_all(self, config_path: str) -> None:
        """Collect POIs for all destinations in config."""
        with open(config_path, "r", encoding="utf-8") as f:
            config = json.load(f)
        
        destinations = config.get("destinations", [])
        
        for destination in destinations:
            try:
                self.collect_destination(destination)
                # Be polite to Overpass API
                time.sleep(2)
            except Exception as e:
                print(f"Error collecting {destination.get('name', 'unknown')}: {e}")
                continue


def main():
    """Main entry point."""
    if len(sys.argv) < 2:
        print("Usage: python scripts/osm_collector.py <config.json>")
        sys.exit(1)
    
    config_path = sys.argv[1]
    
    if not Path(config_path).exists():
        print(f"Error: Config file not found: {config_path}")
        sys.exit(1)
    
    collector = OverpassCollector()
    collector.collect_all(config_path)


if __name__ == "__main__":
    main()

