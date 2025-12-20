# 🚀 LEXA Phase 3 - Advanced Features Roadmap

**Implement AFTER MVP is validated with real users!**

---

## 🎯 Three Major Features

1. **Behavioral Trait Detection** - Adaptive conversation intelligence
2. **Unstructured Data Ingestion** - Document upload & approval system  
3. **Historical Knowledge Integration** - Learn from 5 years of AI conversations

---

## 1️⃣ BEHAVIORAL TRAIT DETECTION

### 🧠 Concept

AIlessia analyzes communication patterns during conversation to detect:

```
Communication Style Traits:
├─ Verbosity (Concise ↔ Verbose)
│  • Short answers (< 10 words) = Concise
│  • Long answers (> 50 words) = Verbose
│
├─ Pace (Patient ↔ Impatient)
│  • Fast responses (< 30 sec) = Impatient
│  • Uses words like "quick", "fast", "now" = Impatient
│  • Asks "how long?" early = Impatient
│
├─ Decision Style (Decisive ↔ Deliberate)
│  • Accepts first suggestion = Decisive
│  • Asks many follow-ups = Deliberate
│  • Uses "maybe", "not sure" = Deliberate
│
├─ Detail Orientation (Big Picture ↔ Detail-Focused)
│  • Asks about specifics = Detail-focused
│  • Talks about "vibe", "feeling" = Big picture
│
└─ Engagement (Passive ↔ Proactive)
   • Volunteers information = Proactive
   • Only answers questions = Passive
```

### 📊 Implementation Architecture

```python
# NEW FILE: core/ailessia/behavioral_analyzer.py

class BehavioralAnalyzer:
    """
    Analyzes communication patterns during conversation to detect
    behavioral traits that affect experience design.
    """
    
    def __init__(self):
        self.trait_detectors = {
            'verbosity': VerbosityDetector(),
            'pace': PaceDetector(),
            'decision_style': DecisionStyleDetector(),
            'detail_orientation': DetailOrientationDetector(),
            'engagement': EngagementDetector()
        }
    
    def analyze_message(
        self,
        message: str,
        response_time_seconds: float,
        conversation_history: List[Message]
    ) -> BehavioralProfile:
        """
        Analyze a single message for behavioral signals.
        
        Returns updated behavioral profile with confidence scores.
        """
        
        signals = {}
        
        # Verbosity detection
        word_count = len(message.split())
        if word_count < 10:
            signals['concise'] = 0.8
        elif word_count > 50:
            signals['verbose'] = 0.8
        
        # Pace detection
        if response_time_seconds < 30:
            signals['impatient'] = 0.7
        
        # Urgency keywords
        urgency_words = ['quick', 'fast', 'now', 'hurry', 'asap', 'immediately']
        if any(word in message.lower() for word in urgency_words):
            signals['impatient'] = signals.get('impatient', 0) + 0.3
        
        # Decision style
        decisive_words = ['yes', 'perfect', 'let\'s go', 'book it', 'done']
        deliberate_words = ['maybe', 'not sure', 'think about', 'consider']
        
        if any(word in message.lower() for word in decisive_words):
            signals['decisive'] = 0.7
        elif any(word in message.lower() for word in deliberate_words):
            signals['deliberate'] = 0.7
        
        # Detail orientation
        if '?' in message or any(word in message.lower() for word in ['specific', 'exactly', 'detail']):
            signals['detail_focused'] = 0.6
        
        # Engagement
        questions_asked = message.count('?')
        info_volunteered = len([s for s in message.split('.') if len(s) > 20])
        
        if questions_asked > 2 or info_volunteered > 3:
            signals['proactive'] = 0.8
        
        return BehavioralProfile(
            signals=signals,
            message_count=len(conversation_history),
            avg_response_time=self._calculate_avg_response_time(conversation_history),
            avg_word_count=self._calculate_avg_word_count(conversation_history)
        )
    
    def get_conversation_style_recommendation(
        self, 
        behavioral_profile: BehavioralProfile
    ) -> ConversationStyleGuide:
        """
        Generate recommendations for how AIlessia should adapt.
        """
        
        recommendations = {}
        
        # Concise communicators
        if behavioral_profile.is_concise:
            recommendations['message_length'] = 'short'
            recommendations['questions_per_turn'] = 1  # One at a time
            recommendations['use_quick_actions'] = True
            recommendations['tone'] = 'direct'
        
        # Verbose communicators
        elif behavioral_profile.is_verbose:
            recommendations['message_length'] = 'long'
            recommendations['questions_per_turn'] = 2-3
            recommendations['use_storytelling'] = True
            recommendations['tone'] = 'conversational'
        
        # Impatient clients
        if behavioral_profile.is_impatient:
            recommendations['conversation_depth'] = 'shallow'  # Fewer questions
            recommendations['show_progress'] = True  # "2 more questions..."
            recommendations['offer_express_mode'] = True
            recommendations['script_style'] = 'bullet_points'  # Not narrative
        
        # Patient clients
        elif behavioral_profile.is_patient:
            recommendations['conversation_depth'] = 'deep'
            recommendations['script_style'] = 'narrative'
            recommendations['include_background'] = True
        
        # Decisive clients
        if behavioral_profile.is_decisive:
            recommendations['show_fewer_options'] = True  # 2-3 max
            recommendations['default_to_best_match'] = True
            recommendations['skip_reconfirmation'] = True
        
        # Deliberate clients
        elif behavioral_profile.is_deliberate:
            recommendations['show_more_options'] = True  # 5-7
            recommendations['provide_comparisons'] = True
            recommendations['allow_backtracking'] = True
        
        return ConversationStyleGuide(**recommendations)
```

### 🗄️ Database Schema

```sql
-- Supabase: Add to client_accounts table
ALTER TABLE client_accounts
ADD COLUMN behavioral_profile JSONB DEFAULT '{
  "verbosity": 0.5,
  "pace": 0.5,
  "decision_style": 0.5,
  "detail_orientation": 0.5,
  "engagement": 0.5,
  "avg_response_time": 0,
  "avg_message_length": 0,
  "total_messages": 0,
  "last_analyzed": null
}'::jsonb;

-- Example stored data:
{
  "verbosity": 0.3,           // 0 = concise, 1 = verbose
  "pace": 0.8,                // 0 = patient, 1 = impatient
  "decision_style": 0.7,      // 0 = deliberate, 1 = decisive
  "detail_orientation": 0.4,  // 0 = big picture, 1 = detail-focused
  "engagement": 0.6,          // 0 = passive, 1 = proactive
  "avg_response_time": 45,    // seconds
  "avg_message_length": 8,    // words
  "total_messages": 12,
  "confidence": 0.75,         // How confident we are
  "last_analyzed": "2025-12-20T10:30:00Z"
}
```

### 🔄 Integration with Conversation Flow

```python
# In api/routes/ailessia.py

@router.post("/converse")
async def converse(request: ConversationRequest):
    # ... existing code ...
    
    # NEW: Analyze behavioral patterns
    behavioral_analyzer = BehavioralAnalyzer()
    
    behavioral_profile = behavioral_analyzer.analyze_message(
        message=request.message,
        response_time_seconds=request.response_time_seconds,  # Track in frontend
        conversation_history=conversation_history
    )
    
    # Update client profile
    await account_manager.update_behavioral_profile(
        account_id=request.account_id,
        behavioral_profile=behavioral_profile
    )
    
    # Get style recommendations
    style_guide = behavioral_analyzer.get_conversation_style_recommendation(
        behavioral_profile
    )
    
    # Adapt AIlessia's response based on style guide
    if style_guide.message_length == 'short':
        system_prompt += "\nBe concise. Keep responses under 50 words."
    
    if style_guide.is_impatient:
        system_prompt += "\nClient values speed. Be direct. Show progress."
    
    if style_guide.questions_per_turn == 1:
        system_prompt += "\nAsk ONE question at a time."
    
    # Generate response with adapted style
    ailessia_response = await emotion_interpreter.interpret_and_respond(
        message=request.message,
        conversation_history=conversation_history,
        style_guide=style_guide  # NEW parameter
    )
    
    # Include behavioral insights in response
    return {
        "ailessia_response": ailessia_response,
        "behavioral_profile": behavioral_profile.as_dict(),
        "conversation_style": style_guide.as_dict(),
        "proactive_suggestions": suggestions
    }
```

### 📱 Frontend Tracking

```typescript
// In app/experience/chat/page.tsx

const [messageStartTime, setMessageStartTime] = useState<number>(0)

// Track when user starts typing
const handleInputFocus = () => {
  setMessageStartTime(Date.now())
}

// Calculate response time when sending
const sendMessage = async (content: string) => {
  const responseTime = (Date.now() - messageStartTime) / 1000  // seconds
  
  const response = await api.sendMessage(
    accountId,
    sessionId,
    content,
    conversationHistory,
    responseTime  // NEW: Send response time to backend
  )
  
  // Reset timer
  setMessageStartTime(Date.now())
}
```

---

## 2️⃣ UNSTRUCTURED DATA INGESTION SYSTEM

### 🧠 Concept

Allow Admins/Captains to upload documents for RAG enhancement:

```
Upload Flow:
1. Captain uploads document (Zoom transcript, article, blog)
2. System extracts & structures data
3. Captain reviews extracted data (approve/reject/edit)
4. Approved data → processed & added to RAG
5. Document auto-deleted or manually deleted
6. Only Captain who uploaded can see their documents
```

### 🏗️ Architecture

```
┌─────────────────────────────────────────────────┐
│                  Frontend                       │
│  ┌────────────────────────────────────┐        │
│  │     Document Upload Interface       │        │
│  │  • Drag & drop                      │        │
│  │  • File type: PDF, DOCX, TXT, SRT   │        │
│  │  • Progress bar                     │        │
│  └────────────────────────────────────┘        │
│                      ↓                          │
│  ┌────────────────────────────────────┐        │
│  │     Extraction Review Interface     │        │
│  │  • Show extracted entities          │        │
│  │  • Show key concepts                │        │
│  │  • Edit before approval             │        │
│  │  • Approve / Reject / Edit          │        │
│  └────────────────────────────────────┘        │
└─────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────┐
│                  Backend                        │
│  ┌────────────────────────────────────┐        │
│  │      Document Processor             │        │
│  │  • Extract text (PyPDF2, python-docx)│       │
│  │  • Chunk text (RecursiveTextSplitter)│       │
│  │  • Extract entities (Claude/GPT-4)  │        │
│  │  • Generate embeddings              │        │
│  │  • Store in pending_approval table  │        │
│  └────────────────────────────────────┘        │
│                      ↓                          │
│  ┌────────────────────────────────────┐        │
│  │      Approval Handler               │        │
│  │  • On approve:                      │        │
│  │    - Add to vector DB (Supabase)    │        │
│  │    - Add to Neo4j (if structured)   │        │
│  │    - Delete or archive original     │        │
│  │  • On reject:                       │        │
│  │    - Delete document & extractions  │        │
│  └────────────────────────────────────┘        │
└─────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────┐
│               Storage & RAG                     │
│  ┌──────────────┐  ┌──────────────┐           │
│  │  Supabase    │  │   Neo4j      │           │
│  │  (pgvector)  │  │   (Graph)    │           │
│  │              │  │              │           │
│  │ • Embeddings │  │ • Entities   │           │
│  │ • Full text  │  │ • Relations  │           │
│  └──────────────┘  └──────────────┘           │
└─────────────────────────────────────────────────┘
```

### 🗄️ Database Schema

```sql
-- Supabase: New tables for document management

-- 1. Document uploads (before approval)
CREATE TABLE document_uploads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  uploaded_by UUID REFERENCES client_accounts(id),
  filename TEXT NOT NULL,
  file_type TEXT NOT NULL,  -- 'pdf', 'docx', 'txt', 'srt', 'url'
  file_size_bytes INTEGER,
  storage_path TEXT,  -- Supabase Storage path
  status TEXT DEFAULT 'processing',  -- 'processing', 'pending_approval', 'approved', 'rejected'
  uploaded_at TIMESTAMP DEFAULT NOW()
);

-- 2. Extracted data (for review)
CREATE TABLE document_extractions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID REFERENCES document_uploads(id) ON DELETE CASCADE,
  extraction_type TEXT,  -- 'entities', 'concepts', 'facts', 'quotes'
  extracted_data JSONB,
  confidence_score FLOAT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Example extracted_data:
{
  "entities": [
    {"type": "destination", "name": "French Riviera", "confidence": 0.95},
    {"type": "activity", "name": "Private yacht charter", "confidence": 0.9}
  ],
  "concepts": [
    {"concept": "luxury_threshold", "value": "Clients expect 5-star minimum", "confidence": 0.85}
  ],
  "facts": [
    {"fact": "Monaco has 247 luxury POIs", "source": "page 3", "confidence": 0.9}
  ],
  "quotes": [
    {"quote": "The emotional connection is more important than the itinerary", "speaker": "Expert", "confidence": 0.95}
  ]
}

-- 3. Approved knowledge (RAG-ready)
CREATE TABLE approved_knowledge (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source_document_id UUID REFERENCES document_uploads(id),
  knowledge_type TEXT,  -- 'destination_info', 'client_insight', 'best_practice'
  content TEXT,
  embedding VECTOR(1536),  -- For semantic search
  metadata JSONB,
  approved_by UUID REFERENCES client_accounts(id),
  approved_at TIMESTAMP DEFAULT NOW()
);

-- 4. RLS (Row Level Security) - Users only see their own uploads
ALTER TABLE document_uploads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only see their own uploads"
  ON document_uploads
  FOR SELECT
  USING (uploaded_by = auth.uid());

CREATE POLICY "Users can only upload for themselves"
  ON document_uploads
  FOR INSERT
  WITH CHECK (uploaded_by = auth.uid());

CREATE POLICY "Users can only delete their own uploads"
  ON document_uploads
  FOR DELETE
  USING (uploaded_by = auth.uid());
```

### 🐍 Backend Implementation

```python
# NEW FILE: core/document_processor/extractor.py

from anthropic import Anthropic
import PyPDF2
import docx
import structlog

logger = structlog.get_logger()

class DocumentExtractor:
    """
    Extracts structured knowledge from unstructured documents.
    """
    
    def __init__(self, anthropic_client: Anthropic):
        self.claude = anthropic_client
    
    async def process_document(
        self,
        file_path: str,
        file_type: str,
        document_id: str
    ) -> ExtractionResult:
        """
        Extract text and structured knowledge from document.
        """
        
        # 1. Extract raw text
        raw_text = await self._extract_text(file_path, file_type)
        
        # 2. Chunk text for processing
        chunks = self._chunk_text(raw_text, chunk_size=2000)
        
        # 3. Extract structured knowledge from each chunk
        all_extractions = []
        
        for i, chunk in enumerate(chunks):
            logger.info(f"Processing chunk {i+1}/{len(chunks)}")
            
            extraction = await self._extract_knowledge(chunk)
            all_extractions.append(extraction)
        
        # 4. Merge and deduplicate extractions
        merged = self._merge_extractions(all_extractions)
        
        return ExtractionResult(
            document_id=document_id,
            total_chunks=len(chunks),
            entities=merged['entities'],
            concepts=merged['concepts'],
            facts=merged['facts'],
            quotes=merged['quotes']
        )
    
    async def _extract_text(self, file_path: str, file_type: str) -> str:
        """Extract raw text from various file types."""
        
        if file_type == 'pdf':
            with open(file_path, 'rb') as f:
                reader = PyPDF2.PdfReader(f)
                text = ' '.join([page.extract_text() for page in reader.pages])
        
        elif file_type == 'docx':
            doc = docx.Document(file_path)
            text = ' '.join([para.text for para in doc.paragraphs])
        
        elif file_type == 'txt' or file_type == 'srt':
            with open(file_path, 'r', encoding='utf-8') as f:
                text = f.read()
        
        else:
            raise ValueError(f"Unsupported file type: {file_type}")
        
        return text
    
    def _chunk_text(self, text: str, chunk_size: int = 2000) -> List[str]:
        """Split text into overlapping chunks."""
        from langchain.text_splitter import RecursiveCharacterTextSplitter
        
        splitter = RecursiveCharacterTextSplitter(
            chunk_size=chunk_size,
            chunk_overlap=200,
            separators=["\n\n", "\n", ". ", " ", ""]
        )
        
        return splitter.split_text(text)
    
    async def _extract_knowledge(self, chunk: str) -> Dict:
        """Use Claude to extract structured knowledge from text chunk."""
        
        prompt = f"""
Analyze this text and extract structured knowledge relevant to luxury travel experiences:

{chunk}

Extract the following (return as JSON):

1. ENTITIES: Named destinations, activities, experiences, people, brands
   Format: {{"type": "destination|activity|person|brand", "name": "...", "confidence": 0.0-1.0}}

2. CONCEPTS: Key ideas, principles, strategies, insights about luxury travel
   Format: {{"concept": "brief_name", "description": "...", "confidence": 0.0-1.0}}

3. FACTS: Specific factual statements (numbers, dates, proven claims)
   Format: {{"fact": "statement", "source": "where in text", "confidence": 0.0-1.0}}

4. QUOTES: Notable quotes from speakers or experts
   Format: {{"quote": "...", "speaker": "name or role", "context": "...", "confidence": 0.0-1.0}}

Only extract knowledge that is:
- Relevant to luxury travel, experiences, client desires, or destination information
- Clear and specific (not vague statements)
- Actionable or informative for an AI travel advisor

Return JSON only, no explanation.
"""
        
        response = await self.claude.messages.create(
            model="claude-3-5-sonnet-20241022",
            max_tokens=2000,
            messages=[{"role": "user", "content": prompt}]
        )
        
        import json
        extracted = json.loads(response.content[0].text)
        
        return extracted


# NEW FILE: api/routes/documents.py

from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from database.account_manager import account_manager
from core.document_processor.extractor import DocumentExtractor

router = APIRouter(prefix="/api/documents", tags=["documents"])

@router.post("/upload")
async def upload_document(
    file: UploadFile = File(...),
    account_id: str = None
):
    """
    Upload a document for processing.
    """
    
    # Check user is admin/captain
    account = await account_manager.get_account(account_id)
    if account.get('role') != 'captain':
        raise HTTPException(403, "Only Captains can upload documents")
    
    # Save file to Supabase Storage
    file_path = f"uploads/{account_id}/{file.filename}"
    storage_url = await supabase_client.storage.from_('documents').upload(
        file_path,
        await file.read()
    )
    
    # Create document record
    document = await supabase_client.table('document_uploads').insert({
        'uploaded_by': account_id,
        'filename': file.filename,
        'file_type': file.filename.split('.')[-1].lower(),
        'file_size_bytes': file.size,
        'storage_path': file_path,
        'status': 'processing'
    }).execute()
    
    document_id = document.data[0]['id']
    
    # Process document in background
    extractor = DocumentExtractor(anthropic_client=claude_client)
    
    try:
        # Download file temporarily
        temp_path = f"/tmp/{document_id}_{file.filename}"
        file_bytes = await supabase_client.storage.from_('documents').download(file_path)
        with open(temp_path, 'wb') as f:
            f.write(file_bytes)
        
        # Extract knowledge
        extraction_result = await extractor.process_document(
            file_path=temp_path,
            file_type=document['file_type'],
            document_id=document_id
        )
        
        # Save extractions
        await supabase_client.table('document_extractions').insert({
            'document_id': document_id,
            'extraction_type': 'comprehensive',
            'extracted_data': extraction_result.as_dict(),
            'confidence_score': extraction_result.avg_confidence
        }).execute()
        
        # Update document status
        await supabase_client.table('document_uploads').update({
            'status': 'pending_approval'
        }).eq('id', document_id).execute()
        
        # Clean up temp file
        import os
        os.remove(temp_path)
        
        return {
            "document_id": document_id,
            "status": "pending_approval",
            "extractions": extraction_result.as_dict()
        }
        
    except Exception as e:
        logger.error("Document processing failed", error=str(e))
        await supabase_client.table('document_uploads').update({
            'status': 'failed'
        }).eq('id', document_id).execute()
        raise HTTPException(500, f"Processing failed: {str(e)}")


@router.get("/pending")
async def get_pending_documents(account_id: str):
    """Get documents pending approval for this captain."""
    
    documents = await supabase_client.table('document_uploads').select(
        '*, document_extractions(*)'
    ).eq('uploaded_by', account_id).eq('status', 'pending_approval').execute()
    
    return {"documents": documents.data}


@router.post("/{document_id}/approve")
async def approve_document(
    document_id: str,
    account_id: str,
    approved_extractions: List[str]  # IDs of extractions to approve
):
    """
    Approve document extractions and add to RAG system.
    """
    
    # Get document
    document = await supabase_client.table('document_uploads').select('*').eq(
        'id', document_id
    ).eq('uploaded_by', account_id).single().execute()
    
    if not document.data:
        raise HTTPException(404, "Document not found or not authorized")
    
    # Get approved extractions
    extractions = await supabase_client.table('document_extractions').select('*').in_(
        'id', approved_extractions
    ).execute()
    
    # Process each approved extraction
    for extraction in extractions.data:
        extracted_data = extraction['extracted_data']
        
        # Generate embeddings and add to approved_knowledge
        for entity in extracted_data.get('entities', []):
            embedding = await generate_embedding(entity['name'])
            
            await supabase_client.table('approved_knowledge').insert({
                'source_document_id': document_id,
                'knowledge_type': entity['type'],
                'content': json.dumps(entity),
                'embedding': embedding,
                'metadata': {'confidence': entity['confidence']},
                'approved_by': account_id
            }).execute()
        
        # Same for concepts, facts, quotes...
    
    # Update document status
    await supabase_client.table('document_uploads').update({
        'status': 'approved'
    }).eq('id', document_id).execute()
    
    # Auto-delete original file if configured
    await supabase_client.storage.from_('documents').remove([document['storage_path']])
    
    return {"status": "approved", "knowledge_items_added": len(approved_extractions)}


@router.delete("/{document_id}")
async def delete_document(document_id: str, account_id: str):
    """Delete document and all related data."""
    
    # Verify ownership
    document = await supabase_client.table('document_uploads').select('*').eq(
        'id', document_id
    ).eq('uploaded_by', account_id).single().execute()
    
    if not document.data:
        raise HTTPException(404, "Document not found or not authorized")
    
    # Delete from storage
    await supabase_client.storage.from_('documents').remove([document.data['storage_path']])
    
    # Delete from database (CASCADE will delete extractions)
    await supabase_client.table('document_uploads').delete().eq('id', document_id).execute()
    
    return {"status": "deleted"}
```

---

## 3️⃣ HISTORICAL KNOWLEDGE INTEGRATION

### 🧠 Concept

Import 5 years of AI conversations to extract:
- Strategic insights about LEXA
- User behavior patterns
- Successful conversation flows
- Feature ideas and requirements
- Domain knowledge about luxury travel

### 🏗️ Implementation

```python
# NEW FILE: scripts/import_historical_chats.py

"""
One-time script to import and analyze 5 years of AI conversations.
"""

import asyncio
from pathlib import Path
from core.document_processor.extractor import DocumentExtractor
from database.supabase_vector_client import vector_db_client

async def import_historical_chats(chat_directory: str):
    """
    Import all historical chat transcripts and extract knowledge.
    
    Args:
        chat_directory: Path to folder containing chat exports
                       (e.g., ChatGPT exports, Claude exports)
    """
    
    extractor = DocumentExtractor(anthropic_client=claude_client)
    
    chat_files = list(Path(chat_directory).glob('**/*.json'))
    
    print(f"Found {len(chat_files)} chat files to process")
    
    for i, chat_file in enumerate(chat_files):
        print(f"\nProcessing {i+1}/{len(chat_files)}: {chat_file.name}")
        
        # Load chat
        with open(chat_file, 'r') as f:
            chat_data = json.load(f)
        
        # Extract conversation text
        conversation_text = extract_conversation_text(chat_data)
        
        # Use Claude to analyze entire conversation
        analysis = await analyze_chat_for_insights(conversation_text)
        
        # Store insights in knowledge base
        await store_insights(analysis, source=str(chat_file))
        
        print(f"  ✓ Extracted {len(analysis['insights'])} insights")


async def analyze_chat_for_insights(conversation_text: str) -> Dict:
    """
    Use Claude to extract high-level insights from entire conversation.
    """
    
    prompt = f"""
Analyze this conversation transcript (from the development of LEXA, a luxury travel AI):

{conversation_text[:50000]}  # Limit to 50k chars

Extract strategic insights in these categories:

1. PRODUCT_VISION: What is LEXA trying to achieve? Core mission?
2. USER_NEEDS: What pain points or desires are being addressed?
3. FEATURE_IDEAS: Specific features or capabilities discussed
4. DESIGN_PRINCIPLES: How should LEXA behave or communicate?
5. TECHNICAL_DECISIONS: Architecture, tech stack, or implementation choices
6. MARKET_INSIGHTS: Understanding of luxury travel market, competitors
7. SUCCESS_METRICS: How to measure if LEXA is working?
8. CHALLENGES: Problems to solve or avoid

For each insight:
- Be specific and actionable
- Include context if needed
- Rate importance (1-10)
- Note if it's still relevant or outdated

Return as structured JSON.
"""
    
    response = await claude_client.messages.create(
        model="claude-3-5-sonnet-20241022",
        max_tokens=4000,
        messages=[{"role": "user", "content": prompt}]
    )
    
    return json.loads(response.content[0].text)


async def store_insights(analysis: Dict, source: str):
    """Store extracted insights in vector database for RAG."""
    
    for category, insights in analysis.items():
        for insight in insights:
            # Generate embedding
            embedding = await vector_db_client.generate_embedding(
                insight['content']
            )
            
            # Store in Supabase
            await supabase_client.table('historical_insights').insert({
                'category': category,
                'content': insight['content'],
                'importance': insight['importance'],
                'context': insight.get('context'),
                'is_relevant': insight.get('is_relevant', True),
                'source_file': source,
                'embedding': embedding
            }).execute()


# Run import
if __name__ == "__main__":
    asyncio.run(import_historical_chats('/path/to/chat/exports'))
```

### 🗄️ Database Schema

```sql
-- Supabase: Store historical insights

CREATE TABLE historical_insights (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category TEXT,  -- 'product_vision', 'user_needs', 'feature_ideas', etc.
  content TEXT,
  importance INTEGER,  -- 1-10
  context TEXT,
  is_relevant BOOLEAN DEFAULT true,
  source_file TEXT,
  embedding VECTOR(1536),
  extracted_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX ON historical_insights USING ivfflat (embedding vector_cosine_ops);

-- Query function
CREATE OR REPLACE FUNCTION search_historical_insights(
  query_embedding VECTOR(1536),
  match_threshold FLOAT DEFAULT 0.7,
  match_count INT DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  category TEXT,
  content TEXT,
  importance INTEGER,
  similarity FLOAT
)
LANGUAGE SQL STABLE
AS $$
  SELECT
    id,
    category,
    content,
    importance,
    1 - (embedding <=> query_embedding) AS similarity
  FROM historical_insights
  WHERE 1 - (embedding <=> query_embedding) > match_threshold
    AND is_relevant = true
  ORDER BY similarity DESC
  LIMIT match_count;
$$;
```

### 🔄 Using Historical Insights in RAG

```python
# In core/ailessia/emotion_interpreter.py

async def interpret_and_respond(
    self,
    message: str,
    conversation_history: List[Message],
    style_guide: ConversationStyleGuide
) -> str:
    """Generate AIlessia response with historical insights."""
    
    # ... existing code ...
    
    # NEW: Query historical insights for relevant context
    message_embedding = await vector_db_client.generate_embedding(message)
    
    historical_context = await supabase_client.rpc(
        'search_historical_insights',
        {
            'query_embedding': message_embedding,
            'match_threshold': 0.75,
            'match_count': 3
        }
    ).execute()
    
    if historical_context.data:
        # Add to system prompt
        insights_text = "\n".join([
            f"- {insight['content']} (importance: {insight['importance']}/10)"
            for insight in historical_context.data
        ])
        
        system_prompt += f"""

RELEVANT INSIGHTS FROM DEVELOPMENT HISTORY:
{insights_text}

Use these insights to inform your response, but don't mention them directly.
"""
    
    # Generate response with enhanced context
    response = await self.claude.messages.create(...)
    
    return response.content[0].text
```

---

## 📋 IMPLEMENTATION PRIORITY

### Phase 3A (After MVP validated - Week 2-3):
1. ✅ Behavioral Trait Detection
   - Quick wins, high impact
   - Improves conversation immediately
   - ~3-5 days development

### Phase 3B (After behavioral detection - Week 4):
2. ✅ Historical Knowledge Integration
   - One-time import
   - Continuous benefit
   - ~2-3 days development

### Phase 3C (After user testing - Week 5-6):
3. ✅ Unstructured Data Ingestion
   - More complex (file handling, approval UI)
   - Requires admin dashboard
   - ~5-7 days development

---

## 🎯 SUCCESS METRICS

### Behavioral Detection:
- Conversation completion rate increases
- User satisfaction scores improve
- Average conversation time optimized (shorter for impatient, deeper for patient)

### Document Ingestion:
- X documents processed per week
- Y% approval rate on extractions
- Z new insights added to RAG

### Historical Integration:
- Relevant insights surfaced in X% of conversations
- Quality of AIlessia responses improves (measured by feedback)

---

## 🚨 IMPORTANT: Do This AFTER MVP!

**Tomorrow:** Focus 100% on building the frontend MVP
**Next Week:** Test with real users, gather feedback
**Week 2:** THEN implement these advanced features

**Why wait?**
- Need to validate core concept first
- Real user feedback will guide prioritization
- Don't over-engineer before product-market fit

---

**These features will make LEXA incredible, but the MVP comes first! 🚀**

**Ship tomorrow, enhance next week! 💪**

