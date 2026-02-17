'use client';

import { useState } from 'react';
import AdminNav from '@/components/admin/admin-nav';
import PortalShell from '@/components/portal/portal-shell';
import ExperienceForm from '@/components/admin/script-engine/ExperienceForm';
import BatchGenerator from '@/components/admin/script-engine/BatchGenerator';
import ScriptList from '@/components/admin/script-engine/ScriptList';

type Tab = 'create' | 'batch' | 'manage';

export default function ScriptEnginePage() {
  const [activeTab, setActiveTab] = useState<Tab>('create');

  const tabs: { id: Tab; label: string; description: string }[] = [
    { id: 'create', label: 'Create', description: 'Single experience' },
    { id: 'batch', label: 'Batch', description: 'Matrix generator' },
    { id: 'manage', label: 'Manage', description: 'View & edit scripts' },
  ];

  return (
    <PortalShell>
      <AdminNav />

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-zinc-900">
            Experience Script Engine
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            Create, generate, and manage LEXA experience scripts for the marketplace
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 border-b border-zinc-200">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-all ${
                activeTab === tab.id
                  ? 'border-lexa-gold text-zinc-900'
                  : 'border-transparent text-zinc-500 hover:text-zinc-700'
              }`}
            >
              <span>{tab.label}</span>
              <span className="ml-1 text-xs text-zinc-400">({tab.description})</span>
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'create' && <ExperienceForm />}
        {activeTab === 'batch' && <BatchGenerator />}
        {activeTab === 'manage' && <ScriptList />}
      </div>
    </PortalShell>
  );
}
