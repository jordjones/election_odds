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

// Map Kalshi contract IDs to candidate names (for KXPRESPERSON market)
const KALSHI_PERSON_MAP: Record<string, string> = {
  'JVAN': 'JD Vance',
  'GNEWS': 'Gavin Newsom',
  'MRUB': 'Marco Rubio',
  'AOCA': 'Alexandria Ocasio-Cortez',
  'DTRU': 'Donald Trump',
  'DTRUJR': 'Donald Trump Jr.',
  'RDES': 'Ron DeSantis',
  'KHAR': 'Kamala Harris',
  'JSHA': 'Josh Shapiro',
  'PBUT': 'Pete Buttigieg',
  'GWHI': 'Gretchen Whitmer',
  'GYOU': 'Glenn Youngkin',
  'TGAB': 'Tulsi Gabbard',
  'GABB': 'Tulsi Gabbard',
  'NHAL': 'Nikki Haley',
  'ABES': 'Andy Beshear',
  'JPRI': 'JB Pritzker',
  'JOSS': 'Jon Ossoff',
  'SSMI': 'Sarah Sanders',
  'JDIM': 'Jamie Dimon',
  'TWAL': 'Tim Walz',
  'VRAM': 'Vivek Ramaswamy',
  'WMOO': 'Wes Moore',
};

// Extract candidate name from contract name or ID
// Returns null if the contract should be skipped (unmapped Kalshi contracts)
function extractCandidateName(contractName: string, contractId?: string): string | null {
  // Handle Kalshi KXPRESPERSON contracts - extract from contract ID
  if (contractId && contractId.startsWith('KXPRESPERSON-28-')) {
    const suffix = contractId.replace('KXPRESPERSON-28-', '');
    if (KALSHI_PERSON_MAP[suffix]) {
      return KALSHI_PERSON_MAP[suffix];
    }
    // Unmapped KXPRESPERSON contract - skip it
    return null;
  }

  // Handle "Will X win..." or "Will X be the nominee..." format (Kalshi)
  const willMatch = contractName.match(/Will (.+?) (win|be the)/i);
  if (willMatch) {
    return willMatch[1].trim();
  }

  // Handle party names
  if (contractName.toLowerCase().includes('democrat')) return 'Democratic Party';
  if (contractName.toLowerCase().includes('republican')) return 'Republican Party';

  // Skip generic question-style contract names
  if (contractName.toLowerCase().startsWith('who will win')) {
    return null;
  }

  return contractName;
}

// Normalize candidate name for matching across sources
function normalizeCandidateName(name: string): string {
  let normalized = name
    .toLowerCase()
    .replace(/\./g, '') // Remove periods (J.D. -> JD)
    .replace(/[\u0027\u0060\u00B4\u2018\u2019\u201B\u2032\u02B9\u02BC]/g, "'") // Normalize all apostrophe variants
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();

  // Handle common name variations
  const nameAliases: Record<string, string> = {
    // AOC variations
    'a ocasio-cortez': 'alexandria ocasio-cortez',
    'aoc': 'alexandria ocasio-cortez',
    'ocasio-cortez': 'alexandria ocasio-cortez',
    // Trump variations
    'donald j trump': 'donald trump',
    'donald j trump jr': 'donald trump jr',
    // Marjorie Taylor Greene variations
    'm taylor greene': 'marjorie taylor greene',
    'mtg': 'marjorie taylor greene',
    // Pete Buttigieg
    'mayor pete': 'pete buttigieg',
    // Josh Hawley
    'j hawley': 'josh hawley',
    // Glenn Youngkin
    'g youngkin': 'glenn youngkin',
    // Beto O'Rourke (handle various apostrophe types)
    "beto o'rourke": "beto o'rourke",
    'beto orourke': "beto o'rourke",
    // Stephen A. Smith
    'stephen smith': 'stephen a smith',
  };

  return nameAliases[normalized] || normalized;
}

// Get image URL for a candidate or party
// Uses Wikipedia Commons and official sources for publicly available images
function getCandidateImageUrl(name: string): string | undefined {
  const normalizedName = normalizeCandidateName(name);

  // Candidate headshots - using Wikipedia Commons images (public domain / CC licensed)
  const candidateImages: Record<string, string> = {
    // Republicans
    'jd vance': 'https://tile.loc.gov/storage-services/service/pnp/ppbd/11600/11612v.jpg',
    'donald trump': 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/56/Donald_Trump_official_portrait.jpg/400px-Donald_Trump_official_portrait.jpg',
    'donald trump jr': 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/19/Donald_Trump%2C_Jr._%2855021618832%29_%28cropped%29.jpg/400px-Donald_Trump%2C_Jr._%2855021618832%29_%28cropped%29.jpg',
    'marco rubio': 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f7/Official_portrait_of_Secretary_Marco_Rubio_%28cropped%29%282%29.jpg/400px-Official_portrait_of_Secretary_Marco_Rubio_%28cropped%29%282%29.jpg',
    'ron desantis': 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4f/Ron_DeSantis_official_photo.jpg/400px-Ron_DeSantis_official_photo.jpg',
    'nikki haley': 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/75/Nikki_Haley_official_photo.jpg/400px-Nikki_Haley_official_photo.jpg',
    'glenn youngkin': 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/27/Youngkin_Governor_Portrait.jpg/400px-Youngkin_Governor_Portrait.jpg',
    'vivek ramaswamy': 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d4/Vivek_Ramaswamy_December_2025.jpg/400px-Vivek_Ramaswamy_December_2025.jpg',
    'ted cruz': 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/81/Ted_Cruz_official_116th_portrait_%283x4_cropped%29.jpg/400px-Ted_Cruz_official_116th_portrait_%283x4_cropped%29.jpg',
    'josh hawley': 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/31/Josh_Hawley%2C_official_portrait%2C_116th_congress.jpg/400px-Josh_Hawley%2C_official_portrait%2C_116th_congress.jpg',
    'sarah sanders': 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/49/Governor_Sarah_Huckabee_Sanders_%28cropped%29.jpg/400px-Governor_Sarah_Huckabee_Sanders_%28cropped%29.jpg',
    'sarah huckabee sanders': 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/49/Governor_Sarah_Huckabee_Sanders_%28cropped%29.jpg/400px-Governor_Sarah_Huckabee_Sanders_%28cropped%29.jpg',
    'tulsi gabbard': 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7a/Director_Tulsi_Gabbard_Official_Portrait.jpg/400px-Director_Tulsi_Gabbard_Official_Portrait.jpg',
    'brian kemp': 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4f/Governor_Kemp_Speaks_%2850838807672%29_%28cropped%29.jpg/400px-Governor_Kemp_Speaks_%2850838807672%29_%28cropped%29.jpg',
    'greg abbott': 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/db/Greg_Abbott_at_NASA_2024_%28cropped%29.jpg/400px-Greg_Abbott_at_NASA_2024_%28cropped%29.jpg',
    'mike pence': 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b9/Mike_Pence_official_Vice_Presidential_portrait.jpg/400px-Mike_Pence_official_Vice_Presidential_portrait.jpg',
    'kristi noem': 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2a/Official_Portrait_of_Secretary_Kristi_Noem.jpg/400px-Official_Portrait_of_Secretary_Kristi_Noem.jpg',
    'rand paul': 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/78/Rand_Paul%2C_official_portrait%2C_112th_Congress_alternate.jpg/400px-Rand_Paul%2C_official_portrait%2C_112th_Congress_alternate.jpg',
    'tom cotton': 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/49/Tom_Cotton_official_Senate_photo.jpg/400px-Tom_Cotton_official_Senate_photo.jpg',
    'liz cheney': 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9a/Liz_Cheney_official_116th_Congress_portrait.jpg/400px-Liz_Cheney_official_116th_Congress_portrait.jpg',
    'elise stefanik': 'https://upload.wikimedia.org/wikipedia/commons/8/89/Elise_Stefanik_portrait_%28118th_Congress%29.jpg',
    'matt gaetz': 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/37/Matt_Gaetz%2C_official_portrait%2C_116th_Congress.jpg/400px-Matt_Gaetz%2C_official_portrait%2C_116th_Congress.jpg',
    'marjorie taylor greene': 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e7/Marjorie_Taylor_Greene_117th_Congress_portrait.jpeg/400px-Marjorie_Taylor_Greene_117th_Congress_portrait.jpeg',
    'byron donalds': 'https://upload.wikimedia.org/wikipedia/commons/5/53/Byron_Donalds_portrait_%28118th_Congress%29.jpg',
    'john thune': 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/15/John_Thune_117th_Congress_portrait.jpg/400px-John_Thune_117th_Congress_portrait.jpg',
    'katie britt': 'https://upload.wikimedia.org/wikipedia/commons/3/3b/Katie_Boyd_Britt_official_Senate_photo.jpg',
    'thomas massie': 'https://upload.wikimedia.org/wikipedia/commons/0/09/Thomas_Massie_official_portrait%2C_2022.jpg',
    'tucker carlson': 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3b/Tucker_Carlson_2025_%28cropped%29.jpg/400px-Tucker_Carlson_2025_%28cropped%29.jpg',
    'steve bannon': 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7b/Steve_Bannon_by_Gage_Skidmore.jpg/400px-Steve_Bannon_by_Gage_Skidmore.jpg',

    // Democrats
    'gavin newsom': 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/88/Governor_Gavin_Newsom_in_2025.jpg/400px-Governor_Gavin_Newsom_in_2025.jpg',
    'alexandria ocasio-cortez': 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4a/Alexandria_Ocasio-Cortez_Official_Portrait.jpg/400px-Alexandria_Ocasio-Cortez_Official_Portrait.jpg',
    'kamala harris': 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/35/Kamala_Harris_Vice_Presidential_Portrait_%28cropped_1%29.jpg/400px-Kamala_Harris_Vice_Presidential_Portrait_%28cropped_1%29.jpg',
    'josh shapiro': 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/79/Josh_Shapiro_December_2025_B.jpg/400px-Josh_Shapiro_December_2025_B.jpg',
    'pete buttigieg': 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2e/Pete_Buttigieg%2C_Secretary_of_Transportation.jpg/400px-Pete_Buttigieg%2C_Secretary_of_Transportation.jpg',
    'gretchen whitmer': 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2e/2025_Gretchen_Whitmer_%28cropped%29.jpg/400px-2025_Gretchen_Whitmer_%28cropped%29.jpg',
    'andy beshear': 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/cf/Andy_Beshear_2024_%28cropped%29.jpg/400px-Andy_Beshear_2024_%28cropped%29.jpg',
    'jb pritzker': 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/53/Governor_JB_Pritzker_official_portrait_2019_%28crop%29.jpg/400px-Governor_JB_Pritzker_official_portrait_2019_%28crop%29.jpg',
    'jon ossoff': 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/97/Jon_Ossoff_Senate_Portrait_2021.jpg/400px-Jon_Ossoff_Senate_Portrait_2021.jpg',
    'wes moore': 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c3/Wes_Moore_Official_Governor_Portrait.jpg/400px-Wes_Moore_Official_Governor_Portrait.jpg',
    'tim walz': 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/61/TimWalz2025.jpg/400px-TimWalz2025.jpg',
    'mark kelly': 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e1/Mark_Kelly%2C_Official_Portrait_117th.jpg/400px-Mark_Kelly%2C_Official_Portrait_117th.jpg',
    'cory booker': 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/24/Cory_Booker%2C_official_portrait_%28119th_Congress%29.jpg/400px-Cory_Booker%2C_official_portrait_%28119th_Congress%29.jpg',
    'amy klobuchar': 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/cc/Amy_Klobuchar_2025.jpg/400px-Amy_Klobuchar_2025.jpg',
    'bernie sanders': 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/de/Bernie_Sanders.jpg/400px-Bernie_Sanders.jpg',
    'elizabeth warren': 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/10/Elizabeth_Warren%2C_official_portrait%2C_116th_Congress_%28cropped%29.jpg/400px-Elizabeth_Warren%2C_official_portrait%2C_116th_Congress_%28cropped%29.jpg',
    'michelle obama': 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4b/Michelle_Obama_2013_official_portrait.jpg/400px-Michelle_Obama_2013_official_portrait.jpg',
    'john fetterman': 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ea/John_Fetterman_official_portrait.jpg/400px-John_Fetterman_official_portrait.jpg',
    'barack obama': 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8d/President_Barack_Obama.jpg/400px-President_Barack_Obama.jpg',
    'hillary clinton': 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/27/Hillary_Clinton_official_Secretary_of_State_portrait_crop.jpg/400px-Hillary_Clinton_official_Secretary_of_State_portrait_crop.jpg',
    'andrew cuomo': 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0e/Governor_Andrew_Cuomo_in_2021.jpg/400px-Governor_Andrew_Cuomo_in_2021.jpg',
    'andrew yang': 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f6/Andrew_Yang_by_Gage_Skidmore.jpg/400px-Andrew_Yang_by_Gage_Skidmore.jpg',
    "beto o'rourke": 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ad/Beto_O%27Rourke%2C_Official_portrait%2C_113th_Congress.jpg/400px-Beto_O%27Rourke%2C_Official_portrait%2C_113th_Congress.jpg',
    'chris murphy': 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/ca/Chris_Murphy%2C_official_portrait%2C_113th_Congress.jpg/400px-Chris_Murphy%2C_official_portrait%2C_113th_Congress.jpg',
    'elissa slotkin': 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/97/Elissa_Slotkin_2026_Official_Portrait.jpg/400px-Elissa_Slotkin_2026_Official_Portrait.jpg',
    'gina raimondo': 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/Gina_Raimondo.jpg/400px-Gina_Raimondo.jpg',
    'erika kirk': 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3a/AmericaFest_2025_-_Erika_Kirk_23_%28cropped%29.jpg/400px-AmericaFest_2025_-_Erika_Kirk_23_%28cropped%29.jpg',
    'jared polis': 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/dc/Governor_Jared_Polis_2023_%28cropped%29.jpg/400px-Governor_Jared_Polis_2023_%28cropped%29.jpg',
    'rahm emanuel': 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/73/Ambassador-emanuel-portrait.jpg/400px-Ambassador-emanuel-portrait.jpg',
    'raphael warnock': 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a3/Raphael_Warnock_official_photo.jpg/400px-Raphael_Warnock_official_photo.jpg',
    'ro khanna': 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/16/Ro_Khanna%2C_official_portrait%2C_115th_Congress_%283x4%29.jpg/400px-Ro_Khanna%2C_official_portrait%2C_115th_Congress_%283x4%29.jpg',
    'roy cooper': 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/72/Gov._Cooper_Cropped.jpg/400px-Gov._Cooper_Cropped.jpg',
    'ruben gallego': 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b7/Senator_Ruben_Gallego_Official_Portrait.jpg/400px-Senator_Ruben_Gallego_Official_Portrait.jpg',
    'phil murphy': 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/70/Philip_D._Murphy_%28cropped%29.jpg/400px-Philip_D._Murphy_%28cropped%29.jpg',
    'jasmine crockett': 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/70/Congresswoman_Jasmine_Crockett_-_118th_Congress.png/400px-Congresswoman_Jasmine_Crockett_-_118th_Congress.png',
    'zohran mamdani': 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/59/Zohran_Mamdani_05.25.25_%28b%29_%28cropped%29.jpg/400px-Zohran_Mamdani_05.25.25_%28b%29_%28cropped%29.jpg',
    'james talarico': 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/58/James_Talarico_Press_Conference_3x4_%28cropped%29.jpg/400px-James_Talarico_Press_Conference_3x4_%28cropped%29.jpg',

    // Independents / Other politicians
    'robert f kennedy jr': 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/66/Robert_F._Kennedy_Jr.%2C_official_portrait_%282025%29_%28cropped_3-4%29.jpg/400px-Robert_F._Kennedy_Jr.%2C_official_portrait_%282025%29_%28cropped_3-4%29.jpg',
    'robert f kennedy jr.': 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/66/Robert_F._Kennedy_Jr.%2C_official_portrait_%282025%29_%28cropped_3-4%29.jpg/400px-Robert_F._Kennedy_Jr.%2C_official_portrait_%282025%29_%28cropped_3-4%29.jpg',
    'elon musk': 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/34/Elon_Musk_Royal_Society_%28crop2%29.jpg/400px-Elon_Musk_Royal_Society_%28crop2%29.jpg',

    // Celebrities and business figures
    'jamie dimon': 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8c/Chancellor_Rachel_Reeves_meets_Jamie_Dimon_%2854838700663%29_%28cropped%29.jpg/400px-Chancellor_Rachel_Reeves_meets_Jamie_Dimon_%2854838700663%29_%28cropped%29.jpg',
    'ivanka trump': 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ea/Ivanka_Trump_official_portrait_2020.jpg/400px-Ivanka_Trump_official_portrait_2020.jpg',
    'dwayne johnson': 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1f/Dwayne_Johnson_2014_%28cropped%29.jpg/400px-Dwayne_Johnson_2014_%28cropped%29.jpg',
    "dwayne 'the rock' johnson": 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1f/Dwayne_Johnson_2014_%28cropped%29.jpg/400px-Dwayne_Johnson_2014_%28cropped%29.jpg',
    'george clooney': 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8d/George_Clooney_2016.jpg/400px-George_Clooney_2016.jpg',
    'jon stewart': 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/fd/JonStewart-byPhilipRomano.jpg/400px-JonStewart-byPhilipRomano.jpg',
    'kim kardashian': 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/df/Kim_Kardashian_West_2014.jpg/400px-Kim_Kardashian_West_2014.jpg',
    'lebron james': 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/cf/LeBron_James_crop.jpg/400px-LeBron_James_crop.jpg',
    'mark cuban': 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/65/MarkCuban2023.jpg/400px-MarkCuban2023.jpg',
    'oprah winfrey': 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/bf/Oprah_in_2014.jpg/400px-Oprah_in_2014.jpg',
    'oprah': 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/bf/Oprah_in_2014.jpg/400px-Oprah_in_2014.jpg',
    'tom brady': 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/cb/Tom_Brady_2021.png/400px-Tom_Brady_2021.png',
    'chelsea clinton': 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/86/Chelsea_Clinton_by_Gage_Skidmore.jpg/400px-Chelsea_Clinton_by_Gage_Skidmore.jpg',
    'hunter biden': 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8a/Hunter_Biden_September_30%2C_2014.jpg/400px-Hunter_Biden_September_30%2C_2014.jpg',
    'stephen a smith': 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7d/Stephen_A._Smith_in_January_2023_%283x4_cropped_b%29.jpg/400px-Stephen_A._Smith_in_January_2023_%283x4_cropped_b%29.jpg',
    'stephen smith': 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7d/Stephen_A._Smith_in_January_2023_%283x4_cropped_b%29.jpg/400px-Stephen_A._Smith_in_January_2023_%283x4_cropped_b%29.jpg',
    'mrbeast': 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/ce/MrBeast_2023_%28cropped%29.jpg/400px-MrBeast_2023_%28cropped%29.jpg',

    // Trump family and associates
    'eric trump': 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/03/Consensus_2025_-_Eric_Trump_10_%283x4_cropped%29.jpg/400px-Consensus_2025_-_Eric_Trump_10_%283x4_cropped%29.jpg',
    'lara trump': 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e4/Lara_Trump_2025_%28cropped%29.jpg/400px-Lara_Trump_2025_%28cropped%29.jpg',
    'jared kushner': 'https://upload.wikimedia.org/wikipedia/commons/3/3e/Jared_Kushner_2025.jpg',

    // Media and business figures
    'dana white': 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d6/Dana_White_in_June_2025_%28cropped%29.jpg/400px-Dana_White_in_June_2025_%28cropped%29.jpg',
    'joe rogan': 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/dc/Joe_Rogan.png/400px-Joe_Rogan.png',
    'bob iger': 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e2/2022_Bob_Iger_%28cropped%29.jpg/400px-2022_Bob_Iger_%28cropped%29.jpg',
    'george conway': 'https://upload.wikimedia.org/wikipedia/commons/1/1e/George_Conway_crop.png',
    'michael bloomberg': 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/10/Mike_Bloomberg_Headshot_%283x4_cropped%29.jpg/400px-Mike_Bloomberg_Headshot_%283x4_cropped%29.jpg',

    // Governors
    'john sununu': 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b3/GovJohnSununu1.jpg/400px-GovJohnSununu1.jpg',
    'kathy hochul': 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/25/Kathy_Hochul_March_2024.jpg/400px-Kathy_Hochul_March_2024.jpg',
    'maura healey': 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/39/Maura_Healey%2C_official_portrait%2C_governor.jpg/400px-Maura_Healey%2C_official_portrait%2C_governor.jpg',
    'janet mills': 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a8/Maine_congressional_delegation_meets_with_Gov_Janet_Mills_%28cropped%29.jpg/400px-Maine_congressional_delegation_meets_with_Gov_Janet_Mills_%28cropped%29.jpg',
    'mike braun': 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/77/Governor_Mike_Braun_DHS.jpg/400px-Governor_Mike_Braun_DHS.jpg',

    // Senators
    'marsha blackburn': 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c2/Sen._Marsha_Blackburn_%28R-TN%29_official_headshot_-_116th_Congress.jpg/400px-Sen._Marsha_Blackburn_%28R-TN%29_official_headshot_-_116th_Congress.jpg',
    'john cornyn': 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/60/John_Cornyn.jpg/400px-John_Cornyn.jpg',
    'joni ernst': 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3a/Joni_Ernst%2C_official_portrait%2C_116th_Congress_2_%281%29.jpg/400px-Joni_Ernst%2C_official_portrait%2C_116th_Congress_2_%281%29.jpg',
    'susan collins': 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ae/Senator_Susan_Collins_2014_official_portrait.jpg/400px-Senator_Susan_Collins_2014_official_portrait.jpg',
    'ed markey': 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/94/Edward_Markey%2C_official_portrait%2C_114th_Congress.jpg/400px-Edward_Markey%2C_official_portrait%2C_114th_Congress.jpg',

    // Representatives
    'rashida tlaib': 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/58/Tlaib_Rashida_119th_Congress_%283x4_cropped%29.jpg/400px-Tlaib_Rashida_119th_Congress_%283x4_cropped%29.jpg',
    'ayanna pressley': 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/57/Rep._Ayanna_Pressley%2C_117th_Congress.jpg/400px-Rep._Ayanna_Pressley%2C_117th_Congress.jpg',
    'deb haaland': 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7e/Secretary_Deb_Haaland%2C_official_headshot.jpg/400px-Secretary_Deb_Haaland%2C_official_headshot.jpg',
    'jamie raskin': 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9b/Jamie_Raskin_Official_Portrait_2019.jpg/400px-Jamie_Raskin_Official_Portrait_2019.jpg',
    'seth moulton': 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3b/Seth_Moulton_%283x4_cropped%29.jpg/400px-Seth_Moulton_%283x4_cropped%29.jpg',
    'chip roy': 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/de/Chip_Roy_118th_Congress.jpg/400px-Chip_Roy_118th_Congress.jpg',
    'mike rogers': 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4c/Mike_Rogers_119th_Congress.jpg/400px-Mike_Rogers_119th_Congress.jpg',
    'nancy mace': 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0c/Nancy_Mace.jpg/400px-Nancy_Mace.jpg',
    'rich mccormick': 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e3/Rep._Rich_McCormick_official_photo%2C_118th_Congress_%281%29.jpg/400px-Rep._Rich_McCormick_official_photo%2C_118th_Congress_%281%29.jpg',
    'wesley hunt': 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5c/Rep._Wesley_Hunt_official_photo.jpg/400px-Rep._Wesley_Hunt_official_photo.jpg',
    'raja krishnamoorthi': 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/aa/Raja_Krishnamoorthi_official_photo.jpg/400px-Raja_Krishnamoorthi_official_photo.jpg',
    'robin kelly': 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0c/Rep._Robin_Kelly%2C_117th_Congress.jpg/400px-Rep._Robin_Kelly%2C_117th_Congress.jpg',
    'colin allred': 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2a/Colin_Allred%2C_official_portrait%2C_117th_Congress.jpg/400px-Colin_Allred%2C_official_portrait%2C_117th_Congress.jpg',
    'hakeem jeffries': 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a6/Rep-Hakeem-Jeffries-Official-Portrait_%28cropped%29.jpg/400px-Rep-Hakeem-Jeffries-Official-Portrait_%28cropped%29.jpg',

    // Cabinet / Administration
    'pete hegseth': 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2f/Pete_Hegseth_Official_Portrait.jpg/400px-Pete_Hegseth_Official_Portrait.jpg',

    // State officials
    'mallory mcmorrow': 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b7/Mallory_McMorrow_%28cropped%29.jpg/400px-Mallory_McMorrow_%28cropped%29.jpg',
    'jocelyn benson': 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/57/SOS_Jocelyn_Benson_web.jpg/400px-SOS_Jocelyn_Benson_web.jpg',
    'garlin gilchrist': 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/73/8R4A9159_%2853359280492%29_%28Garlin_Gilchrist%29.jpg/400px-8R4A9159_%2853359280492%29_%28Garlin_Gilchrist%29.jpg',
    'peggy flanagan': 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c4/2023PeggyFlanaganLtGovMN.jpg/400px-2023PeggyFlanaganLtGovMN.jpg',
    'juliana stratton': 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a8/Juliana_Stratton_2023_%28cropped%29.jpg/400px-Juliana_Stratton_2023_%28cropped%29.jpg',
    'kelda roys': 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5b/Kelda_Helen_Roys.JPG/400px-Kelda_Helen_Roys.JPG',

    // Other notable figures
    'jack schlossberg': 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/38/Jack_Schlossberg_wreath-laying_ceremony_to_commemorate_President_John_F._Kennedy_at_Arlington_National_Cemetery%2C_Virginia_on_October_17%2C_2024_%28cropped%29.jpg/400px-Jack_Schlossberg_wreath-laying_ceremony_to_commemorate_President_John_F._Kennedy_at_Arlington_National_Cemetery%2C_Virginia_on_October_17%2C_2024_%28cropped%29.jpg',

    // More Governors
    'chris sununu': 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/de/GOV_SUNUNU_OFFICIAL_PHOTO.jpg/400px-GOV_SUNUNU_OFFICIAL_PHOTO.jpg',
    'spencer cox': 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/94/Spencer_Cox_-_54856206905_%28cropped%29.jpg/400px-Spencer_Cox_-_54856206905_%28cropped%29.jpg',
    'tony evers': 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/08/Tony_Evers_-_2022_%28a%29.jpg/400px-Tony_Evers_-_2022_%28a%29.jpg',
    'laura kelly': 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0f/Laura_Kelly_official_photo.jpg/400px-Laura_Kelly_official_photo.jpg',

    // Trump Cabinet 2025
    'doug burgum': 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e0/Doug_Burgum_2025_DOI_portrait.jpg/400px-Doug_Burgum_2025_DOI_portrait.jpg',
    'susie wiles': 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/86/Susie_Wiles_%28crop%29.jpg/400px-Susie_Wiles_%28crop%29.jpg',
    'stephen miller': 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b4/P20250718DT-1296_President_Donald_Trump_delivers_remarks_at_a_dinner_for_GOP_Senators_%28cropped%29%28b%29.jpg/400px-P20250718DT-1296_President_Donald_Trump_delivers_remarks_at_a_dinner_for_GOP_Senators_%28cropped%29%28b%29.jpg',
    'kash patel': 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8d/Kash_Patel%2C_official_FBI_portrait_%28cropped_2%29.jpg/400px-Kash_Patel%2C_official_FBI_portrait_%28cropped_2%29.jpg',
    'pam bondi': 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e0/Pam_Bondi_official_portrait_%28cropped%29%282%29.jpg/400px-Pam_Bondi_official_portrait_%28cropped%29%282%29.jpg',
    'sean duffy': 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/60/Secretary_of_Transportation_Sean_Duffy_Official_Portrait.jpg/400px-Secretary_of_Transportation_Sean_Duffy_Official_Portrait.jpg',
    'linda mcmahon': 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4b/ED_Sec_Linda_McMahon.jpg/400px-ED_Sec_Linda_McMahon.jpg',
    'russell vought': 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d9/Russell_Vought%2C_official_portrait_%282025%29_%28cropped%29.jpg/400px-Russell_Vought%2C_official_portrait_%282025%29_%28cropped%29.jpg',
    'ben carson': 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/98/Ben_Carson_USDA.jpg/400px-Ben_Carson_USDA.jpg',

    // More Senators
    'tim scott': 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/bf/Tim_Scott_official_portrait.jpg/400px-Tim_Scott_official_portrait.jpg',
    'bill hagerty': 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/de/Bill_Hagerty_senatorial_portrait.jpg/400px-Bill_Hagerty_senatorial_portrait.jpg',
    'rick scott': 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1d/Official_Portrait_of_Senator_Rick_Scott_%28R-FL%29.jpg/400px-Official_Portrait_of_Senator_Rick_Scott_%28R-FL%29.jpg',

    // More Representatives
    'john james': 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b6/Rep._John_James_official_photo%2C_118th_Congress.jpg/400px-Rep._John_James_official_photo%2C_118th_Congress.jpg',
    'anna paulina luna': 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/66/Anna_Paulina_Luna.jpg/400px-Anna_Paulina_Luna.jpg',
    'jd scholten': 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/26/J.D._Scholten_Portrait.jpg/400px-J.D._Scholten_Portrait.jpg',

    // Additional Representatives
    'dan crenshaw': 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b5/Rep._Dan_Crenshaw%2C_official_portrait%2C_118th_Congress.jpg/400px-Rep._Dan_Crenshaw%2C_official_portrait%2C_118th_Congress.jpg',
    'joaquin castro': 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f0/Joaquin_Castro%2C_official_portrait%2C_118th_Congress.jpg/400px-Joaquin_Castro%2C_official_portrait%2C_118th_Congress.jpg',
    'al green': 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/28/Al_Green_Official_%28cropped%29.jpg/400px-Al_Green_Official_%28cropped%29.jpg',
    'haley stevens': 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5d/Haley_Stevens%2C_official_portrait%2C_116th_Congress.jpg/400px-Haley_Stevens%2C_official_portrait%2C_116th_Congress.jpg',

    // State officials
    'ken paxton': 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/06/Ken_Paxton_%2854816860552%29_%28cropped%29.jpg/400px-Ken_Paxton_%2854816860552%29_%28cropped%29.jpg',
    'antonio delgado': 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0a/LG_Antonio_Delgado_Portrait.jpg/400px-LG_Antonio_Delgado_Portrait.jpg',
    'letitia james': 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/75/Letitia_James_Interview_Feb_2020.png/400px-Letitia_James_Interview_Feb_2020.png',
    'stacey abrams': 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/46/Stacey_Abrams_by_Gage_Skidmore.jpg/400px-Stacey_Abrams_by_Gage_Skidmore.jpg',
    'phil scott': 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/cc/Phil_Scott_2019.png/400px-Phil_Scott_2019.png',
    'charlie baker': 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/39/Charlie_Baker_official_photo_%28portrait_cropped%29.jpg/400px-Charlie_Baker_official_photo_%28portrait_cropped%29.jpg',
    'mandela barnes': 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/49/Mandela_Barnes_2022.jpg/400px-Mandela_Barnes_2022.jpg',

    // Additional Senators
    'michael bennet': 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/92/Senator_Mike_Bennett.jpg/400px-Senator_Mike_Bennett.jpg',

    // Former Cabinet
    'julian castro': 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/12/Juli%C3%A1n_Castro%27s_Official_HUD_Portrait_%283x4_cropped%29.jpg/400px-Juli%C3%A1n_Castro%27s_Official_HUD_Portrait_%283x4_cropped%29.jpg',

    // Media / Other
    'mike lindell': 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/93/Mike_Lindell_by_Gage_Skidmore_2.jpg/400px-Mike_Lindell_by_Gage_Skidmore_2.jpg',
    'michele tafoya': 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/68/MicheleTafoya2023.jpg/400px-MicheleTafoya2023.jpg',

    // Parties
    'democratic party': '/images/parties/democratic.svg',
    'republican party': '/images/parties/republican.svg',
  };

  return candidateImages[normalizedName];
}

// Check if a name is a party name (not a candidate) - used to filter out parties from candidate lists
function isPartyName(name: string): boolean {
  const lower = name.toLowerCase();
  return lower === 'republican party' ||
         lower === 'democratic party' ||
         lower === 'democrat' ||
         lower === 'republican' ||
         lower === 'libertarian party' ||
         lower === 'green party';
}

// Check if a contract name is a placeholder that should be filtered out
function isPlaceholderContract(name: string): boolean {
  const lower = name.toLowerCase();
  // Filter out "Party A", "Party B", etc. placeholders
  if (/^(party|will party)\s+[a-f](\s|$)/i.test(name)) {
    return true;
  }
  // Filter out contracts with 0% or null prices
  return false;
}

// Normalize party names for matching
function normalizePartyName(name: string): string {
  const lower = name.toLowerCase().trim();

  // Democratic variations
  if (lower === 'the democrats' || lower === 'democrats' || lower === 'democratic' || lower === 'democrat' || lower === 'democratic party') {
    return 'Democratic Party';
  }

  // Republican variations
  if (lower === 'the republicans' || lower === 'republicans' || lower === 'republican' || lower === 'republican party') {
    return 'Republican Party';
  }

  return name;
}

// Map market names to canonical market types for aggregation
function getCanonicalMarketType(marketName: string): string | null {
  const lower = marketName.toLowerCase();

  // Exclude "who will run" markets (these are about running, not winning)
  if (lower.includes('who will run') || lower.includes('will run for')) {
    return null;
  }

  // Exclude individual state/district races
  if (lower.includes('district') || /\b(alabama|alaska|arizona|arkansas|california|colorado|connecticut|delaware|florida|georgia|hawaii|idaho|illinois|indiana|iowa|kansas|kentucky|louisiana|maine|maryland|massachusetts|michigan|minnesota|mississippi|montana|nebraska|nevada|new hampshire|new jersey|new mexico|new york|north carolina|north dakota|ohio|oklahoma|oregon|pennsylvania|rhode island|south carolina|south dakota|tennessee|texas|utah|vermont|virginia|washington|west virginia|wisconsin|wyoming)\b/.test(lower)) {
    return null;
  }

  // Presidential election winner (by candidate)
  // Polymarket: "Presidential Election Winner 2028"
  // PredictIt: "Who will win the 2028 US presidential election?"
  // Smarkets: "2028 Presidential Election Winner"
  // Kalshi: "Next U.S. Presidential Election Winner?"
  if ((lower.includes('presidential election winner') ||
       lower.includes('win the 2028 us presidential election') ||
       lower.includes('2028 presidential election winner') ||
       lower.includes('next u.s. presidential election winner')) &&
      !lower.includes('party')) {
    return 'presidential-winner-2028';
  }

  // Presidential election by party
  // Polymarket: "Which party wins 2028 US Presidential Election?"
  // PredictIt: "Which party will win the 2028 US presidential election?"
  // Kalshi: "Which party will win the 2028 Presidential Election?"
  if (lower.includes('2028') && lower.includes('president') &&
      (lower.includes('which party') || lower.includes('party win') || lower.includes('party wins'))) {
    return 'presidential-party-2028';
  }

  // House 2026 control
  // Polymarket: "Which party will win the House in 2026?"
  // PredictIt: "Which party will win the House in the 2026 election?"
  if (lower.includes('2026') && lower.includes('house') &&
      (lower.includes('which party') || lower.includes('party win') || lower.includes('control'))) {
    return 'house-control-2026';
  }

  // Senate 2026 control (party-based, not seat count)
  // Polymarket: "Which party will win the Senate in 2026?"
  // PredictIt: "Which party will control the Senate after the 2026 election?"
  // Exclude: "How many Senate seats..." (seat count markets)
  if (lower.includes('2026') && lower.includes('senate') &&
      (lower.includes('which party') || lower.includes('party win') || lower.includes('party control')) &&
      !lower.includes('how many') && !lower.includes('seats')) {
    return 'senate-control-2026';
  }

  // GOP nomination - must be presidential, not gubernatorial or senate
  // Kalshi: "2028 Republican nominee for President?"
  // PredictIt: "Who will win the 2028 Republican presidential nomination?"
  // Polymarket: "Republican Presidential Nominee 2028"
  if (lower.includes('republican') &&
      (lower.includes('presidential') || lower.includes('for president')) &&
      (lower.includes('nominee') || lower.includes('nomination'))) {
    return 'gop-nominee-2028';
  }

  // Dem nomination - must be presidential
  if (lower.includes('democratic') &&
      (lower.includes('presidential') || lower.includes('for president')) &&
      (lower.includes('nominee') || lower.includes('nomination'))) {
    return 'dem-nominee-2028';
  }

  return null;
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

// Helper to get timestamp for change period
function getChangePeriodTimestamp(period: string): string {
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
    default:
      now.setDate(now.getDate() - 1);
  }
  return now.toISOString();
}

/**
 * Get historical prices from electionbettingodds for change calculation
 * Returns a map of candidate name -> { current: price, historical: price }
 */
function getChartBasedPriceChanges(
  dbMarketId: string,
  changePeriod: string
): Map<string, { current: number; historical: number }> {
  const db = getDb();
  const changeTimestamp = getChangePeriodTimestamp(changePeriod);

  const result = new Map<string, { current: number; historical: number }>();

  // Get the most recent prices from electionbettingodds (current)
  const currentPricesQuery = `
    SELECT
      c.contract_name,
      ps.yes_price
    FROM contracts c
    INNER JOIN (
      SELECT contract_id, market_id, source, yes_price, snapshot_time,
             ROW_NUMBER() OVER (PARTITION BY contract_id ORDER BY snapshot_time DESC) as rn
      FROM price_snapshots
      WHERE source = 'electionbettingodds'
    ) ps ON ps.contract_id = c.contract_id AND ps.market_id = c.market_id AND ps.source = c.source AND ps.rn = 1
    WHERE c.source = 'electionbettingodds' AND c.market_id = ?
    AND ps.yes_price IS NOT NULL
  `;

  // Get the historical prices (closest to the change period timestamp)
  const historicalPricesQuery = `
    SELECT
      c.contract_name,
      ps.yes_price
    FROM contracts c
    INNER JOIN (
      SELECT contract_id, market_id, source, yes_price, snapshot_time,
             ROW_NUMBER() OVER (PARTITION BY contract_id ORDER BY snapshot_time DESC) as rn
      FROM price_snapshots
      WHERE source = 'electionbettingodds' AND snapshot_time <= ?
    ) ps ON ps.contract_id = c.contract_id AND ps.market_id = c.market_id AND ps.source = c.source AND ps.rn = 1
    WHERE c.source = 'electionbettingodds' AND c.market_id = ?
    AND ps.yes_price IS NOT NULL
  `;

  const currentPrices = db.prepare(currentPricesQuery).all(dbMarketId) as { contract_name: string; yes_price: number }[];
  const historicalPrices = db.prepare(historicalPricesQuery).all(changeTimestamp, dbMarketId) as { contract_name: string; yes_price: number }[];

  // Build the result map with current prices
  for (const row of currentPrices) {
    result.set(row.contract_name.toLowerCase(), { current: row.yes_price, historical: row.yes_price });
  }

  // Update with historical prices
  for (const row of historicalPrices) {
    const key = row.contract_name.toLowerCase();
    if (result.has(key)) {
      result.get(key)!.historical = row.yes_price;
    }
  }

  return result;
}

/**
 * Get all markets with their contracts and latest prices from all sources
 */
export function getMarkets(options?: {
  category?: MarketCategory;
  status?: 'open' | 'all';
  limit?: number;
  changePeriod?: string;
}): Market[] {
  const db = getDb();
  const changePeriod = options?.changePeriod || '1d';
  const changeTimestamp = getChangePeriodTimestamp(changePeriod);

  // Get all markets from all sources
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
    WHERE (m.market_name LIKE '%2028%' OR m.market_name LIKE '%2026%' OR m.market_name LIKE '%Next U.S. Presidential%')
      AND m.source IN ('Polymarket', 'Kalshi', 'PredictIt', 'Smarkets')
    ORDER BY m.total_volume DESC NULLS LAST
  `;

  const dbMarkets = db.prepare(marketsQuery).all() as DbMarket[];

  // Group markets by canonical type for aggregation
  const marketsByType = new Map<string, DbMarket[]>();

  for (const market of dbMarkets) {
    const canonicalType = getCanonicalMarketType(market.market_name);
    if (canonicalType) {
      if (!marketsByType.has(canonicalType)) {
        marketsByType.set(canonicalType, []);
      }
      marketsByType.get(canonicalType)!.push(market);
    }
  }

  // Query for contracts with prices
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

  // Query for historical prices (closest to change period timestamp)
  // Gets the most recent price before or at the cutoff timestamp
  const historicalPricesQuery = `
    SELECT
      c.contract_id,
      c.contract_name,
      ps.yes_price,
      ps.snapshot_time
    FROM contracts c
    INNER JOIN (
      SELECT contract_id, market_id, source, yes_price, snapshot_time,
             ROW_NUMBER() OVER (PARTITION BY source, market_id, contract_id ORDER BY snapshot_time DESC) as rn
      FROM price_snapshots
      WHERE snapshot_time <= ?
    ) ps ON ps.contract_id = c.contract_id AND ps.market_id = c.market_id AND ps.source = c.source AND ps.rn = 1
    WHERE c.market_id = ? AND c.source = ?
  `;

  const markets: Market[] = [];

  // Process each canonical market type
  for (const [canonicalType, relatedMarkets] of marketsByType) {
    // Determine category from canonical type
    let category: MarketCategory;
    let marketName: string;

    switch (canonicalType) {
      case 'presidential-winner-2028':
        category = 'presidential';
        marketName = 'Presidential Election Winner 2028';
        break;
      case 'presidential-party-2028':
        category = 'presidential';
        marketName = 'Which Party Wins the 2028 Presidential Election?';
        break;
      case 'gop-nominee-2028':
        category = 'primary-gop';
        marketName = 'Republican Presidential Nominee 2028';
        break;
      case 'dem-nominee-2028':
        category = 'primary-dem';
        marketName = 'Democratic Presidential Nominee 2028';
        break;
      case 'house-control-2026':
        category = 'house';
        marketName = 'Which Party Wins the House in 2026?';
        break;
      case 'senate-control-2026':
        category = 'senate';
        marketName = 'Which Party Wins the Senate in 2026?';
        break;
      default:
        continue;
    }

    // Filter by category if specified
    if (options?.category && category !== options.category) {
      continue;
    }

    // Get chart-based price changes from electionbettingodds
    // Map canonical type to electionbettingodds market ID
    const eboMarketId = canonicalType === 'presidential-winner-2028' ? 'president_2028' :
                        canonicalType === 'gop-nominee-2028' ? 'president_2028' :
                        canonicalType === 'dem-nominee-2028' ? 'president_2028' : null;

    const chartPriceChanges = eboMarketId
      ? getChartBasedPriceChanges(eboMarketId, changePeriod)
      : new Map<string, { current: number; historical: number }>();

    // Aggregate contracts from all sources
    // Map: normalized candidate name -> Contract with prices from all sources
    const contractsByCandidate = new Map<string, Contract>();

    for (const dbMarket of relatedMarkets) {
      const contractsWithPrices = db.prepare(contractsWithPricesQuery).all(
        dbMarket.market_id,
        dbMarket.source
      ) as (DbContract & { yes_price: number; no_price: number | null; volume: number | null; snapshot_time: string })[];

      for (const contract of contractsWithPrices) {
        const candidateName = extractCandidateName(contract.contract_name, contract.contract_id);

        // Skip contracts where we couldn't extract a valid candidate name
        if (!candidateName) {
          continue;
        }

        // Skip generic placeholder names
        if (/^(Person|Party|Candidate)\s+[A-Z]{1,2}$/i.test(candidateName)) {
          continue;
        }
        // Skip "Will Party A/B/C..." placeholder contracts
        if (isPlaceholderContract(contract.contract_name)) {
          continue;
        }
        // Skip party names in candidate markets (but NOT in party markets)
        const isPartyMarket = canonicalType.includes('party') || canonicalType.includes('control');
        if (!isPartyMarket && isPartyName(candidateName)) {
          continue;
        }
        // For party markets, normalize the party name
        const displayName = isPartyMarket ? normalizePartyName(candidateName) : candidateName;

        // Use displayName for normalization so parties merge correctly
        const normalizedName = normalizeCandidateName(displayName);

        // Skip contracts with 0 or very low prices (likely placeholders)
        if (contract.yes_price < 0.001) {
          continue;
        }

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

        if (contractsByCandidate.has(normalizedName)) {
          // Add price to existing contract
          const existing = contractsByCandidate.get(normalizedName)!;
          // Only add if we don't already have a price from this source
          if (!existing.prices.find(p => p.source === price.source)) {
            existing.prices.push(price);
            existing.totalVolume += price.volume || 0;
          }
        } else {
          // Create new contract
          contractsByCandidate.set(normalizedName, {
            id: `${canonicalType}-${normalizedName}`,
            name: displayName,
            shortName: displayName.split(' ')[0],
            imageUrl: getCandidateImageUrl(displayName),
            prices: [price],
            aggregatedPrice: contract.yes_price,
            priceChange: 0,
            totalVolume: contract.volume || 0,
          });
        }
      }
    }

    // Convert to array and calculate aggregated prices and price changes
    const contracts = Array.from(contractsByCandidate.values()).map(contract => {
      // Calculate average price across all sources
      const avgPrice = contract.prices.reduce((sum, p) => sum + p.yesPrice, 0) / contract.prices.length;

      // Calculate price change from electionbettingodds chart data
      // This matches what the chart shows
      let priceChange = 0;

      // Try to match the candidate name to the chart data
      // Chart uses short names like "Vance", "Newsom", etc.
      const shortName = contract.name.split(' ').pop()?.toLowerCase() || '';
      const firstName = contract.name.split(' ')[0]?.toLowerCase() || '';

      // Try different matching strategies
      const chartData = chartPriceChanges.get(shortName) ||
                        chartPriceChanges.get(firstName) ||
                        chartPriceChanges.get(contract.name.toLowerCase());

      if (chartData) {
        // Price change = current chart price - historical chart price
        priceChange = chartData.current - chartData.historical;
      }

      return {
        ...contract,
        aggregatedPrice: avgPrice,
        priceChange,
      };
    });

    // Sort by aggregated price
    contracts.sort((a, b) => b.aggregatedPrice - a.aggregatedPrice);

    if (contracts.length === 0) {
      continue;
    }

    // Get list of sources included
    const sourcesIncluded = [...new Set(contracts.flatMap(c => c.prices.map(p => p.source)))];

    markets.push({
      id: canonicalType,
      slug: createSlug(marketName, canonicalType),
      name: marketName,
      description: `Aggregated from ${sourcesIncluded.join(', ')}.`,
      category,
      status: 'open',
      contracts,
      totalVolume: contracts.reduce((sum, c) => sum + c.totalVolume, 0),
      endDate: relatedMarkets[0]?.end_date || undefined,
      lastUpdated: new Date().toISOString(),
    });
  }

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
    },
  };
}
