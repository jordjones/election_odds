import { NextResponse } from 'next/server';
import { mockStats } from '@/lib/api/mock-data';

export async function GET() {
  return NextResponse.json(mockStats);
}
