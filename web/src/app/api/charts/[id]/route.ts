import { NextResponse } from 'next/server';
import { getChartData, isDatabaseAvailable, getMarket, type DataGranularity } from '@/lib/db';
import { mockMarkets, generateMockChartData } from '@/lib/api/mock-data';
import type { TimeFilter } from '@/lib/types';

// Map market IDs to chart data IDs in the database
// Note: electionbettingodds only has presidential candidate data
function getChartMarketId(marketId: string): string | null {
  // Presidential candidate markets -> president_2028
  if (marketId === 'presidential-winner-2028' ||
      marketId.includes('presidential-election-winner')) {
    return 'presidential-2028';
  }
  // Primary markets use the same presidential data for now
  if (marketId === 'gop-nominee-2028' || marketId === 'dem-nominee-2028') {
    return 'presidential-2028';
  }
  // Party/House/Senate markets don't have historical data
  if (marketId.includes('party') ||
      marketId.includes('house') ||
      marketId.includes('senate')) {
    return null;
  }
  return 'presidential-2028'; // fallback
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const period = (searchParams.get('period') as TimeFilter) || 'all';

  // Try to use real database data first
  if (isDatabaseAvailable()) {
    const dbMarket = getMarket(id);

    if (dbMarket) {
      try {
        // Determine granularity and target data points based on period
        let granularity: DataGranularity;
        let targetDataPoints: number;

        switch (period) {
          case '1d':
            granularity = '15min';
            targetDataPoints = 96;
            break;
          case '1w':
            granularity = '1hour';
            targetDataPoints = 168;
            break;
          case '30d':
            granularity = '6hour';
            targetDataPoints = 120;
            break;
          case 'all':
          default:
            granularity = '1day';
            targetDataPoints = 0;
            break;
        }

        // Get chart data using the mapped market ID for electionbettingodds data
        const chartMarketId = getChartMarketId(id);

        // If no historical data available for this market type, return empty
        if (!chartMarketId) {
          return NextResponse.json({
            marketId: id,
            marketName: dbMarket.name,
            series: [],
            contracts: [],
            message: 'No historical chart data available for this market type',
          });
        }

        const allChartData = getChartData(chartMarketId, undefined, undefined, undefined, granularity);

        if (allChartData.length > 0) {
          // Get top 6 contracts by latest value for display
          const latestValues = allChartData[allChartData.length - 1]?.values || {};
          const topContracts = Object.entries(latestValues)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 6)
            .map(([name]) => name);

          // Filter to target number of data points
          let filteredData = allChartData;
          if (targetDataPoints > 0 && allChartData.length > targetDataPoints) {
            filteredData = allChartData.slice(-targetDataPoints);
          }

          // Filter series to only include top contracts
          const filteredSeries = filteredData.map(point => ({
            timestamp: point.timestamp,
            values: Object.fromEntries(
              Object.entries(point.values)
                .filter(([name]) => topContracts.includes(name))
                .map(([name, value]) => [name, value / 100])
            ),
          }));

          return NextResponse.json({
            marketId: id,
            marketName: dbMarket.name,
            series: filteredSeries,
            contracts: topContracts,
          });
        }
      } catch (error) {
        console.error('Database chart query failed:', error);
      }
    }
  }

  // Fallback to mock data
  const mockMarket = mockMarkets.find((m) => m.id === id || m.slug === id);

  if (!mockMarket) {
    return NextResponse.json(
      { error: 'Market not found' },
      { status: 404 }
    );
  }

  const chartData = generateMockChartData(mockMarket);

  // Filter data based on period
  let filteredSeries = chartData.series;

  switch (period) {
    case '1d':
      filteredSeries = chartData.series.slice(-8);
      break;
    case '1w':
      filteredSeries = chartData.series.slice(-7);
      break;
    case 'all':
    default:
      break;
  }

  return NextResponse.json({
    ...chartData,
    series: filteredSeries,
  });
}
