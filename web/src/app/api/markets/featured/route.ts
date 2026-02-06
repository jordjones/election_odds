import { NextResponse } from 'next/server';
import { getFeaturedMarkets } from '@/lib/db';
import { getFeaturedMarketsAsync, isPostgresAvailable } from '@/lib/db-pg';

export async function GET() {
  try {
    let featured;

    if (isPostgresAvailable()) {
      featured = await getFeaturedMarketsAsync();
    } else {
      featured = getFeaturedMarkets();
    }

    return NextResponse.json(featured);
  } catch (error) {
    console.error('Error fetching featured markets:', error);
    return NextResponse.json({ error: 'Failed to fetch featured markets' }, { status: 500 });
  }
}
