'use client';

import { Heart, Archive, Share2, Eye, ThumbsUp, Info } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useState } from 'react';

interface ScriptLibraryCardProps {
  script: {
    id: string;
    created_at: string;
    when_at?: any;
    theme?: string;
    theme_category?: string;
    hook?: string;
    description?: string;
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
  const [showDescription, setShowDescription] = useState(false);
  const isFavorite = script.library_metadata?.is_favorite || false;
  const isArchived = script.library_metadata?.is_archived || false;
  const title = script.when_at?.title || 'Experience Script';
  const timeAgo = formatDistanceToNow(new Date(script.created_at), { addSuffix: true });
  
  // Click outside to close description
  const handleBackdropClick = () => {
    setShowDescription(false);
  };

  return (
    <>
      {/* Backdrop overlay when description is open */}
      {showDescription && (
        <div 
          className="fixed inset-0 bg-black/20 z-40"
          onClick={handleBackdropClick}
        />
      )}
      
      <div className={`rounded-lg border border-lexa-navy/10 bg-white hover:shadow-lg transition-all cursor-pointer group ${showDescription ? 'relative z-50' : ''}`}>
        <div className="p-6">
          <div className="space-y-4">
            {/* Header with Info Button */}
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900 truncate group-hover:text-lexa-gold transition-colors">
                  {title}
                </h3>
                <p className="text-xs text-gray-500 mt-1">{timeAgo}</p>
              </div>
              <div className="flex items-center gap-1">
                {/* Info Button - Mobile friendly */}
                {(script.theme_category || script.hook || script.description) && (
                  <button
                    className={`rounded-full p-1.5 transition-all ${
                      showDescription 
                        ? 'bg-lexa-gold text-white' 
                        : 'bg-gray-100 text-gray-600 hover:bg-lexa-gold/20 hover:text-lexa-gold'
                    }`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowDescription(!showDescription);
                    }}
                    title="View details"
                  >
                    <Info className="h-4 w-4" />
                  </button>
                )}
                <button
                  className={`${isFavorite ? 'text-red-500' : 'text-gray-400'} hover:text-red-500 p-2`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleFavorite?.(script.id, !isFavorite);
                  }}
                >
                  <Heart className="h-4 w-4" fill={isFavorite ? 'currentColor' : 'none'} />
                </button>
              </div>
            </div>
            
            {/* Theme Category and Hook - Always Visible */}
            {(script.theme_category || script.hook) && (
              <div className="space-y-2 py-3 border-t border-gray-100">
                {script.theme_category && (
                  <div>
                    <span className="text-xs font-semibold text-lexa-gold uppercase tracking-wider">
                      {script.theme_category}
                    </span>
                  </div>
                )}
                {script.hook && (
                  <p className="text-sm text-gray-700 font-medium italic">
                    "{script.hook}"
                  </p>
                )}
              </div>
            )}
            
            {/* Expandable Description */}
            {showDescription && script.description && (
              <div className="bg-gradient-to-br from-lexa-gold/5 to-lexa-navy/5 border border-lexa-gold/30 rounded-lg p-4 space-y-2 animate-in slide-in-from-top duration-200">
                <p className="text-xs font-semibold text-lexa-navy uppercase tracking-wider">
                  About This Experience
                </p>
                <p className="text-sm text-gray-700 leading-relaxed">
                  {script.description}
                </p>
              </div>
            )}

          {/* Tags */}
          <div className="flex flex-wrap gap-2">
            {script.theme && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-lexa-navy/5 text-lexa-navy border border-lexa-navy/20">
                {script.theme}
              </span>
            )}
            {script.difficulty_level && (
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium border ${difficultyColors[script.difficulty_level] || 'bg-gray-100 text-gray-700 border-gray-300'}`}>
                {script.difficulty_level}
              </span>
            )}
            {script.estimated_budget_range && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-gray-100 text-gray-700 border border-gray-300">
                {script.estimated_budget_range}
              </span>
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
                <button
                  onClick={() => onView(script.id)}
                  className="text-xs px-3 py-1.5 rounded-md bg-lexa-gold hover:bg-lexa-gold/90 text-zinc-900 font-medium transition-colors"
                >
                  View
                </button>
              )}
              {onShare && !isArchived && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onShare(script.id);
                  }}
                  className="text-xs p-2 rounded-md text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  <Share2 className="h-3 w-3" />
                </button>
              )}
              {onArchive && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onArchive(script.id);
                  }}
                  className="text-xs p-2 rounded-md text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  <Archive className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>
          </div>
        </div>
      </div>
    </>
  );
}
