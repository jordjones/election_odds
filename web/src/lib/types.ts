/**
 * Core types for the Election Odds Aggregator
 */

export type MarketSource = 'PredictIt' | 'Kalshi' | 'Polymarket' | 'Smarkets' | 'Betfair';

export type MarketRegion = 'US' | 'UK' | 'International';

export type MarketStatus = 'open' | 'closed' | 'resolved' | 'suspended' | 'unknown';

export interface MarketPrice {
  source: MarketSource;
  region: MarketRegion;
  yesPrice: number; // 0-1 probability
  noPrice: number;
  yesBid: number | null;
  yesAsk: number | null;
  volume: number | null;
  lastUpdated: string;
}

export interface Contract {
  id: string;
  name: string;
  shortName?: string;
  imageUrl?: string;
  prices: MarketPrice[];
  aggregatedPrice: number; // Weighted average
  priceChange: number; // Change from previous period
  totalVolume: number;
}

export interface Market {
  id: string;
  slug: string;
  name: string;
  description?: string;
  category: MarketCategory;
  status: MarketStatus;
  contracts: Contract[];
  totalVolume: number;
  endDate?: string;
  lastUpdated: string;
}

export type MarketCategory =
  | 'presidential'
  | 'primary-dem'
  | 'primary-gop'
  | 'senate'
  | 'house'
  | 'governor'
  | 'scotus'
  | 'policy'
  | 'other';

export interface TimeSeriesPoint {
  timestamp: string;
  values: Record<string, number>; // contractName -> price
}

export interface ChartData {
  marketId: string;
  marketName: string;
  series: TimeSeriesPoint[];
  contracts: string[]; // List of contract names in series
}

export interface TrackRecordEntry {
  id: string;
  year: number;
  type: 'General' | 'Primary' | 'Referendum';
  state?: string;
  candidate: string;
  predictedProbability: number;
  actualOutcome: boolean;
  brierScore: number;
}

export interface AggregatedStats {
  totalMarkets: number;
  totalContracts: number;
  totalVolume: number;
  lastUpdated: string;
  sourceBreakdown: Record<MarketSource, number>;
}

// API Response types
export interface ApiResponse<T> {
  data: T;
  meta: {
    timestamp: string;
    sources: MarketSource[];
  };
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

// Time filter options
export type TimeFilter = '4h' | '1d' | '1w' | 'all';

export interface TimeFilterOption {
  value: TimeFilter;
  label: string;
}

export const TIME_FILTER_OPTIONS: TimeFilterOption[] = [
  { value: '4h', label: 'Last 4 hours' },
  { value: '1d', label: 'Last day' },
  { value: '1w', label: 'Last week' },
  { value: 'all', label: 'All time' },
];

// Navigation types
export interface NavItem {
  label: string;
  href: string;
  children?: NavItem[];
}

export const MAIN_NAV: NavItem[] = [
  { label: 'Home', href: '/' },
  { label: 'Charts', href: '/charts' },
  { label: 'Track Record', href: '/track-record' },
  {
    label: '2026 Midterms',
    href: '#',
    children: [
      { label: 'House Control', href: '/races/house-2026' },
      { label: 'Senate Control', href: '/races/senate-2026' },
    ],
  },
  {
    label: '2028 Election',
    href: '#',
    children: [
      { label: 'DEM Primary', href: '/primaries/dem' },
      { label: 'GOP Primary', href: '/primaries/gop' },
      { label: 'By Party', href: '/presidential/party' },
      { label: 'By Candidate', href: '/presidential/candidates' },
    ],
  },
  { label: 'About', href: '/about' },
];

// Market source metadata
export const MARKET_SOURCES: Record<MarketSource, { name: string; region: MarketRegion; flag: string; url: string }> = {
  PredictIt: { name: 'PredictIt', region: 'US', flag: '🇺🇸', url: 'https://predictit.org' },
  Kalshi: { name: 'Kalshi', region: 'US', flag: '🇺🇸', url: 'https://kalshi.com' },
  Polymarket: { name: 'Polymarket', region: 'International', flag: '🌎', url: 'https://polymarket.com' },
  Smarkets: { name: 'Smarkets', region: 'UK', flag: '🇬🇧', url: 'https://smarkets.com' },
  Betfair: { name: 'Betfair', region: 'UK', flag: '🇬🇧', url: 'https://betfair.com' },
};
