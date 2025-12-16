'use client';

/**
 * Quick Reply Buttons Component
 * Pre-defined answer options for streamlined conversation
 */

import { useState, useEffect } from 'react';

interface QuickReplyButton {
  id: string;
  label: string;
  value: string;
  category: 'month' | 'destination' | 'theme' | 'preference';
}

interface QuickRepliesProps {
  type: 'months' | 'destinations' | 'themes' | 'text-voice' | 'custom';
  customButtons?: QuickReplyButton[];
  onSelect: (value: string) => void;
  disabled?: boolean;
}

const MONTHS: QuickReplyButton[] = [
  { id: 'jan', label: 'January', value: 'January', category: 'month' },
  { id: 'feb', label: 'February', value: 'February', category: 'month' },
  { id: 'mar', label: 'March', value: 'March', category: 'month' },
  { id: 'apr', label: 'April', value: 'April', category: 'month' },
  { id: 'may', label: 'May', value: 'May', category: 'month' },
  { id: 'jun', label: 'June', value: 'June', category: 'month' },
  { id: 'jul', label: 'July', value: 'July', category: 'month' },
  { id: 'aug', label: 'August', value: 'August', category: 'month' },
  { id: 'sep', label: 'September', value: 'September', category: 'month' },
  { id: 'oct', label: 'October', value: 'October', category: 'month' },
  { id: 'nov', label: 'November', value: 'November', category: 'month' },
  { id: 'dec', label: 'December', value: 'December', category: 'month' },
];

const DESTINATIONS: QuickReplyButton[] = [
  { id: 'fr-riv', label: 'French Riviera', value: 'French Riviera', category: 'destination' },
  { id: 'amalfi', label: 'Amalfi Coast', value: 'Amalfi Coast', category: 'destination' },
  { id: 'cyclades', label: 'Cyclades', value: 'Cyclades', category: 'destination' },
  { id: 'adriatic', label: 'Adriatic', value: 'Adriatic', category: 'destination' },
  { id: 'ionian', label: 'Ionian Sea', value: 'Ionian Sea', category: 'destination' },
  { id: 'balearics', label: 'Balearics', value: 'Balearics', category: 'destination' },
  { id: 'bahamas', label: 'Bahamas', value: 'Bahamas', category: 'destination' },
  { id: 'bvi', label: 'British Virgin Islands', value: 'BVI', category: 'destination' },
  { id: 'usvi', label: 'US Virgin Islands', value: 'USVI', category: 'destination' },
  { id: 'fr-ant', label: 'French Antilles', value: 'French Antilles', category: 'destination' },
  { id: 'du-ant', label: 'Dutch Antilles', value: 'Dutch Antilles', category: 'destination' },
  { id: 'dubai', label: 'Arabian Gulf (UAE)', value: 'Arabian Gulf', category: 'destination' },
];

const THEMES: QuickReplyButton[] = [
  { id: 'adventure', label: 'Adventure & Exploration', value: 'adventure', category: 'theme' },
  { id: 'culinary', label: 'Culinary Excellence', value: 'culinary', category: 'theme' },
  { id: 'wellness', label: 'Wellness & Relaxation', value: 'wellness', category: 'theme' },
  { id: 'cultural', label: 'Cultural Immersion', value: 'cultural', category: 'theme' },
  { id: 'romance', label: 'Romance & Intimacy', value: 'romance', category: 'theme' },
  { id: 'family', label: 'Family Luxury', value: 'family', category: 'theme' },
  { id: 'water', label: 'Water Sports & Marine', value: 'water sports', category: 'theme' },
  { id: 'art', label: 'Art & Architecture', value: 'art', category: 'theme' },
  { id: 'nightlife', label: 'Nightlife & Entertainment', value: 'nightlife', category: 'theme' },
  { id: 'nature', label: 'Nature & Wildlife', value: 'nature', category: 'theme' },
];

const TEXT_VOICE: QuickReplyButton[] = [
  { id: 'text', label: 'Text Only', value: 'text only', category: 'preference' },
  { id: 'voice', label: 'Text + Voice', value: 'text and voice', category: 'preference' },
];

export default function QuickReplies({ type, customButtons, onSelect, disabled = false }: QuickRepliesProps) {
  const [buttons, setButtons] = useState<QuickReplyButton[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    switch (type) {
      case 'months':
        setButtons(MONTHS);
        break;
      case 'destinations':
        setButtons(DESTINATIONS);
        break;
      case 'themes':
        setButtons(THEMES);
        break;
      case 'text-voice':
        setButtons(TEXT_VOICE);
        break;
      case 'custom':
        setButtons(customButtons || []);
        break;
      default:
        setButtons([]);
    }
  }, [type, customButtons]);

  const handleClick = (button: QuickReplyButton) => {
    if (disabled) return;
    
    setSelectedId(button.id);
    onSelect(button.value);
    
    // Reset selection after a short delay
    setTimeout(() => setSelectedId(null), 2000);
  };

  if (buttons.length === 0) return null;

  return (
    <div className="quick-replies">
      <div className={`quick-replies-grid ${type === 'months' ? 'calendar-grid' : ''}`}>
        {buttons.map((button) => {
          // Special calendar design for months
          if (type === 'months') {
            return (
              <button
                key={button.id}
                onClick={() => handleClick(button)}
                disabled={disabled}
                className={`calendar-month-button ${selectedId === button.id ? 'selected' : ''} ${disabled ? 'disabled' : ''}`}
                aria-label={`Select ${button.label}`}
              >
                <div className="calendar-month-header" />
                <div className="calendar-month-label">{button.label.toUpperCase().slice(0, 3)}</div>
              </button>
            );
          }
          
          // Regular button for other types
          return (
            <button
              key={button.id}
              onClick={() => handleClick(button)}
              disabled={disabled}
              className={`quick-reply-button ${selectedId === button.id ? 'selected' : ''} ${disabled ? 'disabled' : ''}`}
              aria-label={`Select ${button.label}`}
            >
              {button.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

