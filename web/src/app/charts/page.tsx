'use client';

import { useState } from 'react';
import { useMarkets, useChartData, useMarket } from '@/hooks/useMarkets';
import { OddsChart, OddsTable } from '@/components/odds';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { TimeFilter } from '@/lib/types';

export default function ChartsPage() {
  const { data: markets, isLoading: marketsLoading } = useMarkets();
  const [selectedMarketId, setSelectedMarketId] = useState<string>('');
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all');

  // Auto-select first market when data loads
  const marketId = selectedMarketId || markets?.[0]?.id || '';

  const { data: chartData, isLoading: chartLoading } = useChartData(marketId, timeFilter);
  const { data: market, isLoading: marketLoading } = useMarket(marketId);

  return (
    <div className="container py-8">
      <h1 className="text-3xl font-bold mb-2">Price Charts</h1>
      <p className="text-muted-foreground mb-8">
        Track historical price movements across all prediction markets.
      </p>

      {/* Market Selector */}
      <Card className="mb-8">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex-1 min-w-[200px]">
              <label className="text-sm font-medium mb-2 block">Select Market</label>
              {marketsLoading ? (
                <Skeleton className="h-10 w-full" />
              ) : (
                <Select value={marketId} onValueChange={setSelectedMarketId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a market" />
                  </SelectTrigger>
                  <SelectContent>
                    {markets?.map((market) => (
                      <SelectItem key={market.id} value={market.id}>
                        {market.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Chart */}
      {marketId ? (
        <div className="grid gap-8">
          <section>
            <OddsChart
              data={chartData}
              isLoading={chartLoading}
              timeFilter={timeFilter}
              onTimeFilterChange={setTimeFilter}
            />
          </section>

          {/* Current Odds Table */}
          <section>
            <h2 className="text-xl font-bold mb-4">Current Odds</h2>
            {marketLoading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : market ? (
              <OddsTable market={market} showAllSources />
            ) : null}
          </section>
        </div>
      ) : (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            Select a market to view its price history
          </CardContent>
        </Card>
      )}
    </div>
  );
}
