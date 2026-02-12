'use client';

import { Tweet } from 'react-tweet';
import { Card, CardContent } from '@/components/ui/card';

interface TweetEmbedProps {
  tweetId: string;
  isMock?: boolean;
  mockText?: string;
  mockHandle?: string;
  mockName?: string;
  mockLikes?: number;
  mockRetweets?: number;
}

function MockTweetCard({ text, handle, name, likes, retweets }: {
  text: string;
  handle: string;
  name: string;
  likes?: number;
  retweets?: number;
}) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-sm font-bold flex-shrink-0">
            {name.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1">
              <span className="font-bold text-sm">{name}</span>
              <span className="text-muted-foreground text-sm">@{handle}</span>
            </div>
            <p className="mt-1 text-sm leading-relaxed">{text}</p>
            {(likes || retweets) && (
              <div className="flex gap-4 mt-3 text-xs text-muted-foreground">
                {retweets ? <span>{retweets.toLocaleString()} Retweets</span> : null}
                {likes ? <span>{likes.toLocaleString()} Likes</span> : null}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function TweetEmbed({ tweetId, isMock, mockText, mockHandle, mockName, mockLikes, mockRetweets }: TweetEmbedProps) {
  if (isMock && mockText) {
    return (
      <MockTweetCard
        text={mockText}
        handle={mockHandle || ''}
        name={mockName || ''}
        likes={mockLikes}
        retweets={mockRetweets}
      />
    );
  }

  return (
    <div className="not-prose [&_.react-tweet-theme]:!m-0 [&_.react-tweet-theme]:!max-w-full">
      <Tweet id={tweetId} />
    </div>
  );
}
