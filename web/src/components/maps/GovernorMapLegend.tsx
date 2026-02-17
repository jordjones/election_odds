'use client';

import { GOVERNOR_COLORS, getGovernorStats } from '@/data/governor-composition';
import type { GovernorParty } from '@/data/governor-composition';

const LEGEND_ITEMS: { party: GovernorParty; label: string }[] = [
  { party: 'R', label: 'Republican' },
  { party: 'D', label: 'Democrat' },
];

export function GovernorMapLegend() {
  const stats = getGovernorStats();
  const counts: Record<GovernorParty, number> = {
    R: stats.rCount,
    D: stats.dCount,
  };

  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
      {LEGEND_ITEMS.map(({ party, label }) => (
        <div key={party} className="flex items-center gap-2">
          <span
            className="inline-block h-4 w-4 rounded-sm border border-border"
            style={{ backgroundColor: GOVERNOR_COLORS[party].light }}
          />
          <span className="text-muted-foreground">
            {label} ({counts[party]})
          </span>
        </div>
      ))}
      <div className="flex items-center gap-2">
        <span
          className="inline-block h-4 w-4 rounded-sm border-2 border-dashed border-amber-500"
        />
        <span className="text-muted-foreground">
          2026 Race ({stats.racesIn2026})
        </span>
      </div>
    </div>
  );
}
