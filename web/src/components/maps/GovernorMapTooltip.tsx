'use client';

import type { GovernorInfo } from '@/data/governor-composition';

interface GovernorMapTooltipProps {
  stateName: string;
  governor: GovernorInfo;
  x: number;
  y: number;
}

const PARTY_COLORS: Record<string, string> = {
  R: 'text-red-600 dark:text-red-400',
  D: 'text-blue-600 dark:text-blue-400',
};

export function GovernorMapTooltip({
  stateName,
  governor,
  x,
  y,
}: GovernorMapTooltipProps) {
  return (
    <div
      className="pointer-events-none fixed z-50 rounded-md border bg-popover px-3 py-2 text-sm shadow-md"
      style={{ left: x + 12, top: y - 10 }}
    >
      <p className="font-semibold mb-1">{stateName}</p>
      <p className="text-muted-foreground">
        <span className={PARTY_COLORS[governor.party]}>
          ({governor.party})
        </span>{' '}
        {governor.name}
      </p>
      <p className="text-muted-foreground text-xs">
        In office since {governor.since}
      </p>
      {governor.upIn2026 && (
        <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
          2026 race &mdash; click for odds
        </p>
      )}
    </div>
  );
}
