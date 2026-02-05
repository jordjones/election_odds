import { NextResponse } from 'next/server';
import {
  mockMarkets,
  mockGOPPrimary,
  mockDEMPrimary,
  mockPresidential,
  mockHouseControl,
  mockSenateControl,
} from '@/lib/api/mock-data';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Find market by id or slug
  const market = mockMarkets.find((m) => m.id === id || m.slug === id);

  if (!market) {
    return NextResponse.json(
      { error: 'Market not found' },
      { status: 404 }
    );
  }

  return NextResponse.json(market);
}
