'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Heart, Archive, Share2, Eye, ThumbsUp } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface ScriptLibraryCardProps {
  script: {
    id: string;
    created_at: string;
    when_at?: any;
    theme?: string;
    tags?: string[];
    difficulty_level?: string;
    estimated_budget_range?: string;
    view_count?: number;
    like_count?: number;
    library_metadata?: {
      is_favorite: boolean;
      is_archived: boolean;
      last_accessed?: string;
    };
  };
  onView?: (id: string) => void;
  onToggleFavorite?: (id: string, isFavorite: boolean) => void;
  onArchive?: (id: string) => void;
  onShare?: (id: string) => void;
}

const difficultyColors: Record<string, string> = {
  easy: 'bg-green-100 text-green-700 border-green-300',
  moderate: 'bg-yellow-100 text-yellow-700 border-yellow-300',
  challenging: 'bg-orange-100 text-orange-700 border-orange-300',
  expert: 'bg-red-100 text-red-700 border-red-300'
};

export function ScriptLibraryCard({ 
  script, 
  onView,
  onToggleFavorite,
  onArchive,
  onShare 
}: ScriptLibraryCardProps) {
  const isFavorite = script.library_metadata?.is_favorite || false;
  const isArchived = script.library_metadata?.is_archived || false;
  const title = script.when_at?.title || 'Experience Script';
  const timeAgo = formatDistanceToNow(new Date(script.created_at), { addSuffix: true });

  return (
    <Card className="hover:shadow-lg transition-all cursor-pointer border-lexa-navy/10 group">
      <CardContent className="p-6">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-gray-900 truncate group-hover:text-lexa-gold transition-colors">
                {title}
              </h3>
              <p className="text-xs text-gray-500 mt-1">{timeAgo}</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className={`${isFavorite ? 'text-red-500' : 'text-gray-400'} hover:text-red-500 -mt-1 -mr-2`}
              onClick={(e) => {
                e.stopPropagation();
                onToggleFavorite?.(script.id, !isFavorite);
              }}
            >
              <Heart className="h-4 w-4" fill={isFavorite ? 'currentColor' : 'none'} />
            </Button>
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-2">
            {script.theme && (
              <Badge variant="outline" className="bg-lexa-navy/5 text-lexa-navy border-lexa-navy/20 text-xs">
                {script.theme}
              </Badge>
            )}
            {script.difficulty_level && (
              <Badge 
                variant="outline" 
                className={`${difficultyColors[script.difficulty_level] || 'bg-gray-100 text-gray-700'} text-xs`}
              >
                {script.difficulty_level}
              </Badge>
            )}
            {script.estimated_budget_range && (
              <Badge variant="outline" className="bg-gray-100 text-gray-700 border-gray-300 text-xs">
                {script.estimated_budget_range}
              </Badge>
            )}
          </div>

          {/* Custom Tags */}
          {script.tags && script.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {script.tags.slice(0, 3).map((tag) => (
                <span key={tag} className="text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded">
                  #{tag}
                </span>
              ))}
              {script.tags.length > 3 && (
                <span className="text-xs text-gray-400 px-2 py-1">
                  +{script.tags.length - 3} more
                </span>
              )}
            </div>
          )}

          {/* Stats & Actions */}
          <div className="flex items-center justify-between pt-3 border-t border-gray-100">
            <div className="flex gap-3 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <Eye className="h-3 w-3" />
                {script.view_count || 0}
              </span>
              <span className="flex items-center gap-1">
                <ThumbsUp className="h-3 w-3" />
                {script.like_count || 0}
              </span>
            </div>
            <div className="flex gap-1">
              {onView && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => onView(script.id)}
                  className="text-xs bg-lexa-gold hover:bg-lexa-gold/90"
                >
                  View
                </Button>
              )}
              {onShare && !isArchived && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onShare(script.id);
                  }}
                  className="text-xs"
                >
                  <Share2 className="h-3 w-3" />
                </Button>
              )}
              {onArchive && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onArchive(script.id);
                  }}
                  className="text-xs"
                >
                  <Archive className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
