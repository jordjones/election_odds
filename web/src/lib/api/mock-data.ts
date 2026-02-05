/**
 * Mock data for development and testing
 * Based on actual data from prediction market APIs
 */

import type { Market, Contract, MarketPrice, ChartData, TrackRecordEntry, AggregatedStats } from '../types';

// Helper to create mock prices
function createMockPrices(basePrice: number): MarketPrice[] {
  const spread = 0.01 + Math.random() * 0.02;
  return [
    {
      source: 'PredictIt',
      region: 'US',
      yesPrice: basePrice,
      noPrice: 1 - basePrice,
      yesBid: basePrice - spread / 2,
      yesAsk: basePrice + spread / 2,
      volume: Math.floor(Math.random() * 500000) + 50000,
      lastUpdated: new Date().toISOString(),
    },
    {
      source: 'Kalshi',
      region: 'US',
      yesPrice: basePrice + (Math.random() - 0.5) * 0.04,
      noPrice: 1 - basePrice - (Math.random() - 0.5) * 0.04,
      yesBid: basePrice - spread,
      yesAsk: basePrice + spread,
      volume: Math.floor(Math.random() * 2000000) + 100000,
      lastUpdated: new Date().toISOString(),
    },
    {
      source: 'Polymarket',
      region: 'International',
      yesPrice: basePrice + (Math.random() - 0.5) * 0.03,
      noPrice: 1 - basePrice - (Math.random() - 0.5) * 0.03,
      yesBid: basePrice - spread * 0.5,
      yesAsk: basePrice + spread * 0.5,
      volume: Math.floor(Math.random() * 5000000) + 500000,
      lastUpdated: new Date().toISOString(),
    },
    {
      source: 'Smarkets',
      region: 'UK',
      yesPrice: basePrice + (Math.random() - 0.5) * 0.05,
      noPrice: 1 - basePrice - (Math.random() - 0.5) * 0.05,
      yesBid: basePrice - spread * 1.5,
      yesAsk: basePrice + spread * 1.5,
      volume: Math.floor(Math.random() * 200000) + 10000,
      lastUpdated: new Date().toISOString(),
    },
  ];
}

// Create contract helper
function createContract(id: string, name: string, basePrice: number, change: number = 0): Contract {
  const prices = createMockPrices(basePrice);
  return {
    id,
    name,
    shortName: name.split(' ')[0],
    prices,
    aggregatedPrice: basePrice,
    priceChange: change,
    totalVolume: prices.reduce((sum, p) => sum + (p.volume || 0), 0),
  };
}

// 2028 Republican Primary
export const mockGOPPrimary: Market = {
  id: 'gop-primary-2028',
  slug: 'gop-primary-2028',
  name: 'Who will win the 2028 Republican presidential nomination?',
  description: 'This market will resolve to the candidate who wins the Republican nomination.',
  category: 'primary-gop',
  status: 'open',
  contracts: [
    createContract('gop-vance', 'JD Vance', 0.49, 0.02),
    createContract('gop-rubio', 'Marco Rubio', 0.16, -0.01),
    createContract('gop-desantis', 'Ron DeSantis', 0.08, 0.01),
    createContract('gop-kemp', 'Brian Kemp', 0.05, 0.005),
    createContract('gop-trump', 'Donald Trump', 0.04, -0.02),
    createContract('gop-cruz', 'Ted Cruz', 0.03, 0),
    createContract('gop-haley', 'Nikki Haley', 0.03, -0.01),
    createContract('gop-youngkin', 'Glenn Youngkin', 0.02, 0.005),
  ],
  totalVolume: 12500000,
  endDate: '2028-08-01',
  lastUpdated: new Date().toISOString(),
};

// 2028 Democratic Primary
export const mockDEMPrimary: Market = {
  id: 'dem-primary-2028',
  slug: 'dem-primary-2028',
  name: 'Who will win the 2028 Democratic presidential nomination?',
  description: 'This market will resolve to the candidate who wins the Democratic nomination.',
  category: 'primary-dem',
  status: 'open',
  contracts: [
    createContract('dem-newsom', 'Gavin Newsom', 0.33, 0.01),
    createContract('dem-aoc', 'Alexandria Ocasio-Cortez', 0.12, 0.03),
    createContract('dem-shapiro', 'Josh Shapiro', 0.10, 0.02),
    createContract('dem-harris', 'Kamala Harris', 0.08, -0.01),
    createContract('dem-beshear', 'Andy Beshear', 0.07, 0.01),
    createContract('dem-pritzker', 'JB Pritzker', 0.06, 0),
    createContract('dem-buttigieg', 'Pete Buttigieg', 0.05, -0.005),
    createContract('dem-whitmer', 'Gretchen Whitmer', 0.04, -0.01),
  ],
  totalVolume: 8500000,
  endDate: '2028-08-01',
  lastUpdated: new Date().toISOString(),
};

// 2028 Presidential Election
export const mockPresidential: Market = {
  id: 'presidential-2028',
  slug: 'presidential-2028',
  name: 'Who will win the 2028 US Presidential Election?',
  description: 'This market will resolve to the winner of the 2028 Presidential Election.',
  category: 'presidential',
  status: 'open',
  contracts: [
    createContract('pres-vance', 'JD Vance', 0.245, -0.01),
    createContract('pres-newsom', 'Gavin Newsom', 0.18, 0.02),
    createContract('pres-rubio', 'Marco Rubio', 0.08, 0.005),
    createContract('pres-aoc', 'Alexandria Ocasio-Cortez', 0.06, 0.01),
    createContract('pres-desantis', 'Ron DeSantis', 0.05, 0),
    createContract('pres-shapiro', 'Josh Shapiro', 0.05, 0.01),
  ],
  totalVolume: 248220477,
  endDate: '2028-11-05',
  lastUpdated: new Date().toISOString(),
};

// 2028 By Party
export const mockPartyControl: Market = {
  id: 'party-2028',
  slug: 'party-2028',
  name: 'Which party will win the 2028 Presidential Election?',
  description: 'Bets on which party will control the Presidency after the Nov 5, 2028 election.',
  category: 'presidential',
  status: 'open',
  contracts: [
    createContract('party-dem', 'Democratic Party', 0.548, 0.005),
    createContract('party-gop', 'Republican Party', 0.442, -0.005),
    createContract('party-other', 'Other', 0.01, 0),
  ],
  totalVolume: 380866,
  endDate: '2028-11-05',
  lastUpdated: new Date().toISOString(),
};

// 2026 House Control
export const mockHouseControl: Market = {
  id: 'house-2026',
  slug: 'house-2026',
  name: 'Which party will control the House after the 2026 midterms?',
  description: 'This market resolves based on which party holds the majority after the 2026 elections.',
  category: 'house',
  status: 'open',
  contracts: [
    createContract('house-dem', 'Democratic Party', 0.58, 0.02),
    createContract('house-gop', 'Republican Party', 0.42, -0.02),
  ],
  totalVolume: 5200000,
  endDate: '2026-11-03',
  lastUpdated: new Date().toISOString(),
};

// 2026 Senate Control
export const mockSenateControl: Market = {
  id: 'senate-2026',
  slug: 'senate-2026',
  name: 'Which party will control the Senate after the 2026 midterms?',
  description: 'This market resolves based on which party holds the majority after the 2026 elections.',
  category: 'senate',
  status: 'open',
  contracts: [
    createContract('senate-gop', 'Republican Party', 0.64, 0.01),
    createContract('senate-dem', 'Democratic Party', 0.36, -0.01),
  ],
  totalVolume: 3800000,
  endDate: '2026-11-03',
  lastUpdated: new Date().toISOString(),
};

// Supreme Court
export const mockSCOTUS: Market = {
  id: 'scotus-tariffs',
  slug: 'scotus-tariffs',
  name: 'Will the Supreme Court allow Trump tariffs?',
  description: 'Will the Supreme Court rule in favor of Trump\'s tariffs?',
  category: 'scotus',
  status: 'open',
  contracts: [
    createContract('scotus-yes', 'Yes', 0.68, 0.02),
    createContract('scotus-no', 'No', 0.32, -0.02),
  ],
  totalVolume: 13260426,
  endDate: '2026-06-30',
  lastUpdated: new Date().toISOString(),
};

// All markets
export const mockMarkets: Market[] = [
  mockSCOTUS,
  mockPartyControl,
  mockPresidential,
  mockGOPPrimary,
  mockDEMPrimary,
  mockHouseControl,
  mockSenateControl,
];

// Mock chart data
export function generateMockChartData(market: Market): ChartData {
  const now = new Date();
  const series: ChartData['series'] = [];
  const contracts = market.contracts.slice(0, 5).map(c => c.name);

  // Generate 30 days of data
  for (let i = 30; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);

    const values: Record<string, number> = {};
    contracts.forEach((name, idx) => {
      const contract = market.contracts[idx];
      const basePrice = contract.aggregatedPrice;
      // Add some variance
      const variance = (Math.random() - 0.5) * 0.1;
      values[name] = Math.max(0, Math.min(1, basePrice + variance * (i / 30)));
    });

    series.push({
      timestamp: date.toISOString(),
      values,
    });
  }

  return {
    marketId: market.id,
    marketName: market.name,
    series,
    contracts,
  };
}

// Mock track record
export const mockTrackRecord: TrackRecordEntry[] = [
  { id: '1', year: 2024, type: 'General', state: 'USA', candidate: 'Trump', predictedProbability: 0.52, actualOutcome: true, brierScore: 0.23 },
  { id: '2', year: 2024, type: 'General', state: 'PA', candidate: 'Trump', predictedProbability: 0.48, actualOutcome: true, brierScore: 0.27 },
  { id: '3', year: 2024, type: 'General', state: 'GA', candidate: 'Trump', predictedProbability: 0.55, actualOutcome: true, brierScore: 0.20 },
  { id: '4', year: 2024, type: 'General', state: 'MI', candidate: 'Harris', predictedProbability: 0.52, actualOutcome: false, brierScore: 0.27 },
  { id: '5', year: 2022, type: 'General', state: 'PA', candidate: 'Fetterman', predictedProbability: 0.72, actualOutcome: true, brierScore: 0.08 },
  { id: '6', year: 2022, type: 'General', state: 'GA', candidate: 'Warnock', predictedProbability: 0.65, actualOutcome: true, brierScore: 0.12 },
  { id: '7', year: 2020, type: 'General', state: 'USA', candidate: 'Biden', predictedProbability: 0.60, actualOutcome: true, brierScore: 0.16 },
  { id: '8', year: 2016, type: 'General', state: 'USA', candidate: 'Clinton', predictedProbability: 0.71, actualOutcome: false, brierScore: 0.50 },
  { id: '9', year: 2016, type: 'Referendum', state: 'UK', candidate: 'Remain', predictedProbability: 0.75, actualOutcome: false, brierScore: 0.56 },
];

// Mock stats
export const mockStats: AggregatedStats = {
  totalMarkets: 718,
  totalContracts: 6900,
  totalVolume: 285000000,
  lastUpdated: new Date().toISOString(),
  sourceBreakdown: {
    PredictIt: 234,
    Kalshi: 128,
    Polymarket: 346,
    Smarkets: 10,
    Betfair: 0,
  },
};
