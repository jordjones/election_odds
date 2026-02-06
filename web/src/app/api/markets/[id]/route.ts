import { NextResponse } from 'next/server';
import { getMarket } from '@/lib/db';
import type { TimeFilter } from '@/lib/types';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const changePeriod = (searchParams.get('changePeriod') as TimeFilter) || '1d';

  try {
    const market = getMarket(id, changePeriod);

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
