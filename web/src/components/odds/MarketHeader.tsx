'use client';

import type { Market } from '@/lib/types';
import { formatVolume, formatRelativeTime } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface MarketHeaderProps {
  market: Market;
}

export function MarketHeader({ market }: MarketHeaderProps) {
  return (
    <div className="mb-6">
      <div className="flex flex-wrap items-center gap-3 mb-2">
        <h1 className="text-2xl md:text-3xl font-bold">{market.name}</h1>
        <Badge variant={market.status === 'open' ? 'default' : 'secondary'}>
          {market.status}
        </Badge>
      </div>
      {market.description && (
        <p className="text-muted-foreground mb-4">{market.description}</p>
      )}
      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
        <span>Total Volume: {formatVolume(market.totalVolume)}</span>
        {market.endDate && (
          <span>Ends: {new Date(market.endDate).toLocaleDateString()}</span>
        )}
        <span>Updated: {formatRelativeTime(market.lastUpdated)}</span>
      </div>
    </div>
  );
}
