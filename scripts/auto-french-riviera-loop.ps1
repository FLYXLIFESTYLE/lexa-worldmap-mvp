# Automated French Riviera Super Enrichment Loop
# This script runs continuously until French Riviera is 100% enriched

param(
    [int]$MaxBatches = 120,  # Default: 120 batches = 6,000 POIs
    [int]$DelayMinutes = 30   # Wait 30 minutes between batches
)

$ErrorActionPreference = "Continue"
$WorkingDir = "C:\Users\chris\OneDrive\Cursor_LEXA_MVP\lexa-worldmap-mvp"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  French Riviera Auto-Enrichment Loop" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Configuration:" -ForegroundColor Yellow
Write-Host "  Max Batches: $MaxBatches" -ForegroundColor White
Write-Host "  Delay: $DelayMinutes minutes" -ForegroundColor White
Write-Host "  Working Dir: $WorkingDir" -ForegroundColor White
Write-Host ""

# Change to project directory
Set-Location $WorkingDir

$batchCount = 0
$successCount = 0
$errorCount = 0
$startTime = Get-Date

for ($i = 1; $i -le $MaxBatches; $i++) {
    $batchCount++
    $currentTime = Get-Date -Format "HH:mm:ss"
    
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "  Batch $i of $MaxBatches - $currentTime" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    
    try {
        # Run the super enrichment script
        $output = npx ts-node scripts/super-enrich-french-riviera.ts 2>&1
        
        # Display output
        Write-Host $output
        
        # Check if batch was successful
        if ($LASTEXITCODE -eq 0) {
            $successCount++
            Write-Host ""
            Write-Host "✅ Batch $i completed successfully!" -ForegroundColor Green
        } else {
            $errorCount++
            Write-Host ""
            Write-Host "⚠️  Batch $i completed with errors (exit code: $LASTEXITCODE)" -ForegroundColor Yellow
        }
    }
    catch {
        $errorCount++
        Write-Host ""
        Write-Host "❌ Batch $i failed: $_" -ForegroundColor Red
    }
    
    # Calculate progress
    $elapsedTime = (Get-Date) - $startTime
    $avgTimePerBatch = $elapsedTime.TotalMinutes / $batchCount
    $estimatedRemainingTime = $avgTimePerBatch * ($MaxBatches - $batchCount)
    
    Write-Host ""
    Write-Host "Progress Summary:" -ForegroundColor Cyan
    Write-Host "  Batches completed: $batchCount / $MaxBatches" -ForegroundColor White
    Write-Host "  Success: $successCount | Errors: $errorCount" -ForegroundColor White
    Write-Host "  Elapsed time: $([math]::Round($elapsedTime.TotalHours, 1)) hours" -ForegroundColor White
    Write-Host "  Est. remaining: $([math]::Round($estimatedRemainingTime / 60, 1)) hours" -ForegroundColor White
    
    # Check if we should continue
    if ($i -lt $MaxBatches) {
        Write-Host ""
        Write-Host "⏳ Waiting $DelayMinutes minutes before next batch..." -ForegroundColor Yellow
        Write-Host "   (Press Ctrl+C to stop)" -ForegroundColor Gray
        
        # Wait with countdown
        for ($min = $DelayMinutes; $min -gt 0; $min--) {
            Write-Host "   $min minutes remaining..." -ForegroundColor Gray
            Start-Sleep -Seconds 60
        }
    }
}

# Final summary
$totalTime = (Get-Date) - $startTime

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  ENRICHMENT LOOP COMPLETE!" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Final Statistics:" -ForegroundColor Yellow
Write-Host "  Total batches: $batchCount" -ForegroundColor White
Write-Host "  Successful: $successCount" -ForegroundColor Green
Write-Host "  Errors: $errorCount" -ForegroundColor $(if($errorCount -eq 0){"Green"}else{"Yellow"})
Write-Host "  Total time: $([math]::Round($totalTime.TotalHours, 1)) hours" -ForegroundColor White
Write-Host "  Est. POIs enriched: $($successCount * 50)" -ForegroundColor White
Write-Host ""
Write-Host "✅ French Riviera enrichment complete!" -ForegroundColor Green
Write-Host "   Check progress in ChatNeo4j: 'Show French Riviera enrichment stats'" -ForegroundColor Cyan
Write-Host ""

