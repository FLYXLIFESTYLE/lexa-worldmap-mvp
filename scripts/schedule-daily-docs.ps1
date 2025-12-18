# Schedule Daily Documentation Update
# Run this once to set up automatic daily documentation updates at midnight

$ErrorActionPreference = "Stop"

Write-Host "📋 Setting up Daily Documentation Update..." -ForegroundColor Cyan
Write-Host ""

# Get paths
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Split-Path -Parent $scriptPath
$tsxPath = Join-Path $scriptPath "daily-doc-update.ts"

Write-Host "Project Root: $projectRoot" -ForegroundColor Gray
Write-Host "Script: $tsxPath" -ForegroundColor Gray
Write-Host ""

# Check if tsx/ts-node is installed
$tsxInstalled = $null -ne (Get-Command tsx -ErrorAction SilentlyContinue)
$tsNodeInstalled = $null -ne (Get-Command ts-node -ErrorAction SilentlyContinue)

if (-not $tsxInstalled -and -not $tsNodeInstalled) {
    Write-Host "❌ Neither tsx nor ts-node is installed!" -ForegroundColor Red
    Write-Host "Install one with: npm install -g tsx" -ForegroundColor Yellow
    exit 1
}

$executor = if ($tsxInstalled) { "tsx" } else { "ts-node" }
Write-Host "✅ Using $executor to run TypeScript" -ForegroundColor Green
Write-Host ""

# Create task
$taskName = "LEXA_Daily_Documentation_Update"
$taskDescription = "Updates LEXA documentation from internal to published versions daily at midnight"

# Check if task already exists
$existingTask = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue

if ($existingTask) {
    Write-Host "⚠️  Task already exists. Removing old task..." -ForegroundColor Yellow
    Unregister-ScheduledTask -TaskName $taskName -Confirm:$false
}

# Create action
$action = New-ScheduledTaskAction `
    -Execute "powershell.exe" `
    -Argument "-NoProfile -ExecutionPolicy Bypass -Command `"cd '$projectRoot'; $executor '$tsxPath'`"" `
    -WorkingDirectory $projectRoot

# Create trigger (daily at midnight)
$trigger = New-ScheduledTaskTrigger -Daily -At "00:00"

# Create settings
$settings = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -StartWhenAvailable `
    -RunOnlyIfNetworkAvailable:$false

# Register task
Register-ScheduledTask `
    -TaskName $taskName `
    -Description $taskDescription `
    -Action $action `
    -Trigger $trigger `
    -Settings $settings `
    -User $env:USERNAME `
    -RunLevel Highest | Out-Null

Write-Host "✅ Task created successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "📅 Schedule: Daily at midnight (00:00)" -ForegroundColor Cyan
Write-Host "📂 Working Directory: $projectRoot" -ForegroundColor Cyan
Write-Host "📝 Script: $tsxPath" -ForegroundColor Cyan
Write-Host ""
Write-Host "To test immediately, run:" -ForegroundColor Yellow
Write-Host "  Start-ScheduledTask -TaskName '$taskName'" -ForegroundColor Gray
Write-Host ""
Write-Host "To view task:" -ForegroundColor Yellow
Write-Host "  Get-ScheduledTask -TaskName '$taskName'" -ForegroundColor Gray
Write-Host ""
Write-Host "To remove task:" -ForegroundColor Yellow
Write-Host "  Unregister-ScheduledTask -TaskName '$taskName'" -ForegroundColor Gray
Write-Host ""
Write-Host "✨ Setup complete!" -ForegroundColor Green

