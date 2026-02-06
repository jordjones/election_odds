'use client';

import { useState } from 'react';
import { useParams, notFound } from 'next/navigation';
import { useMarketsByCategory, useMarkets, useChartData } from '@/hooks/useMarkets';
import { OddsTable, OddsChart } from '@/components/odds';
import { Skeleton } from '@/components/ui/skeleton';
import type { TimeFilter } from '@/lib/types';

const VIEW_CONFIG: Record<string, { title: string; description: string }> = {
  party: {
    title: '2028 Presidential Election by Party',
    description: 'Which party will win the White House?',
  },
  candidates: {
    title: '2028 Presidential Election by Candidate',
    description: 'Who will win the 2028 Presidential Election?',
  },
};

export default function PresidentialPage() {
  const params = useParams();
  const view = params.view as string;
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all');

  const config = VIEW_CONFIG[view];

  if (!config) {
    notFound();
  }

  const { data: markets, isLoading: marketsLoading } = useMarketsByCategory('presidential');

  // Find the appropriate market based on view
  const market = markets?.find((m) => {
    if (view === 'party') {
      return m.name.toLowerCase().includes('party');
    }
    return !m.name.toLowerCase().includes('party');
  }) || markets?.[0];

  const { data: chartData, isLoading: chartLoading } = useChartData(
    market?.id || '',
    timeFilter
  );

  if (marketsLoading) {
    return (
      <div className="container py-8">
        <Skeleton className="h-10 w-3/4 mb-4" />
        <Skeleton className="h-6 w-1/2 mb-8" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  if (!market) {
    return (
      <div className="container py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">No Market Data</h1>
          <p className="text-muted-foreground">
            No presidential market data is currently available.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <h1 className="text-3xl font-bold mb-2">{config.title}</h1>
      <p className="text-muted-foreground mb-8">{config.description}</p>

      <div className="grid gap-8">
        {/* Chart Section */}
        <section>
          <OddsChart
            data={chartData}
            isLoading={chartLoading}
            timeFilter={timeFilter}
            onTimeFilterChange={setTimeFilter}
          />
        </section>

        {/* Odds Table */}
        <section>
          <h2 className="text-xl font-bold mb-4">Current Odds</h2>
          <OddsTable market={market} showAllSources />
        </section>
      </div>
    </div>
  );
}
