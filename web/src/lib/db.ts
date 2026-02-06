/**
 * Database utilities for querying the SQLite election odds database
 */

import Database from 'better-sqlite3';
import path from 'path';

// Path to the SQLite database
// Use absolute path to avoid issues with Next.js cwd
const DB_PATH = process.env.DB_PATH || path.join(process.cwd(), '..', 'data', 'election_odds.db');

let db: Database.Database | null = null;

function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH, { readonly: true });
  }
  return db;
}

export interface PriceSnapshot {
  source: string;
  market_id: string;
  contract_id: string;
  snapshot_time: string;
  yes_price: number | null;
  contract_name?: string;
}

export interface ChartDataPoint {
  timestamp: string;
  values: Record<string, number>;
}

export type DataGranularity = '5min' | '15min' | '1hour' | '6hour' | '1day';

/**
 * Get price history for a market, suitable for charting
 */
export function getChartData(
  marketId: string,
  startDate?: string,
  endDate?: string,
  source?: string,
  granularity: DataGranularity = '1day'
): ChartDataPoint[] {
  const db = getDb();

  // Default to electionbettingodds source for historical data
  const selectedSource = source || 'electionbettingodds';

  // Map frontend market IDs to database market IDs
  const dbMarketId = mapMarketId(marketId);

  let query = `
    SELECT
      ps.snapshot_time,
      ps.contract_id,
      c.contract_name,
      ps.yes_price
    FROM price_snapshots ps
    LEFT JOIN contracts c ON ps.source = c.source
      AND ps.market_id = c.market_id
      AND ps.contract_id = c.contract_id
    WHERE ps.source = ?
      AND ps.market_id = ?
  `;

  const params: (string | undefined)[] = [selectedSource, dbMarketId];

  if (startDate) {
    query += ` AND ps.snapshot_time >= ?`;
    params.push(startDate);
  }

  if (endDate) {
    query += ` AND ps.snapshot_time <= ?`;
    params.push(endDate);
  }

  query += ` ORDER BY ps.snapshot_time ASC`;

  const rows = db.prepare(query).all(...params) as PriceSnapshot[];

  // Group by timestamp bucket based on granularity
  const byTimestamp = new Map<string, { values: Record<string, number[]>, timestamp: string }>();

  for (const row of rows) {
    const bucket = getTimeBucket(row.snapshot_time, granularity);

    if (!byTimestamp.has(bucket)) {
      byTimestamp.set(bucket, { values: {}, timestamp: bucket });
    }

    const entry = byTimestamp.get(bucket)!;
    const name = row.contract_name || row.contract_id;

    if (row.yes_price !== null) {
      if (!entry.values[name]) {
        entry.values[name] = [];
      }
      entry.values[name].push(row.yes_price * 100);
    }
  }

  // Convert to array format, averaging values within each bucket
  const result: ChartDataPoint[] = [];
  for (const [, entry] of byTimestamp) {
    const avgValues: Record<string, number> = {};
    for (const [name, prices] of Object.entries(entry.values)) {
      avgValues[name] = prices.reduce((a, b) => a + b, 0) / prices.length;
    }
    result.push({
      timestamp: entry.timestamp,
      values: avgValues,
    });
  }

  // Interpolate to fill gaps for smoother charts
  if (result.length >= 2 && granularity !== '1day') {
    return interpolateChartData(result, granularity);
  }

  return result;
}

/**
 * Interpolate chart data to fill gaps between data points
 */
function interpolateChartData(
  data: ChartDataPoint[],
  granularity: DataGranularity
): ChartDataPoint[] {
  if (data.length < 2) return data;

  // Get interval in milliseconds
  const intervals: Record<DataGranularity, number> = {
    '5min': 5 * 60 * 1000,
    '15min': 15 * 60 * 1000,
    '1hour': 60 * 60 * 1000,
    '6hour': 6 * 60 * 60 * 1000,
    '1day': 24 * 60 * 60 * 1000,
  };
  const interval = intervals[granularity];

  const result: ChartDataPoint[] = [];
  const allContracts = new Set<string>();

  // Collect all contract names
  for (const point of data) {
    for (const name of Object.keys(point.values)) {
      allContracts.add(name);
    }
  }

  // Interpolate between consecutive points
  for (let i = 0; i < data.length - 1; i++) {
    const current = data[i];
    const next = data[i + 1];

    const currentTime = new Date(current.timestamp).getTime();
    const nextTime = new Date(next.timestamp).getTime();

    // Add current point
    result.push(current);

    // Calculate number of intervals to fill
    const gap = nextTime - currentTime;
    const steps = Math.floor(gap / interval);

    // Only interpolate if gap is larger than one interval but not too large
    if (steps > 1 && steps < 100) {
      for (let step = 1; step < steps; step++) {
        const t = step / steps; // interpolation factor 0-1
        const interpolatedTime = new Date(currentTime + step * interval);

        const interpolatedValues: Record<string, number> = {};
        for (const name of allContracts) {
          const v1 = current.values[name];
          const v2 = next.values[name];
          if (v1 !== undefined && v2 !== undefined) {
            // Linear interpolation
            interpolatedValues[name] = v1 + (v2 - v1) * t;
          } else if (v1 !== undefined) {
            interpolatedValues[name] = v1;
          } else if (v2 !== undefined) {
            interpolatedValues[name] = v2;
          }
        }

        result.push({
          timestamp: interpolatedTime.toISOString(),
          values: interpolatedValues,
        });
      }
    }
  }

  // Add last point
  result.push(data[data.length - 1]);

  return result;
}

/**
 * Get time bucket string for a timestamp based on granularity
 */
function getTimeBucket(timestamp: string, granularity: DataGranularity): string {
  const date = new Date(timestamp);

  switch (granularity) {
    case '5min': {
      const mins = Math.floor(date.getMinutes() / 5) * 5;
      return `${date.toISOString().slice(0, 14)}${mins.toString().padStart(2, '0')}:00Z`;
    }
    case '15min': {
      const mins = Math.floor(date.getMinutes() / 15) * 15;
      return `${date.toISOString().slice(0, 14)}${mins.toString().padStart(2, '0')}:00Z`;
    }
    case '1hour':
      return `${date.toISOString().slice(0, 13)}:00:00Z`;
    case '6hour': {
      const hours = Math.floor(date.getHours() / 6) * 6;
      return `${date.toISOString().slice(0, 11)}${hours.toString().padStart(2, '0')}:00:00Z`;
    }
    case '1day':
    default:
      return `${date.toISOString().slice(0, 10)}T00:00:00Z`;
  }
}

/**
 * Get list of contracts/candidates for a market
 */
export function getContracts(marketId: string, source?: string): string[] {
  const db = getDb();
  const selectedSource = source || 'electionbettingodds';
  const dbMarketId = mapMarketId(marketId);

  const rows = db.prepare(`
    SELECT DISTINCT contract_name
    FROM contracts
    WHERE source = ? AND market_id = ?
    ORDER BY contract_name
  `).all(selectedSource, dbMarketId) as { contract_name: string }[];

  return rows.map(r => r.contract_name);
}

/**
 * Get date range of available data
 */
export function getDataRange(marketId?: string, source?: string): { earliest: string; latest: string } | null {
  const db = getDb();
  const selectedSource = source || 'electionbettingodds';
  const dbMarketId = marketId ? mapMarketId(marketId) : null;

  let query = `
    SELECT
      MIN(snapshot_time) as earliest,
      MAX(snapshot_time) as latest
    FROM price_snapshots
    WHERE source = ?
  `;
  const params: string[] = [selectedSource];

  if (dbMarketId) {
    query += ` AND market_id = ?`;
    params.push(dbMarketId);
  }

  const row = db.prepare(query).get(...params) as { earliest: string; latest: string } | undefined;

  return row?.earliest ? row : null;
}

/**
 * Map frontend market IDs to database market IDs
 */
function mapMarketId(frontendId: string): string {
  const mapping: Record<string, string> = {
    'presidential-2028': 'president_2028',
    'pres-2028': 'president_2028',
    'president-2028': 'president_2028',
    'gop-primary-2028': 'president_2028',  // Same data for now
    'dem-primary-2028': 'president_2028',  // Same data for now
  };

  return mapping[frontendId] || frontendId;
}

/**
 * Check if database is available
 */
export function isDatabaseAvailable(): boolean {
  try {
    getDb();
    return true;
  } catch {
    return false;
  }
}

// ============ Market Data Functions ============

import type { Market, Contract, MarketPrice, MarketCategory } from './types';

interface DbMarket {
  id: number;
  source: string;
  market_id: string;
  market_name: string;
  category: string | null;
  status: string | null;
  url: string | null;
  total_volume: number | null;
  end_date: string | null;
}

interface DbContract {
  id: number;
  source: string;
  market_id: string;
  contract_id: string;
  contract_name: string;
  short_name: string | null;
}

interface DbPriceSnapshotFull {
  source: string;
  yes_price: number | null;
  no_price: number | null;
  volume: number | null;
  snapshot_time: string;
}

// Map market names to categories
function categorizeMarket(name: string): MarketCategory {
  const lowerName = name.toLowerCase();

  if (lowerName.includes('republican') && (lowerName.includes('nomination') || lowerName.includes('nominee') || lowerName.includes('primary'))) {
    return 'primary-gop';
  }
  if (lowerName.includes('democratic') && (lowerName.includes('nomination') || lowerName.includes('nominee') || lowerName.includes('primary'))) {
    return 'primary-dem';
  }
  if (lowerName.includes('president') && lowerName.includes('party')) {
    return 'presidential';
  }
  if (lowerName.includes('president') || lowerName.includes('presidency')) {
    return 'presidential';
  }
  if (lowerName.includes('house')) {
    return 'house';
  }
  if (lowerName.includes('senate')) {
    return 'senate';
  }
  if (lowerName.includes('supreme court') || lowerName.includes('scotus')) {
    return 'scotus';
  }
  return 'other';
}

// Extract candidate name from contract name
function extractCandidateName(contractName: string): string {
  // Handle "Will X win..." format
  const willMatch = contractName.match(/Will (.+?) win/i);
  if (willMatch) {
    return willMatch[1].trim();
  }

  // Handle party names
  if (contractName.toLowerCase().includes('democrat')) return 'Democratic Party';
  if (contractName.toLowerCase().includes('republican')) return 'Republican Party';

  return contractName;
}

// Create slug from market name
function createSlug(name: string, id: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50);
  return `${slug}-${id}`;
}

/**
 * Get all markets with their contracts and latest prices
 */
export function getMarkets(options?: {
  category?: MarketCategory;
  status?: 'open' | 'all';
  limit?: number;
}): Market[] {
  const db = getDb();

  console.log('[getMarkets] Starting with options:', options);

  // Get unique markets from Polymarket/Kalshi (prefer Polymarket)
  const marketsQuery = `
    SELECT DISTINCT
      m.id,
      m.source,
      m.market_id,
      m.market_name,
      m.category,
      m.status,
      m.url,
      m.total_volume,
      m.end_date
    FROM markets m
    WHERE (m.market_name LIKE '%2028%' OR m.market_name LIKE '%2026%')
      AND m.source IN ('Polymarket', 'Kalshi', 'PredictIt', 'Smarkets')
    ORDER BY
      CASE
        WHEN m.source = 'Polymarket' THEN 1
        WHEN m.source = 'Kalshi' THEN 2
        WHEN m.source = 'PredictIt' THEN 3
        ELSE 4
      END,
      m.total_volume DESC NULLS LAST
  `;

  const dbMarkets = db.prepare(marketsQuery).all() as DbMarket[];
  console.log('[getMarkets] Raw markets from DB:', dbMarkets.length);

  // Filter to key election markets
  const keyMarkets = dbMarkets.filter(m => {
    const lowerName = m.market_name.toLowerCase();
    return (
      // Presidential winner
      lowerName.includes('presidential election winner') ||
      lowerName.includes('us presidential election') ||
      lowerName.includes('next u.s. presidential election') ||
      // Nominations/primaries
      lowerName.includes('presidential nomination') ||
      lowerName.includes('presidential nominee') ||
      lowerName.includes('nominee for president') ||
      // Party control
      lowerName.includes('which party will win the 2028') ||
      lowerName.includes('which party wins 2028') ||
      // Congress
      lowerName.includes('house') ||
      lowerName.includes('senate') ||
      // Courts
      lowerName.includes('supreme court')
    );
  });

  console.log('[getMarkets] Filtered key markets:', keyMarkets.length);
  if (keyMarkets.length > 0) {
    console.log('[getMarkets] First 3 key markets:', keyMarkets.slice(0, 3).map(m => m.market_name));
  }

  const markets: Market[] = [];
  const processedNames = new Set<string>();

  let processedCount = 0;
  let skippedDupe = 0;
  let skippedCategory = 0;
  let noContracts = 0;

  for (const dbMarket of keyMarkets) {
    // Skip duplicates (same market from different sources)
    const normalizedName = dbMarket.market_name.toLowerCase().replace(/\?$/, '').trim();
    if (processedNames.has(normalizedName)) {
      skippedDupe++;
      continue;
    }
    processedNames.add(normalizedName);

    const category = categorizeMarket(dbMarket.market_name);

    // Filter by category if specified
    if (options?.category && category !== options.category) {
      skippedCategory++;
      continue;
    }

    processedCount++;

    // Get contracts with latest prices in a single query
    // Note: Join on contract_id (external ID string), not id (internal auto-increment)
    const contractsWithPricesQuery = `
      SELECT
        c.id,
        c.source,
        c.market_id,
        c.contract_id,
        c.contract_name,
        c.short_name,
        ps.yes_price,
        ps.no_price,
        ps.volume,
        ps.snapshot_time
      FROM contracts c
      INNER JOIN (
        SELECT contract_id, market_id, source, yes_price, no_price, volume, snapshot_time,
               ROW_NUMBER() OVER (PARTITION BY source, market_id, contract_id ORDER BY snapshot_time DESC) as rn
        FROM price_snapshots
      ) ps ON ps.contract_id = c.contract_id AND ps.market_id = c.market_id AND ps.source = c.source AND ps.rn = 1
      WHERE c.market_id = ? AND c.source = ?
      AND ps.yes_price IS NOT NULL
    `;

    const contractsWithPrices = db.prepare(contractsWithPricesQuery).all(
      dbMarket.market_id,
      dbMarket.source
    ) as (DbContract & { yes_price: number; no_price: number | null; volume: number | null; snapshot_time: string })[];

    const contracts: Contract[] = [];

    for (const contract of contractsWithPrices) {
      const candidateName = extractCandidateName(contract.contract_name);
      const priceChange = 0; // Skip old price lookup for performance

      const price: MarketPrice = {
        source: contract.source as any,
        region: contract.source === 'Polymarket' ? 'International' :
               contract.source === 'Smarkets' ? 'UK' : 'US',
        yesPrice: contract.yes_price,
        noPrice: contract.no_price || (1 - contract.yes_price),
        yesBid: null,
        yesAsk: null,
        volume: contract.volume || 0,
        lastUpdated: contract.snapshot_time,
      };

      contracts.push({
        id: `${dbMarket.market_id}-${contract.contract_id}`,
        name: candidateName,
        shortName: candidateName.split(' ')[0],
        prices: [price],
        aggregatedPrice: contract.yes_price,
        priceChange,
        totalVolume: contract.volume || 0,
      });
    }

    // Sort contracts by price
    contracts.sort((a, b) => b.aggregatedPrice - a.aggregatedPrice);

    if (contracts.length === 0) {
      noContracts++;
      continue;
    }

    markets.push({
      id: dbMarket.market_id.toString(),
      slug: createSlug(dbMarket.market_name, dbMarket.market_id.toString()),
      name: dbMarket.market_name,
      description: `Market data from ${dbMarket.source}.`,
      category,
      status: 'open',
      contracts,
      totalVolume: contracts.reduce((sum, c) => sum + c.totalVolume, 0),
      endDate: dbMarket.end_date || undefined,
      lastUpdated: new Date().toISOString(),
    });
  }

  console.log('[getMarkets] Processing summary:', {
    processed: processedCount,
    skippedDupe,
    skippedCategory,
    noContracts,
    finalMarkets: markets.length
  });

  // Apply market limit
  if (options?.limit) {
    return markets.slice(0, options.limit);
  }

  return markets;
}

/**
 * Get a specific market by ID or slug
 */
export function getMarket(idOrSlug: string): Market | null {
  const markets = getMarkets();
  return markets.find(m => m.id === idOrSlug || m.slug === idOrSlug || m.slug.includes(idOrSlug)) || null;
}

/**
 * Get featured markets for homepage
 */
export function getFeaturedMarkets(): Market[] {
  const allMarkets = getMarkets();

  // Return a curated selection
  const featured: Market[] = [];

  // Add presidential by candidate
  const presidential = allMarkets.find(m =>
    m.category === 'presidential' &&
    !m.name.toLowerCase().includes('party')
  );
  if (presidential) featured.push(presidential);

  // Add GOP primary
  const gopPrimary = allMarkets.find(m => m.category === 'primary-gop');
  if (gopPrimary) featured.push(gopPrimary);

  // Add Dem primary
  const demPrimary = allMarkets.find(m => m.category === 'primary-dem');
  if (demPrimary) featured.push(demPrimary);

  // Add House control
  const house = allMarkets.find(m => m.category === 'house');
  if (house) featured.push(house);

  return featured.slice(0, 4);
}

/**
 * Get aggregated statistics
 */
export function getStats() {
  const db = getDb();

  const marketCount = db.prepare('SELECT COUNT(DISTINCT market_id) as count FROM markets').get() as { count: number };
  const contractCount = db.prepare('SELECT COUNT(*) as count FROM contracts').get() as { count: number };

  // Get total volume
  const volumeQuery = `
    SELECT SUM(volume) as total
    FROM (
      SELECT ps.volume
      FROM price_snapshots ps
      INNER JOIN (
        SELECT contract_id, MAX(snapshot_time) as max_time
        FROM price_snapshots
        GROUP BY contract_id
      ) latest ON ps.contract_id = latest.contract_id AND ps.snapshot_time = latest.max_time
    )
  `;
  const volume = db.prepare(volumeQuery).get() as { total: number | null };

  return {
    totalMarkets: marketCount.count,
    totalContracts: contractCount.count,
    totalVolume: volume.total || 0,
    lastUpdated: new Date().toISOString(),
    sourceBreakdown: {
      PredictIt: 0,
      Kalshi: 0,
      Polymarket: 0,
      Smarkets: 0,
      Betfair: 0,
    },
  };
}
