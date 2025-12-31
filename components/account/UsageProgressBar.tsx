'use client';

import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { ArrowUp, CheckCircle } from 'lucide-react';

interface UsageProgressBarProps {
  label: string;
  current: number;
  limit: number;
  description?: string;
  onUpgrade?: () => void;
}

export function UsageProgressBar({ 
  label, 
  current, 
  limit,
  description,
  onUpgrade 
}: UsageProgressBarProps) {
  const isUnlimited = limit === -1;
  const percentage = isUnlimited ? 0 : Math.min((current / limit) * 100, 100);
  const remaining = isUnlimited ? -1 : Math.max(0, limit - current);
  const isNearLimit = !isUnlimited && percentage >= 80;
  const isAtLimit = !isUnlimited && current >= limit;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-900">{label}</p>
          {description && (
            <p className="text-xs text-gray-500 mt-0.5">{description}</p>
          )}
        </div>
        <div className="text-right">
          {isUnlimited ? (
            <div className="flex items-center gap-1 text-lexa-gold">
              <CheckCircle className="h-4 w-4" />
              <span className="text-sm font-medium">Unlimited</span>
            </div>
          ) : (
            <div className="text-sm">
              <span className={`font-semibold ${isAtLimit ? 'text-red-600' : isNearLimit ? 'text-orange-600' : 'text-gray-900'}`}>
                {current}
              </span>
              <span className="text-gray-500"> / {limit}</span>
            </div>
          )}
        </div>
      </div>

      {!isUnlimited && (
        <>
          <Progress 
            value={percentage} 
            className={`h-2 ${isAtLimit ? 'bg-red-100' : isNearLimit ? 'bg-orange-100' : 'bg-gray-100'}`}
            indicatorClassName={isAtLimit ? 'bg-red-600' : isNearLimit ? 'bg-orange-600' : 'bg-lexa-gold'}
          />

          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-500">
              {remaining === 0 ? (
                <span className="text-red-600 font-medium">Limit reached</span>
              ) : (
                <span>{remaining} remaining this month</span>
              )}
            </p>
            {(isNearLimit || isAtLimit) && onUpgrade && (
              <Button
                variant="outline"
                size="sm"
                onClick={onUpgrade}
                className="text-xs h-7 border-lexa-gold text-lexa-gold hover:bg-lexa-gold/10"
              >
                <ArrowUp className="h-3 w-3 mr-1" />
                Upgrade
              </Button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
