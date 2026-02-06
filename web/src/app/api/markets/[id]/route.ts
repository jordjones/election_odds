import { NextResponse } from 'next/server';
import type { TimeFilter } from '@/lib/types';

// Dynamic import to avoid loading better-sqlite3 on Netlify
async function getMarketFromDb(id: string, changePeriod: string) {
  if (process.env.DATABASE_URL) {
    const { getMarketAsync } = await import('@/lib/db-pg');
    return getMarketAsync(id, changePeriod);
  } else {
    const { getMarket } = await import('@/lib/db');
    return getMarket(id, changePeriod);
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const changePeriod = (searchParams.get('changePeriod') as TimeFilter) || '1d';

  try {
    const market = await getMarketFromDb(id, changePeriod);

    if (!market) {
      return NextResponse.json(
        { error: 'Market not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(market);
  } catch (error) {
    console.error('Error fetching market:', error);
    return NextResponse.json({ error: 'Failed to fetch market' }, { status: 500 });
  }
}
