/**
 * Voice Toggle - Enable/Disable Voice Replies
 */

'use client';

interface VoiceToggleProps {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
}

export default function VoiceToggle({ enabled, onChange }: VoiceToggleProps) {
  return (
    <div className="flex items-center space-x-2">
      <span className="text-sm text-zinc-600">Voice Replies</span>
      <button
        onClick={() => onChange(!enabled)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
          enabled ? 'bg-zinc-900' : 'bg-zinc-300'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            enabled ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );
}

