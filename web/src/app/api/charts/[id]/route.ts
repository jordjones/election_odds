import { NextResponse } from 'next/server';
import { mockMarkets, generateMockChartData } from '@/lib/api/mock-data';
import type { TimeFilter } from '@/lib/types';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const period = (searchParams.get('period') as TimeFilter) || '1w';

  // Find market
  const market = mockMarkets.find((m) => m.id === id || m.slug === id);

  if (!market) {
    return NextResponse.json(
      { error: 'Market not found' },
      { status: 404 }
    );
  }

  // Generate chart data based on period
  const chartData = generateMockChartData(market);

  // Filter data based on period
  let filteredSeries = chartData.series;
  const now = new Date();

  switch (period) {
    case '4h':
      // Last 4 hours - use last 4 data points
      filteredSeries = chartData.series.slice(-4);
      break;
    case '1d':
      // Last day - use last 8 data points
      filteredSeries = chartData.series.slice(-8);
      break;
    case '1w':
      // Last week - use last 7 data points
      filteredSeries = chartData.series.slice(-7);
      break;
    case 'all':
    default:
      // All data
      break;
  }

  return NextResponse.json({
    ...chartData,
    series: filteredSeries,
  });
}
