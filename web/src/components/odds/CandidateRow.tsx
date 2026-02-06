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

// Get initials from a name (e.g., "Joe Biden" -> "JB")
function getInitials(name: string): string {
  return name
    .split(' ')
    .map(word => word[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

// Generate a consistent color based on name
function getAvatarColor(name: string): string {
  const colors = [
    'bg-blue-500',
    'bg-red-500',
    'bg-green-500',
    'bg-purple-500',
    'bg-orange-500',
    'bg-cyan-500',
    'bg-pink-500',
    'bg-indigo-500',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

export function CandidateRow({ contract, rank, sources }: CandidateRowProps) {
  // Get price for each source
  const getPriceForSource = (source: MarketSource) => {
    return contract.prices.find((p) => p.source === source);
  };

  const initials = getInitials(contract.name);
  const avatarColor = getAvatarColor(contract.name);

  return (
    <tr className="border-b hover:bg-muted/50 transition-colors">
      {/* Rank */}
      <td className="px-3 py-2 text-center text-muted-foreground w-12">
        {rank}
      </td>

      {/* Candidate Name */}
      <td className="px-3 py-2 font-medium">
        <div className="flex items-center gap-2">
          {contract.imageUrl ? (
            <img
              src={contract.imageUrl}
              alt={contract.name}
              className="w-8 h-8 rounded-full object-cover flex-shrink-0"
            />
          ) : (
            <div className={cn(
              'w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0',
              avatarColor
            )}>
              {initials}
            </div>
          )}
          <span>{contract.name}</span>
        </div>
      </td>

      {/* Aggregated Price */}
      <td className="px-3 py-2 text-center">
        <span className="font-mono font-bold text-lg">
          {formatPercent(contract.aggregatedPrice, 1)}
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
