# Setup Windows Task Scheduler for Overnight French Riviera Enrichment
# Run this script as Administrator to create scheduled tasks

$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Overnight Enrichment Setup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if running as Administrator
$currentPrincipal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
$isAdmin = $currentPrincipal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "❌ This script must be run as Administrator!" -ForegroundColor Red
    Write-Host "   Right-click PowerShell and select 'Run as Administrator'" -ForegroundColor Yellow
    exit 1
}

# Configuration
$projectPath = "C:\Users\chris\OneDrive\Cursor_LEXA_MVP\lexa-worldmap-mvp"
$scriptPath = Join-Path $projectPath "scripts\super-enrich-french-riviera.ts"
$logPath = Join-Path $projectPath "logs\enrichment"

# Create logs directory if it doesn't exist
if (-not (Test-Path $logPath)) {
    New-Item -ItemType Directory -Path $logPath -Force | Out-Null
    Write-Host "✅ Created logs directory: $logPath" -ForegroundColor Green
}

Write-Host ""
Write-Host "Creating scheduled tasks for overnight enrichment..." -ForegroundColor Yellow
Write-Host ""

# Task 1: 11:00 PM
$action1 = New-ScheduledTaskAction `
    -Execute "npx" `
    -Argument "ts-node scripts/super-enrich-french-riviera.ts" `
    -WorkingDirectory $projectPath

$trigger1 = New-ScheduledTaskTrigger -Daily -At "11:00PM"

$settings1 = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -StartWhenAvailable `
    -RunOnlyIfNetworkAvailable

Register-ScheduledTask `
    -TaskName "LEXA_Enrich_2300" `
    -Action $action1 `
    -Trigger $trigger1 `
    -Settings $settings1 `
    -Description "LEXA French Riviera enrichment at 11:00 PM" `
    -Force

Write-Host "✅ Task 1: 11:00 PM enrichment scheduled" -ForegroundColor Green

# Task 2: 1:00 AM
$action2 = New-ScheduledTaskAction `
    -Execute "npx" `
    -Argument "ts-node scripts/super-enrich-french-riviera.ts" `
    -WorkingDirectory $projectPath

$trigger2 = New-ScheduledTaskTrigger -Daily -At "1:00AM"

$settings2 = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -StartWhenAvailable `
    -RunOnlyIfNetworkAvailable

Register-ScheduledTask `
    -TaskName "LEXA_Enrich_0100" `
    -Action $action2 `
    -Trigger $trigger2 `
    -Settings $settings2 `
    -Description "LEXA French Riviera enrichment at 1:00 AM" `
    -Force

Write-Host "✅ Task 2: 1:00 AM enrichment scheduled" -ForegroundColor Green

# Task 3: 3:00 AM
$action3 = New-ScheduledTaskAction `
    -Execute "npx" `
    -Argument "ts-node scripts/super-enrich-french-riviera.ts" `
    -WorkingDirectory $projectPath

$trigger3 = New-ScheduledTaskTrigger -Daily -At "3:00AM"

$settings3 = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -StartWhenAvailable `
    -RunOnlyIfNetworkAvailable

Register-ScheduledTask `
    -TaskName "LEXA_Enrich_0300" `
    -Action $action3 `
    -Trigger $trigger3 `
    -Settings $settings3 `
    -Description "LEXA French Riviera enrichment at 3:00 AM" `
    -Force

Write-Host "✅ Task 3: 3:00 AM enrichment scheduled" -ForegroundColor Green

# Task 4: 5:00 AM
$action4 = New-ScheduledTaskAction `
    -Execute "npx" `
    -Argument "ts-node scripts/super-enrich-french-riviera.ts" `
    -WorkingDirectory $projectPath

$trigger4 = New-ScheduledTaskTrigger -Daily -At "5:00AM"

$settings4 = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -StartWhenAvailable `
    -RunOnlyIfNetworkAvailable

Register-ScheduledTask `
    -TaskName "LEXA_Enrich_0500" `
    -Action $action4 `
    -Trigger $trigger4 `
    -Settings $settings4 `
    -Description "LEXA French Riviera enrichment at 5:00 AM" `
    -Force

Write-Host "✅ Task 4: 5:00 AM enrichment scheduled" -ForegroundColor Green

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Setup Complete!" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "📅 Scheduled Tasks Created:" -ForegroundColor Yellow
Write-Host "  - LEXA_Enrich_2300 (11:00 PM)" -ForegroundColor White
Write-Host "  - LEXA_Enrich_0100 (1:00 AM)" -ForegroundColor White
Write-Host "  - LEXA_Enrich_0300 (3:00 AM)" -ForegroundColor White
Write-Host "  - LEXA_Enrich_0500 (5:00 AM)" -ForegroundColor White
Write-Host ""
Write-Host "⏰ Overnight Enrichment Schedule:" -ForegroundColor Yellow
Write-Host "  - 4 batches per night" -ForegroundColor White
Write-Host "  - 50 POIs per batch = 200 POIs/night" -ForegroundColor White
Write-Host "  - Cost per night: ~$3.40" -ForegroundColor White
Write-Host ""
Write-Host "🎯 To manage tasks:" -ForegroundColor Cyan
Write-Host "  1. Open Task Scheduler (taskschd.msc)" -ForegroundColor White
Write-Host "  2. Look for tasks starting with 'LEXA_'" -ForegroundColor White
Write-Host "  3. Right-click to disable, run now, or delete" -ForegroundColor White
Write-Host ""
Write-Host "🔍 To check logs:" -ForegroundColor Cyan
Write-Host "  Location: $logPath" -ForegroundColor White
Write-Host ""
Write-Host "✅ Your laptop will now enrich POIs automatically every night!" -ForegroundColor Green
Write-Host "   (Make sure laptop is plugged in and not in sleep mode)" -ForegroundColor Yellow
Write-Host ""

