# 🎉 Captain Portal Backend Complete!

## ✅ What's Been Built

### **Backend APIs (All Production-Ready on Render)**

1. **File Upload & Processing API** (`/api/captain/upload/`)
   - Upload PDF, Word, Excel, Images, Text
   - Paste text directly
   - View upload history
   - Extract 7 types of intelligence automatically

2. **Web Scraping API** (`/api/captain/scrape/`)
   - Scrape single URL
   - Batch scraping
   - Discover subpages
   - Extract intelligence from web content

3. **POI Management API** (`/api/captain/pois/`)
   - Browse/filter POIs (by destination, category, verification status)
   - View single POI details
   - Edit POI information
   - Verify POIs (allows confidence >80%)
   - Promote POIs to main database
   - Delete POIs

4. **Keyword Monitoring API** (`/api/captain/keywords/`)
   - Create/edit/delete keywords
   - View all discovered articles
   - Filter articles by status (new, selected, scraped, deleted)
   - Mark articles for scraping
   - Delete irrelevant articles

5. **Statistics & Analytics API** (`/api/captain/stats/`)
   - Dashboard overview (uploads, POIs, scraping, keywords, intelligence)
   - Upload analytics
   - POI analytics (by category, destination, verification status)
   - Intelligence extraction stats

### **Database Schema (12 New Tables)**

All tables created in Supabase with Row Level Security (RLS):

**Captain Portal Tables (6):**
- `captain_uploads` - Track file uploads
- `extracted_pois` - POIs before promotion
- `scraped_urls` - All scraped URLs (shared view)
- `keywords` - Monitoring keywords
- `keyword_articles` - Discovered articles
- `scraping_queue` - Articles queued for scraping

**Intelligence Tables (6):**
- `extracted_experiences` - Experience ideas
- `market_trends` - Market trend insights
- `client_insights` - Client behavior/desires
- `price_intelligence` - Pricing data
- `competitor_analysis` - Competitor info
- `operational_learnings` - Operational best practices

### **Frontend Integration**

Created `lib/api/captain-portal.ts` with complete TypeScript API client:
- Type-safe interfaces
- Error handling
- All CRUD operations
- Ready to use in any Captain Portal page

---

## 🚀 **How to Complete Frontend Integration**

### **Step 1: Add Environment Variable**

Add to `.env.local`:
```bash
NEXT_PUBLIC_BACKEND_URL=https://lexa-worldmap-mvp-rlss.onrender.com
```

### **Step 2: Example - Update Upload Page**

```typescript
// At the top of app/captain/upload/page.tsx
import { uploadAPI, scrapingAPI } from '@/lib/api/captain-portal';

// Replace the handleFileUpload function:
const handleFileUpload = async (uploadedFiles: FileList | null) => {
  if (!uploadedFiles || uploadedFiles.length === 0) return;

  setLoading(true);

  try {
    for (const file of Array.from(uploadedFiles)) {
      // Show as pending
      setFiles(prev => [...prev, {
        name: file.name,
        size: file.size,
        type: file.type,
        status: 'processing',
        confidenceScore: 0
      }]);

      // Upload to backend
      const result = await uploadAPI.uploadFile(file);

      // Update status
      setFiles(prev => prev.map(f => 
        f.name === file.name 
          ? { ...f, status: 'done', confidenceScore: result.intelligence_extracted.pois }
          : f
      ));

      // Show success
      alert(`✅ ${file.name} processed!\n` +
            `POIs found: ${result.pois_extracted}\n` +
            `Experiences: ${result.intelligence_extracted.experiences}\n` +
            `Trends: ${result.intelligence_extracted.trends}`);
    }
  } catch (error) {
    console.error('Upload failed:', error);
    alert(`❌ Upload failed: ${error.message}`);
  } finally {
    setLoading(false);
  }
};

// Replace handleURLScrape:
const handleURLScrape = async () => {
  if (!url.trim()) return;

  setLoading(true);
  try {
    const result = await scrapingAPI.scrapeURL(url, true);
    
    setUrls(prev => [...prev, url]);
    setUrl('');

    alert(`✅ URL scraped!\n` +
          `Content length: ${result.content_length}\n` +
          `POIs found: ${result.pois_discovered}\n` +
          `Subpages: ${result.subpages_discovered}`);
  } catch (error) {
    console.error('Scraping failed:', error);
    alert(`❌ Scraping failed: ${error.message}`);
  } finally {
    setLoading(false);
  }
};
```

### **Step 3: Example - Update Browse Page**

```typescript
// At the top of app/captain/browse/page.tsx
import { poisAPI } from '@/lib/api/captain-portal';
import { useState, useEffect } from 'react';

// Load POIs on page mount
useEffect(() => {
  loadPOIs();
}, []);

const loadPOIs = async () => {
  setLoading(true);
  try {
    const result = await poisAPI.getPOIs({
      skip: 0,
      limit: 50,
      verified: false, // Show unverified POIs
      search: searchTerm,
      destination: destinationFilter,
      category: categoryFilter,
    });

    setPois(result.pois);
    setTotalCount(result.total);
  } catch (error) {
    console.error('Error loading POIs:', error);
  } finally {
    setLoading(false);
  }
};

// Verify POI
const handleVerifyPOI = async (poiId: string, confidenceScore: number) => {
  try {
    await poisAPI.verifyPOI(poiId, true, confidenceScore);
    alert('✅ POI verified!');
    loadPOIs(); // Reload list
  } catch (error) {
    alert(`❌ Verification failed: ${error.message}`);
  }
};

// Promote POI
const handlePromotePOI = async (poiId: string) => {
  try {
    await poisAPI.promotePOI(poiId);
    alert('✅ POI promoted to main database!');
    loadPOIs(); // Reload list
  } catch (error) {
    alert(`❌ Promotion failed: ${error.message}`);
  }
};
```

### **Step 4: Example - Update Keywords Page**

```typescript
// At the top of app/captain/keywords/page.tsx
import { keywordsAPI } from '@/lib/api/captain-portal';

// Load keywords and articles
useEffect(() => {
  loadKeywords();
  loadArticles();
}, []);

const loadKeywords = async () => {
  try {
    const result = await keywordsAPI.getKeywords(true);
    setKeywords(result.keywords);
  } catch (error) {
    console.error('Error loading keywords:', error);
  }
};

const loadArticles = async () => {
  try {
    const result = await keywordsAPI.getAllArticles({
      status: 'new',
      limit: 50,
    });
    setArticles(result.articles);
  } catch (error) {
    console.error('Error loading articles:', error);
  }
};

// Add keyword
const handleAddKeyword = async () => {
  if (!newKeyword.trim()) return;

  try {
    await keywordsAPI.createKeyword(newKeyword, true);
    setNewKeyword('');
    loadKeywords();
    alert('✅ Keyword added!');
  } catch (error) {
    alert(`❌ Failed: ${error.message}`);
  }
};

// Select article for scraping
const handleSelectArticle = async (articleId: string) => {
  try {
    await keywordsAPI.articleAction(articleId, 'select');
    loadArticles();
    alert('✅ Article queued for scraping!');
  } catch (error) {
    alert(`❌ Failed: ${error.message}`);
  }
};

// Delete irrelevant article
const handleDeleteArticle = async (articleId: string) => {
  try {
    await keywordsAPI.articleAction(articleId, 'delete');
    loadArticles();
  } catch (error) {
    alert(`❌ Failed: ${error.message}`);
  }
};
```

### **Step 5: Update Captain Portal Dashboard**

```typescript
// At the top of app/captain/page.tsx
import { statsAPI } from '@/lib/api/captain-portal';

// Load stats on mount
useEffect(() => {
  loadStats();
}, []);

const loadStats = async () => {
  try {
    const stats = await statsAPI.getDashboard('30d');

    setStats({
      uploads: stats.uploads.total,
      poisDiscovered: stats.pois.total,
      verifiedPOIs: stats.pois.verified,
      urlsScraped: stats.scraping.total_urls,
      activeKeywords: stats.keywords.active,
      newArticles: stats.keywords.new_articles,
    });
  } catch (error) {
    console.error('Error loading stats:', error);
  }
};
```

---

## 📊 **Testing Your Backend**

### **Option 1: Swagger UI (Interactive)**
```
https://lexa-worldmap-mvp-rlss.onrender.com/docs
```

### **Option 2: Health Check**
```bash
curl https://lexa-worldmap-mvp-rlss.onrender.com/health
```

### **Option 3: Test Upload (PowerShell)**
```powershell
# Create test file
"Sample POI data: Luxury Restaurant in Monaco, Michelin 3-star" | Out-File test.txt

# Upload (requires multipart/form-data)
curl.exe -X POST "https://lexa-worldmap-mvp-rlss.onrender.com/api/captain/upload/" -F "file=@test.txt"
```

---

## 📋 **Quick Integration Checklist**

- [ ] Add `NEXT_PUBLIC_BACKEND_URL` to `.env.local`
- [ ] Update Upload page (`app/captain/upload/page.tsx`)
  - [ ] File upload → `uploadAPI.uploadFile()`
  - [ ] Text paste → `uploadAPI.uploadText()`
  - [ ] URL scraping → `scrapingAPI.scrapeURL()`
- [ ] Update Browse page (`app/captain/browse/page.tsx`)
  - [ ] Load POIs → `poisAPI.getPOIs()`
  - [ ] Verify POI → `poisAPI.verifyPOI()`
  - [ ] Edit POI → `poisAPI.updatePOI()`
  - [ ] Promote POI → `poisAPI.promotePOI()`
- [ ] Update Keywords page (`app/captain/keywords/page.tsx`)
  - [ ] Load keywords → `keywordsAPI.getKeywords()`
  - [ ] Add keyword → `keywordsAPI.createKeyword()`
  - [ ] Load articles → `keywordsAPI.getAllArticles()`
  - [ ] Article actions → `keywordsAPI.articleAction()`
- [ ] Update Captain Dashboard (`app/captain/page.tsx`)
  - [ ] Load stats → `statsAPI.getDashboard()`
- [ ] Update History page (`app/captain/history/page.tsx`)
  - [ ] Load history → `uploadAPI.getHistory()`
- [ ] Add loading states and error handling to all pages
- [ ] Add toast notifications (optional but nice UX)
- [ ] Test everything
- [ ] Deploy to Vercel

---

## 🎯 **What This Enables**

With this complete backend, Captains can now:

1. **Upload Knowledge**: PDFs, Word docs, Excel sheets, images, text
2. **Scrape Web Content**: Any URL, automatically extract intelligence
3. **Manage POIs**: Browse, edit, verify, enhance, and promote
4. **Monitor Keywords**: Track topics, review articles, queue for scraping
5. **View Analytics**: Comprehensive stats on all activities

All data is:
- ✅ Automatically extracted by Claude AI
- ✅ Categorized into 7 intelligence types
- ✅ Stored in Supabase with RLS
- ✅ Available to LEXA for script creation
- ✅ Tracked with confidence scores
- ✅ Verified by Captains before going live

---

## 🚀 **Ready to Deploy**

Your backend is **live and production-ready** on Render:
```
https://lexa-worldmap-mvp-rlss.onrender.com
```

Just add the frontend integration code, and the Captain Portal will be fully functional!

---

**Need help with integration? All the API client code is ready in `lib/api/captain-portal.ts`. Just import and use! 🎉**
