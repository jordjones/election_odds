import { NextResponse } from 'next/server';
import { usePostgres } from '@/lib/use-postgres';

async function getStatsFromDb() {
  if (usePostgres()) {
    const { getStatsAsync } = await import('@/lib/db-pg');
    return getStatsAsync();
  } else {
    const { getStats } = await import('@/lib/db');
    return getStats();
  }
}

export async function GET() {
  try {
    const stats = await getStatsFromDb();
    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error fetching stats:', error);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}
