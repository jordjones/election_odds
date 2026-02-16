'use client';

import Link from 'next/link';
import { useMarketsByCategory } from '@/hooks/useMarkets';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatPercent } from '@/lib/utils';
import type { TimeFilter } from '@/lib/types';

function PrimaryCard({
  title,
  color,
  href,
  category,
}: {
  title: string;
  color: string;
  href: string;
  category: 'primary-gop' | 'primary-dem';
}) {
  const { data: markets, isLoading } = useMarketsByCategory(category, '1d' as TimeFilter);
  const market = markets?.[0];
  const topContracts = market
    ? [...market.contracts].sort((a, b) => b.aggregatedPrice - a.aggregatedPrice).slice(0, 5)
    : [];

  return (
    <Link href={href} className="block">
      <Card className="hover:shadow-md transition-shadow h-full">
        <CardHeader className="pb-3">
          <CardTitle className={`text-xl ${color}`}>{title}</CardTitle>
          <p className="text-sm text-muted-foreground">
            Who will win the nomination?
          </p>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-6 w-full" />
              ))}
            </div>
          ) : topContracts.length > 0 ? (
            <div className="space-y-2">
              {topContracts.map((contract) => (
                <div
                  key={contract.id}
                  className="flex items-center justify-between py-1"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {contract.imageUrl ? (
                      <img
                        src={contract.imageUrl}
                        alt={contract.name}
                        className="w-6 h-6 rounded-full object-cover shrink-0"
                      />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-muted shrink-0" />
                    )}
                    <span className="font-medium text-sm truncate">
                      {contract.shortName || contract.name}
                    </span>
                  </div>
                  <span className="font-mono text-sm font-semibold shrink-0 ml-2">
                    {formatPercent(contract.aggregatedPrice)}
                  </span>
                </div>
              ))}
              {market && market.contracts.length > 5 && (
                <p className="text-xs text-muted-foreground pt-1">
                  +{market.contracts.length - 5} more candidates
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No data available</p>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}

export default function PrimariesPage() {
  return (
    <div className="container py-8">
      <h1 className="text-3xl font-bold mb-2">2028 Presidential Primaries</h1>
      <p className="text-muted-foreground mb-8">
        Live odds for the Republican and Democratic presidential nominations from prediction markets.
      </p>

      <div className="grid md:grid-cols-2 gap-6">
        <PrimaryCard
          title="Republican Primary"
          color="text-red-600"
          href="/primaries/republican"
          category="primary-gop"
        />
        <PrimaryCard
          title="Democratic Primary"
          color="text-blue-600"
          href="/primaries/democratic"
          category="primary-dem"
        />
      </div>
    </div>
  );
}
