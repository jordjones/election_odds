'use client';

import { PulseFeedItem } from './PulseFeedItem';
import { Skeleton } from '@/components/ui/skeleton';

interface FeedItem {
  tweetId: string;
  candidateName: string;
  twitterHandle: string;
  topic: string;
  postedAt: string;
  editorNote?: string;
  isMock: boolean;
  text?: string;
  likes?: number;
  retweets?: number;
}

interface PulseFeedProps {
  posts: FeedItem[] | undefined;
  isLoading: boolean;
}

export function PulseFeed({ posts, isLoading }: PulseFeedProps) {
  if (isLoading) {
    return (
      <div className="space-y-6">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-16" />
            </div>
            <Skeleton className="h-48 w-full rounded-lg" />
          </div>
        ))}
      </div>
    );
  }

  if (!posts || posts.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p className="text-lg font-medium">No posts found</p>
        <p className="text-sm mt-1">Try adjusting your filters</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {posts.map((post) => (
        <PulseFeedItem
          key={post.tweetId}
          tweetId={post.tweetId}
          candidateName={post.candidateName}
          twitterHandle={post.twitterHandle}
          topic={post.topic as any}
          postedAt={post.postedAt}
          editorNote={post.editorNote}
          isMock={post.isMock}
          text={post.text}
          likes={post.likes}
          retweets={post.retweets}
        />
      ))}
    </div>
  );
}
