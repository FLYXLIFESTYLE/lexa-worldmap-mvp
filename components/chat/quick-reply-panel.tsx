'use client';

/**
 * Server-driven quick replies.
 * Supports single-tap replies and multi-select (for theme selection).
 */

import { useMemo, useState } from 'react';
import type { LexaUiPayload, LexaUiQuickReply } from '@/lib/lexa/types';
import {
  Heart,
  Mountain,
  Sparkles,
  Utensils,
  Landmark,
  Crown,
  Leaf,
  Waves,
  Palette,
  Users,
  PartyPopper,
  Moon,
  Check,
} from 'lucide-react';

const ICONS: Record<string, any> = {
  Heart,
  Mountain,
  Sparkles,
  Utensils,
  Landmark,
  Crown,
  Leaf,
  Waves,
  Palette,
  Users,
  PartyPopper,
  Moon,
};

function accentClasses(accent?: LexaUiQuickReply['accent']) {
  switch (accent) {
    case 'gold':
      return 'from-lexa-gold/25 to-white/5 border-lexa-gold/30 text-white';
    case 'rose':
      return 'from-rose-500/20 to-white/5 border-rose-300/20 text-white';
    case 'emerald':
      return 'from-emerald-500/15 to-white/5 border-emerald-300/20 text-white';
    case 'sky':
      return 'from-sky-500/15 to-white/5 border-sky-300/20 text-white';
    case 'violet':
      return 'from-violet-500/15 to-white/5 border-violet-300/20 text-white';
    case 'amber':
      return 'from-amber-500/15 to-white/5 border-amber-300/20 text-white';
    case 'navy':
    default:
      return 'from-white/10 to-white/5 border-white/10 text-white';
  }
}

export default function QuickReplyPanel({
  ui,
  disabled,
  onSend,
}: {
  ui: LexaUiPayload;
  disabled?: boolean;
  onSend: (value: string) => void;
}) {
  const multi = ui.multiSelect?.enabled;
  const max = ui.multiSelect?.max ?? 1;

  const [selected, setSelected] = useState<Set<string>>(new Set());

  const selectedValues = useMemo(() => Array.from(selected.values()), [selected]);

  const toggle = (b: LexaUiQuickReply) => {
    if (disabled) return;

    if (!multi) {
      onSend(b.value);
      return;
    }

    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(b.value)) {
        next.delete(b.value);
        return next;
      }
      if (next.size >= max) return next;
      next.add(b.value);
      return next;
    });
  };

  const submitMulti = () => {
    if (disabled) return;
    if (selectedValues.length === 0) return;
    onSend(selectedValues.join(', '));
    setSelected(new Set());
  };

  return (
    <div className="mt-4">
      {/* Theme cards (multi-select) */}
      {multi ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs text-zinc-300">
              Tap up to <span className="text-lexa-gold font-semibold">{max}</span>
            </p>
            <button
              onClick={submitMulti}
              disabled={disabled || selectedValues.length === 0}
              className="rounded-full bg-lexa-gold px-4 py-2 text-xs font-semibold text-zinc-900 transition-all hover:shadow-lg hover:shadow-lexa-gold/30 disabled:opacity-50 disabled:hover:shadow-none"
            >
              {ui.multiSelect?.submitLabel ?? 'Continue'}
            </button>
          </div>

          {(() => {
            const themes = ui.quickReplies.filter((b) => b.kind === 'theme');
            const otherActions = ui.quickReplies.filter((b) => b.kind !== 'theme');
            return (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {themes.map((b) => {
              const isSelected = selected.has(b.value);
              const Icon = b.icon ? ICONS[b.icon] : null;
              return (
                <button
                  key={b.id}
                  onClick={() => toggle(b)}
                  disabled={disabled}
                  className={[
                    'group relative overflow-hidden rounded-2xl border px-4 py-4 text-left transition-all',
                    'bg-gradient-to-br backdrop-blur-md',
                    accentClasses(b.accent),
                    isSelected ? 'ring-2 ring-lexa-gold shadow-xl shadow-lexa-gold/10' : 'hover:shadow-xl hover:shadow-black/30',
                    disabled ? 'opacity-60 cursor-not-allowed' : 'hover:-translate-y-0.5',
                  ].join(' ')}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-black/30 border border-white/10">
                      {Icon ? <Icon className="h-5 w-5 text-lexa-gold" /> : <Sparkles className="h-5 w-5 text-lexa-gold" />}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm font-semibold leading-tight">{b.label}</span>
                        {isSelected ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-lexa-gold/20 px-2 py-1 text-xs text-lexa-gold">
                            <Check className="h-3 w-3" />
                            Selected
                          </span>
                        ) : null}
                      </div>
                      {b.hook ? (
                        <p className="mt-1 text-xs text-zinc-200/90 italic">{b.hook}</p>
                      ) : (
                        <p className="mt-1 text-xs text-zinc-300/80">Tap to {isSelected ? 'remove' : 'select'}</p>
                      )}
                      {b.description ? (
                        <div className="mt-2 hidden group-hover:block">
                          <p className="text-xs text-zinc-200/90 leading-relaxed">{b.description}</p>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </button>
              );
                  })}
                </div>

                {otherActions.length ? (
                  <div className="pt-2">
                    {otherActions.map((b) => (
                      <button
                        key={b.id}
                        onClick={() => onSend(b.value)}
                        disabled={disabled}
                        className="w-full rounded-2xl border border-lexa-gold/25 bg-white/5 px-4 py-3 text-sm font-semibold text-lexa-gold transition-all hover:bg-lexa-gold/10 disabled:opacity-60"
                      >
                        {b.label}
                      </button>
                    ))}
                  </div>
                ) : null}
              </>
            );
          })()}
        </div>
      ) : (
        /* Single-tap quick replies */
        <div className="flex flex-wrap gap-2">
          {ui.quickReplies.map((b) => (
            <button
              key={b.id}
              onClick={() => toggle(b)}
              disabled={disabled}
              className={[
                'rounded-full px-4 py-2 text-sm font-medium transition-all',
                'border bg-white/10 text-white backdrop-blur-md',
                b.accent === 'gold' ? 'border-lexa-gold/30 hover:bg-lexa-gold/15' : 'border-white/10 hover:bg-white/15',
                disabled ? 'opacity-60 cursor-not-allowed' : 'hover:-translate-y-0.5',
              ].join(' ')}
            >
              {b.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}


