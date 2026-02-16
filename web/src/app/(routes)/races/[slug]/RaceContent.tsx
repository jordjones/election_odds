'use client';

import { useState } from 'react';
import { useParams, notFound } from 'next/navigation';
import { useMarketsByCategory, useChartData } from '@/hooks/useMarkets';
import { OddsTable, OddsChart, MarketHeader } from '@/components/odds';
import { Skeleton } from '@/components/ui/skeleton';
import type { TimeFilter, MarketCategory } from '@/lib/types';

const RACE_CONFIG: Record<string, { category: MarketCategory; title: string }> = {
  'house-2026': {
    category: 'house',
    title: '2026 House Control',
  },
  'senate-2026': {
    category: 'senate',
    title: '2026 Senate Control',
  },
};

export default function RaceContent() {
  const params = useParams();
  const slug = params.slug as string;
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all');
  const [changePeriod, setChangePeriod] = useState<TimeFilter>('1d');

  const config = RACE_CONFIG[slug];

  if (!config) {
    notFound();
  }

  const { data: markets, isLoading: marketsLoading } = useMarketsByCategory(config.category, changePeriod);
  const market = markets?.[0];

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
            No market data is currently available for this race.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <MarketHeader market={market} />

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
          <OddsTable
            market={market}
            showAllSources
            changePeriod={changePeriod}
            onChangePeriodChange={setChangePeriod}
          />
        </section>
      </div>
    </div>
  );
}
