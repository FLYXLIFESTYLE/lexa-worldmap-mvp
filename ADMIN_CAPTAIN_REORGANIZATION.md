# LEXA Admin & Captain Tools Inventory
**Date:** December 31, 2025  
**Purpose:** Reorganize tools for Admin Dashboard vs Captain's Knowledge Portal

---

## 📊 Current Tools & Functionalities Inventory

### **Currently in Admin Dashboard** (`/admin/dashboard`)

#### **1. LEXA Demo Chat** ✨
- **Purpose:** Test the LEXA conversation experience
- **Features:**
  - Full conversation flow
  - Dark/Light mode
  - Reset session
  - Admin testing
- **Access:** Admin only
- **Status:** Active

#### **2. Captain's Knowledge Portal** 📚
- **Purpose:** Contribute knowledge, upload files, scrape URLs
- **Features:**
  - Upload files
  - Scrape URLs
  - Manual input
  - Knowledge browser
- **Access:** Currently admin, should be Captain+
- **Status:** Active

#### **3. ChatNeo4j** 💬
- **Purpose:** Query Neo4j database using natural language
- **Features:**
  - Natural language queries
  - Cypher generation
  - Data exploration
- **Access:** Admin only
- **Status:** Active

#### **4. Destinations Browser** 🗺️
- **Purpose:** Enhanced destination analytics with AI insights
- **Features:**
  - POI statistics
  - Data quality
  - Destination coverage
- **Access:** Admin only
- **Status:** Coming Soon (integrating into ChatNeo4j)

#### **5. POI Search & Edit** 🔍
- **Purpose:** Search and edit POI properties
- **Features:**
  - Search POIs
  - Edit properties
  - Update scores
  - Add comments
- **Access:** Admin only
- **Status:** Active
- **Location:** `/admin/knowledge/editor`

#### **6. Scraped URLs Manager** 🌐
- **Purpose:** Manage scraped URLs and re-trigger scrapes
- **Features:**
  - URL history
  - Re-scrape
  - Status tracking
  - Subpage detection
- **Access:** Admin only
- **Status:** Active
- **Location:** `/admin/knowledge/scraped-urls`

#### **7. Platform Architecture** 📖
- **Purpose:** System architecture and technical docs
- **Features:**
  - System architecture
  - Features list
  - Technical docs
- **Access:** Admin only
- **Status:** Active
- **Location:** `/admin/documentation`

#### **8. Release Notes** 📝
- **Purpose:** Daily changelog of features and improvements
- **Features:**
  - Daily updates
  - Feature tracking
  - Version history
- **Access:** Admin only
- **Status:** Active
- **Location:** `/admin/release-notes`

#### **9. Development Backlog** 📋
- **Purpose:** Track and manage development tasks
- **Features:**
  - Task management
  - Priority tracking
  - Sprint planning
- **Access:** Admin only
- **Status:** Active
- **Location:** `/admin/backlog`

#### **10. Bug Reports** 🐛
- **Purpose:** View and manage user-reported bugs
- **Features:**
  - View all bug reports
  - Screenshots
  - User contact info
  - Status tracking
- **Access:** Admin only
- **Status:** Active
- **Location:** `/admin/bugs`

#### **11. System Errors** ⚠️
- **Purpose:** Monitor system errors and exceptions
- **Features:**
  - Error logs
  - Stack traces
  - Error frequency
- **Access:** Admin only
- **Status:** Active
- **Location:** `/admin/errors`

#### **12. User Management** 👥
- **Purpose:** Manage user accounts and roles
- **Features:**
  - View all users
  - Assign roles (admin, captain, user)
  - User statistics
- **Access:** Admin only
- **Status:** Active
- **Location:** `/admin/users`

#### **13. Seed Themes** 🎨
- **Purpose:** Seed theme categories into Neo4j
- **Features:**
  - Add/update theme categories
  - One-time setup tool
- **Access:** Admin only
- **Status:** Active (rarely used)
- **Location:** `/admin/seed-themes`

#### **14. Yacht Destinations Upload** ⛵
- **Purpose:** Upload yacht destination data
- **Features:**
  - CSV upload
  - OCR for images
  - Luxury scoring
- **Access:** Admin only
- **Status:** Active (2 versions)
- **Locations:** 
  - `/admin/upload-yacht-destinations` (v1)
  - `/admin/upload-yacht-destinations-v2` (v2 with OCR)

#### **15. Data Quality Dashboard** 📈
- **Purpose:** Monitor data quality across the system
- **Features:**
  - POI completeness
  - Missing data reports
  - Quality scores
- **Access:** Admin only
- **Status:** Active
- **Location:** `/admin/data-quality`

#### **16. POI Collection** 📍
- **Purpose:** Bulk POI import and management
- **Features:**
  - Import POIs from CSV
  - Bulk updates
  - Category assignment
- **Access:** Admin only
- **Status:** Active
- **Location:** `/admin/poi-collection`

#### **17. Debug Profile** 🔧
- **Purpose:** Debug user profiles and sessions
- **Features:**
  - View user data
  - Session debugging
  - Profile editor
- **Access:** Admin only
- **Status:** Active
- **Location:** `/admin/debug-profile`

---

## 📁 Captain's Knowledge Portal Tools (`/admin/knowledge`)

### **Currently Available:**

#### **1. Write Knowledge** ✏️
- **Purpose:** Manually add travel insights
- **Status:** Active
- **Location:** `/admin/knowledge/editor`

#### **2. Upload Knowledge** 📤
- **Purpose:** Upload documents and files
- **Current formats:** Text files, some PDFs
- **Status:** Active - **NEEDS ENHANCEMENT**
- **Location:** `/admin/knowledge/upload`

#### **3. Browse Knowledge** 🔍
- **Purpose:** Search and explore contributed knowledge
- **Status:** Active
- **Location:** `/admin/knowledge/browse`

#### **4. Upload History** 📊
- **Purpose:** Track all file uploads
- **Features:**
  - Upload statistics
  - File management
  - Keep/dump decisions
- **Status:** Active
- **Location:** `/admin/knowledge/history`

#### **5. Scraped URLs** 🌐
- **Purpose:** View URLs scraped from websites
- **Status:** Active
- **Location:** `/admin/knowledge/scraped-urls`

---

## 🎯 Proposed Reorganization

### **ADMIN DASHBOARD** (Access: You, Paul, Bakary only)

#### **Section 1: Statistics** 📊
- Total POIs
- Luxury POIs
- Total Relations
- Total Users
- System Health Metrics
- Data Quality Overview

#### **Section 2: Active Tools** ✅
1. **User Management** 👥 - Manage all users and roles
2. **Bug Reports** 🐛 - View and manage user bugs
3. **System Errors** ⚠️ - Monitor system health
4. **ChatNeo4j** 💬 - Advanced database queries
5. **Data Quality Dashboard** 📈 - Monitor data completeness
6. **POI Collection** 📍 - Bulk POI import
7. **Release Notes** 📝 - View daily updates
8. **Platform Architecture** 📖 - Technical documentation

#### **Section 3: In Development / Inactive** 🚧
1. **LEXA Demo Chat** ✨ - Testing environment
2. **Development Backlog** 📋 - Task management
3. **Seed Themes** 🎨 - One-time setup (rarely needed)
4. **Yacht Destinations Upload** ⛵ - Legacy tool
5. **Debug Profile** 🔧 - Developer tool
6. **Destinations Browser** 🗺️ - Being integrated into ChatNeo4j

---

### **CAPTAIN'S KNOWLEDGE PORTAL** (Access: Captains + Admins)

#### **Main Features:**

##### **1. Upload Documents** 📤
**NEW Enhanced Upload System:**
- **Supported Formats:**
  - PDF documents
  - Word (.doc, .docx)
  - Excel (.xls, .xlsx)
  - Text files (.txt)
  - Images (.png, .jpg, .jpeg)
  - Paste from clipboard
- **Features:**
  - AI-powered text extraction
  - Automatic POI detection
  - Theme classification
  - Confidence scoring
  - Keep/Dump workflow
- **Access Control:**
  - Captains can only see their own uploads
  - Admins can see all uploads

##### **2. Browse & Verify Knowledge** 🔍
- Search uploaded content
- View extraction results
- Verify POI data
- Adjust confidence scores
- Approve/reject extracted data

##### **3. Manual Knowledge Entry** ✏️
- Write travel insights directly
- Add hidden gems
- Share expert tips
- Tag with themes and destinations

##### **4. URL Scraping** 🌐
- Submit URLs to scrape
- View scraping results
- Manage scraped content

##### **5. Upload History** 📊
- View own upload history (Captains)
- View all uploads (Admins)
- Track statistics
- Re-process files if needed

##### **6. Data Enhancement** ✨
- Enrich POI data
- Add missing information
- Update confidence scores
- Verify luxury ratings

---

## 🔐 Access Control Summary

| Tool | You + Paul + Bakary | Other Captains |
|------|---------------------|----------------|
| **Admin Dashboard** | ✅ Full Access | ❌ No Access |
| **User Management** | ✅ | ❌ |
| **Bug Reports** | ✅ | ❌ |
| **System Errors** | ✅ | ❌ |
| **ChatNeo4j** | ✅ | ❌ |
| **Captain's Portal** | ✅ Full Access | ✅ Own Data Only |
| **Upload Documents** | ✅ All uploads | ✅ Own uploads |
| **Browse Knowledge** | ✅ All content | ✅ All content |
| **Manual Entry** | ✅ | ✅ |
| **Upload History** | ✅ All history | ✅ Own history |

---

## 🚀 Implementation Steps

### **Phase 1: Reorganize Existing Tools**
1. Create new `/admin/dashboard` with 3 sections
2. Move Captain tools to `/captain/portal`
3. Implement role-based access control
4. Update navigation

### **Phase 2: Enhance Upload System**
1. Support all file types (PDF, Word, Excel, images, text)
2. Add clipboard paste functionality
3. AI-powered extraction
4. Confidence scoring
5. Keep/Dump workflow per captain

### **Phase 3: Data Verification**
1. Build verification interface
2. Confidence score adjustment
3. POI data enrichment
4. Approve/reject workflow

---

## 📝 Questions to Decide:

### **1. Tools Assignment - Where should these go?**

**POI Search & Edit** 🔍
- [ ] Admin Dashboard (full edit access)
- [ ] Captain Portal (view + suggest edits)
- [ ] Both (different permissions)

**Scraped URLs Manager** 🌐
- [ ] Admin Dashboard only
- [ ] Captain Portal (captains can scrape URLs)
- [ ] Both

**Data Quality Dashboard** 📈
- [ ] Admin Dashboard (monitoring)
- [ ] Captain Portal (see their data quality)
- [ ] Both

**Yacht Destinations Upload** ⛵
- [ ] Keep in Admin (rare use)
- [ ] Move to inactive
- [ ] Delete (functionality replaced)

### **2. Captain Permissions**

**Can Captains:**
- [ ] Edit POIs they didn't create?
- [ ] See other captain's uploads?
- [ ] Approve/reject extracted data?
- [ ] Access Neo4j queries (read-only)?
- [ ] View system statistics?

### **3. Upload File Types Priority**

**Which formats are most important to support first?**
1. [ ] PDFs (travel guides, itineraries)
2. [ ] Word documents (reports, notes)
3. [ ] Excel (POI lists, data tables)
4. [ ] Images (menus, flyers, maps)
5. [ ] Text files (quick notes)
6. [ ] Paste from clipboard

---

## 💡 My Recommendations

### **Admin Dashboard Should Have:**
✅ User Management  
✅ Bug Reports  
✅ System Errors  
✅ ChatNeo4j (advanced queries)  
✅ Data Quality (system-wide view)  
✅ Release Notes  
✅ Documentation  

### **Captain Portal Should Have:**
✅ Upload Documents (all formats)  
✅ Browse & Verify Knowledge  
✅ Manual Entry  
✅ Upload History (own data)  
✅ Data Enhancement (confidence scoring)  
✅ URL Scraping (optional)  

### **Captains Should NOT Have:**
❌ User management  
❌ System error logs  
❌ Advanced database queries  
❌ Other captain's private uploads  

---

**Ready to implement when you give the green light!** 🚀

Please review and let me know:
1. Which tools go where (see Questions section)
2. What captain permissions should be
3. Priority for file format support
