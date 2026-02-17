'use client';

import { useState } from 'react';

type Script = {
  script_id: string;
  experience_name: string;
  arc_code: string;
  region: string;
  duration: string;
  journey_type: string;
  status: string;
  generated_at: string;
};

/**
 * Script Management List - placeholder for managing generated scripts.
 * In a full implementation this would connect to the database.
 * For now it shows the concept.
 */
export default function ScriptList() {
  const [scripts] = useState<Script[]>([]);
  const [filter, setFilter] = useState('all');

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex gap-2">
        {['all', 'DRAFT', 'MARKETPLACE_READY', 'FULL_READY', 'ARCHIVED'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
              filter === f
                ? 'bg-lexa-navy text-white'
                : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
            }`}
          >
            {f === 'all' ? 'All' : f.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* Table */}
      {scripts.length === 0 ? (
        <div className="rounded-lg border border-zinc-200 bg-white p-12 text-center">
          <p className="text-zinc-400 text-sm">
            No scripts generated yet. Use the Create or Batch tab to generate experiences.
          </p>
        </div>
      ) : (
        <div className="rounded-lg border border-zinc-200 bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 border-b border-zinc-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500">Name</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500">Arc</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500">Region</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500">Duration</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500">Type</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500">Actions</th>
              </tr>
            </thead>
            <tbody>
              {scripts
                .filter((s) => filter === 'all' || s.status === filter)
                .map((script) => (
                  <tr key={script.script_id} className="border-b border-zinc-100 hover:bg-zinc-50">
                    <td className="px-4 py-3 font-medium text-zinc-900">{script.experience_name}</td>
                    <td className="px-4 py-3 text-zinc-600">{script.arc_code}</td>
                    <td className="px-4 py-3 text-zinc-600">{script.region}</td>
                    <td className="px-4 py-3 text-zinc-600">{script.duration}</td>
                    <td className="px-4 py-3 text-zinc-600">{script.journey_type}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        script.status === 'MARKETPLACE_READY' ? 'bg-green-100 text-green-700' :
                        script.status === 'FULL_READY' ? 'bg-blue-100 text-blue-700' :
                        script.status === 'ARCHIVED' ? 'bg-zinc-100 text-zinc-500' :
                        'bg-amber-100 text-amber-700'
                      }`}>
                        {script.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button className="text-xs text-lexa-gold hover:underline">View</button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
