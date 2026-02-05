import { NextResponse } from 'next/server';
import { getChartData, getContracts, getDataRange, isDatabaseAvailable, type DataGranularity } from '@/lib/db';
import { mockMarkets, generateMockChartData } from '@/lib/api/mock-data';
import type { TimeFilter } from '@/lib/types';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const period = (searchParams.get('period') as TimeFilter) || '1w';

  // Find market for metadata
  const market = mockMarkets.find((m) => m.id === id || m.slug === id);

  if (!market) {
    return NextResponse.json(
      { error: 'Market not found' },
      { status: 404 }
    );
  }

  // Try to use real database data
  if (isDatabaseAvailable()) {
    try {
      // Get the actual date range of available data
      const dataRange = getDataRange(id);

      // Use the latest data date as reference (not current date)
      // This handles cases where data isn't updated in real-time
      const latestDataDate = dataRange?.latest
        ? new Date(dataRange.latest.split('T')[0])
        : new Date();

      // For fine-grained periods, we don't filter by date upfront
      // Instead we fetch all data and slice the last N points after bucketing
      // This ensures interpolation works even when recent data is sparse
      const startDate: string | undefined = undefined;

      // Determine granularity and target data points based on period
      let granularity: DataGranularity;
      let targetDataPoints: number;

      switch (period) {
        case '4h':
          granularity = '5min';  // 48 points for 4 hours
          targetDataPoints = 48;
          break;
        case '1d':
          granularity = '15min'; // 96 points for 24 hours
          targetDataPoints = 96;
          break;
        case '1w':
          granularity = '1hour'; // 168 points for 7 days
          targetDataPoints = 168;
          break;
        case '30d':
          granularity = '6hour'; // 120 points for 30 days
          targetDataPoints = 120;
          break;
        case 'all':
        default:
          granularity = '1day';
          targetDataPoints = 0; // All data
          break;
      }

      // Get chart data with appropriate granularity and date filtering
      const allChartData = getChartData(id, startDate, undefined, undefined, granularity);
      const contracts = getContracts(id);

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
              .map(([name, value]) => [name, value / 100]) // Convert back to decimal for frontend
          ),
        }));

        return NextResponse.json({
          marketId: id,
          marketName: market.name,
          series: filteredSeries,
          contracts: topContracts,
        });
      }
    } catch (error) {
      console.error('Database query failed, falling back to mock data:', error);
    }
  }

  // Fallback to mock data
  const chartData = generateMockChartData(market);

  // Filter data based on period
  let filteredSeries = chartData.series;

  switch (period) {
    case '4h':
      filteredSeries = chartData.series.slice(-4);
      break;
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
