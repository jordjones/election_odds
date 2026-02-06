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
    'jd vance': 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/12/Senator_Vance_official_portrait_%28cropped%29.jpg/220px-Senator_Vance_official_portrait_%28cropped%29.jpg',
    'donald trump': 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/56/Donald_Trump_official_portrait.jpg/220px-Donald_Trump_official_portrait.jpg',
    'donald trump jr': 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/44/Don_Jr._%2848508436972%29_%28cropped%29.jpg/220px-Don_Jr._%2848508436972%29_%28cropped%29.jpg',
    'marco rubio': 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5c/Secretary_Rubio_%28cropped%29.jpg/220px-Secretary_Rubio_%28cropped%29.jpg',
    'ron desantis': 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b5/Ron_DeSantis_at_CPAC_2023_%28cropped%29.jpg/220px-Ron_DeSantis_at_CPAC_2023_%28cropped%29.jpg',
    'nikki haley': 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/75/Nikki_Haley_by_Gage_Skidmore_2.jpg/220px-Nikki_Haley_by_Gage_Skidmore_2.jpg',
    'glenn youngkin': 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/eb/Glenn_Youngkin_official_photo.jpg/220px-Glenn_Youngkin_official_photo.jpg',
    'vivek ramaswamy': 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ea/Vivek_Ramaswamy_by_Gage_Skidmore.jpg/220px-Vivek_Ramaswamy_by_Gage_Skidmore.jpg',
    'ted cruz': 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5c/Ted_Cruz_official_116th_portrait_%28cropped%29.jpg/220px-Ted_Cruz_official_116th_portrait_%28cropped%29.jpg',
    'josh hawley': 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f3/Senator_Hawley_official_portrait_%28cropped%29.jpg/220px-Senator_Hawley_official_portrait_%28cropped%29.jpg',
    'sarah sanders': 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a7/Sarah_Huckabee_Sanders_official_photo.jpg/220px-Sarah_Huckabee_Sanders_official_photo.jpg',
    'sarah huckabee sanders': 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a7/Sarah_Huckabee_Sanders_official_photo.jpg/220px-Sarah_Huckabee_Sanders_official_photo.jpg',
    'tulsi gabbard': 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3e/Tulsi_Gabbard_official_photo_%28cropped%29.jpg/220px-Tulsi_Gabbard_official_photo_%28cropped%29.jpg',
    'brian kemp': 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/15/Brian_Kemp_official_photo.jpg/220px-Brian_Kemp_official_photo.jpg',
    'greg abbott': 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4a/Greg_Abbott_2024_%28cropped%29.jpg/220px-Greg_Abbott_2024_%28cropped%29.jpg',
    'mike pence': 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b9/Mike_Pence_official_Vice_Presidential_portrait.jpg/220px-Mike_Pence_official_Vice_Presidential_portrait.jpg',
    'kristi noem': 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/22/Official_Portrait_of_Secretary_Kristi_Noem.jpg/220px-Official_Portrait_of_Secretary_Kristi_Noem.jpg',
    'rand paul': 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/78/Rand_Paul%2C_official_portrait%2C_112th_Congress_alternate.jpg/220px-Rand_Paul%2C_official_portrait%2C_112th_Congress_alternate.jpg',
    'tom cotton': 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a5/Tom_Cotton_official_Senate_photo.jpg/220px-Tom_Cotton_official_Senate_photo.jpg',
    'liz cheney': 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6a/Liz_Cheney_official_portrait.jpg/220px-Liz_Cheney_official_portrait.jpg',
    'elise stefanik': 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/21/Elise_Stefanik%2C_115th_official_photo.jpg/220px-Elise_Stefanik%2C_115th_official_photo.jpg',
    'matt gaetz': 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4b/Matt_Gaetz%2C_official_portrait%2C_116th_Congress_%28cropped%29.jpg/220px-Matt_Gaetz%2C_official_portrait%2C_116th_Congress_%28cropped%29.jpg',
    'marjorie taylor greene': 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/35/Marjorie_Taylor_Greene_117th_Congress_portrait.jpeg/220px-Marjorie_Taylor_Greene_117th_Congress_portrait.jpeg',
    'byron donalds': 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d1/Rep._Byron_Donalds_117th_Congress_official_photo.jpg/220px-Rep._Byron_Donalds_117th_Congress_official_photo.jpg',
    'john thune': 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1a/John_Thune%2C_official_portrait%2C_111th_Congress.jpg/220px-John_Thune%2C_official_portrait%2C_111th_Congress.jpg',
    'katie britt': 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/38/Katie_Britt_official_Senate_photo.jpg/220px-Katie_Britt_official_Senate_photo.jpg',
    'thomas massie': 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6e/Thomas_Massie_official_portrait%2C_2022_%28cropped%29.jpg/220px-Thomas_Massie_official_portrait%2C_2022_%28cropped%29.jpg',
    'tucker carlson': 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/61/Tucker_Carlson_%2846491086341%29.jpg/220px-Tucker_Carlson_%2846491086341%29.jpg',
    'steve bannon': 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/00/Steve_Bannon_by_Gage_Skidmore.jpg/220px-Steve_Bannon_by_Gage_Skidmore.jpg',

    // Democrats
    'gavin newsom': 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5c/Gavin_Newsom_by_Gage_Skidmore_%28cropped%29.jpg/220px-Gavin_Newsom_by_Gage_Skidmore_%28cropped%29.jpg',
    'alexandria ocasio-cortez': 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/58/Alexandria_Ocasio-Cortez_Official_Portrait_%28118th_Congress%29_%28cropped%29.jpg/220px-Alexandria_Ocasio-Cortez_Official_Portrait_%28118th_Congress%29_%28cropped%29.jpg',
    'kamala harris': 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/41/Kamala_Harris_Vice_Presidential_Portrait_%28cropped%29.jpg/220px-Kamala_Harris_Vice_Presidential_Portrait_%28cropped%29.jpg',
    'josh shapiro': 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c3/Governor_Josh_Shapiro_Official_Portrait_%28cropped%29.jpg/220px-Governor_Josh_Shapiro_Official_Portrait_%28cropped%29.jpg',
    'pete buttigieg': 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/22/Secretary_Pete_Buttigieg_%28cropped%29.jpg/220px-Secretary_Pete_Buttigieg_%28cropped%29.jpg',
    'gretchen whitmer': 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ae/Gretchen_Whitmer_2024_%28cropped%29.jpg/220px-Gretchen_Whitmer_2024_%28cropped%29.jpg',
    'andy beshear': 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/78/Andy_Beshear_official_photo_%28cropped%29.jpg/220px-Andy_Beshear_official_photo_%28cropped%29.jpg',
    'jb pritzker': 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1b/J._B._Pritzker_official_photo_%28cropped%29.jpg/220px-J._B._Pritzker_official_photo_%28cropped%29.jpg',
    'jon ossoff': 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e0/Sen._Jon_Ossoff_official_portrait%2C_117th_Congress_%28cropped%29.jpg/220px-Sen._Jon_Ossoff_official_portrait%2C_117th_Congress_%28cropped%29.jpg',
    'wes moore': 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7a/Official_Portrait_of_Governor_Wes_Moore_%28cropped%29.jpg/220px-Official_Portrait_of_Governor_Wes_Moore_%28cropped%29.jpg',
    'tim walz': 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ec/Tim_Walz_official_portrait_%28cropped%29.jpg/220px-Tim_Walz_official_portrait_%28cropped%29.jpg',
    'mark kelly': 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1f/Sen._Mark_Kelly_official_portrait%2C_117th_Congress_%28cropped%29.jpg/220px-Sen._Mark_Kelly_official_portrait%2C_117th_Congress_%28cropped%29.jpg',
    'cory booker': 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/dd/Cory_Booker%2C_official_portrait%2C_114th_Congress_%28cropped%29.jpg/220px-Cory_Booker%2C_official_portrait%2C_114th_Congress_%28cropped%29.jpg',
    'amy klobuchar': 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/cc/Amy_Klobuchar_2024_%28cropped%29.jpg/220px-Amy_Klobuchar_2024_%28cropped%29.jpg',
    'bernie sanders': 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/de/Bernie_Sanders%2C_119th_Congress_%28cropped%29.jpg/220px-Bernie_Sanders%2C_119th_Congress_%28cropped%29.jpg',
    'elizabeth warren': 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/10/Elizabeth_Warren%2C_official_portrait%2C_116th_Congress_%28cropped%29.jpg/220px-Elizabeth_Warren%2C_official_portrait%2C_116th_Congress_%28cropped%29.jpg',
    'michelle obama': 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4b/Michelle_Obama_2013_official_portrait_%28cropped%29.jpg/220px-Michelle_Obama_2013_official_portrait_%28cropped%29.jpg',
    'john fetterman': 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/47/Senator_Fetterman_official_portrait_%28cropped%29.jpg/220px-Senator_Fetterman_official_portrait_%28cropped%29.jpg',
    'barack obama': 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8d/President_Barack_Obama.jpg/220px-President_Barack_Obama.jpg',
    'hillary clinton': 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/27/Hillary_Clinton_official_Secretary_of_State_portrait_crop.jpg/220px-Hillary_Clinton_official_Secretary_of_State_portrait_crop.jpg',
    'andrew cuomo': 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0d/Andrew_Cuomo_by_Pat_Arnow_cropped.jpeg/220px-Andrew_Cuomo_by_Pat_Arnow_cropped.jpeg',
    'andrew yang': 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7e/Andrew_Yang_talking_about_education_at_NH_Teacher_Town_Hall_%28cropped%29.jpg/220px-Andrew_Yang_talking_about_education_at_NH_Teacher_Town_Hall_%28cropped%29.jpg',
    "beto o'rourke": 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ad/Beto_O%27Rourke%2C_Official_portrait%2C_113th_Congress.jpg/220px-Beto_O%27Rourke%2C_Official_portrait%2C_113th_Congress.jpg',
    'chris murphy': 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e7/Chris_Murphy_official_portrait.jpg/220px-Chris_Murphy_official_portrait.jpg',
    'elissa slotkin': 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/57/Elissa_Slotkin%2C_official_portrait%2C_116th_Congress.jpg/220px-Elissa_Slotkin%2C_official_portrait%2C_116th_Congress.jpg',
    'gina raimondo': 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/36/Gina_Raimondo_official_portrait.jpg/220px-Gina_Raimondo_official_portrait.jpg',
    'jared polis': 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6d/Jared_Polis_official_photo.jpg/220px-Jared_Polis_official_photo.jpg',
    'rahm emanuel': 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c2/Rahm_Emanuel%2C_official_photo_portrait_color.jpg/220px-Rahm_Emanuel%2C_official_photo_portrait_color.jpg',
    'raphael warnock': 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/13/Raphael_Warnock_official_photo.jpg/220px-Raphael_Warnock_official_photo.jpg',
    'ro khanna': 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2f/Ro_Khanna%2C_official_portrait%2C_115th_Congress.jpg/220px-Ro_Khanna%2C_official_portrait%2C_115th_Congress.jpg',
    'roy cooper': 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/44/NC_Governor_Roy_Cooper.jpg/220px-NC_Governor_Roy_Cooper.jpg',
    'ruben gallego': 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/76/Ruben_Gallego_official_portrait.jpg/220px-Ruben_Gallego_official_portrait.jpg',
    'phil murphy': 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/Phil_Murphy_for_Governor_%2833782680673%29_%28cropped%29.jpg/220px-Phil_Murphy_for_Governor_%2833782680673%29_%28cropped%29.jpg',
    'jasmine crockett': 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/79/Congresswoman_Jasmine_Crockett_-_118th_Congress.png/220px-Congresswoman_Jasmine_Crockett_-_118th_Congress.png',
    'zohran mamdani': 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5a/Zohran_Mamdani.jpg/220px-Zohran_Mamdani.jpg',
    'james talarico': 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1e/James_Talarico_Press_Conference_3x4_%28cropped%29.jpg/220px-James_Talarico_Press_Conference_3x4_%28cropped%29.jpg',

    // Independents / Other politicians
    'robert f kennedy jr': 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/99/Robert_F._Kennedy_Jr.%2C_official_portrait_%282025%29.jpg/220px-Robert_F._Kennedy_Jr.%2C_official_portrait_%282025%29.jpg',
    'robert f kennedy jr.': 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/99/Robert_F._Kennedy_Jr.%2C_official_portrait_%282025%29.jpg/220px-Robert_F._Kennedy_Jr.%2C_official_portrait_%282025%29.jpg',
    'elon musk': 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/34/Elon_Musk_Royal_Society_%28crop2%29.jpg/220px-Elon_Musk_Royal_Society_%28crop2%29.jpg',

    // Celebrities and business figures
    'jamie dimon': 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/57/Jamie_Dimon_%2833760021753%29_%28cropped%29.jpg/220px-Jamie_Dimon_%2833760021753%29_%28cropped%29.jpg',
    'ivanka trump': 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/87/Ivanka_Trump_official_photo_%28cropped%29.jpg/220px-Ivanka_Trump_official_photo_%28cropped%29.jpg',
    'dwayne johnson': 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1f/Dwayne_Johnson_2014_%28cropped%29.jpg/220px-Dwayne_Johnson_2014_%28cropped%29.jpg',
    "dwayne 'the rock' johnson": 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1f/Dwayne_Johnson_2014_%28cropped%29.jpg/220px-Dwayne_Johnson_2014_%28cropped%29.jpg',
    'george clooney': 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8d/George_Clooney_2016.jpg/220px-George_Clooney_2016.jpg',
    'jon stewart': 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0e/Jon_Stewart_by_David_Shankbone.jpg/220px-Jon_Stewart_by_David_Shankbone.jpg',
    'kim kardashian': 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3e/Kim_Kardashian_2022.jpg/220px-Kim_Kardashian_2022.jpg',
    'lebron james': 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/cf/LeBron_James_crop.jpg/220px-LeBron_James_crop.jpg',
    'mark cuban': 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/20/Mark_Cuban_by_Gage_Skidmore.jpg/220px-Mark_Cuban_by_Gage_Skidmore.jpg',
    'oprah winfrey': 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/bf/Oprah_in_2014.jpg/220px-Oprah_in_2014.jpg',
    'oprah': 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/bf/Oprah_in_2014.jpg/220px-Oprah_in_2014.jpg',
    'tom brady': 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/48/Tom_Brady_2017.jpg/220px-Tom_Brady_2017.jpg',
    'chelsea clinton': 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/27/Chelsea_Clinton_at_British_Embassy%2C_January_8%2C_2024_%28cropped%29.jpg/220px-Chelsea_Clinton_at_British_Embassy%2C_January_8%2C_2024_%28cropped%29.jpg',
    'hunter biden': 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/34/R._Hunter_Biden_at_Center_for_Strategic_%26_International_Studies.jpg/220px-R._Hunter_Biden_at_Center_for_Strategic_%26_International_Studies.jpg',
    'stephen a smith': 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e6/Stephen_A._Smith_February_2020.jpg/220px-Stephen_A._Smith_February_2020.jpg',
    'stephen smith': 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e6/Stephen_A._Smith_February_2020.jpg/220px-Stephen_A._Smith_February_2020.jpg',
    'mrbeast': 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/ce/MrBeast_2023_%28cropped%29.jpg/220px-MrBeast_2023_%28cropped%29.jpg',

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

/**
 * Get all markets with their contracts and latest prices from all sources
 */
export function getMarkets(options?: {
  category?: MarketCategory;
  status?: 'open' | 'all';
  limit?: number;
}): Market[] {
  const db = getDb();

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

    // Convert to array and calculate aggregated prices
    const contracts = Array.from(contractsByCandidate.values()).map(contract => {
      // Calculate average price across all sources
      const avgPrice = contract.prices.reduce((sum, p) => sum + p.yesPrice, 0) / contract.prices.length;
      return {
        ...contract,
        aggregatedPrice: avgPrice,
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
