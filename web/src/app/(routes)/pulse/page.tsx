'use client';

import { useState } from 'react';
import { usePulseFeed, usePulseCandidates } from '@/hooks/usePulse';
import { PulseFeed } from '@/components/pulse/PulseFeed';
import { PulseFilterBar } from '@/components/pulse/PulseFilterBar';
import { PulseCandidateCard } from '@/components/pulse/PulseCandidateCard';
import type { PulseTopic, PulseRace, PulseSortMode } from '@/lib/pulse-types';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function PulsePage() {
  const [raceFilter, setRaceFilter] = useState<PulseRace | undefined>();
  const [candidateFilter, setCandidateFilter] = useState<string | undefined>();
  const [topicFilter, setTopicFilter] = useState<PulseTopic | undefined>();
  const [sort, setSort] = useState<PulseSortMode>('recent');

  const handleRaceChange = (race: PulseRace | undefined) => {
    setRaceFilter(race);
    setCandidateFilter(undefined); // clear candidate when race changes
  };

  const { data: posts, isLoading: postsLoading } = usePulseFeed({
    race: raceFilter,
    candidate: candidateFilter,
    topic: topicFilter,
    sort,
  });
  const { data: candidates } = usePulseCandidates(raceFilter);

  return (
    <div className="container py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-3xl font-bold">Candidate Pulse</h1>
          <Button variant="outline" asChild>
            <Link href="/pulse/contrast">Compare Candidates</Link>
          </Button>
        </div>
        <p className="text-muted-foreground">
          Curated candidate posts from X alongside their prediction market odds.
          See what&apos;s driving the numbers.
        </p>
      </div>

      {/* Filters */}
      <div className="mb-6">
        <PulseFilterBar
          candidates={candidates}
          selectedRace={raceFilter}
          selectedCandidate={candidateFilter}
          selectedTopic={topicFilter}
          selectedSort={sort}
          onRaceChange={handleRaceChange}
          onCandidateChange={setCandidateFilter}
          onTopicChange={setTopicFilter}
          onSortChange={setSort}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Main feed */}
        <div className="lg:col-span-3">
          <PulseFeed posts={posts} isLoading={postsLoading} />
        </div>

        {/* Sidebar: candidates */}
        <div className="space-y-4">
          <h2 className="font-semibold text-lg">Candidates</h2>
          {candidates?.slice(0, 8).map((c) => (
            <PulseCandidateCard key={c.slug} candidate={c} />
          ))}
        </div>
      </div>
    </div>
  );
}
