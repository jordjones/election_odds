'use client';

import { useState } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PulseFeed } from './PulseFeed';
import { usePulseFeed, usePulseCandidates } from '@/hooks/usePulse';
import type { PulseCandidate } from '@/lib/pulse-types';

export function ContrastView() {
  const { data: candidates } = usePulseCandidates();
  const [leftCandidate, setLeftCandidate] = useState<string | undefined>();
  const [rightCandidate, setRightCandidate] = useState<string | undefined>();

  const { data: leftPosts, isLoading: leftLoading } = usePulseFeed(
    leftCandidate ? { candidate: leftCandidate, sort: 'recent' } : undefined
  );
  const { data: rightPosts, isLoading: rightLoading } = usePulseFeed(
    rightCandidate ? { candidate: rightCandidate, sort: 'recent' } : undefined
  );

  const leftName = candidates?.find((c) => c.slug === leftCandidate)?.name;
  const rightName = candidates?.find((c) => c.slug === rightCandidate)?.name;

  return (
    <div className="space-y-6">
      {/* Candidate selectors */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium mb-1 block">Candidate A</label>
          <Select value={leftCandidate || ''} onValueChange={setLeftCandidate}>
            <SelectTrigger>
              <SelectValue placeholder="Select candidate..." />
            </SelectTrigger>
            <SelectContent>
              {candidates?.map((c) => (
                <SelectItem key={c.slug} value={c.slug}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-sm font-medium mb-1 block">Candidate B</label>
          <Select value={rightCandidate || ''} onValueChange={setRightCandidate}>
            <SelectTrigger>
              <SelectValue placeholder="Select candidate..." />
            </SelectTrigger>
            <SelectContent>
              {candidates?.map((c) => (
                <SelectItem key={c.slug} value={c.slug}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Side-by-side feeds */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          {leftCandidate ? (
            <>
              <h3 className="font-semibold mb-4">{leftName}</h3>
              <PulseFeed posts={leftPosts} isLoading={leftLoading} />
            </>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              Select a candidate to compare
            </div>
          )}
        </div>
        <div>
          {rightCandidate ? (
            <>
              <h3 className="font-semibold mb-4">{rightName}</h3>
              <PulseFeed posts={rightPosts} isLoading={rightLoading} />
            </>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              Select a candidate to compare
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
