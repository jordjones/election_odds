import { NextResponse } from 'next/server';
import { getMarkets } from '@/lib/db';
import type { MarketCategory, TimeFilter } from '@/lib/types';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category') as MarketCategory | null;
  const status = searchParams.get('status') as 'open' | 'all' | null;
  const limitStr = searchParams.get('limit');
  const limit = limitStr ? parseInt(limitStr, 10) : undefined;
  const changePeriod = searchParams.get('changePeriod') as TimeFilter | null;

  try {
    const markets = getMarkets({
      category: category || undefined,
      status: status || undefined,
      limit,
      changePeriod: changePeriod || '1d',
    });

    return NextResponse.json(markets);
  } catch (error) {
    console.error('[API /markets] Error fetching markets:', error);
    return NextResponse.json({ error: 'Failed to fetch markets', details: String(error) }, { status: 500 });
  }
}
