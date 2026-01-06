'use client';

/**
 * Captain Portal: Market Intelligence
 * Strategic insights dashboard for Chris, Paul, and Bakary
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client-browser';
import AdminNav from '@/components/admin/admin-nav';
import PortalShell from '@/components/portal/portal-shell';

const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://lexa-worldmap-mvp-rlss.onrender.com';

export default function MarketInsightsPage() {
  const router = useRouter();
  const supabase = createClient();

  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [answer, setAnswer] = useState<any>(null);
  const [archetypeData, setArchetypeData] = useState<any>(null);
  const [cruiseRecs, setCruiseRecs] = useState<any[]>([]);

  // Suggested questions
  const suggestedQuestions = [
    "How many of our users are Cultural Connoisseur archetype?",
    "What would be a great destination for Art & Culinary cruise besides French Riviera?",
    "What theme should we create a SYCC cruise for that matches the most users?",
    "Which client archetype is most underserved by our current POI coverage?",
    "What pricing optimization opportunities exist based on conversion data?",
    "Which destinations are mentioned most in user conversations?",
  ];

  // Load archetype distribution on mount
  useEffect(() => {
    loadArchetypeDistribution();
  }, []);

  const loadArchetypeDistribution = async () => {
    try {
      const { data: session } = await supabase.auth.getSession();
      const accessToken = session.session?.access_token;

      const response = await fetch(`${API_BASE_URL}/api/market-intelligence/archetype-distribution`, {
        headers: {
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {})
        }
      });

      if (response.ok) {
        const data = await response.json();
        setArchetypeData(data);
      }
    } catch (error) {
      console.error('Error loading archetype data:', error);
    }
  };

  const askQuestion = async (q: string = question) => {
    if (!q.trim()) return;

    setLoading(true);
    setAnswer(null);

    try {
      const { data: session } = await supabase.auth.getSession();
      const accessToken = session.session?.access_token;

      const response = await fetch(`${API_BASE_URL}/api/market-intelligence/ask`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {})
        },
        body: JSON.stringify({
          question: q,
          time_period: "last_90_days"
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to get answer');
      }

      const data = await response.json();
      setAnswer(data);

    } catch (error: any) {
      alert(`❌ Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const loadCruiseRecommendations = async () => {
    setLoading(true);

    try {
      const { data: session } = await supabase.auth.getSession();
      const accessToken = session.session?.access_token;

      const response = await fetch(`${API_BASE_URL}/api/market-intelligence/cruise-recommendations`, {
        headers: {
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {})
        }
      });

      if (response.ok) {
        const data = await response.json();
        setCruiseRecs(data.recommendations || []);
      }
    } catch (error) {
      console.error('Error loading cruise recommendations:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <PortalShell
      icon="📊"
      title="Market Intelligence"
      subtitle="Strategic insights for business decisions"
      backLink={{ href: '/captain', label: 'Back to Captain Portal' }}
      topRight={<AdminNav />}
      mission={[
        { label: 'YOUR MISSION', text: 'Use aggregated user data to guide SYCC cruise creation and business strategy.' },
        { label: 'CAPABILITIES', text: 'Ask questions, get cruise recommendations, analyze demand patterns, identify gaps.' },
        { label: 'AUDIENCE', text: 'Chris, Paul, and Bakary making strategic decisions.' },
      ]}
      quickTips={[
        'Ask natural language questions: "What would be a great destination for Art & Culinary cruise?"',
        'Recommendations are ROI-projected based on real user data.',
        'Use archetype distribution to identify which client types need more content.',
      ]}
    >
      {/* Q&A Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 mb-8">
        <h2 className="text-2xl font-semibold text-gray-900 mb-4">🤔 Ask Strategic Questions</h2>
        <p className="text-gray-600 mb-6">
          Ask natural language questions about user demand, archetypes, destinations, or SYCC cruise opportunities.
        </p>

        {/* Question Input */}
        <div className="flex gap-3 mb-4">
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !loading && askQuestion()}
            placeholder="Example: What would be a great destination for Art & Culinary cruise?"
            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            disabled={loading}
          />
          <button
            onClick={() => askQuestion()}
            disabled={loading || !question.trim()}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {loading ? '⏳ Analyzing...' : '🔍 Ask'}
          </button>
        </div>

        {/* Suggested Questions */}
        <div className="mb-6">
          <p className="text-sm text-gray-600 mb-2">Suggested questions:</p>
          <div className="flex flex-wrap gap-2">
            {suggestedQuestions.map((q, i) => (
              <button
                key={i}
                onClick={() => {
                  setQuestion(q);
                  askQuestion(q);
                }}
                className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700 transition-colors"
              >
                {q}
              </button>
            ))}
          </div>
        </div>

        {/* Answer Display */}
        {answer && (
          <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
            <h3 className="font-semibold text-blue-900 mb-2">💡 Answer</h3>
            <div className="text-gray-800 whitespace-pre-wrap mb-4">{answer.answer}</div>

            {answer.data_summary && Object.keys(answer.data_summary).length > 0 && (
              <div className="mt-4 pt-4 border-t border-blue-200">
                <h4 className="font-semibold text-blue-900 mb-2">📊 Data Summary</h4>
                <div className="grid grid-cols-2 gap-3">
                  {Object.entries(answer.data_summary).map(([key, value]) => (
                    <div key={key} className="bg-white rounded p-3">
                      <div className="text-xs text-gray-500">{key.replace(/_/g, ' ')}</div>
                      <div className="font-semibold text-gray-900">{String(value)}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {answer.recommendations && answer.recommendations.length > 0 && (
              <div className="mt-4 pt-4 border-t border-blue-200">
                <h4 className="font-semibold text-blue-900 mb-3">🎯 Recommendations</h4>
                <div className="space-y-3">
                  {answer.recommendations.map((rec: any, i: number) => (
                    <div key={i} className="bg-white rounded p-4 border-l-4 border-blue-500">
                      <div className="font-semibold text-gray-900 mb-1">{rec.action}</div>
                      <div className="text-sm text-gray-600 mb-2">{rec.rationale}</div>
                      {rec.projected_impact && (
                        <div className="text-sm text-green-600 font-medium">💰 {rec.projected_impact}</div>
                      )}
                      {rec.priority && (
                        <span className={`inline-block mt-2 px-2 py-1 rounded text-xs font-medium ${
                          rec.priority === 'critical' ? 'bg-red-100 text-red-700' :
                          rec.priority === 'important' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {rec.priority}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-4 text-sm text-gray-500">
              Confidence: {Math.round((answer.confidence || 0) * 100)}%
            </div>
          </div>
        )}
      </div>

      {/* Archetype Distribution */}
      {archetypeData && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">👥 Client Archetype Distribution</h2>
          <p className="text-gray-600 mb-6">
            Overview of which client types are in your user base.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {archetypeData.archetype_distribution && Object.entries(archetypeData.archetype_distribution).map(([archetype, data]: [string, any]) => (
              <div key={archetype} className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-gray-900">{archetype}</h3>
                  <span className="text-2xl font-bold text-blue-600">{data.percentage}%</span>
                </div>
                <div className="text-sm text-gray-600">{data.count} users</div>
                <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all"
                    style={{ width: `${data.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="text-sm text-gray-500">
            Total users: {archetypeData.total_users}
          </div>
        </div>
      )}

      {/* SYCC Cruise Recommendations */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-semibold text-gray-900">🚢 SYCC Cruise Recommendations</h2>
          <button
            onClick={loadCruiseRecommendations}
            disabled={loading}
            className="px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50 transition-colors"
          >
            {loading ? '⏳ Analyzing...' : '🔄 Generate Recommendations'}
          </button>
        </div>
        <p className="text-gray-600 mb-6">
          AI-generated cruise recommendations based on user demand, POI coverage, and ROI potential.
        </p>

        {cruiseRecs.length > 0 && (
          <div className="space-y-6">
            {cruiseRecs.map((cruise: any, i: number) => (
              <div key={i} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-1">{cruise.cruise_name}</h3>
                    <div className="text-sm text-gray-600">Priority: #{cruise.priority}</div>
                  </div>
                  <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                    {cruise.pricing_tier}
                  </span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div>
                    <div className="text-xs text-gray-500">Target Archetype</div>
                    <div className="font-semibold text-gray-900">{cruise.target_archetype}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Destination</div>
                    <div className="font-semibold text-gray-900">{cruise.destination}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Duration</div>
                    <div className="font-semibold text-gray-900">{cruise.duration_days} days</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Avg Price</div>
                    <div className="font-semibold text-green-600">€{cruise.avg_price?.toLocaleString()}</div>
                  </div>
                </div>

                {cruise.demand_evidence && (
                  <div className="bg-green-50 rounded p-3 mb-4">
                    <div className="text-sm font-semibold text-green-900 mb-1">📈 Demand Evidence</div>
                    <div className="grid grid-cols-3 gap-3 text-sm">
                      <div>
                        <span className="text-gray-600">User mentions:</span> <span className="font-semibold">{cruise.demand_evidence.user_mentions}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Emotional matches:</span> <span className="font-semibold">{cruise.demand_evidence.emotional_match_count}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Archetype match:</span> <span className="font-semibold">{cruise.demand_evidence.archetype_match_percentage}%</span>
                      </div>
                    </div>
                  </div>
                )}

                {cruise.revenue_projection && (
                  <div className="bg-blue-50 rounded p-3 mb-4">
                    <div className="text-sm font-semibold text-blue-900 mb-1">💰 Revenue Projection</div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                      <div>
                        <span className="text-gray-600">Annual revenue:</span> <span className="font-semibold text-green-600">€{cruise.revenue_projection.annual_revenue?.toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Margin:</span> <span className="font-semibold">{cruise.revenue_projection.estimated_margin_pct}%</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Net profit:</span> <span className="font-semibold text-green-600">€{cruise.revenue_projection.net_profit?.toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Timeline:</span> <span className="font-semibold">{cruise.timeline_months} months</span>
                      </div>
                    </div>
                  </div>
                )}

                {cruise.competitive_differentiation && (
                  <div className="text-sm text-gray-700 mb-3">
                    <span className="font-semibold">Differentiation:</span> {cruise.competitive_differentiation}
                  </div>
                )}

                {cruise.required_actions && cruise.required_actions.length > 0 && (
                  <div>
                    <div className="text-sm font-semibold text-gray-900 mb-2">Required Actions:</div>
                    <ul className="text-sm text-gray-700 list-disc list-inside space-y-1">
                      {cruise.required_actions.map((action: string, j: number) => (
                        <li key={j}>{action}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="mt-3 text-xs text-gray-500">
                  Confidence: {Math.round((cruise.confidence || 0) * 100)}%
                </div>
              </div>
            ))}
          </div>
        )}

        {cruiseRecs.length === 0 && !loading && (
          <div className="text-center text-gray-500 py-8">
            Click "Generate Recommendations" to get SYCC cruise suggestions based on user demand.
          </div>
        )}
      </div>
    </PortalShell>
  );
}
