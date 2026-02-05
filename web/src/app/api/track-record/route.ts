import { NextResponse } from 'next/server';
import { mockTrackRecord } from '@/lib/api/mock-data';

export async function GET() {
  return NextResponse.json(mockTrackRecord);
}
