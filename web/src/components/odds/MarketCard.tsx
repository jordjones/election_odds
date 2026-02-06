'use client';

import Link from 'next/link';
import type { Market } from '@/lib/types';
import { formatPercent, formatPriceChange, formatVolume, getPriceChangeColor, cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface MarketCardProps {
  market: Market;
  linkTo?: string;
}

export function MarketCard({ market, linkTo }: MarketCardProps) {
  // Get top 3 contracts
  const topContracts = [...market.contracts]
    .sort((a, b) => b.aggregatedPrice - a.aggregatedPrice)
    .slice(0, 3);

  const content = (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-lg leading-tight">{market.name}</CardTitle>
          <Badge variant={market.status === 'open' ? 'default' : 'secondary'}>
            {market.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {topContracts.map((contract, index) => (
            <div
              key={contract.id}
              className="flex items-center justify-between py-1"
            >
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground text-sm w-4">{index + 1}</span>
                <span className="font-medium">{contract.shortName || contract.name}</span>
              </div>
              <div className="flex items-center gap-3">
                <span
                  className={cn(
                    'text-xs font-mono',
                    getPriceChangeColor(contract.priceChange)
                  )}
                >
                  {formatPriceChange(contract.priceChange)}
                </span>
                <span className="font-mono font-bold">
                  {formatPercent(contract.aggregatedPrice, 1)}
                </span>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 pt-3 border-t flex justify-between text-xs text-muted-foreground">
          <span>Vol: {formatVolume(market.totalVolume)}</span>
          {market.endDate && (
            <span>Ends: {new Date(market.endDate).toLocaleDateString()}</span>
          )}
        </div>
      </CardContent>
    </Card>
  );

  if (linkTo) {
    return (
      <Link href={linkTo} className="block">
        {content}
      </Link>
    );
  }

  return content;
}
