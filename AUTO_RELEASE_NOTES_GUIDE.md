# 🤖 Automatic Release Notes System

**Created:** December 19, 2025  
**Status:** ✅ Ready to Use

---

## 🎯 **What This Does**

Automatically generates release notes every day at **11:50 PM** by:

1. ✅ **Analyzing git commits** from the past 24 hours
2. ✅ **Using Claude AI** to write professional release notes
3. ✅ **Creating JSON file** in correct format (`docs/release-notes/YYYY-MM-DD.json`)
4. ✅ **Committing & pushing** to GitHub automatically
5. ✅ **Triggering Vercel deployment** (GitHub push triggers build)
6. ✅ **Updating website** at https://lexa-worldmap-mvp.vercel.app/admin/release-notes

**By midnight, your release notes will be live on the website!** 🚀

---

## 📦 **What's Been Created**

### **1. Auto-Generator Script**
**File:** `scripts/auto-generate-release-notes.ts`

**Features:**
- Analyzes git commits since yesterday
- Extracts changed files
- Sends data to Claude AI
- Generates properly formatted release notes
- Saves to `docs/release-notes/YYYY-MM-DD.json`
- Auto-commits and pushes to GitHub

### **2. Scheduler Script**
**File:** `scripts/schedule-auto-release-notes.ps1`

**Features:**
- Creates Windows Task Scheduler job
- Runs daily at 11:50 PM
- Executes the auto-generator
- Handles errors gracefully

---

## 🚀 **How to Set It Up (One Time)**

### **Step 1: Install (if needed)**
```powershell
# Make sure ts-node is available
npm install -g ts-node
```

### **Step 2: Run Scheduler**
```powershell
# Navigate to project root
cd C:\Users\chris\OneDrive\Cursor_LEXA_MVP\lexa-worldmap-mvp

# Run scheduler (as Administrator)
.\scripts\schedule-auto-release-notes.ps1
```

### **Step 3: Done!** ✅
The task is now scheduled. It will run automatically every day at 11:50 PM.

---

## 🧪 **Test It Now (Optional)**

Don't want to wait until 11:50 PM? Test it immediately:

```powershell
npx ts-node scripts/auto-generate-release-notes.ts
```

**What happens:**
1. Analyzes today's commits
2. Generates release notes
3. Creates/updates `docs/release-notes/2025-12-19.json`
4. Commits and pushes to GitHub
5. Vercel deploys automatically (~2-3 minutes)
6. Website updates with new notes

---

## 📊 **How It Works**

### **Timeline:**

**11:50 PM - Script Runs**
```
1. Fetch git commits since yesterday
2. Analyze changed files
3. Send to Claude AI for analysis
4. Generate release notes JSON
5. Save to docs/release-notes/
6. Git commit and push
```

**11:51 PM - GitHub Receives Push**
```
1. GitHub webhook triggers
2. Vercel starts build
```

**11:53 PM - Vercel Deploys**
```
1. Build completes (~2 min)
2. Deploy to production
3. Website updated
```

**12:00 AM - Release Notes Live!** 🎉

---

## 📝 **What Gets Generated**

### **Example Output:**

```json
[
  {
    "id": "2025-12-19-1734606000-upload-tracking",
    "date": "2025-12-19",
    "timestamp": "2025-12-19T23:50:00.000Z",
    "category": "feature",
    "title": "Upload Tracking System",
    "description": "Complete file upload tracking with history and statistics.",
    "details": "New upload_tracking table stores all upload metadata...",
    "author": "System",
    "isPublic": true,
    "tags": ["upload", "tracking", "database"],
    "relatedFiles": ["app/api/knowledge/upload/route.ts"],
    "githubCommit": "a2c5faa"
  }
]
```

### **AI Categories:**
- `feature` - New functionality
- `enhancement` - Improvements to existing features
- `bugfix` - Bug fixes
- `performance` - Performance improvements
- `documentation` - Documentation updates
- `infrastructure` - Infrastructure changes
- `security` - Security updates
- `database` - Database schema changes

### **Public vs Internal:**
- `isPublic: true` - User-facing changes (visible to all)
- `isPublic: false` - Internal/backend changes (admin only)

---

## 🔍 **Monitoring**

### **Check If Task Is Scheduled:**
1. Open **Task Scheduler** (Windows search)
2. Navigate to **Task Scheduler Library**
3. Look for: `LEXA-AutoGenerateReleaseNotes`
4. Double-click to see details

### **Check Task History:**
1. Open the task in Task Scheduler
2. Click **History** tab
3. See all past runs and results

### **Check Generated Files:**
```powershell
# List all release notes
ls docs/release-notes/

# View today's notes
cat docs/release-notes/2025-12-19.json
```

### **Check Git Commits:**
```powershell
# See recent auto-commits
git log --grep="auto-generate release notes" --oneline

# See what was committed
git show HEAD
```

---

## ⚙️ **Configuration**

### **Change Run Time:**

Edit the scheduler script:

```powershell
# Change this line:
$triggerTime = "23:50"  # 11:50 PM

# To any time you want:
$triggerTime = "22:00"  # 10:00 PM
$triggerTime = "23:30"  # 11:30 PM
$triggerTime = "00:30"  # 12:30 AM (after midnight)
```

Then re-run:
```powershell
.\scripts\schedule-auto-release-notes.ps1
```

### **Disable Automation:**

Remove the scheduled task:

```powershell
Unregister-ScheduledTask -TaskName "LEXA-AutoGenerateReleaseNotes"
```

---

## 🐛 **Troubleshooting**

### **Problem: Task doesn't run**

**Check:**
1. Is Task Scheduler service running?
2. Is the task enabled? (Check Task Scheduler)
3. Does the user have permissions?
4. Is `ANTHROPIC_API_KEY` set in `.env.local`?

**Solution:**
```powershell
# Test manually
npx ts-node scripts/auto-generate-release-notes.ts

# Check for errors
# Re-create task as Administrator
```

### **Problem: No commits found**

**This is normal!** If no development work was done that day, the script will exit gracefully:

```
ℹ️  No commits found since yesterday. Nothing to do.
   This is normal if no development work was done today.
```

### **Problem: AI generation fails**

**Possible causes:**
- API key not set
- API quota exceeded
- Network issues

**Solution:**
```powershell
# Check API key
echo $env:ANTHROPIC_API_KEY  # Should show your key

# Or check .env.local file
cat .env.local | grep ANTHROPIC
```

### **Problem: Git push fails**

**Possible causes:**
- Git authentication not configured
- No internet connection
- Merge conflicts

**Solution:**
```powershell
# Check git status
git status

# Ensure credentials are saved
git config --global credential.helper wincred

# Test push manually
git push origin main
```

---

## 📚 **Manual Operation**

If you prefer manual control, you can skip scheduling and run manually:

### **Daily Manual Process:**

```powershell
# At end of day:
npx ts-node scripts/auto-generate-release-notes.ts

# Review the generated notes:
cat docs/release-notes/$(Get-Date -Format "yyyy-MM-dd").json

# Edit if needed, then push:
git add docs/release-notes/
git commit -m "docs: release notes for $(Get-Date -Format 'yyyy-MM-dd')"
git push origin main
```

---

## ✅ **Summary**

### **Automated System:**
- ✅ Script created: `auto-generate-release-notes.ts`
- ✅ Scheduler created: `schedule-auto-release-notes.ps1`
- ✅ Runs daily at 11:50 PM
- ✅ Auto-commits and pushes
- ✅ Triggers Vercel deployment
- ✅ Website updates by midnight

### **Benefits:**
- 🚀 **Zero manual work** - Fully automatic
- 📝 **Professional notes** - AI-written summaries
- ⏰ **Daily updates** - Never miss a day
- 🔄 **Always synced** - GitHub → Vercel → Website
- 🎯 **Consistent format** - Proper JSON structure

### **Next Steps:**
1. Run `.\scripts\schedule-auto-release-notes.ps1` (one time)
2. Test with `npx ts-node scripts/auto-generate-release-notes.ts`
3. Check website at 12:01 AM tomorrow
4. Enjoy automatic release notes forever! 🎉

---

**Your release notes will now update automatically every day at midnight!** 🌙

