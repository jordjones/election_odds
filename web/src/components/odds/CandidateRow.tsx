'use client';

import type { Contract, MarketSource, TimeFilter } from '@/lib/types';
import { MARKET_SOURCES } from '@/lib/types';
import { formatPercent, formatPriceChange, formatVolume, getPriceChangeColor, cn } from '@/lib/utils';
import { MarketPriceCell } from './MarketPriceCell';

interface CandidateRowProps {
  contract: Contract;
  rank: number;
  sources: MarketSource[];
  changePeriod?: TimeFilter;
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

// Get image zoom/position settings per candidate
// scale: zoom level (1 = no zoom, 2 = 2x zoom)
// position: CSS object-position value
function getImageSettings(name: string): { scale: number; position: string } {
  const settings: Record<string, { scale: number; position: string }> = {
    // Senate portrait - already a headshot, minimal adjustment
    'JD Vance': { scale: 1.3, position: '50% 15%' },
    'Gavin Newsom': { scale: 1.5, position: '50% 20%' },
    'Marco Rubio': { scale: 1.5, position: '50% 20%' },

    // Already face-focused - less zoom needed
    'Josh Shapiro': { scale: 1.1, position: '50% 30%' },
    'Gretchen Whitmer': { scale: 1.1, position: '50% 25%' },

    // Good middle ground
    'Alexandria Ocasio-Cortez': { scale: 1.4, position: '50% 20%' },
    'Kamala Harris': { scale: 1.4, position: '50% 20%' },
    'Donald Trump': { scale: 1.5, position: '50% 15%' },
    'Pete Buttigieg': { scale: 1.5, position: '50% 20%' },
    'Ron DeSantis': { scale: 1.5, position: '50% 20%' },
    'Nikki Haley': { scale: 1.5, position: '50% 20%' },
    'Vivek Ramaswamy': { scale: 1.5, position: '50% 20%' },
    'Tim Walz': { scale: 1.5, position: '50% 20%' },
    'Andy Beshear': { scale: 1.5, position: '50% 20%' },
    'JB Pritzker': { scale: 1.5, position: '50% 20%' },
    'Wes Moore': { scale: 1.5, position: '50% 20%' },
    'Jon Ossoff': { scale: 1.5, position: '50% 20%' },
    'Mark Kelly': { scale: 1.5, position: '50% 20%' },
    'Cory Booker': { scale: 1.5, position: '50% 20%' },
    'Amy Klobuchar': { scale: 1.5, position: '50% 20%' },
    'Bernie Sanders': { scale: 1.5, position: '50% 20%' },
    'Elizabeth Warren': { scale: 1.5, position: '50% 20%' },
    'Michelle Obama': { scale: 1.5, position: '50% 20%' },
    'Barack Obama': { scale: 1.5, position: '50% 20%' },
    'Hillary Clinton': { scale: 1.5, position: '50% 20%' },
    'John Fetterman': { scale: 1.5, position: '50% 20%' },
    'Mike Pence': { scale: 1.5, position: '50% 20%' },
    'Ted Cruz': { scale: 1.5, position: '50% 20%' },
    'Josh Hawley': { scale: 1.5, position: '50% 20%' },
    'Rand Paul': { scale: 1.5, position: '50% 20%' },
    'Tom Cotton': { scale: 1.5, position: '50% 20%' },
    'Glenn Youngkin': { scale: 1.5, position: '50% 20%' },
    'Brian Kemp': { scale: 1.5, position: '50% 20%' },
    'Kristi Noem': { scale: 1.5, position: '50% 20%' },
    'Sarah Sanders': { scale: 1.5, position: '50% 20%' },
    'Tulsi Gabbard': { scale: 1.5, position: '50% 20%' },
    'Elon Musk': { scale: 1.5, position: '50% 20%' },
    'Tucker Carlson': { scale: 1.5, position: '50% 20%' },
    'Robert F. Kennedy Jr.': { scale: 1.5, position: '50% 20%' },

    // Party logos - no zoom
    'Democratic Party': { scale: 1, position: 'center' },
    'Republican Party': { scale: 1, position: 'center' },
  };

  return settings[name] || { scale: 1.5, position: '50% 20%' };
}

export function CandidateRow({ contract, rank, sources, changePeriod = '1d' }: CandidateRowProps) {
  // Get price for each source
  const getPriceForSource = (source: MarketSource) => {
    return contract.prices.find((p) => p.source === source);
  };

  const initials = getInitials(contract.name);
  const avatarColor = getAvatarColor(contract.name);
  const imageSettings = getImageSettings(contract.name);

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
            <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
              <img
                src={contract.imageUrl}
                alt={contract.name}
                className="w-full h-full object-cover"
                style={{
                  transform: `scale(${imageSettings.scale})`,
                  objectPosition: imageSettings.position,
                }}
              />
            </div>
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
