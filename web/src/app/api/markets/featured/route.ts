import { NextResponse } from 'next/server';
import { mockMarkets } from '@/lib/api/mock-data';

export async function GET() {
  // Return top 4 markets by volume for featured section
  const featured = [...mockMarkets]
    .sort((a, b) => b.totalVolume - a.totalVolume)
    .slice(0, 4);

  return NextResponse.json(featured);
}
