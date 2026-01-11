# Download Overture Places GeoJSON per destination (Windows / PowerShell)
#
# What this does (plain English):
# - Reads our destination bounding boxes from docs/destinations_bbox_mvp12.json
# - Uses the official `overturemaps` CLI (Python) to download Places inside each bbox
# - Writes one GeoJSON file per destination into data_overture/
#
# Prerequisites:
# 1) Install Python (already required by LEXA)
# 2) Install overturemaps CLI:
#    pip install overturemaps
#
# Run:
#   powershell -ExecutionPolicy Bypass -File scripts\download-overture-mvp12.ps1
#
# Then ingest each file into Supabase:
#   npm run ingest:destination -- "French Riviera" --overture "data_overture\french_riviera.geojson"

$ErrorActionPreference = "Stop"

$configPath = "docs/destinations_bbox_mvp12.json"
$outDir = "data_overture"

if (!(Test-Path $configPath)) {
  throw "Config not found: $configPath"
}

if (!(Test-Path $outDir)) {
  New-Item -ItemType Directory -Path $outDir | Out-Null
}

$cfg = Get-Content $configPath -Raw | ConvertFrom-Json
$destinations = $cfg.destinations

function Slugify([string]$s) {
  $t = $s.ToLower().Trim()
  $t = $t -replace "[^a-z0-9]+","_"
  $t = $t -replace "^_+|_+$",""
  return $t
}

Write-Host "=== Downloading Overture Places for MVP12 ==="
Write-Host "Config: $configPath"
Write-Host "Output: $outDir"

foreach ($d in $destinations) {
  $name = [string]$d.name
  $bbox = $d.bbox
  if ($null -eq $bbox -or $bbox.Count -ne 4) {
    Write-Host "Skipping $name (no bbox)" -ForegroundColor Yellow
    continue
  }

  $minLon = $bbox[0]
  $minLat = $bbox[1]
  $maxLon = $bbox[2]
  $maxLat = $bbox[3]

  $slug = Slugify $name
  $outFile = Join-Path $outDir "$slug.geojson"

  Write-Host "`n--- $name ---"
  Write-Host "bbox: $minLon,$minLat,$maxLon,$maxLat"
  Write-Host "out:  $outFile"

  # Official docs: https://docs.overturemaps.org/getting-data/overturemaps-py/
  # This downloads "places" for the bbox as GeoJSON.
  overturemaps download --bbox "$minLon,$minLat,$maxLon,$maxLat" -f geojson --type=place -o "$outFile"
}

Write-Host "`nDone. Next step: ingest each GeoJSON with npm run ingest:destination -- <name> --overture <file>"

