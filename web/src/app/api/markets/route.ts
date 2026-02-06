import { NextResponse } from 'next/server';
import type { MarketCategory, TimeFilter } from '@/lib/types';
import { usePostgres } from '@/lib/use-postgres';

// Dynamic import to avoid loading better-sqlite3 on Netlify
async function getMarketsFromDb(options: {
  category?: MarketCategory;
  status?: 'open' | 'all';
  limit?: number;
  changePeriod?: string;
}) {
  // Use PostgreSQL in production (Netlify), SQLite locally
  if (usePostgres()) {
    const { getMarketsAsync } = await import('@/lib/db-pg');
    return getMarketsAsync(options);
  } else {
    const { getMarkets } = await import('@/lib/db');
    return getMarkets(options);
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category') as MarketCategory | null;
  const status = searchParams.get('status') as 'open' | 'all' | null;
  const limitStr = searchParams.get('limit');
  const limit = limitStr ? parseInt(limitStr, 10) : undefined;
  const changePeriod = searchParams.get('changePeriod') as TimeFilter | null;

  try {
    const markets = await getMarketsFromDb({
      category: category || undefined,
      status: status || undefined,
      limit,
      changePeriod: changePeriod || '1d',
    });

    return NextResponse.json(markets);
  } catch (error) {
    console.error('[API /markets] Error fetching markets:', error);
    const dbUrl = (process.env as Record<string, string | undefined>)['DATABASE_URL'];
    return NextResponse.json({
      error: 'Failed to fetch markets',
      details: String(error),
      usePostgresResult: usePostgres(),
      dbUrlType: typeof dbUrl,
      dbUrlLength: dbUrl?.length ?? -1,
      dbUrlPrefix: dbUrl?.slice(0, 20) || 'empty/undefined',
    }, { status: 500 });
  }
}
