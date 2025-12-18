# 📚 Documentation Update Process

## Overview

LEXA uses an **automated daily update system** to keep published documentation synchronized with internal documentation.

---

## 🔄 Update Flow

```
Internal Docs (docs/)
        ↓
   [Daily at Midnight]
        ↓
Published Docs (public/docs/)
        ↓
   [Served to Users]
```

---

## 📝 How It Works

### **Automatic Updates:**

1. **Daily Schedule:** Every day at midnight (00:00)
2. **Script Runs:** `scripts/daily-doc-update.ts`
3. **Copies Files:** Internal docs → Published docs
4. **Adds Timestamp:** "Last Updated: YYYY-MM-DD"
5. **Status Tag:** Marks as "Published"

### **What Gets Updated:**

| Internal Document | Published Location | Description |
|-------------------|-------------------|-------------|
| `docs/LEXA_ARCHITECTURE.md` | `public/docs/LEXA_ARCHITECTURE.md` | Platform Architecture |
| `docs/QUICK_REFERENCE.md` | `public/docs/QUICK_REFERENCE.md` | Quick Reference Guide |
| `docs/POI_SEARCH_EDIT_GUIDE.md` | `public/docs/POI_SEARCH_EDIT_GUIDE.md` | POI Editor Guide |

---

## ⚙️ Setup Instructions

### **Initial Setup (One Time):**

1. **Open PowerShell as Administrator**

2. **Navigate to project:**
   ```powershell
   cd C:\path\to\lexa-worldmap-mvp
   ```

3. **Run setup script:**
   ```powershell
   .\scripts\schedule-daily-docs.ps1
   ```

4. **Verify task created:**
   ```powershell
   Get-ScheduledTask -TaskName "LEXA_Daily_Documentation_Update"
   ```

### **Test Immediately:**

```powershell
Start-ScheduledTask -TaskName "LEXA_Daily_Documentation_Update"
```

---

## 🛠️ Manual Update

If you need to update documentation immediately (outside the scheduled time):

### **Option 1: Run Script Directly**
```powershell
cd C:\path\to\lexa-worldmap-mvp
npx tsx scripts/daily-doc-update.ts
```

### **Option 2: Trigger Scheduled Task**
```powershell
Start-ScheduledTask -TaskName "LEXA_Daily_Documentation_Update"
```

---

## 📊 What Happens During Update

### **1. Script Starts**
```
🔄 Starting daily documentation update...
📅 2025-12-18T00:00:00.000Z
```

### **2. Processing Each Document**
```
✅ Updated: Platform Architecture
   Source: docs/LEXA_ARCHITECTURE.md
   Dest:   public/docs/LEXA_ARCHITECTURE.md

✅ Updated: Quick Reference Guide
   Source: docs/QUICK_REFERENCE.md
   Dest:   public/docs/QUICK_REFERENCE.md
```

### **3. Summary**
```
📊 Update Summary:
   ✅ Success: 3
   ❌ Errors:  0
   📝 Total:   3

✨ Documentation update complete!
```

---

## 🔍 Monitoring & Logs

### **Check Task Status:**
```powershell
Get-ScheduledTask -TaskName "LEXA_Daily_Documentation_Update" | Get-ScheduledTaskInfo
```

### **View Last Run Time:**
```powershell
(Get-ScheduledTask -TaskName "LEXA_Daily_Documentation_Update" | Get-ScheduledTaskInfo).LastRunTime
```

### **View Task History:**
1. Open **Task Scheduler** (Win + R → `taskschd.msc`)
2. Navigate to **Task Scheduler Library**
3. Find **LEXA_Daily_Documentation_Update**
4. Click **History** tab

---

## 🚨 Troubleshooting

### **Task Not Running?**

1. **Check if task exists:**
   ```powershell
   Get-ScheduledTask -TaskName "LEXA_Daily_Documentation_Update"
   ```

2. **Check last result code:**
   ```powershell
   Get-ScheduledTaskInfo -TaskName "LEXA_Daily_Documentation_Update" | Select LastTaskResult
   ```

3. **Manually trigger to see errors:**
   ```powershell
   Start-ScheduledTask -TaskName "LEXA_Daily_Documentation_Update"
   ```

### **Common Issues:**

| Issue | Solution |
|-------|----------|
| Task not found | Run setup script again |
| Permission denied | Run PowerShell as Administrator |
| tsx/ts-node not found | Install: `npm install -g tsx` |
| Script errors | Check console output when running manually |

---

## 📁 File Structure

```
lexa-worldmap-mvp/
├── docs/                          # Internal Documentation (Editable)
│   ├── LEXA_ARCHITECTURE.md
│   ├── QUICK_REFERENCE.md
│   └── POI_SEARCH_EDIT_GUIDE.md
│
├── public/
│   └── docs/                      # Published Documentation (Auto-updated)
│       ├── LEXA_ARCHITECTURE.md   # ← Updated from internal
│       ├── QUICK_REFERENCE.md     # ← Updated from internal
│       └── POI_SEARCH_EDIT_GUIDE.md # ← Updated from internal
│
└── scripts/
    ├── daily-doc-update.ts        # Update script
    └── schedule-daily-docs.ps1    # Setup script
```

---

## ✏️ Making Changes to Documentation

### **Workflow:**

1. **Edit internal docs** in `docs/` folder
2. **Commit changes** to git
3. **Wait for midnight** OR **trigger manual update**
4. **Published docs** automatically updated
5. **Users see updates** on next page load

### **Best Practices:**

- ✅ Always edit files in `docs/` folder (internal)
- ❌ Never edit files in `public/docs/` (auto-overwritten)
- ✅ Commit changes to git for version control
- ✅ Test manual update before midnight if urgent

---

## 🎯 Benefits

| Benefit | Description |
|---------|-------------|
| **Automation** | No manual copying needed |
| **Consistency** | Published docs always match internal |
| **Timestamps** | Clear indication of last update |
| **Version Control** | Internal docs tracked in git |
| **Reliability** | Runs even if you forget |

---

## 🔧 Maintenance

### **Add New Documents:**

Edit `scripts/daily-doc-update.ts`:

```typescript
const DOCS_TO_UPDATE: DocUpdate[] = [
  {
    source: 'docs/NEW_DOCUMENT.md',
    destination: 'public/docs/NEW_DOCUMENT.md',
    description: 'New Document'
  },
  // ... existing docs
];
```

### **Change Schedule:**

Edit task trigger in `scripts/schedule-daily-docs.ps1`:

```powershell
# Currently: Daily at midnight
$trigger = New-ScheduledTaskTrigger -Daily -At "00:00"

# Example: Every 6 hours
$trigger = New-ScheduledTaskTrigger -Daily -At "00:00", "06:00", "12:00", "18:00"
```

---

## ❓ FAQ

### **Q: Do internal docs update automatically?**
**A:** No. You must manually edit files in `docs/` folder and commit to git.

### **Q: How often are published docs updated?**
**A:** Daily at midnight (00:00). Can also be triggered manually anytime.

### **Q: Can I see the update history?**
**A:** Yes. Check Task Scheduler history or git commit history for internal docs.

### **Q: What if the script fails?**
**A:** Check Task Scheduler history for error details. Run manually to see console output.

### **Q: Can I change the update time?**
**A:** Yes. Edit the trigger in `schedule-daily-docs.ps1` and re-run setup.

---

## 📞 Support

If you encounter issues:

1. Check Task Scheduler history
2. Run script manually to see errors
3. Verify tsx/ts-node is installed
4. Check file permissions
5. Review this documentation

---

**Last Updated:** 2025-12-18  
**Status:** Active  
**Automation:** ✅ Enabled

