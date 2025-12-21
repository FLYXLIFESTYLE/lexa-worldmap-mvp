/**
 * LEXA API Client
 * Connects frontend to FastAPI backend
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface AccountCreateRequest {
  email: string;
  name?: string;
  phone?: string;
}

export interface AccountResponse {
  account_id: string;
  email: string;
  name?: string;
  personality_archetype?: string;
  vip_status: string;
  total_scripts_created: number;
  session_id?: string;
  ailessia_greeting?: string;
}

export interface ConversationMessage {
  role: 'user' | 'ailessia' | 'assistant';
  content: string;
  timestamp?: string;
}

export interface ConverseRequest {
  account_id: string;
  session_id: string;
  message: string;
  conversation_history?: ConversationMessage[];
}

export interface ConverseResponse {
  ailessia_response: string;
  tone_used: string;
  conversation_stage: string;
  progress: number;
  emotional_reading?: any;
  proactive_suggestions?: any[];
  key_insight?: string;
  rag_payload?: any;
}

export interface ComposeScriptRequest {
  account_id: string;
  session_id: string;
  selected_choices: {
    destination?: string;
    theme?: string;
    time?: string;
    budget?: string;
    duration?: string;
    must_haves?: string[];
  };
}

export interface ScriptResponse {
  script_id: string;
  title: string;
  cinematic_hook: string;
  emotional_arc: string;
  pdf_url?: string;
  preview_narrative: string;
  total_investment: number;
  duration_days: number;
  ailessia_message: string;
}

export interface POIRecommendationRequest {
  account_id: string;
  destination?: string;
  activity_types?: string[];
  min_luxury_score?: number;
  min_fit_score?: number;
  limit?: number;
}

export interface POIRecommendationResponse {
  pois: any[];
  client_archetype_weights: Record<string, number>;
  recommendation_strategy: string;
  total_found: number;
}

// ============================================================================
// API CLIENT CLASS
// ============================================================================

class LexaAPIClient {
  private baseURL: string;

  constructor(baseURL: string = API_BASE_URL) {
    this.baseURL = baseURL;
  }

  /**
   * Make API request with error handling
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    
    const defaultHeaders = {
      'Content-Type': 'application/json',
    };

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...defaultHeaders,
          ...options.headers,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.detail || `API Error: ${response.status} ${response.statusText}`
        );
      }

      return await response.json();
    } catch (error) {
      console.error('API Request Failed:', {
        endpoint,
        error,
      });
      throw error;
    }
  }

  // ==========================================================================
  // ACCOUNT MANAGEMENT
  // ==========================================================================

  /**
   * Create a new client account
   */
  async createAccount(data: AccountCreateRequest): Promise<AccountResponse> {
    try {
      const response = await this.request<AccountResponse>('/api/lexa/account/create', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      
      // Store the real account info
      saveToLocalStorage('lexa_account', {
        account_id: response.account_id,
        session_id: response.session_id,
        email: response.email,
        name: response.name,
      });
      
      return response;
    } catch (error) {
      console.error('Backend account creation failed, creating offline fallback:', error);
      
      // Generate a valid UUID v4 for offline mode
      const uuid = crypto.randomUUID();
      const offlineAccount = {
        account_id: uuid,
        session_id: `session-${uuid}`,
        email: data.email,
        name: data.name || data.email.split('@')[0],
        personality_archetype: undefined, // Changed from null to undefined
        vip_status: 'General',
        total_scripts_created: 0,
        ailessia_greeting: undefined, // Changed from null to undefined
      };
      
      // Store offline account
      saveToLocalStorage('lexa_account', {
        account_id: offlineAccount.account_id,
        session_id: offlineAccount.session_id,
        email: offlineAccount.email,
        name: offlineAccount.name,
        offline: true, // Mark as offline
      });
      
      return offlineAccount as AccountResponse;
    }
  }

  /**
   * Get account by ID
   */
  async getAccount(accountId: string): Promise<AccountResponse> {
    return this.request<AccountResponse>(`/api/lexa/account/${accountId}`, {
      method: 'GET',
    });
  }

  // ==========================================================================
  // CONVERSATION
  // ==========================================================================

  /**
   * Send message to LEXA
   */
  async converse(data: ConverseRequest): Promise<ConverseResponse> {
    return this.request<ConverseResponse>('/api/lexa/converse', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /**
   * Start a new conversation (gets initial greeting)
   */
  async startConversation(
    accountId: string,
    sessionId: string,
    initialContext?: {
      destination?: string;
      theme?: string;
      time?: string;
    }
  ): Promise<ConverseResponse> {
    const message = initialContext
      ? `I'm interested in ${initialContext.theme || 'an experience'} in ${
          initialContext.destination || 'a beautiful destination'
        } during ${initialContext.time || 'a perfect time'}.`
      : "I'm ready to begin my journey.";

    return this.converse({
      account_id: accountId,
      session_id: sessionId,
      message,
      conversation_history: [],
    });
  }

  // ==========================================================================
  // SCRIPT COMPOSITION
  // ==========================================================================

  /**
   * Compose experience script
   */
  async composeScript(data: ComposeScriptRequest): Promise<ScriptResponse> {
    return this.request<ScriptResponse>('/api/lexa/compose-script', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /**
   * Get script by ID
   */
  async getScript(scriptId: string): Promise<ScriptResponse> {
    return this.request<ScriptResponse>(`/api/lexa/script/${scriptId}`, {
      method: 'GET',
    });
  }

  /**
   * Download script PDF
   */
  async downloadScriptPDF(scriptId: string): Promise<Blob> {
    const response = await fetch(
      `${this.baseURL}/api/lexa/script/${scriptId}/pdf`
    );
    if (!response.ok) {
      throw new Error('Failed to download PDF');
    }
    return response.blob();
  }

  // ==========================================================================
  // RECOMMENDATIONS
  // ==========================================================================

  /**
   * Get personalized POI recommendations
   */
  async getPOIRecommendations(
    data: POIRecommendationRequest
  ): Promise<POIRecommendationResponse> {
    return this.request<POIRecommendationResponse>(
      '/api/lexa/recommendations/pois',
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    );
  }

  // ==========================================================================
  // FEEDBACK
  // ==========================================================================

  /**
   * Submit feedback
   */
  async submitFeedback(data: {
    account_id: string;
    feedback_type: string;
    rating: number;
    feedback_text?: string;
    script_id?: string;
    session_id?: string;
  }): Promise<{ status: string }> {
    return this.request<{ status: string }>('/api/lexa/feedback', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // ==========================================================================
  // HEALTH CHECK
  // ==========================================================================

  /**
   * Check API health
   */
  async healthCheck(): Promise<{
    status: string;
    neo4j: string;
    qdrant: string;
  }> {
    return this.request<{
      status: string;
      neo4j: string;
      qdrant: string;
    }>('/api/health', {
      method: 'GET',
    });
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

export const lexaAPI = new LexaAPIClient();

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Extract initial context from builder state
 */
export function extractContextFromBuilder(builderState: any) {
  return {
    destination: builderState.destination?.name || undefined,
    theme: builderState.theme?.name || undefined,
    time: builderState.time?.month
      ? `${builderState.time.month} ${builderState.time.year}`
      : undefined,
  };
}

/**
 * Format conversation history for API
 */
export function formatConversationHistory(
  messages: Array<{ role: string; content: string; timestamp?: string }>
): ConversationMessage[] {
  return messages.map((msg) => ({
    role: msg.role === 'assistant' ? 'ailessia' : (msg.role as any),
    content: msg.content,
    timestamp: msg.timestamp,
  }));
}

/**
 * Save to localStorage with expiry
 */
export function saveToLocalStorage(
  key: string,
  data: any,
  expiryHours: number = 24
) {
  const item = {
    data,
    expiry: new Date().getTime() + expiryHours * 60 * 60 * 1000,
  };
  localStorage.setItem(key, JSON.stringify(item));
}

/**
 * Load from localStorage with expiry check
 */
export function loadFromLocalStorage(key: string): any | null {
  const itemStr = localStorage.getItem(key);
  if (!itemStr) return null;

  try {
    const item = JSON.parse(itemStr);
    if (new Date().getTime() > item.expiry) {
      localStorage.removeItem(key);
      return null;
    }
    return item.data;
  } catch {
    return null;
  }
}

/**
 * Clear all LEXA data from localStorage
 */
export function clearLexaData() {
  const keys = ['lexa_account', 'lexa_session', 'lexa_builder_state', 'lexa_conversation'];
  keys.forEach((key) => localStorage.removeItem(key));
}

export default lexaAPI;

