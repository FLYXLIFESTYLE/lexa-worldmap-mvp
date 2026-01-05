'use client';

import Link from 'next/link';
import { ReactNode } from 'react';

type MissionLine = {
  label: string;
  text: string;
};

type BackLink = {
  href: string;
  label: string;
};

export type PortalShellProps = {
  title: string;
  subtitle?: string;
  icon?: string;
  backLink?: BackLink;
  topRight?: ReactNode;
  mission?: MissionLine[];
  children: ReactNode;
  quickTips?: string[];
};

export default function PortalShell({
  title,
  subtitle,
  icon,
  backLink,
  topRight,
  mission,
  children,
  quickTips,
}: PortalShellProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-50 via-white to-lexa-cream">
      {/* Hero */}
      <div className="bg-gradient-to-r from-lexa-navy to-blue-900 text-white px-6 py-12">
        <div className="mx-auto max-w-7xl">
          <div className="flex items-start justify-between gap-6">
            <div className="flex-1">
              {backLink && (
                <Link
                  href={backLink.href}
                  className="inline-flex items-center gap-2 text-sm text-white/80 hover:text-white transition-colors mb-4"
                >
                  ← {backLink.label}
                </Link>
              )}

              <div className="flex items-center gap-4 mb-4">
                {icon && <span className="text-5xl">{icon}</span>}
                <div>
                  <h1 className="text-4xl font-bold mb-1">{title}</h1>
                  {subtitle && <p className="text-xl opacity-90">{subtitle}</p>}
                </div>
              </div>

              {mission && mission.length > 0 && (
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 space-y-2 max-w-3xl">
                  {mission.map((line) => (
                    <div key={line.label} className="text-sm">
                      <strong className="text-lexa-gold">{line.label}:</strong>{' '}
                      <span className="opacity-90">{line.text}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {topRight && <div className="shrink-0">{topRight}</div>}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-7xl px-6 py-12">
        {children}

        {quickTips && quickTips.length > 0 && (
          <div className="mt-12 bg-blue-50 border border-blue-200 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-blue-900 mb-3">💡 Quick Tips</h3>
            <ul className="space-y-2 text-sm text-gray-700">
              {quickTips.map((tip, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-blue-600 font-bold">•</span>
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

