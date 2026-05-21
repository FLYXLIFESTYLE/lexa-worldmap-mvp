'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import LuxuryBackground from '@/components/luxury-background';
import { createClient } from '@/lib/supabase/client-browser';
import { getClientAuthUser, shouldBlockUnauthenticated } from '@/lib/auth/client-auth';
import { Loader2, Check, ChevronDown, ChevronUp, X } from 'lucide-react';
import {
  PREFERENCE_SECTIONS,
  EMPTY_PREFERENCES,
  type GuestPreferences,
  type PreferenceField,
} from '@/lib/script-engine/preference-types';

export default function PreferencesPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [prefs, setPrefs] = useState<GuestPreferences>({ ...EMPTY_PREFERENCES });
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({ dietary: true });

  useEffect(() => {
    async function init() {
      const user = await getClientAuthUser(supabase);
      if (shouldBlockUnauthenticated(user)) { router.push('/auth/signin'); return; }

      try {
        const res = await fetch('/api/user/profile');
        if (res.ok) {
          const profileData = await res.json();
          const stored = profileData.profile?.guest_preferences;
          if (stored && typeof stored === 'object') {
            setPrefs({ ...EMPTY_PREFERENCES, ...stored });
          }
        }
      } catch { /* use defaults */ }
      setLoading(false);
    }
    init();
  }, [router, supabase.auth]);

  const toggleSection = (id: string) => {
    setOpenSections(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const updateField = (key: keyof GuestPreferences, value: unknown) => {
    setPrefs(prev => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  const toggleMultiValue = (key: keyof GuestPreferences, value: string) => {
    const current = (prefs[key] as string[]) || [];
    if (current.includes(value)) {
      updateField(key, current.filter(v => v !== value));
    } else {
      updateField(key, [...current, value]);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ guest_preferences: prefs }),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch (err) {
      console.error('Failed to save preferences:', err);
    } finally {
      setSaving(false);
    }
  };

  function renderField(field: PreferenceField) {
    const value = prefs[field.key];

    if (field.type === 'text') {
      return (
        <div key={field.key}>
          <label className="block text-xs text-zinc-400 mb-1.5">{field.label}</label>
          <input
            type="text"
            value={(value as string) || ''}
            onChange={e => updateField(field.key, e.target.value)}
            placeholder={field.placeholder}
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-lexa-gold focus:outline-none"
          />
        </div>
      );
    }

    if (field.type === 'single-select') {
      return (
        <div key={field.key}>
          <label className="block text-xs text-zinc-400 mb-1.5">{field.label}</label>
          <div className="flex flex-wrap gap-1.5">
            {field.options?.map(opt => (
              <button
                key={opt}
                onClick={() => updateField(field.key, (value as string) === opt ? '' : opt)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-all ${
                  (value as string) === opt
                    ? 'bg-lexa-gold text-zinc-900'
                    : 'bg-white/5 border border-white/10 text-zinc-300 hover:bg-white/10'
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
      );
    }

    // multi-select
    const selected = (value as string[]) || [];
    return (
      <div key={field.key}>
        <label className="block text-xs text-zinc-400 mb-1.5">
          {field.label}
          {selected.length > 0 && (
            <span className="ml-2 text-lexa-gold">{selected.length} selected</span>
          )}
        </label>
        {/* Selected chips */}
        {selected.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {selected.map(s => (
              <span
                key={s}
                className="inline-flex items-center gap-1 rounded-full bg-lexa-gold/20 border border-lexa-gold/30 px-2.5 py-0.5 text-xs text-lexa-gold"
              >
                {s}
                <button onClick={() => toggleMultiValue(field.key, s)} className="hover:text-white">
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        )}
        {/* Available options */}
        <div className="flex flex-wrap gap-1.5">
          {field.options?.filter(opt => !selected.includes(opt)).map(opt => (
            <button
              key={opt}
              onClick={() => toggleMultiValue(field.key, opt)}
              className="rounded-full px-3 py-1 text-xs font-medium bg-white/5 border border-white/10 text-zinc-400 hover:bg-white/10 hover:text-white transition-all"
            >
              + {opt}
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="relative min-h-screen overflow-hidden">
        <LuxuryBackground />
        <div className="relative z-10 flex min-h-screen items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-lexa-gold" />
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden">
      <LuxuryBackground />

      <div className="relative z-10 min-h-screen py-8 px-4">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <Link href="/account" className="text-sm text-zinc-300 hover:text-white transition-colors">
              &larr; Back to Account
            </Link>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 rounded-lg bg-lexa-gold px-5 py-2 text-sm font-semibold text-zinc-900 hover:bg-yellow-500 transition-all disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : saved ? <Check className="h-4 w-4" /> : null}
              {saved ? 'Saved' : 'Save Preferences'}
            </button>
          </div>

          <div className="mb-6">
            <h1 className="text-2xl font-bold text-white">Guest Preferences</h1>
            <p className="text-sm text-zinc-400 mt-1">
              These preferences shape your experience scripts and help the crew deliver exactly what you need.
            </p>
          </div>

          {/* Sections */}
          <div className="space-y-3">
            {PREFERENCE_SECTIONS.map(section => (
              <div
                key={section.id}
                className="rounded-xl border border-white/10 bg-black/30 backdrop-blur-xl overflow-hidden"
              >
                <button
                  onClick={() => toggleSection(section.id)}
                  className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-white/5 transition-colors"
                >
                  <span className="text-sm font-semibold text-white">{section.title}</span>
                  {openSections[section.id]
                    ? <ChevronUp className="h-4 w-4 text-zinc-400" />
                    : <ChevronDown className="h-4 w-4 text-zinc-400" />
                  }
                </button>

                {openSections[section.id] && (
                  <div className="px-5 pb-5 space-y-4 border-t border-white/5 pt-4">
                    {section.fields.map(field => renderField(field))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Bottom save */}
          <div className="mt-6 flex justify-end">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 rounded-lg bg-lexa-gold px-6 py-3 text-sm font-semibold text-zinc-900 hover:bg-yellow-500 transition-all disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : saved ? <Check className="h-4 w-4" /> : null}
              {saved ? 'Saved' : 'Save All Preferences'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
