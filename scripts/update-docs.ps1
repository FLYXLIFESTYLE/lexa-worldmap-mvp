# Manual Release Notes & Backlog Sync
# Run these commands to update the website

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  LEXA - Manual Documentation Update" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Generate Release Notes
Write-Host "Step 1: Generating Release Notes for Dec 21..." -ForegroundColor Yellow
npx ts-node scripts/manual-release-notes-dec21.ts
Write-Host ""

# Step 2: Sync Backlog
Write-Host "Step 2: Syncing Backlog to Website..." -ForegroundColor Yellow
npx ts-node scripts/sync-backlog-to-web.ts
Write-Host ""

# Step 3: Git commit and push
Write-Host "Step 3: Committing changes..." -ForegroundColor Yellow
git add docs/release-notes/2025-12-21.json
git add docs/backlog-data.json
git add scripts/manual-release-notes-dec21.ts
git add scripts/sync-backlog-to-web.ts
git commit -m "docs: manual release notes and backlog sync for Dec 21

RELEASE NOTES (7 items):
- Name fields on signup
- Conversation flow rewrite
- Quick reply buttons
- Improved error messages
- Bug fixes and infrastructure updates
- Backlog documentation update

BACKLOG SYNC:
- 130+ total items
- 30+ completed in December
- Phase 3 AIfred features documented
- Frontend refinements tracked"

Write-Host ""
Write-Host "Step 4: Pushing to GitHub..." -ForegroundColor Yellow
git push origin main

Write-Host ""
Write-Host "================================================" -ForegroundColor Green
Write-Host "  ✅ Documentation Updated Successfully!" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Green
Write-Host ""
Write-Host "📄 Files created/updated:" -ForegroundColor White
Write-Host "  - docs/release-notes/2025-12-21.json" -ForegroundColor Gray
Write-Host "  - docs/backlog-data.json" -ForegroundColor Gray
Write-Host ""
Write-Host "🚀 Changes pushed to GitHub and will auto-deploy to Vercel" -ForegroundColor White
Write-Host ""

