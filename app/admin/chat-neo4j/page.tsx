'use client';

/**
 * ChatNeo4j - Natural Language Interface to Neo4j Database
 * 
 * Ask questions in plain English and get intelligent responses
 * powered by Claude AI + Neo4j Cypher queries
 */

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AdminNav from '@/components/admin/admin-nav';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  cypherQuery?: string;
  results?: any[];
  rowCount?: number;
  timestamp: Date;
}

const EXAMPLE_QUESTIONS = [
  "Show me all luxury POIs in St. Tropez",
  "How many POIs do we have worldwide?",
  "What destinations have the most POIs?",
  "Find all beach clubs with luxury score above 8",
  "Show me snorkeling spots in the Mediterranean",
  "What are the top 10 highest-rated luxury hotels?",
  "How many POIs are missing luxury scores?",
  "Show me all destinations in France",
  "What types of POIs do we have?",
  "Find POIs with captain comments in Monaco",
];

export default function ChatNeo4jPage() {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '0',
      role: 'assistant',
      content: 'Hello! I\'m ChatNeo4j, your intelligent database assistant. Ask me anything about your travel POIs, destinations, and luxury data. Try questions like "Show me luxury POIs in Monaco" or "How many beach clubs do we have?"',
      timestamp: new Date(),
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showCypher, setShowCypher] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/neo4j/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: userMessage.content,
          conversationHistory: messages.slice(-6).map(m => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to process question');
      }

      const data = await response.json();

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.data.summary,
        cypherQuery: data.data.cypherQuery,
        results: data.data.results,
        rowCount: data.data.rowCount,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);

    } catch (error) {
      console.error('ChatNeo4j error:', error);
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `Sorry, I encountered an error: ${error instanceof Error ? error.message : 'Unknown error'}. Please try rephrasing your question or make it more specific.`,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExampleClick = (question: string) => {
    setInput(question);
  };

  const clearChat = () => {
    setMessages([
      {
        id: '0',
        role: 'assistant',
        content: 'Chat cleared! Ask me anything about your database.',
        timestamp: new Date(),
      }
    ]);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-50 via-white to-zinc-100">
      <div className="max-w-6xl mx-auto p-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-start justify-between mb-4">
            <button
              onClick={() => router.push('/admin/knowledge')}
              className="text-lexa-navy hover:text-lexa-gold flex items-center gap-2"
            >
              ← Back to Portal
            </button>
            <AdminNav />
          </div>
          
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h1 className="text-4xl font-bold text-lexa-navy mb-2">
                💬 ChatNeo4j
              </h1>
              <p className="text-zinc-600 mb-4">
                Ask questions in plain English about your travel database
              </p>
              
              {/* Why - What - How */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 space-y-2 max-w-2xl">
                <div className="text-sm">
                  <strong className="text-yellow-900">WHY:</strong> <span className="text-gray-700">Instant data insights without writing complex Cypher queries</span>
                </div>
                <div className="text-sm">
                  <strong className="text-yellow-900">WHAT:</strong> <span className="text-gray-700">AI-powered natural language queries to explore POIs, destinations, and data quality</span>
                </div>
                <div className="text-sm">
                  <strong className="text-yellow-900">HOW:</strong> <span className="text-gray-700">Type questions like "Show luxury POIs in Monaco" or click example questions below</span>
                </div>
              </div>
            </div>
            <div className="flex gap-3 ml-4">
              <button
                onClick={() => setShowCypher(!showCypher)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                  showCypher
                    ? 'bg-lexa-gold text-white'
                    : 'bg-white text-lexa-navy border-2 border-lexa-gold'
                }`}
              >
                {showCypher ? '🔍 Showing Cypher' : '🔍 Show Cypher'}
              </button>
              <button
                onClick={clearChat}
                className="px-4 py-2 bg-white text-zinc-700 border-2 border-zinc-300 rounded-lg text-sm font-semibold hover:bg-zinc-50"
              >
                Clear Chat
              </button>
            </div>
          </div>
        </div>

        {/* Example Questions */}
        <div className="mb-6 bg-white rounded-xl p-6 shadow-sm">
          <h3 className="text-sm font-semibold text-lexa-navy mb-3">
            💡 Example Questions (click to use):
          </h3>
          <div className="flex flex-wrap gap-2">
            {EXAMPLE_QUESTIONS.map((question, idx) => (
              <button
                key={idx}
                onClick={() => handleExampleClick(question)}
                className="px-3 py-1.5 bg-lexa-bg text-lexa-navy text-sm rounded-lg hover:bg-lexa-gold hover:text-white transition-colors"
              >
                {question}
              </button>
            ))}
          </div>
        </div>

        {/* Chat Messages */}
        <div className="bg-white rounded-2xl shadow-lg mb-6 h-[600px] flex flex-col">
          {/* Messages Container */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] ${
                    message.role === 'user'
                      ? 'bg-gradient-to-r from-lexa-navy to-lexa-gold text-white'
                      : 'bg-lexa-bg text-lexa-navy'
                  } rounded-2xl p-4 shadow-sm`}
                >
                  {/* Message Content */}
                  <div className="whitespace-pre-wrap">{message.content}</div>

                  {/* Results Summary */}
                  {message.role === 'assistant' && message.rowCount !== undefined && (
                    <div className="mt-3 pt-3 border-t border-zinc-200 text-sm">
                      <span className="font-semibold">
                        📊 {message.rowCount} result{message.rowCount !== 1 ? 's' : ''}
                      </span>
                    </div>
                  )}

                  {/* Cypher Query (if enabled) */}
                  {message.role === 'assistant' && showCypher && message.cypherQuery && (
                    <div className="mt-3 pt-3 border-t border-zinc-200">
                      <div className="text-xs font-semibold mb-2">Cypher Query:</div>
                      <pre className="text-xs bg-zinc-800 text-green-400 p-3 rounded-lg overflow-x-auto">
                        {message.cypherQuery}
                      </pre>
                    </div>
                  )}

                  {/* Results Table (first 10 rows) */}
                  {message.role === 'assistant' && message.results && message.results.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-zinc-200">
                      <div className="text-xs font-semibold mb-2">Data Preview:</div>
                      <div className="overflow-x-auto">
                        <table className="text-xs w-full border-collapse">
                          <thead>
                            <tr className="bg-zinc-100">
                              {Object.keys(message.results[0]).map((key) => (
                                <th key={key} className="p-2 text-left border border-zinc-200">
                                  {key}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {message.results.slice(0, 10).map((row, idx) => (
                              <tr key={idx} className="border-b border-zinc-200 hover:bg-zinc-50">
                                {Object.values(row).map((value: any, vidx) => (
                                  <td key={vidx} className="p-2 border border-zinc-200">
                                    {typeof value === 'object' && value !== null
                                      ? JSON.stringify(value)
                                      : String(value ?? 'null')}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {message.results.length > 10 && (
                          <div className="text-xs text-zinc-500 mt-2">
                            Showing first 10 of {message.results.length} results
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Timestamp */}
                  <div className={`text-xs mt-2 ${
                    message.role === 'user' ? 'text-white/70' : 'text-zinc-500'
                  }`}>
                    {message.timestamp.toLocaleTimeString()}
                  </div>
                </div>
              </div>
            ))}

            {/* Loading Indicator */}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-lexa-bg text-lexa-navy rounded-2xl p-4 shadow-sm">
                  <div className="flex items-center gap-2">
                    <div className="animate-spin h-4 w-4 border-2 border-lexa-gold border-t-transparent rounded-full"></div>
                    <span>Thinking...</span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Form */}
          <form onSubmit={handleSubmit} className="p-6 border-t border-zinc-200">
            <div className="flex gap-3">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask anything about your database... e.g., 'Show me luxury POIs in Monaco'"
                className="flex-1 px-4 py-3 border-2 border-lexa-gold/30 rounded-lg focus:border-lexa-gold focus:outline-none text-lexa-navy"
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="px-6 py-3 bg-gradient-to-r from-lexa-navy to-lexa-gold text-white rounded-lg font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Sending...' : 'Send'}
              </button>
            </div>
          </form>
        </div>

        {/* Info Box */}
        <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4 text-sm text-blue-800">
          <strong>💡 Pro Tip:</strong> ChatNeo4j uses AI to convert your questions into database queries. 
          Be specific for best results. Enable &quot;Show Cypher&quot; to see the actual queries being executed.
        </div>
      </div>
    </div>
  );
}

