'use client';

import { useState } from 'react';
import { useParams, notFound } from 'next/navigation';
import Link from 'next/link';
import { useStateGovernorRaces } from '@/hooks/useMarkets';
import { OddsTable } from '@/components/odds';
import { Skeleton } from '@/components/ui/skeleton';
import type { TimeFilter } from '@/lib/types';

const STATE_CONFIG: Record<string, string> = {
  al: 'Alabama',
  ak: 'Alaska',
  az: 'Arizona',
  ar: 'Arkansas',
  ca: 'California',
  co: 'Colorado',
  ct: 'Connecticut',
  fl: 'Florida',
  ga: 'Georgia',
  hi: 'Hawaii',
  id: 'Idaho',
  il: 'Illinois',
  ia: 'Iowa',
  ks: 'Kansas',
  me: 'Maine',
  md: 'Maryland',
  ma: 'Massachusetts',
  mi: 'Michigan',
  mn: 'Minnesota',
  ne: 'Nebraska',
  nv: 'Nevada',
  nh: 'New Hampshire',
  nm: 'New Mexico',
  ny: 'New York',
  oh: 'Ohio',
  ok: 'Oklahoma',
  or: 'Oregon',
  pa: 'Pennsylvania',
  ri: 'Rhode Island',
  sc: 'South Carolina',
  sd: 'South Dakota',
  tn: 'Tennessee',
  tx: 'Texas',
  vt: 'Vermont',
  wi: 'Wisconsin',
  wy: 'Wyoming',
};

export default function GovernorStateContent() {
  const params = useParams();
  const stateAbbrev = (params.state as string).toLowerCase();
  const [changePeriod, setChangePeriod] = useState<TimeFilter>('1d');

  const stateName = STATE_CONFIG[stateAbbrev];
  if (!stateName) {
    notFound();
  }

  const { data: races, isLoading } = useStateGovernorRaces(changePeriod, stateAbbrev);
  const market = races?.[0];

  if (isLoading) {
    return (
      <div className="container py-8">
        <Skeleton className="h-10 w-3/4 mb-4" />
        <Skeleton className="h-6 w-1/2 mb-8" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  if (!market) {
    return (
      <div className="container py-8">
        <Link href="/governors" className="text-sm text-muted-foreground hover:underline mb-4 inline-block">
          &larr; All Governor Races
        </Link>
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold mb-4">No Market Data</h1>
          <p className="text-muted-foreground">
            No market data is currently available for the {stateName} Governor race.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <Link href="/governors" className="text-sm text-muted-foreground hover:underline mb-4 inline-block">
        &larr; All Governor Races
      </Link>

      <div className="mb-6">
        <h1 className="text-3xl font-bold">{stateName} Governor Race 2026</h1>
        {market?.description && (
          <p className="text-muted-foreground mt-1">{market.description}</p>
        )}
      </div>

      <section className="mb-8">
        <OddsTable
          market={market}
          showAllSources
          changePeriod={changePeriod}
          onChangePeriodChange={setChangePeriod}
        />
      </section>
    </div>
  );
}
