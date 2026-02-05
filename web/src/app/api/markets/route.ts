import { NextResponse } from 'next/server';
import {
  mockMarkets,
  mockGOPPrimary,
  mockDEMPrimary,
  mockPresidential,
  mockHouseControl,
  mockSenateControl,
} from '@/lib/api/mock-data';
import type { MarketCategory } from '@/lib/types';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category') as MarketCategory | null;
  const status = searchParams.get('status');
  const limitStr = searchParams.get('limit');
  const limit = limitStr ? parseInt(limitStr, 10) : undefined;

  let markets = [...mockMarkets];

  // Filter by category
  if (category) {
    markets = markets.filter((m) => m.category === category);
  }

  // Filter by status
  if (status === 'open') {
    markets = markets.filter((m) => m.status === 'open');
  }

  // Apply limit
  if (limit && limit > 0) {
    markets = markets.slice(0, limit);
  }

  return NextResponse.json(markets);
}
