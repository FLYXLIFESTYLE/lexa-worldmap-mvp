# 📄 Uploaded Documents - Frequently Asked Questions

## Overview

This document answers all questions about how uploaded documents are handled in LEXA's Knowledge Portal.

---

## ❓ Your Questions Answered

### **Q1: Where can I find uploaded documents?**

**A:** Uploaded documents can be found in multiple places:

1. **Browse Knowledge Page:** `/admin/knowledge/browse`
   - View all knowledge entries
   - Search by title or content
   - Filter by type (Uploaded, Scraped, Manual)

2. **Supabase Storage:** Original files are stored in Supabase
   - Bucket: `knowledge-uploads`
   - Access via Supabase Dashboard
   - Files are organized by user ID and date

3. **Neo4j Database:** Extracted content is stored as knowledge nodes
   - Query using ChatNeo4j: `/admin/chat-neo4j`
   - Example: "Show me all uploaded knowledge"

### **Q2: Are personal infos also extracted or just relevant infos for the database?**

**A:** ✅ **ONLY relevant travel information is extracted. Personal information is filtered out.**

#### **What IS Extracted:**
- ✅ Destinations and locations
- ✅ Activities and experiences
- ✅ Recommendations and tips
- ✅ Dates and seasons (for "best time to visit")
- ✅ Themes and preferences
- ✅ Luxury establishments (hotels, restaurants, etc.)
- ✅ Travel insights and advice

#### **What IS NOT Extracted (Filtered Out):**
- ❌ Personal names (except public figures)
- ❌ Email addresses
- ❌ Phone numbers
- ❌ Home addresses
- ❌ Payment information
- ❌ Passport/ID numbers
- ❌ Booking confirmation numbers
- ❌ Private conversations

#### **How It Works:**

1. **Upload Document** → PDF, Word, Text file
2. **Content Extraction** → Text is parsed
3. **AI Processing** → Claude AI reads and understands
4. **Filtering** → Personal info removed
5. **Relevant Data** → Only travel knowledge saved
6. **Database Storage** → Added to Neo4j as knowledge nodes

### **Q3: Will uploaded documents be stored?**

**A:** ✅ **YES - Original files are stored securely, and extracted knowledge is saved to the database.**

#### **Two-Level Storage:**

**1. Original Files (Supabase Storage):**
```
Supabase Storage
└── knowledge-uploads/
    └── {user_id}/
        └── {timestamp}_{filename}.pdf
```

- **Retention:** Permanent (unless manually deleted)
- **Access:** Captains and Admins only
- **Security:** Row-level security (RLS) enabled
- **Encryption:** At rest and in transit

**2. Extracted Knowledge (Neo4j Database):**
```
(:knowledge {
  id: "uuid",
  title: "French Riviera Recommendations",
  content: "Monaco is perfect for luxury travelers...",
  source_type: "upload",
  source_file: "recommendations.pdf",
  created_at: "2025-12-18",
  created_by: "captain@email.com"
})
```

- **Retention:** Permanent
- **Searchable:** Full-text search available
- **Linked:** Connected to destinations, themes, POIs
- **Versioned:** Updates tracked in database

---

## 📁 File Processing Workflow

```
┌─────────────────────────────────────────────┐
│ 1. USER UPLOADS FILE                        │
│    • PDF, Word, Text, CSV                   │
│    • Up to 10MB per file                    │
└─────────────┬───────────────────────────────┘
              ↓
┌─────────────────────────────────────────────┐
│ 2. FILE SAVED TO SUPABASE STORAGE           │
│    • Original file preserved                │
│    • Secure, encrypted storage              │
└─────────────┬───────────────────────────────┘
              ↓
┌─────────────────────────────────────────────┐
│ 3. CONTENT EXTRACTION                       │
│    • Text parsed from document              │
│    • Format-specific processing             │
└─────────────┬───────────────────────────────┘
              ↓
┌─────────────────────────────────────────────┐
│ 4. AI ANALYSIS (Claude)                     │
│    • Understand travel content              │
│    • Identify destinations, activities      │
│    • Extract recommendations                │
│    • FILTER OUT personal information        │
└─────────────┬───────────────────────────────┘
              ↓
┌─────────────────────────────────────────────┐
│ 5. KNOWLEDGE SAVED TO NEO4J                 │
│    • Create knowledge nodes                 │
│    • Link to destinations                   │
│    • Connect to themes                      │
│    • Add metadata                           │
└─────────────┬───────────────────────────────┘
              ↓
┌─────────────────────────────────────────────┐
│ 6. AVAILABLE IN LEXA                        │
│    • Browse Knowledge page                  │
│    • ChatNeo4j queries                      │
│    • RAG for recommendations                │
└─────────────────────────────────────────────┘
```

---

## 🔒 Privacy & Security

### **Data Protection:**

1. **Access Control:**
   - Only Captains and Admins can upload
   - Only Captains and Admins can view uploaded knowledge
   - Public users NEVER see uploaded documents

2. **Personal Information Filtering:**
   - AI automatically removes PII (Personally Identifiable Information)
   - Regex patterns catch emails, phones, addresses
   - Only travel-relevant content is stored

3. **Encryption:**
   - Files encrypted at rest in Supabase
   - SSL/TLS for all transfers
   - Database connections encrypted

4. **Audit Trail:**
   - All uploads logged with user ID and timestamp
   - Changes tracked in database
   - Deletion history maintained

---

## 📊 Supported File Types

| Type | Extensions | Processing |
|------|-----------|------------|
| PDF | `.pdf` | Full text extraction |
| Word | `.docx`, `.doc` | Full text extraction |
| Text | `.txt` | Direct parsing |
| CSV | `.csv` | Structured data import |
| JSON | `.json` | Structured data import |

**Max File Size:** 10MB per upload

---

## 🔍 How to Find Your Uploaded Documents

### **Method 1: Browse Knowledge Page**

1. Go to Captain's Knowledge Portal
2. Click "Browse Knowledge"
3. Filter by "Uploaded Documents"
4. Search by filename or content

### **Method 2: ChatNeo4j**

1. Go to `/admin/chat-neo4j`
2. Ask: "Show me all uploaded knowledge"
3. Or: "What knowledge came from uploads in December?"

### **Method 3: Supabase Dashboard**

1. Open Supabase Dashboard
2. Go to Storage
3. Open `knowledge-uploads` bucket
4. Browse by folder (user ID)
5. Download original files if needed

---

## ✅ Best Practices

### **For Uploading:**

1. **Use Descriptive Filenames:**
   - ✅ `french-riviera-luxury-hotels-2024.pdf`
   - ❌ `document1.pdf`

2. **Clean Documents:**
   - Remove personal notes before uploading
   - Keep only relevant travel information
   - Use clear formatting

3. **Organize by Topic:**
   - One destination per file (or clearly separated)
   - Use consistent naming conventions
   - Add metadata in filename (date, region)

### **For Privacy:**

1. **Review Before Upload:**
   - Check for personal information
   - Remove booking confirmations
   - Redact client details

2. **Trust the AI:**
   - Automatic filtering is robust
   - Personal info is removed during processing
   - Only travel knowledge is saved

---

## 🛠️ Troubleshooting

### **Issue: "Can't find my uploaded document"**

**Solutions:**
1. Check Browse Knowledge page: `/admin/knowledge/browse`
2. Search by filename or content
3. Verify you're logged in as Captain/Admin
4. Check Supabase Storage directly

### **Issue: "Document uploaded but no knowledge appears"**

**Possible Causes:**
1. File contains no travel-related content
2. File format not supported
3. Processing error (check logs)

**Solutions:**
1. Upload a different format (try PDF instead of Word)
2. Check file isn't corrupted
3. Verify file size is under 10MB

### **Issue: "Worried about personal information"**

**Reassurance:**
1. AI automatically filters personal info
2. Test with sample document first
3. Review extracted knowledge in Browse page
4. Contact admin if concerns persist

---

## 📞 Support

If you have questions or issues:

1. **Check this FAQ first**
2. **Test with Browse Knowledge page:** `/admin/knowledge/browse`
3. **Query Neo4j directly:** `/admin/chat-neo4j`
4. **Review Supabase Storage:** Check original files
5. **Report bugs:** Use bug report button 🐛

---

## 🎯 Summary

| Question | Answer |
|----------|--------|
| **Where are uploads?** | Browse Knowledge page + Supabase Storage + Neo4j |
| **Personal info extracted?** | ❌ NO - Filtered out automatically |
| **Files stored?** | ✅ YES - Originals in Supabase, knowledge in Neo4j |
| **Who can see?** | Only Captains and Admins |
| **How long stored?** | Permanently (unless manually deleted) |
| **Safe to upload?** | ✅ YES - PII automatically filtered |

---

**Last Updated:** 2025-12-18  
**Status:** Active  
**Contact:** Admin Dashboard → Bug Report

