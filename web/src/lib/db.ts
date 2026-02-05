/**
 * Database utilities for querying the SQLite election odds database
 */

import Database from 'better-sqlite3';
import path from 'path';

// Path to the SQLite database
const DB_PATH = path.join(process.cwd(), '..', 'data', 'election_odds.db');

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
