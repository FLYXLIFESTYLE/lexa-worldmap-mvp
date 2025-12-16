'use client';

/**
 * Info Tooltip Component
 * Reusable tooltip for showing helpful information and examples
 */

import { useState } from 'react';

interface InfoTooltipProps {
  text: string;
}

export function InfoTooltip({ text }: InfoTooltipProps) {
  const [show, setShow] = useState(false);
  
  return (
    <div className="relative inline-block">
      <button
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        onClick={() => setShow(!show)}
        className="w-5 h-5 rounded-full bg-blue-500 text-white text-xs flex items-center justify-center hover:bg-blue-600 transition-colors"
        type="button"
        aria-label="More information"
      >
        ?
      </button>
      
      {show && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-64 bg-zinc-900 text-white text-sm p-3 rounded-lg shadow-xl z-50">
          {text}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1 w-2 h-2 bg-zinc-900 rotate-45"></div>
        </div>
      )}
    </div>
  );
}

