'use client';

import { useState } from 'react';
import { useParams, notFound } from 'next/navigation';
import Link from 'next/link';
import { useStateSenateRaces, useSenatePrimaries } from '@/hooks/useMarkets';
import { OddsTable } from '@/components/odds';
import { Skeleton } from '@/components/ui/skeleton';
import type { TimeFilter } from '@/lib/types';

const STATE_CONFIG: Record<string, string> = {
  al: 'Alabama',
  ak: 'Alaska',
  ar: 'Arkansas',
  co: 'Colorado',
  de: 'Delaware',
  fl: 'Florida',
  ga: 'Georgia',
  id: 'Idaho',
  il: 'Illinois',
  ia: 'Iowa',
  ks: 'Kansas',
  ky: 'Kentucky',
  la: 'Louisiana',
  me: 'Maine',
  ma: 'Massachusetts',
  mi: 'Michigan',
  mn: 'Minnesota',
  ms: 'Mississippi',
  mt: 'Montana',
  ne: 'Nebraska',
  nh: 'New Hampshire',
  nj: 'New Jersey',
  nm: 'New Mexico',
  nc: 'North Carolina',
  oh: 'Ohio',
  ok: 'Oklahoma',
  or: 'Oregon',
  ri: 'Rhode Island',
  sc: 'South Carolina',
  sd: 'South Dakota',
  tn: 'Tennessee',
  tx: 'Texas',
  va: 'Virginia',
  wv: 'West Virginia',
  wy: 'Wyoming',
};

export default function StateContent() {
  const params = useParams();
  const stateAbbrev = (params.state as string).toLowerCase();
  const [changePeriod, setChangePeriod] = useState<TimeFilter>('1d');

  const stateName = STATE_CONFIG[stateAbbrev];
  if (!stateName) {
    notFound();
  }

  const { data: races, isLoading } = useStateSenateRaces(changePeriod, stateAbbrev);
  const { data: allPrimaries, isLoading: primariesLoading } = useSenatePrimaries(changePeriod);
  const market = races?.[0];

  // Filter primaries for this state
  const statePrimaries = allPrimaries?.filter(p =>
    p.id.startsWith(`senate-primary-${stateAbbrev}-`)
  ) || [];

  if (isLoading) {
    return (
      <div className="container py-8">
        <Skeleton className="h-10 w-3/4 mb-4" />
        <Skeleton className="h-6 w-1/2 mb-8" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  if (!market && statePrimaries.length === 0) {
    return (
      <div className="container py-8">
        <Link href="/senate" className="text-sm text-muted-foreground hover:underline mb-4 inline-block">
          &larr; All Senate Races
        </Link>
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold mb-4">No Market Data</h1>
          <p className="text-muted-foreground">
            No market data is currently available for the {stateName} Senate race.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <Link href="/senate" className="text-sm text-muted-foreground hover:underline mb-4 inline-block">
        &larr; All Senate Races
      </Link>

      <div className="mb-6">
        <h1 className="text-3xl font-bold">{stateName} Senate Race 2026</h1>
        {market?.description && (
          <p className="text-muted-foreground mt-1">{market.description}</p>
        )}
      </div>

      {market && (
        <section className="mb-8">
          <h2 className="text-xl font-bold mb-4">General Election</h2>
          <OddsTable
            market={market}
            showAllSources
            changePeriod={changePeriod}
            onChangePeriodChange={setChangePeriod}
          />
        </section>
      )}

      {statePrimaries.length > 0 && (
        <section>
          <h2 className="text-xl font-bold mb-4">Primaries</h2>
          <div className="space-y-6">
            {statePrimaries.map((primary) => (
              <div key={primary.id}>
                <h3 className="text-lg font-semibold mb-3">{primary.name}</h3>
                <OddsTable
                  market={primary}
                  showAllSources
                  changePeriod={changePeriod}
                  onChangePeriodChange={setChangePeriod}
                  hideVolume={primary.totalVolume === 0}
                />
              </div>
            ))}
          </div>
        </section>
      )}

      {primariesLoading && statePrimaries.length === 0 && (
        <Skeleton className="h-[200px] w-full mt-4" />
      )}
    </div>
  );
}
