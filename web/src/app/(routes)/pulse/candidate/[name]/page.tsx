'use client';

import { use } from 'react';
import { usePulseFeed, usePulseCandidates } from '@/hooks/usePulse';
import { PulseFeed } from '@/components/pulse/PulseFeed';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { slugToCandidateName, getTwitterHandle } from '@/lib/candidates';
import Link from 'next/link';

interface Props {
  params: Promise<{ name: string }>;
}

export default function CandidatePulsePage({ params }: Props) {
  const { name: slug } = use(params);
  const candidateName = slugToCandidateName(slug);
  const twitterHandle = candidateName ? getTwitterHandle(candidateName) : undefined;

  const { data: posts, isLoading } = usePulseFeed({ candidate: slug, sort: 'recent' });
  const { data: allCandidates } = usePulseCandidates();
  const candidateInfo = allCandidates?.find((c) => c.slug === slug);

  return (
    <div className="container py-8">
      {/* Breadcrumb */}
      <div className="text-sm text-muted-foreground mb-4">
        <Link href="/pulse" className="hover:underline">Pulse</Link>
        {' / '}
        <span>{candidateName || slug}</span>
      </div>

      {/* Candidate header */}
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-2">
          <h1 className="text-3xl font-bold">{candidateName || slug}</h1>
          {twitterHandle && (
            <a
              href={`https://x.com/${twitterHandle}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-primary"
            >
              @{twitterHandle}
            </a>
          )}
        </div>

        {/* Stats row */}
        {candidateInfo && (
          <div className="flex gap-4 mt-4">
            <Card>
              <CardContent className="p-3">
                <div className="text-lg font-bold">{candidateInfo.postCount}</div>
                <div className="text-xs text-muted-foreground">Curated Posts</div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Feed */}
      <PulseFeed posts={posts} isLoading={isLoading} />

      {/* Back link */}
      <div className="mt-8">
        <Button variant="outline" asChild>
          <Link href="/pulse">Back to Pulse Feed</Link>
        </Button>
      </div>
    </div>
  );
}
