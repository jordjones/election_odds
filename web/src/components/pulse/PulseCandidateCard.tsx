'use client';

import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatRelativeTime } from '@/lib/utils';
import type { PulseCandidate } from '@/lib/pulse-types';

interface PulseCandidateCardProps {
  candidate: PulseCandidate;
}

export function PulseCandidateCard({ candidate }: PulseCandidateCardProps) {
  return (
    <Link href={`/pulse/candidate/${candidate.slug}`}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-semibold">{candidate.name}</div>
              <div className="text-sm text-muted-foreground">
                @{candidate.twitterHandle}
              </div>
            </div>
            <div className="text-right">
              <Badge variant="secondary">{candidate.postCount} posts</Badge>
              <div className="text-xs text-muted-foreground mt-1">
                Latest: {formatRelativeTime(candidate.latestPostAt)}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
