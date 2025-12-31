'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, MessageCircle, ArrowRight } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface ConversationPreviewCardProps {
  conversation: {
    id: string;
    created_at: string;
    updated_at: string;
    stage: string;
    state?: any;
    summaries?: Array<{
      summary_type: string;
      content: string;
      extracted_data?: any;
    }>;
  };
  onContinue?: (id: string) => void;
  onView?: (id: string) => void;
}

export function ConversationPreviewCard({ 
  conversation, 
  onContinue,
  onView 
}: ConversationPreviewCardProps) {
  const experienceDNA = conversation.summaries?.find(s => s.summary_type === 'experience_dna');
  const sessionSummary = conversation.summaries?.find(s => s.summary_type === 'session');
  const theme = conversation.state?.theme || 'Experience';
  const timeAgo = formatDistanceToNow(new Date(conversation.updated_at), { addSuffix: true });

  return (
    <Card className="hover:shadow-md transition-shadow cursor-pointer border-lexa-navy/10">
      <CardContent className="p-6">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline" className="bg-lexa-navy/5 text-lexa-navy border-lexa-navy/20">
                  {theme}
                </Badge>
                <span className="text-xs text-gray-500 flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {timeAgo}
                </span>
              </div>
              <h3 className="font-medium text-gray-900">
                {experienceDNA?.extracted_data?.story?.narrative || 'Conversation with LEXA'}
              </h3>
            </div>
          </div>

          {/* Experience DNA Preview */}
          {experienceDNA && (
            <div className="bg-lexa-gold/5 rounded-lg p-3 border border-lexa-gold/20">
              <p className="text-sm text-gray-700 line-clamp-2">
                {experienceDNA.content || 'Experience DNA being processed...'}
              </p>
            </div>
          )}

          {/* Session Summary */}
          {sessionSummary && !experienceDNA && (
            <p className="text-sm text-gray-600 line-clamp-2">
              {sessionSummary.content}
            </p>
          )}

          {/* Status */}
          <div className="flex items-center justify-between pt-2 border-t border-gray-100">
            <span className="text-xs text-gray-500 flex items-center gap-1">
              <MessageCircle className="h-3 w-3" />
              {conversation.stage === 'COMPLETE' ? 'Completed' : 'In Progress'}
            </span>
            <div className="flex gap-2">
              {onView && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onView(conversation.id)}
                  className="text-xs"
                >
                  View Details
                </Button>
              )}
              {conversation.stage !== 'COMPLETE' && onContinue && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => onContinue(conversation.id)}
                  className="text-xs bg-lexa-gold hover:bg-lexa-gold/90"
                >
                  Continue <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
