/**
 * Terms of Service & Legal Information
 */

import Link from 'next/link';
import { ArrowLeft, Shield, AlertTriangle, FileText, Scale } from 'lucide-react';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white/80 backdrop-blur-lg">
        <div className="max-w-4xl mx-auto px-6 py-6">
          <Link 
            href="/" 
            className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-lexa-gold transition-colors mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to LEXA
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Terms of Service</h1>
            <p className="text-sm text-gray-500 mt-2">Last updated: December 31, 2025</p>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-6 py-12">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          
          {/* Warning Banner */}
          <div className="bg-amber-50 border-b border-amber-200 px-6 py-4">
            <div className="flex gap-3">
              <AlertTriangle className="h-6 w-6 text-amber-600 flex-shrink-0" />
              <div>
                <h2 className="font-semibold text-amber-900 mb-1">Important Notice</h2>
                <p className="text-sm text-amber-800">
                  LEXA is a creative planning tool only. We are NOT a travel agency, tour operator, 
                  or booking service. Please read these terms carefully before using our service.
                </p>
              </div>
            </div>
          </div>

          {/* Terms Content */}
          <div className="px-6 py-8 space-y-8 text-gray-700">
            
            {/* Section 1 */}
            <section>
              <div className="flex items-center gap-3 mb-4">
                <Scale className="h-5 w-5 text-lexa-gold" />
                <h2 className="text-xl font-bold text-gray-900">1. Nature of Service</h2>
              </div>
              <div className="space-y-3 text-sm leading-relaxed">
                <p>
                  <strong>LEXA</strong> (Luxury Experience AI Agent) is an AI-powered creative planning tool 
                  designed to help users design and plan personalized travel experiences. LEXA provides:
                </p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Inspirational experience scripts and itinerary suggestions</li>
                  <li>Personalized recommendations for activities and destinations</li>
                  <li>Creative planning assistance based on emotional goals and preferences</li>
                </ul>
              </div>
            </section>

            {/* Section 2 */}
            <section>
              <div className="flex items-center gap-3 mb-4">
                <Shield className="h-5 w-5 text-lexa-gold" />
                <h2 className="text-xl font-bold text-gray-900">2. NOT a Travel Agency (But Optional Concierge Available)</h2>
              </div>
              <div className="space-y-3 text-sm leading-relaxed bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="font-bold text-red-900">
                  LEXA IS NOT A TRAVEL AGENCY, TOUR OPERATOR, OR BOOKING SERVICE.
                </p>
                <p>LEXA does not and cannot:</p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Make travel bookings, reservations, or purchases on your behalf</li>
                  <li>Provide travel insurance or financial guarantees</li>
                  <li>Verify real-time availability of activities, accommodations, or services</li>
                  <li>Guarantee the quality, safety, or legality of suggested activities</li>
                  <li>Act as an intermediary between you and service providers</li>
                  <li>Issue tickets, vouchers, or travel documents</li>
                </ul>
              </div>
              
              <div className="space-y-3 text-sm leading-relaxed bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
                <p className="font-bold text-blue-900">
                  💎 Optional Premium Services (Separate Legal Entity)
                </p>
                <p>We offer optional premium services including:</p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li><strong>Concierge Booking Service:</strong> Full-service travel booking and arrangements</li>
                  <li><strong>Partner Booking Services:</strong> Direct booking through our verified partners</li>
                  <li><strong>White-Glove Service:</strong> Comprehensive travel management and support</li>
                </ul>
                <p className="font-semibold text-blue-900 mt-3">
                  These premium services operate under separate terms and conditions, legal agreements, 
                  and are provided by licensed travel service providers or partner agencies. 
                  They are NOT included in standard LEXA usage.
                </p>
                <p className="text-blue-700 text-xs mt-2">
                  By choosing premium services, you enter into a separate contract with our licensed 
                  travel partners, who assume full legal responsibility for bookings and arrangements.
                </p>
              </div>
            </section>

            {/* Section 3 */}
            <section>
              <div className="flex items-center gap-3 mb-4">
                <FileText className="h-5 w-5 text-lexa-gold" />
                <h2 className="text-xl font-bold text-gray-900">3. User Responsibilities</h2>
              </div>
              <div className="space-y-3 text-sm leading-relaxed">
                <p className="font-semibold text-gray-900">By using LEXA, you agree that YOU are solely responsible for:</p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li><strong>Independent Verification:</strong> Verifying all suggestions, prices, availability, and details before booking</li>
                  <li><strong>Booking & Payment:</strong> Making your own bookings directly with service providers</li>
                  <li><strong>Travel Insurance:</strong> Obtaining appropriate travel and medical insurance</li>
                  <li><strong>Legal Compliance:</strong> Ensuring compliance with visa requirements, travel restrictions, and local laws</li>
                  <li><strong>Safety Assessment:</strong> Evaluating the safety and suitability of all activities and destinations</li>
                  <li><strong>Health Requirements:</strong> Consulting medical professionals for health and vaccination requirements</li>
                  <li><strong>Due Diligence:</strong> Researching and vetting all venues, operators, and service providers</li>
                </ul>
              </div>
            </section>

            {/* Section 4 */}
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-4">4. Limited Liability</h2>
              <div className="space-y-3 text-sm leading-relaxed">
                <p>
                  LEXA and its creators, operators, and affiliates assume <strong>NO LIABILITY</strong> for:
                </p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>The accuracy, completeness, or currency of any information or suggestions</li>
                  <li>Any bookings, transactions, or arrangements made based on LEXA's suggestions</li>
                  <li>The quality, safety, legality, or suitability of suggested activities, venues, or destinations</li>
                  <li>Any loss, injury, damage, or expense arising from using LEXA's suggestions</li>
                  <li>Actions or omissions of third-party service providers (hotels, restaurants, tour operators, etc.)</li>
                  <li>Changes in availability, pricing, regulations, or conditions at suggested locations</li>
                  <li>Force majeure events, natural disasters, political instability, or other unforeseeable circumstances</li>
                </ul>
              </div>
            </section>

            {/* Section 5 */}
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-4">5. AI-Generated Content</h2>
              <div className="space-y-3 text-sm leading-relaxed">
                <p>
                  LEXA uses artificial intelligence to generate personalized suggestions. While we strive for accuracy:
                </p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>AI-generated content may contain errors, outdated information, or inaccuracies</li>
                  <li>Suggestions are based on patterns and data, not real-time verification</li>
                  <li>LEXA cannot guarantee the current status of any venue, activity, or destination</li>
                  <li>Users must independently verify all AI-generated suggestions before acting on them</li>
                </ul>
              </div>
            </section>

            {/* Section 6 */}
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-4">6. Intellectual Property</h2>
              <div className="space-y-3 text-sm leading-relaxed">
                <p>
                  Experience scripts created by LEXA remain your personal intellectual property. 
                  However, by using LEXA, you grant us permission to:
                </p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Store your conversation data to improve our AI models</li>
                  <li>Use anonymized data for research and development</li>
                  <li>Display community-shared scripts (only if you explicitly enable sharing)</li>
                </ul>
              </div>
            </section>

            {/* Section 7 */}
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-4">7. Privacy & Data</h2>
              <div className="space-y-3 text-sm leading-relaxed">
                <p>
                  We collect and process personal data as described in our Privacy Policy. 
                  By using LEXA, you consent to data collection for service provision and improvement.
                </p>
              </div>
            </section>

            {/* Section 8 */}
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-4">8. Modifications</h2>
              <div className="space-y-3 text-sm leading-relaxed">
                <p>
                  We reserve the right to modify these Terms of Service at any time. 
                  Continued use of LEXA after changes constitutes acceptance of modified terms.
                </p>
              </div>
            </section>

            {/* Section 9 */}
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-4">9. Governing Law</h2>
              <div className="space-y-3 text-sm leading-relaxed">
                <p>
                  These terms are governed by applicable laws. Any disputes shall be resolved 
                  through binding arbitration in accordance with international arbitration rules.
                </p>
              </div>
            </section>

            {/* Section 10 */}
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-4">10. Contact</h2>
              <div className="space-y-3 text-sm leading-relaxed">
                <p>
                  For questions about these terms, please contact us at: <strong>legal@lexa.ai</strong>
                </p>
              </div>
            </section>

            {/* Acceptance */}
            <section className="border-t border-gray-200 pt-6">
              <div className="bg-lexa-navy/5 border border-lexa-navy/20 rounded-lg p-4">
                <p className="text-sm font-semibold text-lexa-navy mb-2">
                  By using LEXA, you acknowledge that:
                </p>
                <ul className="text-sm text-gray-700 space-y-1 ml-4">
                  <li>✓ You have read and understood these Terms of Service</li>
                  <li>✓ You agree to use LEXA as a planning tool only</li>
                  <li>✓ You will independently verify all suggestions before booking</li>
                  <li>✓ You accept full responsibility for your travel decisions and bookings</li>
                  <li>✓ You understand that LEXA is not a travel agency or booking service</li>
                </ul>
              </div>
            </section>

          </div>
        </div>

        {/* Back to Top */}
        <div className="text-center mt-8">
          <Link 
            href="/" 
            className="inline-flex items-center gap-2 px-6 py-3 bg-lexa-gold hover:bg-lexa-gold/90 text-zinc-900 font-semibold rounded-lg transition-colors"
          >
            Back to LEXA
          </Link>
        </div>
      </main>
    </div>
  );
}
