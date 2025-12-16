# PowerShell Script to Import All Adriatic and Ionian Cypher Files
# This script will automatically import all files to Neo4j
# Each file is split into chunks of 50 rows to avoid memory errors

Write-Host "=================================" -ForegroundColor Cyan
Write-Host "NEO4J BATCH IMPORT - ADRIATIC & IONIAN" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan
Write-Host ""

# Get all cypher files matching the pattern
$cypherFiles = Get-ChildItem -Path "../cypher" -Filter "adriatic_*.cypher" | Sort-Object Name
$ionianFiles = Get-ChildItem -Path "../cypher" -Filter "ionian_*.cypher" | Sort-Object Name

$allFiles = $cypherFiles + $ionianFiles
$totalFiles = $allFiles.Count

Write-Host "Found $totalFiles files to import" -ForegroundColor Yellow
Write-Host ""

$currentFile = 0
$successCount = 0
$errorCount = 0

foreach ($file in $allFiles) {
    $currentFile++
    $percentage = [math]::Round(($currentFile / $totalFiles) * 100, 1)
    
    Write-Host "[$currentFile/$totalFiles - $percentage%] Processing: $($file.Name)" -ForegroundColor Cyan
    
    # Run the Python import script
    $result = python smart_split_cypher.py "../cypher/$($file.Name)" 2>&1
    
    # Check if successful
    if ($LASTEXITCODE -eq 0) {
        Write-Host "[OK] Imported successfully" -ForegroundColor Green
        $successCount++
    } else {
        Write-Host "[ERROR] Import failed" -ForegroundColor Red
        $errorCount++
        # Optionally, log the error
        Write-Host $result -ForegroundColor Red
    }
    
    Write-Host ""
}

Write-Host "=================================" -ForegroundColor Cyan
Write-Host "BATCH IMPORT COMPLETE" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan
Write-Host "Total files processed: $totalFiles" -ForegroundColor White
Write-Host "Successful: $successCount" -ForegroundColor Green
Write-Host "Errors: $errorCount" -ForegroundColor Red
Write-Host ""

if ($errorCount -eq 0) {
    Write-Host "[SUCCESS] All files imported successfully!" -ForegroundColor Green
} else {
    Write-Host "[WARNING] Some files failed to import. Review errors above." -ForegroundColor Yellow
}

