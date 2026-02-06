import { NextResponse } from 'next/server';
import { getMarkets } from '@/lib/db';
import type { MarketCategory } from '@/lib/types';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category') as MarketCategory | null;
  const status = searchParams.get('status') as 'open' | 'all' | null;
  const limitStr = searchParams.get('limit');
  const limit = limitStr ? parseInt(limitStr, 10) : undefined;

  console.log('[API /markets] Request received:', { category, status, limit });

  try {
    const markets = getMarkets({
      category: category || undefined,
      status: status || undefined,
      limit,
    });

    console.log('[API /markets] Returning', markets.length, 'markets');
    return NextResponse.json(markets);
  } catch (error) {
    console.error('[API /markets] Error fetching markets:', error);
    return NextResponse.json({ error: 'Failed to fetch markets', details: String(error) }, { status: 500 });
  }
}
