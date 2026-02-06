'use client';

import type { MarketPrice, MarketSource } from '@/lib/types';
import { formatPercent } from '@/lib/utils';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface MarketPriceCellProps {
  price: MarketPrice | undefined;
  source: MarketSource;
}

export function MarketPriceCell({ price, source }: MarketPriceCellProps) {
  if (!price) {
    return (
      <td className="px-3 py-2 text-center text-muted-foreground text-sm">
        --
      </td>
    );
  }

  const spread = price.yesAsk && price.yesBid
    ? ((price.yesAsk - price.yesBid) * 100).toFixed(1)
    : null;

  return (
    <td className="px-3 py-2 text-center">
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={cn(
              'font-mono text-sm cursor-help',
              price.yesPrice >= 0.5 ? 'font-medium' : ''
            )}
          >
            {formatPercent(price.yesPrice, 1)}
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <div className="space-y-1 text-xs">
            <div className="font-medium">{source}</div>
            <div className="grid grid-cols-2 gap-x-4">
              <span className="text-muted-foreground">Bid:</span>
              <span>{price.yesBid ? formatPercent(price.yesBid) : '--'}</span>
              <span className="text-muted-foreground">Ask:</span>
              <span>{price.yesAsk ? formatPercent(price.yesAsk) : '--'}</span>
              {spread && (
                <>
                  <span className="text-muted-foreground">Spread:</span>
                  <span>{spread}%</span>
                </>
              )}
              {price.volume && (
                <>
                  <span className="text-muted-foreground">Volume:</span>
                  <span>${price.volume.toLocaleString()}</span>
                </>
              )}
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </td>
  );
}
