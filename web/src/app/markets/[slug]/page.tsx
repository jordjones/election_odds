'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useMarket, useChartData } from '@/hooks/useMarkets';
import { OddsTable, OddsChart, MarketHeader } from '@/components/odds';
import { Skeleton } from '@/components/ui/skeleton';
import type { TimeFilter } from '@/lib/types';

export default function MarketDetailPage() {
  const params = useParams();
  const slug = params.slug as string;
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('1w');

  const { data: market, isLoading: marketLoading, error: marketError } = useMarket(slug);
  const { data: chartData, isLoading: chartLoading } = useChartData(slug, timeFilter);

  if (marketLoading) {
    return (
      <div className="container py-8">
        <Skeleton className="h-10 w-3/4 mb-4" />
        <Skeleton className="h-6 w-1/2 mb-8" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  if (marketError || !market) {
    return (
      <div className="container py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Market Not Found</h1>
          <p className="text-muted-foreground">
            The market you&apos;re looking for doesn&apos;t exist or has been removed.
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
          <OddsTable market={market} showAllSources />
        </section>
      </div>
    </div>
  );
}
