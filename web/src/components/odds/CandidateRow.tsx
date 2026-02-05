'use client';

import type { Contract, MarketSource } from '@/lib/types';
import { MARKET_SOURCES } from '@/lib/types';
import { formatPercent, formatPriceChange, formatVolume, getPriceChangeColor, cn } from '@/lib/utils';
import { MarketPriceCell } from './MarketPriceCell';

interface CandidateRowProps {
  contract: Contract;
  rank: number;
  sources: MarketSource[];
}

export function CandidateRow({ contract, rank, sources }: CandidateRowProps) {
  // Get price for each source
  const getPriceForSource = (source: MarketSource) => {
    return contract.prices.find((p) => p.source === source);
  };

  return (
    <tr className="border-b hover:bg-muted/50 transition-colors">
      {/* Rank */}
      <td className="px-3 py-2 text-center text-muted-foreground w-12">
        {rank}
      </td>

      {/* Candidate Name */}
      <td className="px-3 py-2 font-medium">
        <div className="flex items-center gap-2">
          {contract.imageUrl && (
            <img
              src={contract.imageUrl}
              alt={contract.name}
              className="w-8 h-8 rounded-full object-cover"
            />
          )}
          <span>{contract.name}</span>
        </div>
      </td>

      {/* Aggregated Price */}
      <td className="px-3 py-2 text-center">
        <span className="font-mono font-bold text-lg">
          {formatPercent(contract.aggregatedPrice, 0)}
        </span>
      </td>

      {/* Price Change */}
      <td className={cn('px-3 py-2 text-center font-mono text-sm', getPriceChangeColor(contract.priceChange))}>
        {formatPriceChange(contract.priceChange)}
      </td>

      {/* Price from each source */}
      {sources.map((source) => (
        <MarketPriceCell
          key={source}
          price={getPriceForSource(source)}
          source={source}
        />
      ))}

      {/* Total Volume */}
      <td className="px-3 py-2 text-center text-sm text-muted-foreground">
        {formatVolume(contract.totalVolume)}
      </td>
    </tr>
  );
}
