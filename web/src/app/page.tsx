'use client';

import { useState } from 'react';
import { useFeaturedMarkets, useStats, useMarketsByCategory } from '@/hooks/useMarkets';
import { MarketCard, OddsTable } from '@/components/odds';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatVolume } from '@/lib/utils';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import type { TimeFilter } from '@/lib/types';
import { JsonLd, HOMEPAGE_JSONLD } from '@/components/seo/JsonLd';

export default function HomePage() {
  const [changePeriod, setChangePeriod] = useState<TimeFilter>('1d');
  const { data: featuredMarkets, isLoading: marketsLoading } = useFeaturedMarkets();
  const { data: stats, isLoading: statsLoading } = useStats();
  const { data: presidentialMarkets, isLoading: presidentialLoading } = useMarketsByCategory('presidential', changePeriod);

  // Get the main presidential candidate market (not party)
  const presidentialMarket = presidentialMarkets?.find(
    (m) => !m.name.toLowerCase().includes('party')
  ) || presidentialMarkets?.[0];

  return (
    <div className="container py-8">
      <JsonLd data={HOMEPAGE_JSONLD} />
      {/* Hero Section */}
      <section className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-bold mb-4">
          Election Odds Aggregator
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Real-time aggregated prediction market odds for US elections.
          Compare prices from PredictIt, Kalshi, Polymarket, and more.
        </p>
      </section>

      {/* Stats Section */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
        {statsLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-8 w-20 mb-2" />
                <Skeleton className="h-4 w-24" />
              </CardContent>
            </Card>
          ))
        ) : stats ? (
          <>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold">{stats.totalMarkets.toLocaleString()}</div>
                <div className="text-sm text-muted-foreground">Markets</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold">{stats.totalContracts.toLocaleString()}</div>
                <div className="text-sm text-muted-foreground">Contracts</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold">{formatVolume(stats.totalVolume)}</div>
                <div className="text-sm text-muted-foreground">Total Volume</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold">5</div>
                <div className="text-sm text-muted-foreground">Data Sources</div>
              </CardContent>
            </Card>
          </>
        ) : null}
      </section>

      {/* 2028 Presidential Odds */}
      <section className="mb-12">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">2028 Presidential Odds</h2>
          <Button variant="outline" asChild>
            <Link href="/presidential/candidates">View Details</Link>
          </Button>
        </div>
        {presidentialLoading ? (
          <Skeleton className="h-[300px] w-full" />
        ) : presidentialMarket ? (
          <OddsTable
            market={presidentialMarket}
            changePeriod={changePeriod}
            onChangePeriodChange={setChangePeriod}
          />
        ) : (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              Presidential market data unavailable
            </CardContent>
          </Card>
        )}
      </section>

      {/* Featured Markets */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-6">Featured Markets</h2>
        <div className="grid md:grid-cols-2 gap-6">
          {marketsLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-3/4" />
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {Array.from({ length: 3 }).map((_, j) => (
                      <Skeleton key={j} className="h-8 w-full" />
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))
          ) : featuredMarkets ? (
            featuredMarkets.map((market) => (
              <MarketCard
                key={market.id}
                market={market}
                linkTo={`/markets/${market.slug}`}
              />
            ))
          ) : null}
        </div>
      </section>

      {/* Quick Links */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-6">Explore Markets</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <Link href="/presidential/candidates">
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-4 text-center">
                <div className="text-2xl mb-2">🏛️</div>
                <div className="font-medium">2028 Presidential</div>
              </CardContent>
            </Card>
          </Link>
          <Link href="/primaries/gop">
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-4 text-center">
                <div className="text-2xl mb-2">🔴</div>
                <div className="font-medium">GOP Primary</div>
              </CardContent>
            </Card>
          </Link>
          <Link href="/primaries/dem">
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-4 text-center">
                <div className="text-2xl mb-2">🔵</div>
                <div className="font-medium">DEM Primary</div>
              </CardContent>
            </Card>
          </Link>
          <Link href="/races/house-2026">
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-4 text-center">
                <div className="text-2xl mb-2">🏠</div>
                <div className="font-medium">2026 House</div>
              </CardContent>
            </Card>
          </Link>
          <Link href="/races/senate-2026">
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-4 text-center">
                <div className="text-2xl mb-2">🏛️</div>
                <div className="font-medium">2026 Senate</div>
              </CardContent>
            </Card>
          </Link>
          <Link href="/charts">
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-4 text-center">
                <div className="text-2xl mb-2">📈</div>
                <div className="font-medium">Charts</div>
              </CardContent>
            </Card>
          </Link>
        </div>
      </section>

      {/* CTA Section */}
      <section className="text-center py-8 px-4 rounded-lg bg-muted">
        <h2 className="text-2xl font-bold mb-2">Track Record</h2>
        <p className="text-muted-foreground mb-4">
          See how prediction markets have performed in past elections.
        </p>
        <Button asChild>
          <Link href="/track-record">View Track Record</Link>
        </Button>
      </section>
    </div>
  );
}
