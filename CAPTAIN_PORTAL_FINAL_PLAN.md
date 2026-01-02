# LEXA Admin & Captain Portal - Final Structure
**Date:** December 31, 2025  
**Status:** ✅ Approved - Ready to Implement

---

## 🎯 FINAL STRUCTURE

### **ADMIN DASHBOARD** (Access: Chris, Paul, Bakary ONLY)

#### **Section 1: Statistics** 📊
- Total POIs
- Luxury POIs  
- Total Relations
- Total Users
- System Health Metrics
- Data Quality Overview

#### **Section 2: Active Tools** ✅
1. **User Management** 👥 - Manage users and roles
2. **Bug Reports** 🐛 - View user-reported bugs
3. **System Errors** ⚠️ - Monitor system health
4. **ChatNeo4j** 💬 - Advanced database queries
5. **Data Quality Dashboard** 📈 - System-wide data quality
6. **POI Collection** 📍 - Bulk POI import
7. **POI Search & Edit** 🔍 - Edit POIs directly
8. **Release Notes** 📝 - Daily updates
9. **Platform Architecture** 📖 - Technical docs

#### **Section 3: In Development / Inactive** 🚧
1. **Development Backlog** 📋 - Task management
2. **Seed Themes** 🎨 - One-time setup
3. **Yacht Destinations Upload** ⛵ - Legacy tool
4. **Debug Profile** 🔧 - Developer tool
5. **Destinations Browser** 🗺️ - Integrating into ChatNeo4j

---

### **CAPTAIN'S KNOWLEDGE PORTAL** (Access: All Captains + Admins)

#### **Page 1: Upload & Manual Entry** 📤✏️
**Combined upload and manual entry page**

**Upload Section:**
- **Supported Formats:**
  - PDF documents
  - Word (.doc, .docx)
  - Excel (.xls, .xlsx)
  - Text files (.txt)
  - Images (.png, .jpg, .jpeg)
  - Paste from clipboard
  - URLs for scraping

**Manual Entry Section:**
- Rich text editor
- Theme tagging
- Destination tagging
- Custom metadata

**Confidence Score:**
- **Default: 80%** for all new uploads
- Uploader can adjust (0-100%)
- **RAG System rule:** Auto-imported data cannot exceed 80%
- Only Captains can approve to increase beyond 80%

**Workflow:**
1. Upload file OR enter text manually
2. System extracts/processes
3. Set confidence score (default 80%)
4. Preview extracted data
5. Choose: Keep or Dump
6. If Keep: Saves to captain's history

---

#### **Page 2: Browse, Verify & Enhance** 🔍✨
**Combined browsing, verification, and confidence scoring**

**Browse Section:**
- Search all knowledge (all captains)
- Filter by:
  - Confidence score
  - Date uploaded
  - Theme
  - Destination
  - Captain (admins only)
  - Status (verified/unverified)

**Verify Section:**
- Review extracted POIs
- Check accuracy
- Add missing information
- Flag incorrect data

**Enhance Section:**
- Adjust confidence scores
- **Approve to increase beyond 80%**
- Add luxury scoring
- Enrich with additional details
- Add relationships

**Workflow:**
1. Search/browse knowledge
2. Select entry to review
3. Verify accuracy
4. Enhance data quality
5. Adjust confidence score
6. If score > 80%: Requires Captain approval ✅
7. Save changes

---

#### **Page 3: Upload History** 📊
**Individual captain's own uploads only**

**Features:**
- View only YOUR uploads
- Admins can view ALL uploads with captain filter
- Statistics:
  - Total uploads
  - Files by type
  - Average confidence score
  - Verified vs unverified
- Re-process files if needed
- Delete own uploads
- Export history

**Table Columns:**
- File name
- Type
- Upload date
- Confidence score
- Status (processed/pending/error)
- POIs extracted
- Actions (view, re-process, delete)

---

#### **Page 4: Scraped URLs** 🌐
**All URLs visible to ALL Captains**

**Features:**
- View all scraped URLs (from all captains)
- URL submission form
- Re-scrape functionality
- Status tracking
- Subpage detection

**Table Columns:**
- URL
- Submitted by (captain name)
- Submitted date
- Status (pending/scraped/error)
- POIs found
- Last scraped
- Actions (view, re-scrape)

**Submit Form:**
- URL input
- Confidence score (default 80%)
- Theme tags (optional)
- Destination tags (optional)
- Submit button

---

#### **Page 5: Keyword Monitor** 🔔
**NEW - Google Alerts style monitoring**

**Purpose:** Automatically find articles about specific keywords daily

**Features:**

**Keyword Management:**
- Add keywords (e.g., "Monaco luxury hotels", "French Riviera restaurants")
- View active keywords
- Delete keywords (bin icon)
- Toggle active/inactive

**Article Discovery:**
- System scans daily at **11:00 PM** (23:00)
- Finds news articles, blog posts, reviews
- Displays results with:
  - Article title
  - Source
  - Published date
  - Preview snippet
  - Checkbox ✅
  - Delete bin icon 🗑️

**Article Actions:**
1. **Select for Scraping:** Tick checkbox
2. **Delete Unwanted:** Click bin icon
3. **Batch Scrape:** "Scrape Selected" button
4. **View Article:** Click title to open in new tab

**Workflow:**
1. Add keywords
2. System finds articles daily at 11pm
3. Review articles next day
4. Tick checkboxes for articles to scrape
5. Click "Scrape Selected Articles"
6. Articles go to unstructured data scraping
7. Delete unwanted articles (bin icon)

**Table Columns:**
- ✅ Checkbox (select for scraping)
- Article Title (clickable link)
- Source
- Published Date
- Keyword (which keyword found it)
- Preview (first 200 chars)
- 🗑️ Delete icon

**Automated Process:**
- Runs daily at 23:00 (11pm)
- Searches for each active keyword
- Finds articles published in last 7 days
- Adds to review queue
- Sends notification (optional)

---

## 🔐 Access Control

| Feature | Admins (3) | Other Captains |
|---------|------------|----------------|
| **Admin Dashboard** | ✅ Full | ❌ No Access |
| **Upload & Manual Entry** | ✅ | ✅ |
| **Browse, Verify & Enhance** | ✅ All data | ✅ All data |
| **Approve >80% confidence** | ✅ | ✅ |
| **Upload History** | ✅ All captains | ✅ Own only |
| **Scraped URLs** | ✅ All | ✅ All |
| **Keyword Monitor** | ✅ | ✅ |

---

## 📋 Implementation Checklist

### **Phase 1: Admin Dashboard Reorganization** (2-3 hours)
- [ ] Create new 3-section layout
- [ ] Remove Demo Chat
- [ ] Reorganize tools into sections
- [ ] Update navigation
- [ ] Test access control

### **Phase 2: Captain Portal - Page 1 (Upload & Manual)** (4-5 hours)
- [ ] Create unified upload + manual entry page
- [ ] File upload component (all formats)
- [ ] Paste from clipboard
- [ ] Rich text editor for manual entry
- [ ] Confidence score slider (default 80%)
- [ ] Preview extracted data
- [ ] Keep/Dump workflow
- [ ] Save to captain's history

### **Phase 3: Captain Portal - Page 2 (Browse & Verify)** (3-4 hours)
- [ ] Search/filter interface
- [ ] Browse all knowledge
- [ ] Verification interface
- [ ] Confidence score adjustment
- [ ] Approval system for >80% scores
- [ ] Data enhancement forms
- [ ] Save changes

### **Phase 4: Captain Portal - Page 3 (Upload History)** (2-3 hours)
- [ ] Personal upload history table
- [ ] Filter by captain (admins only)
- [ ] Statistics dashboard
- [ ] Re-process functionality
- [ ] Delete functionality
- [ ] Export functionality

### **Phase 5: Captain Portal - Page 4 (Scraped URLs)** (2-3 hours)
- [ ] All URLs table
- [ ] URL submission form
- [ ] Re-scrape functionality
- [ ] Status tracking
- [ ] Filter/search

### **Phase 6: Captain Portal - Page 5 (Keyword Monitor)** (5-6 hours)
- [ ] Keyword management UI
- [ ] Add/delete keywords
- [ ] Articles discovery table
- [ ] Checkbox selection
- [ ] Bin icon delete
- [ ] Batch scrape functionality
- [ ] **Daily cron job (11pm)** to scan keywords
- [ ] Article preview
- [ ] Integration with scraping system

### **Phase 7: Backend APIs** (4-5 hours)
- [ ] Upload API (all file types)
- [ ] Manual entry API
- [ ] Browse/search API
- [ ] Verification API
- [ ] Confidence score API
- [ ] Upload history API
- [ ] Scraped URLs API
- [ ] Keyword monitor API
- [ ] Daily scan scheduler

### **Phase 8: Database Migrations** (2 hours)
- [ ] Captain uploads table
- [ ] Confidence scores tracking
- [ ] Verification log
- [ ] Keywords table
- [ ] Articles queue table
- [ ] Access control tables

---

## 🚀 Total Estimated Time: 24-31 hours

**Priority Order:**
1. Phase 1: Admin Dashboard (quick cleanup)
2. Phase 2: Upload & Manual Entry (core feature)
3. Phase 4: Upload History (track uploads)
4. Phase 3: Browse & Verify (quality control)
5. Phase 5: Scraped URLs (community feature)
6. Phase 6: Keyword Monitor (automation)

---

## 📝 Technical Notes

### **File Processing Pipeline:**
```
Upload → Extract Text → Parse → Confidence 80% → Preview → Keep/Dump → Save
```

### **Confidence Score Rules:**
- **Default:** 80% for all new uploads
- **User adjustable:** 0-100% during upload
- **RAG auto-import:** Max 80%
- **Increase beyond 80%:** Requires Captain approval in Browse & Verify page

### **Keyword Monitor Flow:**
```
Add Keywords → Daily Scan (11pm) → Find Articles → Review Queue → 
Select + Tick → Batch Scrape → Unstructured Data Pipeline
```

### **Access Control:**
- Supabase RLS policies for captain-specific data
- Role checks in API routes
- Frontend role-based rendering

---

**Ready to start implementation!** 🎉

Which phase should we start with?
