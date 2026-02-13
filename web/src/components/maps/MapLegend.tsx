'use client';

import { DELEGATION_COLORS, getSenateStats } from '@/data/senate-composition';
import type { DelegationType } from '@/data/senate-composition';

const LEGEND_ITEMS: { type: DelegationType; label: string }[] = [
  { type: 'solid-r', label: 'Both Republican' },
  { type: 'solid-d', label: 'Both Dem / Ind (caucus)' },
  { type: 'split', label: 'Split Delegation' },
];

export function MapLegend() {
  const stats = getSenateStats();

  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
      {LEGEND_ITEMS.map(({ type, label }) => (
        <div key={type} className="flex items-center gap-2">
          <span
            className="inline-block h-4 w-4 rounded-sm border border-border"
            style={{ backgroundColor: DELEGATION_COLORS[type].light }}
          />
          <span className="text-muted-foreground">{label}</span>
        </div>
      ))}
      <span className="text-muted-foreground ml-auto pr-1">
        {stats.rSeats}R &ndash; {stats.dSeats + stats.iSeats}D/I
      </span>
    </div>
  );
}
