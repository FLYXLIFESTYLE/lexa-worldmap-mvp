# Captain Portal Frontend-Backend Integration Guide

## Environment Variables

Add this to your `.env.local` file:

```bash
# Captain Portal Backend API
NEXT_PUBLIC_BACKEND_URL=https://lexa-worldmap-mvp-rlss.onrender.com
```

For local development:
```bash
# For testing locally
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000
```

## API Client Usage

The frontend now has a complete API client in `lib/api/captain-portal.ts`.

### Example Usage:

#### Upload a File
```typescript
import { uploadAPI } from '@/lib/api/captain-portal';

const handleFileUpload = async (file: File) => {
  try {
    const result = await uploadAPI.uploadFile(file);
    console.log(`Uploaded! Found ${result.pois_extracted} POIs`);
  } catch (error) {
    console.error('Upload failed:', error);
  }
};
```

#### Get POIs
```typescript
import { poisAPI } from '@/lib/api/captain-portal';

const fetchPOIs = async () => {
  try {
    const { pois, total } = await poisAPI.getPOIs({
      skip: 0,
      limit: 50,
      verified: false, // Get unverified POIs
    });
    console.log(`Found ${total} POIs`);
  } catch (error) {
    console.error('Error fetching POIs:', error);
  }
};
```

#### Verify a POI
```typescript
import { poisAPI } from '@/lib/api/captain-portal';

const verifyPOI = async (poiId: string) => {
  try {
    const result = await poisAPI.verifyPOI(poiId, true, 85); // verified, 85% confidence
    console.log('POI verified!');
  } catch (error) {
    console.error('Verification failed:', error);
  }
};
```

#### Manage Keywords
```typescript
import { keywordsAPI } from '@/lib/api/captain-portal';

// Add a keyword
const addKeyword = async () => {
  await keywordsAPI.createKeyword('luxury yachting', true);
};

// Get articles
const getArticles = async () => {
  const { articles } = await keywordsAPI.getAllArticles({
    status: 'new',
    limit: 20,
  });
};

// Mark article for scraping
const selectArticle = async (articleId: string) => {
  await keywordsAPI.articleAction(articleId, 'select');
};
```

#### Get Dashboard Stats
```typescript
import { statsAPI } from '@/lib/api/captain-portal';

const loadStats = async () => {
  const stats = await statsAPI.getDashboard('30d');
  console.log(`Total POIs: ${stats.pois.total}`);
  console.log(`Verified: ${stats.pois.verified}`);
};
```

## Available APIs

### 1. Upload API (`uploadAPI`)
- `uploadFile(file)` - Upload PDF, Word, Excel, Image, or Text file
- `uploadText(title, content)` - Paste text directly
- `getHistory(skip, limit)` - View upload history

### 2. Scraping API (`scrapingAPI`)
- `scrapeURL(url, extractIntelligence)` - Scrape a single URL
- `scrapeBatch(urls, extractIntelligence)` - Scrape multiple URLs

### 3. POI API (`poisAPI`)
- `getPOIs(params)` - Browse/filter POIs
- `getPOI(id)` - Get single POI
- `updatePOI(id, updates)` - Edit POI details
- `verifyPOI(id, verified, confidenceScore)` - Verify POI
- `promotePOI(id)` - Promote to main database
- `deletePOI(id)` - Delete POI

### 4. Keywords API (`keywordsAPI`)
- `getKeywords(activeOnly)` - Get all keywords
- `createKeyword(keyword, active)` - Add new keyword
- `updateKeyword(id, updates)` - Update keyword
- `deleteKeyword(id)` - Delete keyword
- `getKeywordArticles(keywordId, status)` - Get articles for keyword
- `getAllArticles(params)` - Get all articles across keywords
- `articleAction(articleId, action)` - Perform action ('select', 'delete', 'scrape')

### 5. Stats API (`statsAPI`)
- `getDashboard(timeRange)` - Get dashboard overview
- `getUploadStats(timeRange)` - Detailed upload analytics
- `getPOIStats(timeRange)` - POI analytics
- `getIntelligenceStats()` - Intelligence extraction stats

### 6. Health API (`healthAPI`)
- `check()` - Check backend health

## Integration Status

### ✅ Completed Backend APIs:
- Upload & Processing
- Web Scraping
- POI Management (CRUD)
- Keyword Monitoring
- Statistics & Analytics

### 📋 To Do - Frontend Integration:
1. Update Upload page to use `uploadAPI`
2. Update Browse page to use `poisAPI`
3. Update Keywords page to use `keywordsAPI`
4. Update Captain Portal dashboard to use `statsAPI`
5. Add loading states and error handling
6. Add toast notifications for success/error

## Testing

Test the backend directly via Swagger UI:
```
https://lexa-worldmap-mvp-rlss.onrender.com/docs
```

Or test health check:
```bash
curl https://lexa-worldmap-mvp-rlss.onrender.com/health
```

## Next Steps

1. Add `NEXT_PUBLIC_BACKEND_URL` to your `.env.local`
2. Update Captain Portal pages to use the API client
3. Test file uploads and POI management
4. Deploy to Vercel (will auto-detect env var)
