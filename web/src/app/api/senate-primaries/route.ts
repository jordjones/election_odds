import { NextResponse } from 'next/server';
import type { TimeFilter } from '@/lib/types';
import { usePostgres } from '@/lib/use-postgres';

async function getSenatePrimariesFromDb(options: {
  changePeriod?: string;
}) {
  if (usePostgres()) {
    const { getSenatePrimariesAsync } = await import('@/lib/db-pg');
    return getSenatePrimariesAsync(options);
  } else {
    const { getSenatePrimaries } = await import('@/lib/db');
    return getSenatePrimaries(options);
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const changePeriod = searchParams.get('changePeriod') as TimeFilter | null;

  try {
    const markets = await getSenatePrimariesFromDb({
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
    console.error('[API /senate-primaries] Error fetching senate primaries:', error);
    return NextResponse.json({ error: 'Failed to fetch senate primaries', details: String(error) }, { status: 500 });
  }
}
