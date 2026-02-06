import { NextResponse } from 'next/server';

// Dynamic import to avoid loading better-sqlite3 on Netlify
async function getFeaturedFromDb() {
  if (process.env.DATABASE_URL) {
    const { getFeaturedMarketsAsync } = await import('@/lib/db-pg');
    return getFeaturedMarketsAsync();
  } else {
    const { getFeaturedMarkets } = await import('@/lib/db');
    return getFeaturedMarkets();
  }
}

export async function GET() {
  try {
    const featured = await getFeaturedFromDb();
    return NextResponse.json(featured);
  } catch (error) {
    console.error('Error fetching featured markets:', error);
    return NextResponse.json({ error: 'Failed to fetch featured markets' }, { status: 500 });
  }
}
