import { NextResponse } from 'next/server';
import { mockMarkets, generateMockChartData } from '@/lib/api/mock-data';
import type { TimeFilter } from '@/lib/types';
import { usePostgres } from '@/lib/use-postgres';

// Candidate party affiliations for filtering primary charts
const DEMOCRAT_CANDIDATES = new Set([
  'Newsom', 'Cortez', 'Shapiro', 'Buttigieg', 'Whitmer', 'Harris', 'Pritzker',
  'Beshear', 'Moore', 'Ossoff', 'Kelly', 'Booker', 'Klobuchar', 'Sanders',
  'Warren', 'M_Obama', 'Obama', 'H_Clinton', 'Fetterman', 'Warnock', 'Murphy',
  'Khanna', 'Gallego', 'P_Murphy', 'Polis', 'Cooper', 'Cuomo', 'Yang',
  'Slotkin', 'Crockett', 'Mamdani', 'Talarico', 'Emanuel', 'Raimondo',
  'Jeffries', 'Abrams', 'Walz', 'C_Clinton',
]);

const REPUBLICAN_CANDIDATES = new Set([
  'Vance', 'Rubio', 'DeSantis', 'Haley', 'Ramaswamy', 'Trump', 'Trump_Jr',
  'I_Trump', 'Youngkin', 'Gabbard', 'Carlson', 'Cruz', 'Hawley', 'S_Sanders',
  'Kemp', 'Noem', 'Pence', 'R_Paul', 'Cotton', 'Kennedy', 'Musk', 'Abbott',
  'Gaetz', 'M_Greene', 'Donalds', 'Stefanik', 'Thune', 'Britt', 'Massie',
  'Bannon', 'T_Scott', 'R_Scott', 'Hagerty', 'Ernst', 'Crenshaw', 'Cheney',
  'E_Trump', 'L_Trump', 'Hegseth', 'Patel', 'Burgum', 'Carson', 'McMahon',
]);

// Map frontend market IDs to chart data market IDs
// Now uses Polymarket data which has separate markets for presidential, GOP, and DEM
function getChartMarketId(marketId: string): string | null {
  // Presidential candidate markets
  if (marketId === 'presidential-winner-2028' ||
      marketId.includes('presidential-election-winner')) {
    return 'presidential-winner-2028';
  }
  // GOP primary market
  if (marketId === 'gop-nominee-2028' || marketId.includes('gop-primary')) {
    return 'gop-nominee-2028';
  }
  // DEM primary market
  if (marketId === 'dem-nominee-2028' || marketId.includes('dem-primary')) {
    return 'dem-nominee-2028';
  }
  // Party markets
  if (marketId === 'presidential-party-2028' || marketId.includes('party-2028')) {
    return 'presidential-party-2028';
  }
  // House/Senate markets don't have Polymarket historical data yet
  if (marketId.includes('house') || marketId.includes('senate')) {
    return null;
  }
  return marketId; // pass through for other markets
}

// Get party filter for a market
function getPartyFilter(marketId: string): 'dem' | 'gop' | null {
  if (marketId === 'dem-nominee-2028' || marketId.includes('dem-primary') || marketId.includes('democratic')) {
    return 'dem';
  }
  if (marketId === 'gop-nominee-2028' || marketId.includes('gop-primary') || marketId.includes('republican')) {
    return 'gop';
  }
  return null;
}

// Filter candidates by party
function filterByParty(candidates: string[], party: 'dem' | 'gop' | null): string[] {
  if (!party) return candidates;
  const partySet = party === 'dem' ? DEMOCRAT_CANDIDATES : REPUBLICAN_CANDIDATES;
  return candidates.filter(c => partySet.has(c));
}

// Dynamic imports to avoid loading better-sqlite3 on Netlify
async function getDbMarket(id: string) {
  if (usePostgres()) {
    const { getMarketAsync } = await import('@/lib/db-pg');
    return getMarketAsync(id);
  } else {
    const { getMarket, isDatabaseAvailable } = await import('@/lib/db');
    if (!isDatabaseAvailable()) return null;
    return getMarket(id);
  }
}

async function getDbChartData(chartMarketId: string, granularity: string, startDate?: string, endDate?: string) {
  if (usePostgres()) {
    const { getChartDataAsync } = await import('@/lib/db-pg');
    return getChartDataAsync(chartMarketId, startDate, endDate);
  } else {
    const { getChartData } = await import('@/lib/db');
    return getChartData(chartMarketId, startDate, endDate, undefined, granularity as any);
  }
}

function isDbAvailable(): boolean {
  if (process.env.DATABASE_URL) return true;
  // For SQLite, we can't check without importing - assume true and catch errors
  return true;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const period = (searchParams.get('period') as TimeFilter) || 'all';

  try {
    const dbMarket = await getDbMarket(id);

    if (dbMarket) {
      // Determine granularity and target data points based on period
      let granularity: string;
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

      // Compute start date based on period
      let startDate: string | undefined;
      if (period !== 'all') {
        const now = new Date();
        switch (period) {
          case '1d':
            now.setDate(now.getDate() - 1);
            break;
          case '1w':
            now.setDate(now.getDate() - 7);
            break;
          case '30d':
            now.setDate(now.getDate() - 30);
            break;
        }
        startDate = now.toISOString();
      }

      const allChartData = await getDbChartData(chartMarketId, granularity, startDate);

      if (allChartData.length > 0) {
        // Get party filter for primary markets
        const partyFilter = getPartyFilter(id);

        // Get top 10 contracts by latest value for display (filtered by party if applicable)
        const latestValues = allChartData[allChartData.length - 1]?.values || {};
        const allCandidates = Object.keys(latestValues);
        const partyCandidates = filterByParty(allCandidates, partyFilter);

        const topContracts = Object.entries(latestValues)
          .filter(([name]) => partyCandidates.includes(name))
          .sort(([, a], [, b]) => b - a)
          .slice(0, 10)
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
    }
  } catch (error) {
    console.error('Database chart query failed:', error);
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
