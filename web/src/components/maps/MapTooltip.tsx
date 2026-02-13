'use client';

import type { StateDelegation } from '@/data/senate-composition';

interface MapTooltipProps {
  stateName: string;
  delegation: StateDelegation;
  x: number;
  y: number;
}

const PARTY_COLORS: Record<string, string> = {
  R: 'text-red-600 dark:text-red-400',
  D: 'text-blue-600 dark:text-blue-400',
  I: 'text-purple-600 dark:text-purple-400',
};

export function MapTooltip({ stateName, delegation, x, y }: MapTooltipProps) {
  return (
    <div
      className="pointer-events-none fixed z-50 rounded-md border bg-popover px-3 py-2 text-sm shadow-md"
      style={{ left: x + 12, top: y - 10 }}
    >
      <p className="font-semibold mb-1">{stateName}</p>
      {delegation.senators.map((senator, i) => (
        <p key={i} className="text-muted-foreground">
          <span className={PARTY_COLORS[senator.party]}>
            ({senator.party})
          </span>{' '}
          {senator.name}
        </p>
      ))}
    </div>
  );
}
