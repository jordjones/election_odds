'use client';

import { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { SenateCompositionMap } from '@/components/maps/SenateCompositionMap';
import { GovernorMap } from '@/components/maps/GovernorMap';
import { getSenateStats } from '@/data/senate-composition';
import { getGovernorStats } from '@/data/governor-composition';

export default function MapsPage() {
  const [tab, setTab] = useState('senate');
  const senateStats = getSenateStats();
  const govStats = getGovernorStats();

  return (
    <div className="container py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Election Maps</h1>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="senate">Senate</TabsTrigger>
          <TabsTrigger value="governors">Governors</TabsTrigger>
        </TabsList>

        <TabsContent value="senate">
          <div className="space-y-6 pt-4">
            <div>
              <h2 className="text-xl font-semibold">
                US Senate Composition
              </h2>
              <p className="text-muted-foreground mt-1">
                119th Congress (2025&ndash;2027) &mdash; {senateStats.rSeats}R,{' '}
                {senateStats.dSeats}D, {senateStats.iSeats}I &mdash;{' '}
                {senateStats.solidR + senateStats.solidD + senateStats.split}{' '}
                states
              </p>
            </div>

            <SenateCompositionMap />

            <p className="text-xs text-muted-foreground">
              Click any state with a 2026 Senate race to view prediction market
              odds. Independents Sanders (VT) and King (ME) caucus with
              Democrats.
            </p>
          </div>
        </TabsContent>

        <TabsContent value="governors">
          <div className="space-y-6 pt-4">
            <div>
              <h2 className="text-xl font-semibold">
                US Governors by Party
              </h2>
              <p className="text-muted-foreground mt-1">
                {govStats.rCount} Republican, {govStats.dCount} Democrat
                &mdash; {govStats.racesIn2026} races in 2026
              </p>
            </div>

            <GovernorMap />

            <p className="text-xs text-muted-foreground">
              Click any state with a 2026 governor&rsquo;s race to view
              prediction market odds. Dashed borders indicate states with
              upcoming races.
            </p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
