import { NextResponse } from 'next/server';
import type { TimeFilter } from '@/lib/types';
import { usePostgres } from '@/lib/use-postgres';

async function getSenateRacesFromDb(options: {
  states?: string[];
  changePeriod?: string;
}) {
  if (usePostgres()) {
    const { getStateSenateRacesAsync } = await import('@/lib/db-pg');
    return getStateSenateRacesAsync(options);
  } else {
    const { getStateSenateRaces } = await import('@/lib/db');
    return getStateSenateRaces(options);
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const state = searchParams.get('state');
  const changePeriod = searchParams.get('changePeriod') as TimeFilter | null;

  try {
    const markets = await getSenateRacesFromDb({
      states: state ? [state] : undefined,
      changePeriod: changePeriod || '1d',
    });

    return NextResponse.json(markets, {
      headers: {
        'Cache-Control': 'public, max-age=60',
        'CDN-Cache-Control': 'public, max-age=120, stale-while-revalidate=300',
        'Netlify-Vary': 'query',
      },
    });
  } catch (error) {
    console.error('[API /senate-races] Error fetching senate races:', error);
    return NextResponse.json({ error: 'Failed to fetch senate races', details: String(error) }, { status: 500 });
  }
}
