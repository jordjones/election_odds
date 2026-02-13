'use client';

import { SenateCompositionMap } from '@/components/maps/SenateCompositionMap';
import { getSenateStats } from '@/data/senate-composition';

export default function MapsPage() {
  const stats = getSenateStats();

  return (
    <div className="container py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          US Senate Composition
        </h1>
        <p className="text-muted-foreground mt-1">
          119th Congress (2025&ndash;2027) &mdash; {stats.rSeats}R,{' '}
          {stats.dSeats}D, {stats.iSeats}I &mdash;{' '}
          {stats.solidR + stats.solidD + stats.split} states
        </p>
      </div>

      <SenateCompositionMap />

      <p className="text-xs text-muted-foreground">
        Click any state with a 2026 Senate race to view prediction market odds.
        Independents Sanders (VT) and King (ME) caucus with Democrats.
      </p>
    </div>
  );
}
