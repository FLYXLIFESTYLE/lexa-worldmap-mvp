'use client';

import { Crown, Sparkles, Star, Gem } from 'lucide-react';

interface MembershipBadgeProps {
  tierSlug: string;
  tierName: string;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}

const tierConfig = {
  free: {
    color: 'bg-gray-100 text-gray-700 border-gray-300',
    icon: Star,
    label: 'Free'
  },
  explorer: {
    color: 'bg-blue-100 text-blue-700 border-blue-300',
    icon: Sparkles,
    label: 'Explorer'
  },
  creator: {
    color: 'bg-purple-100 text-purple-700 border-purple-300',
    icon: Gem,
    label: 'Creator'
  },
  concierge: {
    color: 'bg-lexa-gold/20 text-lexa-gold border-lexa-gold',
    icon: Crown,
    label: 'Concierge'
  }
};

export function MembershipBadge({ 
  tierSlug, 
  tierName, 
  size = 'md',
  showIcon = true 
}: MembershipBadgeProps) {
  const config = tierConfig[tierSlug as keyof typeof tierConfig] || tierConfig.free;
  const Icon = config.icon;

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-3 py-1',
    lg: 'text-base px-4 py-1.5'
  };

  const iconSizes = {
    sm: 12,
    md: 14,
    lg: 16
  };

  return (
    <span 
      className={`${config.color} ${sizeClasses[size]} font-medium border rounded-md inline-flex items-center gap-1.5`}
    >
      {showIcon && <Icon size={iconSizes[size]} />}
      {config.label}
    </span>
  );
}
