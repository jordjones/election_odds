'use client';

import Link from 'next/link';
import { TweetEmbed } from './TweetEmbed';
import { Badge } from '@/components/ui/badge';
import { PULSE_TOPICS } from '@/lib/pulse-types';
import type { PulseTopic } from '@/lib/pulse-types';
import { candidateNameToSlug } from '@/lib/candidates';
import { formatRelativeTime } from '@/lib/utils';

interface PulseFeedItemProps {
  tweetId: string;
  candidateName: string;
  twitterHandle: string;
  topic: PulseTopic;
  postedAt: string;
  editorNote?: string;
  isMock: boolean;
  text?: string;
  likes?: number;
  retweets?: number;
  currentOdds?: number;
}

export function PulseFeedItem({
  tweetId,
  candidateName,
  twitterHandle,
  topic,
  postedAt,
  editorNote,
  isMock,
  text,
  likes,
  retweets,
  currentOdds,
}: PulseFeedItemProps) {
  const topicLabel = PULSE_TOPICS.find((t) => t.value === topic)?.label || topic;
  const slug = candidateNameToSlug(candidateName);

  return (
    <div className="space-y-2">
      {/* Header: candidate info + metadata */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link
            href={`/pulse/candidate/${slug}`}
            className="font-semibold text-sm hover:underline"
          >
            {candidateName}
          </Link>
          <span className="text-xs text-muted-foreground">
            @{twitterHandle}
          </span>
          {currentOdds !== undefined && (
            <Badge variant="secondary" className="text-xs">
              {(currentOdds * 100).toFixed(0)}%
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            {topicLabel}
          </Badge>
          <span className="text-xs text-muted-foreground">
            {formatRelativeTime(postedAt)}
          </span>
        </div>
      </div>

      {/* Editor note */}
      {editorNote && (
        <p className="text-xs text-muted-foreground italic border-l-2 border-muted pl-2">
          {editorNote}
        </p>
      )}

      {/* Tweet embed */}
      <TweetEmbed
        tweetId={tweetId}
        isMock={isMock}
        mockText={text}
        mockHandle={twitterHandle}
        mockName={candidateName}
        mockLikes={likes}
        mockRetweets={retweets}
      />
    </div>
  );
}
