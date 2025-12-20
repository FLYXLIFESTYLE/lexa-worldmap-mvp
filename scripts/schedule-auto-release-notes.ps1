# Schedule Automatic Release Notes Generation
# Run this script once to set up daily automation

$scriptPath = Join-Path $PSScriptRoot "auto-generate-release-notes.ts"
$projectRoot = Split-Path $PSScriptRoot -Parent
$nodeExe = "node"
$npxExe = "npx"

# Task details
$taskName = "LEXA-AutoGenerateReleaseNotes"
$taskDescription = "Automatically generate release notes daily at 11:50 PM and push to GitHub"

# Time to run (11:50 PM - before midnight)
$triggerTime = "23:50"

Write-Host "╔═══════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║   SCHEDULE AUTOMATIC RELEASE NOTES GENERATION             ║" -ForegroundColor Cyan
Write-Host "╚═══════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

Write-Host "📋 Task Configuration:" -ForegroundColor Yellow
Write-Host "   Name: $taskName"
Write-Host "   Time: $triggerTime (11:50 PM daily)"
Write-Host "   Script: $scriptPath"
Write-Host "   Project: $projectRoot"
Write-Host ""

# Check if task already exists
$existingTask = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue

if ($existingTask) {
    Write-Host "⚠️  Task already exists!" -ForegroundColor Yellow
    $response = Read-Host "Do you want to replace it? (y/n)"
    
    if ($response -eq 'y' -or $response -eq 'Y') {
        Unregister-ScheduledTask -TaskName $taskName -Confirm:$false
        Write-Host "✅ Removed existing task" -ForegroundColor Green
    } else {
        Write-Host "❌ Cancelled. Keeping existing task." -ForegroundColor Red
        exit
    }
}

# Create the action (run the script with ts-node)
$action = New-ScheduledTaskAction `
    -Execute $npxExe `
    -Argument "ts-node `"$scriptPath`"" `
    -WorkingDirectory $projectRoot

# Create the trigger (daily at 11:50 PM)
$trigger = New-ScheduledTaskTrigger -Daily -At $triggerTime

# Create task settings
$settings = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -StartWhenAvailable `
    -RunOnlyIfNetworkAvailable `
    -ExecutionTimeLimit (New-TimeSpan -Hours 1)

# Get current user
$principal = New-ScheduledTaskPrincipal `
    -UserId "$env:USERDOMAIN\$env:USERNAME" `
    -LogonType S4U `
    -RunLevel Highest

# Register the task
try {
    Register-ScheduledTask `
        -TaskName $taskName `
        -Description $taskDescription `
        -Action $action `
        -Trigger $trigger `
        -Settings $settings `
        -Principal $principal `
        -Force

    Write-Host ""
    Write-Host "✅ Successfully scheduled automatic release notes generation!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📅 Schedule Details:" -ForegroundColor Cyan
    Write-Host "   ⏰ Runs daily at: 11:50 PM"
    Write-Host "   📝 Generates release notes from today's commits"
    Write-Host "   🤖 Uses Claude AI to analyze changes"
    Write-Host "   💾 Saves to: docs/release-notes/YYYY-MM-DD.json"
    Write-Host "   📤 Auto-commits and pushes to GitHub"
    Write-Host "   🚀 Triggers Vercel deployment automatically"
    Write-Host ""
    Write-Host "🔍 To view the task:" -ForegroundColor Yellow
    Write-Host "   Task Scheduler → Task Scheduler Library → $taskName"
    Write-Host ""
    Write-Host "🧪 To test now (without waiting for 11:50 PM):" -ForegroundColor Yellow
    Write-Host "   npx ts-node scripts/auto-generate-release-notes.ts"
    Write-Host ""
    Write-Host "❌ To remove the task:" -ForegroundColor Yellow
    Write-Host "   Unregister-ScheduledTask -TaskName '$taskName'"
    Write-Host ""
    
} catch {
    Write-Host ""
    Write-Host "❌ Error creating scheduled task:" -ForegroundColor Red
    Write-Host $_.Exception.Message
    Write-Host ""
    Write-Host "💡 Troubleshooting:" -ForegroundColor Yellow
    Write-Host "   1. Run PowerShell as Administrator"
    Write-Host "   2. Ensure npx and ts-node are installed globally:"
    Write-Host "      npm install -g ts-node"
    Write-Host "   3. Check that ANTHROPIC_API_KEY is set in .env.local"
    Write-Host ""
    exit 1
}

Write-Host "🎉 Setup complete! Release notes will now generate automatically every day at 11:50 PM." -ForegroundColor Green
Write-Host ""

