#!/usr/bin/env python3
"""
Count POIs per destination from data_mapped files.
"""

from pathlib import Path
import json

data_dir = Path("data_mapped")
if not data_dir.exists():
    print(f"Error: {data_dir} directory not found")
    exit(1)

files = sorted(data_dir.glob("*.jsonl"))

if not files:
    print(f"No JSONL files found in {data_dir}")
    exit(1)

print("POIs per destination:")
print("-" * 50)
total = 0

for f in files:
    count = 0
    activities_count = 0
    themes_count = 0
    
    with open(f, "r", encoding="utf-8") as file:
        for line in file:
            if line.strip():
                poi = json.loads(line)
                count += 1
                activities_count += len(poi.get("supports_activity", []))
                themes_count += len(poi.get("has_theme", []))
    
    print(f"{f.stem:30} {count:6,} POIs  ({activities_count:,} activities, {themes_count:,} themes)")
    total += count

print("-" * 50)
print(f"{'TOTAL':30} {total:6,} POIs")

