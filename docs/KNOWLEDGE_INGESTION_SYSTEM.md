# LEXA Knowledge Ingestion System

## Overview

This system allows you to import **5 years of ChatGPT conversations** and other unstructured data (blog posts, reviews, expert knowledge, "captain's wisdom") into LEXA's Neo4j knowledge base.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   KNOWLEDGE INGESTION FLOW                   │
└─────────────────────────────────────────────────────────────┘

1. INPUT SOURCES
   ├─ ChatGPT Conversation Export (JSON)
   ├─ Text Files (TXT, MD)
   ├─ Documents (PDF, DOCX)
   ├─ Web URLs (scraping)
   └─ Manual Input (rich text editor)

2. PREPROCESSING
   ├─ Format Detection
   ├─ Text Extraction
   ├─ Chunking (by conversation/document)
   └─ Metadata Extraction

3. AI PROCESSING (Claude)
   ├─ Entity Extraction
   │  ├─ POIs (hotels, restaurants, attractions)
   │  ├─ Destinations (cities, regions)
   │  ├─ Themes & Activities
   │  ├─ Emotions & Desires
   │  └─ Practical Tips
   ├─ Relationship Inference
   │  ├─ Geographic relationships
   │  ├─ Thematic connections
   │  ├─ Psychological relationships
   │  └─ Temporal relationships (seasonal, time-based)
   ├─ Knowledge Extraction
   │  ├─ Travel wisdom
   │  ├─ Captain's insights
   │  ├─ Best practices
   │  └─ Warnings/caveats
   └─ Quality Assessment
      ├─ Confidence scoring
      ├─ Source reliability
      └─ Evidence tracking

4. ENRICHMENT (Optional)
   ├─ Google Places validation
   ├─ Wikipedia context
   ├─ Coordinate lookup
   └─ Image URLs

5. NEO4J INGESTION
   ├─ Create/Update POI nodes
   ├─ Create Relationship edges
   ├─ Add Luxury scores
   ├─ Add Confidence scores
   ├─ Tag source & provenance
   └─ Create Knowledge nodes

6. INDEXING & SEARCH
   ├─ Full-text search index
   ├─ Vector embeddings (future)
   └─ Graph-based search
```

---

## 1. ChatGPT Conversation Import

### **Export Format**

ChatGPT exports conversations as JSON:

```json
{
  "title": "Mediterranean Travel Planning",
  "create_time": 1678901234.56,
  "update_time": 1678912345.67,
  "mapping": {
    "message_id_1": {
      "message": {
        "author": { "role": "user" },
        "content": {
          "parts": ["I'm planning a luxury trip to the French Riviera..."]
        },
        "create_time": 1678901234.56
      }
    },
    "message_id_2": {
      "message": {
        "author": { "role": "assistant" },
        "content": {
          "parts": ["The French Riviera offers exceptional luxury..."]
        }
      }
    }
  }
}
```

### **Processing Pipeline**

1. **Parse JSON** → Extract all conversations
2. **Thread Conversations** → User + Assistant messages in sequence
3. **Extract Context** → Destination, themes, preferences mentioned
4. **AI Analysis** → Claude processes each conversation
5. **Extract Entities** → POIs, relationships, insights
6. **Ingest to Neo4j** → Create nodes and relationships

---

## 2. Web Application Design

### **Pages**

#### **A. Knowledge Upload Page** (`/admin/knowledge/upload`)

**Features:**
- File upload (drag & drop)
- Supported formats: JSON (ChatGPT), TXT, MD, PDF, DOCX
- Batch upload (multiple files)
- URL input (scrape web content)
- Preview before processing
- Processing status tracker

**UI Components:**
```
┌────────────────────────────────────────┐
│  📤 Upload Knowledge to LEXA           │
├────────────────────────────────────────┤
│                                        │
│  [Drag & Drop Files Here]             │
│  or                                    │
│  [Browse Files] [Enter URL]           │
│                                        │
│  Supported Formats:                    │
│  • ChatGPT Export (JSON)              │
│  • Text Files (.txt, .md)             │
│  • Documents (.pdf, .docx)            │
│  • URLs (web scraping)                │
│                                        │
│  ┌──────────────────────────────────┐ │
│  │ File: chatgpt-export.json        │ │
│  │ Size: 15.2 MB                    │ │
│  │ Conversations: 1,247             │ │
│  │ Status: ● Processing...          │ │
│  │ Progress: ████████░░░░ 65%       │ │
│  └──────────────────────────────────┘ │
│                                        │
│  [Start Processing]                    │
└────────────────────────────────────────┘
```

#### **B. Captain's Knowledge Editor** (`/admin/knowledge/editor`)

Rich text editor for adding travel wisdom manually.

**Features:**
- WYSIWYG editor (TipTap/Quill)
- Destination/POI tagging
- Theme/Activity tagging
- Confidence rating slider
- Preview & publish

**UI:**
```
┌────────────────────────────────────────┐
│  ✏️  Add Captain's Knowledge           │
├────────────────────────────────────────┤
│  Title: [Best Time to Visit Santorini]│
│                                        │
│  Tags:                                 │
│  🏖️  Santorini  🌅  Sunset  ⏰  Timing │
│  [+ Add Tag]                           │
│                                        │
│  Confidence: ████████████░░ 80%       │
│                                        │
│  ┌──────────────────────────────────┐ │
│  │ [B] [I] [U] [Link] [Quote]       │ │
│  ├──────────────────────────────────┤ │
│  │ For the best experience, visit   │ │
│  │ Santorini in late April or early │ │
│  │ September. Avoid July-August when│ │
│  │ crowds are overwhelming...        │ │
│  └──────────────────────────────────┘ │
│                                        │
│  Related POIs:                         │
│  • Amoudi Bay                         │
│  • Oia Castle                         │
│  [+ Link POI]                         │
│                                        │
│  [Preview] [Save Draft] [Publish]     │
└────────────────────────────────────────┘
```

#### **C. Knowledge Base Browser** (`/admin/knowledge/browse`)

**Features:**
- Search all imported knowledge
- Filter by source (ChatGPT, Manual, Web)
- Filter by confidence
- View extracted entities
- Edit/delete entries

**UI:**
```
┌────────────────────────────────────────┐
│  🔍 Knowledge Base                     │
├────────────────────────────────────────┤
│  Search: [santorini sunset]   🔍      │
│                                        │
│  Filters:                              │
│  Source: [All ▼] [ChatGPT] [Manual]  │
│  Confidence: [>70%]                   │
│                                        │
│  Results: 47 entries                   │
│                                        │
│  ┌──────────────────────────────────┐ │
│  │ 📝 Best Sunset Viewpoints        │ │
│  │ Source: ChatGPT Conv #1247       │ │
│  │ Confidence: 85%                   │ │
│  │ Entities: 5 POIs, 3 themes       │ │
│  │ "The best sunsets in Santorini..." │
│  │ [View] [Edit] [Delete]           │ │
│  └──────────────────────────────────┘ │
│                                        │
│  [Load More]                          │
└────────────────────────────────────────┘
```

---

## 3. AI Processing Pipeline

### **Prompt Template for ChatGPT Conversation Analysis**

```typescript
const systemPrompt = `You are an expert travel knowledge extractor. Analyze ChatGPT conversations about travel and extract structured data.

Extract:
1. **POIs**: Hotels, restaurants, attractions with:
   - Name
   - Type (hotel, restaurant, beach, etc.)
   - Destination/Location
   - Description (if mentioned)
   - Luxury indicators (5-star, Michelin, exclusive, etc.)

2. **Relationships**:
   - POI → Destination (LOCATED_IN)
   - POI → Theme (HAS_THEME)
   - POI → Activity (SUPPORTS_ACTIVITY)
   - POI → Emotion (EVOKES)
   - POI → Desire (AMPLIFIES_DESIRE)
   - POI → Season (AVAILABLE_IN)

3. **Travel Wisdom** (Captain's Knowledge):
   - Best times to visit
   - Insider tips
   - Things to avoid
   - Hidden gems
   - Local insights

4. **Confidence Scoring**:
   - Explicit statement: 0.9
   - Strong implication: 0.75
   - Weak signal: 0.6

Return JSON:
{
  "pois": [
    {
      "name": "Hotel du Cap-Eden-Roc",
      "type": "luxury_resort",
      "destination": "French Riviera",
      "description": "...",
      "luxuryIndicators": ["5-star", "iconic", "exclusive"],
      "confidence": 0.9
    }
  ],
  "relationships": [
    {
      "from": "Hotel du Cap-Eden-Roc",
      "type": "EVOKES",
      "to": "Romance",
      "confidence": 0.85,
      "evidence": "User mentioned romantic ambiance"
    }
  ],
  "wisdom": [
    {
      "topic": "Best time to visit",
      "content": "Visit in May-June or September-October...",
      "applies_to": ["French Riviera"],
      "confidence": 0.9
    }
  ]
}`;
```

### **Processing Function**

```typescript
async function processConversation(conversation: ChatGPTConversation) {
  // 1. Extract full text
  const text = conversation.mapping
    .map(msg => msg.message?.content?.parts?.join(' '))
    .join('\n\n');

  // 2. Send to Claude
  const result = await anthropic.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 4000,
    system: systemPrompt,
    messages: [{ role: 'user', content: text }]
  });

  // 3. Parse JSON response
  const extracted = JSON.parse(result.content[0].text);

  // 4. Ingest to Neo4j
  await ingestExtractedKnowledge(extracted, {
    source: 'chatgpt_conversation',
    conversation_id: conversation.id,
    conversation_title: conversation.title,
    date: conversation.create_time
  });
}
```

---

## 4. Neo4j Schema for Knowledge

### **New Node Type: `Knowledge`**

```cypher
CREATE (k:Knowledge {
  knowledge_id: 'kn_12345',
  content: 'Visit Santorini in late spring for best weather and fewer crowds...',
  topic: 'Best Time to Visit',
  confidence: 0.9,
  
  // Source tracking
  source: 'chatgpt_conversation',
  source_id: 'conv_1247',
  source_title: 'Mediterranean Travel Planning',
  source_date: datetime('2023-03-15'),
  
  // Metadata
  tags: ['timing', 'santorini', 'seasonal'],
  created_at: datetime(),
  author: 'captain' | 'chatgpt' | 'user',
  
  // Quality
  upvotes: 0,
  downvotes: 0,
  verified: false
})

// Relationships
(k)-[:APPLIES_TO]->(d:destination)
(k)-[:RELATES_TO]->(p:poi)
(k)-[:HAS_TAG]->(tag:Tag)
```

### **Example Queries**

```cypher
// Get all wisdom about Santorini
MATCH (k:Knowledge)-[:APPLIES_TO]->(d:destination {name: 'Santorini'})
WHERE k.confidence >= 0.8
RETURN k.content, k.topic, k.confidence
ORDER BY k.confidence DESC

// Get insider tips for a specific POI
MATCH (p:poi {name: 'Oia Castle'})<-[:RELATES_TO]-(k:Knowledge)
WHERE k.topic = 'Insider Tips'
RETURN k.content

// Get all ChatGPT-sourced knowledge
MATCH (k:Knowledge)
WHERE k.source = 'chatgpt_conversation'
RETURN count(k) as total,
       avg(k.confidence) as avg_confidence
```

---

## 5. Implementation Files

### **File Structure**

```
lib/
├─ knowledge/
│  ├─ chatgpt-parser.ts          # Parse ChatGPT JSON exports
│  ├─ text-processor.ts          # Process text/MD files
│  ├─ pdf-extractor.ts           # Extract text from PDFs
│  ├─ web-scraper.ts             # Scrape URLs
│  ├─ ai-processor.ts            # Claude AI processing
│  ├─ knowledge-ingestor.ts      # Ingest to Neo4j
│  └─ index.ts                   # Main orchestrator

app/
├─ admin/
│  ├─ knowledge/
│  │  ├─ upload/
│  │  │  └─ page.tsx             # Upload interface
│  │  ├─ editor/
│  │  │  └─ page.tsx             # Knowledge editor
│  │  └─ browse/
│  │     └─ page.tsx             # Browse knowledge base
│  └─ api/
│     └─ knowledge/
│        ├─ upload/route.ts      # Upload endpoint
│        ├─ process/route.ts     # Processing endpoint
│        └─ search/route.ts      # Search endpoint
```

---

## 6. ChatGPT Export Instructions

### **How to Export from ChatGPT**

1. Go to ChatGPT → Settings → Data Controls
2. Click "Export Data"
3. Wait for email (can take hours/days for large histories)
4. Download ZIP file
5. Extract `conversations.json`
6. Upload to LEXA Knowledge Ingestion

### **Processing Time Estimate**

- **1,000 conversations**: ~30-60 minutes
- **5,000 conversations**: ~2-5 hours
- **10,000+ conversations**: ~5-10 hours

**Why so slow?**
- Each conversation requires Claude AI analysis
- API rate limits
- Neo4j transaction overhead

**Optimization:**
- Batch processing (50 conversations at a time)
- Parallel processing (5 workers)
- Resume capability (track progress)
- Skip duplicates (check conversation_id)

---

## 7. Cost Estimation

### **Claude API Costs** (for 5 years of ChatGPT data)

Assuming:
- 5,000 conversations
- Average 2,000 tokens per conversation
- Claude Sonnet pricing: $3/M input tokens, $15/M output tokens

```
Input tokens: 5,000 × 2,000 = 10M tokens
Cost: 10M × $3/M = $30

Output tokens: ~2M tokens (entities extracted)
Cost: 2M × $15/M = $30

Total: ~$60
```

### **Neo4j Aura Costs**

- Storage: Minimal (text is small)
- No additional cost for ingestion

---

## 8. Quality Assurance

### **Confidence Thresholds**

- ✅ **0.9-1.0**: Publish immediately
- ⚠️  **0.7-0.89**: Review recommended
- ❌ **<0.7**: Manual review required

### **Duplicate Detection**

```cypher
// Find potential duplicate knowledge
MATCH (k1:Knowledge), (k2:Knowledge)
WHERE k1.content CONTAINS k2.content
  AND k1.knowledge_id < k2.knowledge_id
RETURN k1, k2
```

### **Quality Metrics**

- Entities extracted per conversation
- Confidence score distribution
- Source diversity
- User validation (upvotes/downvotes)

---

## 9. Future Enhancements

1. **Vector Embeddings**: Semantic search using OpenAI embeddings
2. **Automatic Summarization**: Claude generates summaries of long conversations
3. **Contradiction Detection**: Flag conflicting information
4. **Knowledge Evolution**: Track how recommendations change over time
5. **Multi-language Support**: Process conversations in multiple languages
6. **Image Analysis**: Extract POIs from travel photos
7. **Voice Input**: Process voice memos as knowledge

---

## Summary for You

### **What This System Does:**

1. **Upload** your 5 years of ChatGPT conversations (JSON file)
2. **AI Processing** extracts POIs, relationships, and wisdom
3. **Luxury Scoring** automatically scores all extracted POIs
4. **Relationship Creation** builds the knowledge graph
5. **Search & Use** LEXA can now answer based on YOUR knowledge

### **Benefits:**

✅ Your 5 years of travel expertise → LEXA's knowledge base  
✅ Automatic POI discovery from conversations  
✅ Relationship inference (emotions, themes, activities)  
✅ Captain's wisdom preserved and queryable  
✅ Continuous learning (add more knowledge anytime)

### **Next Steps:**

1. I'll build the upload interface
2. Create the ChatGPT parser
3. Implement the AI processing pipeline
4. Add the knowledge browser
5. You upload your ChatGPT export
6. LEXA ingests 5 years of wisdom 🎉


