# Simple API Client for Frontend

Create this file: `lib/api.ts`

```typescript
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export interface Account {
  account_id: string
  session_id: string
}

export interface ConversationResponse {
  ailessia_response: string
  emotion_analysis?: any
  conversation_stage?: string
  proactive_suggestions?: string[]
}

export interface ExperienceScript {
  title: string
  cinematic_hook: string
  emotional_arc: string
  signature_highlights: string[]
  ailessia_message: string
}

class APIClient {
  private baseURL: string
  
  constructor(baseURL: string = API_URL) {
    this.baseURL = baseURL
  }
  
  // Account Management
  async createAccount(email: string, name?: string): Promise<Account> {
    const response = await fetch(`${this.baseURL}/api/ailessia/account/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, name })
    })
    
    if (!response.ok) {
      throw new Error('Failed to create account')
    }
    
    return response.json()
  }
  
  // Conversation
  async sendMessage(
    accountId: string,
    sessionId: string,
    message: string,
    conversationHistory: Array<{ role: string; content: string }>
  ): Promise<ConversationResponse> {
    const response = await fetch(`${this.baseURL}/api/ailessia/converse`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        account_id: accountId,
        session_id: sessionId,
        message,
        conversation_history: conversationHistory
      })
    })
    
    if (!response.ok) {
      throw new Error('Failed to send message')
    }
    
    return response.json()
  }
  
  // Script Generation
  async generateScript(
    accountId: string,
    sessionId: string,
    selectedChoices: any
  ): Promise<ExperienceScript> {
    const response = await fetch(`${this.baseURL}/api/ailessia/compose-script`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        account_id: accountId,
        session_id: sessionId,
        selected_choices: selectedChoices
      })
    })
    
    if (!response.ok) {
      throw new Error('Failed to generate script')
    }
    
    return response.json()
  }
  
  // POI Recommendations
  async getRecommendations(
    accountId: string,
    destination: string,
    limit: number = 10
  ) {
    const response = await fetch(
      `${this.baseURL}/api/ailessia/recommendations/pois?` +
      `account_id=${accountId}&destination_name=${destination}&limit=${limit}`
    )
    
    if (!response.ok) {
      throw new Error('Failed to get recommendations')
    }
    
    return response.json()
  }
  
  // Download PDF
  async downloadScriptPDF(accountId: string, scriptId: string): Promise<Blob> {
    const response = await fetch(
      `${this.baseURL}/api/ailessia/script/${accountId}/${scriptId}/pdf`
    )
    
    if (!response.ok) {
      throw new Error('Failed to download PDF')
    }
    
    return response.blob()
  }
}

// Export singleton instance
export const api = new APIClient()

// Export for custom usage
export default APIClient
```

---

## Usage Examples

### 1. Create Account

```typescript
import { api } from '@/lib/api'

const handleSignup = async () => {
  try {
    const account = await api.createAccount('user@example.com', 'John Doe')
    
    localStorage.setItem('lexa_account_id', account.account_id)
    localStorage.setItem('lexa_session_id', account.session_id)
    
    router.push('/experience')
  } catch (error) {
    console.error('Signup failed:', error)
  }
}
```

### 2. Send Message

```typescript
import { api } from '@/lib/api'

const sendMessage = async (content: string) => {
  const accountId = localStorage.getItem('lexa_account_id')!
  const sessionId = localStorage.getItem('lexa_session_id')!
  
  try {
    const response = await api.sendMessage(
      accountId,
      sessionId,
      content,
      conversationHistory
    )
    
    // Update UI with response.ailessia_response
    setMessages(prev => [...prev, {
      role: 'ailessia',
      content: response.ailessia_response
    }])
  } catch (error) {
    console.error('Message failed:', error)
  }
}
```

### 3. Generate Script

```typescript
import { api } from '@/lib/api'

const generateScript = async () => {
  const accountId = localStorage.getItem('lexa_account_id')!
  const sessionId = localStorage.getItem('lexa_session_id')!
  const selections = JSON.parse(localStorage.getItem('lexa_selections') || '{}')
  
  try {
    const script = await api.generateScript(
      accountId,
      sessionId,
      selections
    )
    
    setScript(script)
  } catch (error) {
    console.error('Script generation failed:', error)
  }
}
```

### 4. Download PDF

```typescript
import { api } from '@/lib/api'

const downloadPDF = async () => {
  const accountId = localStorage.getItem('lexa_account_id')!
  const scriptId = 'script_123' // Get from script object
  
  try {
    const blob = await api.downloadScriptPDF(accountId, scriptId)
    
    // Create download link
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'lexa-experience-script.pdf'
    a.click()
  } catch (error) {
    console.error('PDF download failed:', error)
  }
}
```

---

## Environment Setup

Create `.env.local` in your Next.js project root:

```bash
NEXT_PUBLIC_API_URL=http://localhost:8000
```

For production (Vercel):

```bash
NEXT_PUBLIC_API_URL=https://your-backend-domain.com
```

---

## Error Handling Helper

```typescript
// lib/errors.ts

export class APIError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public details?: any
  ) {
    super(message)
    this.name = 'APIError'
  }
}

export const handleAPIError = (error: any): string => {
  if (error instanceof APIError) {
    return error.message
  }
  
  if (error.message) {
    return error.message
  }
  
  return 'Something went wrong. Please try again.'
}
```

Usage:

```typescript
import { handleAPIError } from '@/lib/errors'

try {
  await api.sendMessage(...)
} catch (error) {
  const errorMessage = handleAPIError(error)
  toast.error(errorMessage) // or setError(errorMessage)
}
```

---

## LocalStorage Helper

```typescript
// lib/storage.ts

export const storage = {
  getAccountId: () => localStorage.getItem('lexa_account_id'),
  getSessionId: () => localStorage.getItem('lexa_session_id'),
  getName: () => localStorage.getItem('lexa_name') || 'Guest',
  getSelections: () => JSON.parse(localStorage.getItem('lexa_selections') || '{}'),
  
  setAccount: (accountId: string, sessionId: string, name?: string) => {
    localStorage.setItem('lexa_account_id', accountId)
    localStorage.setItem('lexa_session_id', sessionId)
    if (name) localStorage.setItem('lexa_name', name)
  },
  
  setSelections: (selections: any) => {
    localStorage.setItem('lexa_selections', JSON.stringify(selections))
  },
  
  clear: () => {
    localStorage.removeItem('lexa_account_id')
    localStorage.removeItem('lexa_session_id')
    localStorage.removeItem('lexa_name')
    localStorage.removeItem('lexa_selections')
  }
}
```

---

## That's it! Simple, clean API client! 🚀

