/**
 * Legal Disclaimer Component
 * LEXA is a creative planning tool, NOT a travel agency
 */

'use client';

import { AlertTriangle, Shield, FileText } from 'lucide-react';
import Link from 'next/link';

interface LegalDisclaimerProps {
  variant?: 'footer' | 'inline' | 'modal' | 'minimal';
  showIcon?: boolean;
  className?: string;
}

export function LegalDisclaimer({ 
  variant = 'footer', 
  showIcon = true,
  className = '' 
}: LegalDisclaimerProps) {
  
  if (variant === 'minimal') {
    return (
      <div className={`lexa-legal-footnote ${className}`}>
        {showIcon ? (
          <div className="lexa-legal-footnote__icon">
            <Shield className="h-4 w-4" />
          </div>
        ) : null}
        <p className="lexa-legal-footnote__text">
          LEXA is a creative planning tool only, not a travel agency. Always verify and book independently.
          <Link href="/terms" className="lexa-legal-footnote__link">
            Full terms →
          </Link>
        </p>
      </div>
    );
  }

  if (variant === 'footer') {
    return (
      <div className={`border-t border-gray-200 bg-gray-50 px-4 py-6 ${className}`}>
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
            {showIcon && (
              <div className="flex-shrink-0">
                <Shield className="h-6 w-6 text-gray-400" />
              </div>
            )}
            <div className="flex-1 text-xs text-gray-600 leading-relaxed">
              <p className="font-semibold text-gray-800 mb-2">⚖️ Legal Disclaimer</p>
              <p>
                <strong>LEXA is a creative experience planning tool only.</strong> We are NOT a travel agency, tour operator, or booking service. 
                LEXA provides inspirational scripts and suggestions for experiences. We do not make reservations, provide travel insurance, 
                guarantee availability, or assume any legal responsibility for activities, accommodations, or points of interest (POIs) suggested. 
                Users are solely responsible for booking, verifying, and ensuring the safety and suitability of all activities and destinations.
              </p>
              <p className="mt-2">
                <strong>Optional Services:</strong> You may choose to book through our premium concierge service or partner booking services, 
                which operate under separate terms and legal entities. Standard LEXA usage remains a planning tool only.
              </p>
              <p className="mt-2">
                By using LEXA, you agree that all suggestions are inspirational in nature and should be independently verified before booking or travel.
              </p>
            </div>
            <Link 
              href="/terms" 
              className="flex-shrink-0 text-xs text-lexa-gold hover:text-lexa-gold/80 font-medium whitespace-nowrap"
            >
              Full Terms →
            </Link>
          </div>
        </div>
      </div>
    );
  }
  
  if (variant === 'inline') {
    return (
      <div className={`rounded-lg border border-amber-200 bg-amber-50 p-4 ${className}`}>
        <div className="flex gap-3">
          {showIcon && (
            <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
          )}
          <div className="flex-1">
            <p className="text-sm font-semibold text-amber-900 mb-1">
              Planning Tool Only - Not a Travel Agency
            </p>
            <p className="text-xs text-amber-800 leading-relaxed">
              LEXA creates inspirational experience scripts. We don't book travel, provide insurance, 
              or guarantee activities. You may optionally book through our premium concierge service (separate terms apply). 
              Always verify and book independently. 
              <Link href="/terms" className="underline ml-1 font-medium hover:text-amber-900">
                See full terms
              </Link>
            </p>
          </div>
        </div>
      </div>
    );
  }
  
  if (variant === 'modal') {
    return (
      <div className={`space-y-4 ${className}`}>
        <div className="flex items-center gap-3 pb-3 border-b border-gray-200">
          <FileText className="h-6 w-6 text-lexa-gold" />
          <h3 className="text-lg font-semibold text-gray-900">Legal Disclaimer</h3>
        </div>
        
        <div className="space-y-3 text-sm text-gray-700 leading-relaxed">
          <p className="font-semibold text-gray-900">
            LEXA is a Creative Planning Tool - NOT a Travel Agency
          </p>
          
          <div className="space-y-2">
            <p><strong>What LEXA Does:</strong></p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Creates personalized experience scripts and suggestions</li>
              <li>Provides inspiration for activities and destinations</li>
              <li>Helps you plan memorable experiences</li>
            </ul>
          </div>
          
          <div className="space-y-2">
            <p><strong>What LEXA Does NOT Do:</strong></p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Make travel bookings or reservations</li>
              <li>Provide travel insurance or guarantees</li>
              <li>Verify availability of activities or accommodations</li>
              <li>Assume legal responsibility for suggested POIs or activities</li>
              <li>Act as a tour operator or travel agency</li>
            </ul>
          </div>
          
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <p className="text-amber-900 font-medium">
                ⚠️ Your Responsibility
              </p>
              <p className="text-amber-800 text-xs mt-1">
                You are solely responsible for independently verifying all suggestions, 
                booking your own travel, ensuring safety, checking regulations, 
                and obtaining appropriate insurance before any travel or activities.
              </p>
              <p className="text-amber-700 text-xs mt-2 font-medium">
                💎 Optional: You may choose to book through our premium concierge service or partner 
                booking services, which operate under separate legal agreements and provide full-service travel arrangements.
              </p>
            </div>
          
          <p className="text-xs text-gray-500 pt-2">
            By using LEXA, you acknowledge and agree to these terms. 
            <Link href="/terms" className="text-lexa-gold hover:underline ml-1">
              Read full Terms of Service
            </Link>
          </p>
        </div>
      </div>
    );
  }
  
  return null;
}
