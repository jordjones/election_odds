/**
 * PostgreSQL database adapter for Supabase
 * Used in production when DATABASE_URL is set
 */

import { Pool, PoolClient } from 'pg';
import type { Market, Contract, MarketPrice, MarketCategory } from './types';

// PostgreSQL pool (lazy initialized)
let pool: Pool | null = null;

function getPool(): Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL not set');
    }
    pool = new Pool({
      connectionString,
      ssl: { rejectUnauthorized: false },
      max: 10,
    });
  }
  return pool;
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
  return 'other';
}

// Map canonical market types
function getCanonicalMarketType(marketName: string): string | null {
  const lower = marketName.toLowerCase();

  if (lower.includes('who will run') || lower.includes('will run for')) {
    return null;
  }

  if (lower.includes('district') || /\b(alabama|alaska|arizona|arkansas|california|colorado|connecticut|delaware|florida|georgia|hawaii|idaho|illinois|indiana|iowa|kansas|kentucky|louisiana|maine|maryland|massachusetts|michigan|minnesota|mississippi|montana|nebraska|nevada|new hampshire|new jersey|new mexico|new york|north carolina|north dakota|ohio|oklahoma|oregon|pennsylvania|rhode island|south carolina|south dakota|tennessee|texas|utah|vermont|virginia|washington|west virginia|wisconsin|wyoming)\b/.test(lower)) {
    return null;
  }

  if ((lower.includes('presidential election winner') ||
       lower.includes('win the 2028 us presidential election') ||
       lower.includes('2028 presidential election winner') ||
       lower.includes('next u.s. presidential election winner')) &&
      !lower.includes('party')) {
    return 'presidential-winner-2028';
  }

  if (lower.includes('2028') && lower.includes('president') &&
      (lower.includes('which party') || lower.includes('party win') || lower.includes('party wins'))) {
    return 'presidential-party-2028';
  }

  if (lower.includes('2026') && lower.includes('house') &&
      (lower.includes('which party') || lower.includes('party win') || lower.includes('control'))) {
    return 'house-control-2026';
  }

  if (lower.includes('2026') && lower.includes('senate') &&
      (lower.includes('which party') || lower.includes('party win') || lower.includes('party control')) &&
      !lower.includes('how many') && !lower.includes('seats')) {
    return 'senate-control-2026';
  }

  if (lower.includes('republican') &&
      (lower.includes('presidential') || lower.includes('for president')) &&
      (lower.includes('nominee') || lower.includes('nomination'))) {
    return 'gop-nominee-2028';
  }

  if (lower.includes('democratic') &&
      (lower.includes('presidential') || lower.includes('for president')) &&
      (lower.includes('nominee') || lower.includes('nomination'))) {
    return 'dem-nominee-2028';
  }

  return null;
}

// Extract candidate name from contract
function extractCandidateName(contractName: string, contractId?: string): string | null {
  if (contractName.endsWith(' - No')) {
    return null;
  }

  const cleanName = contractName.replace(/ - Yes$/, '');

  // Handle Kalshi KXPRESPERSON contracts
  if (contractId && contractId.startsWith('KXPRESPERSON-28-')) {
    const KALSHI_PERSON_MAP: Record<string, string> = {
      'JVAN': 'JD Vance', 'GNEWS': 'Gavin Newsom', 'MRUB': 'Marco Rubio',
      'AOCA': 'Alexandria Ocasio-Cortez', 'DTRU': 'Donald Trump', 'RDES': 'Ron DeSantis',
      'KHAR': 'Kamala Harris', 'JSHA': 'Josh Shapiro', 'PBUT': 'Pete Buttigieg',
    };
    const suffix = contractId.replace('KXPRESPERSON-28-', '');
    return KALSHI_PERSON_MAP[suffix] || null;
  }

  const willMatch = cleanName.match(/Will (.+?) (win|be the)/i);
  if (willMatch) {
    const name = willMatch[1].trim();
    if (/^Person [A-Z]{1,2}$/i.test(name) || name.toLowerCase() === 'another person') {
      return null;
    }
    return name;
  }

  if (cleanName.toLowerCase().includes('democrat')) return 'Democratic Party';
  if (cleanName.toLowerCase().includes('republican')) return 'Republican Party';
  if (cleanName.toLowerCase().startsWith('who will win')) return null;

  return cleanName;
}

// Normalize candidate name for matching
function normalizeCandidateName(name: string): string {
  return name.toLowerCase().replace(/\./g, '').replace(/\s+/g, ' ').trim();
}

// Get image URL for candidate
function getCandidateImageUrl(name: string): string | undefined {
  const images: Record<string, string> = {
    'jd vance': 'https://tile.loc.gov/storage-services/service/pnp/ppbd/11600/11612v.jpg',
    'donald trump': 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/56/Donald_Trump_official_portrait.jpg/400px-Donald_Trump_official_portrait.jpg',
    'marco rubio': 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f7/Official_portrait_of_Secretary_Marco_Rubio_%28cropped%29%282%29.jpg/400px-Official_portrait_of_Secretary_Marco_Rubio_%28cropped%29%282%29.jpg',
    'gavin newsom': 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/88/Governor_Gavin_Newsom_in_2025.jpg/400px-Governor_Gavin_Newsom_in_2025.jpg',
    'alexandria ocasio-cortez': 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4a/Alexandria_Ocasio-Cortez_Official_Portrait.jpg/400px-Alexandria_Ocasio-Cortez_Official_Portrait.jpg',
    'kamala harris': 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/35/Kamala_Harris_Vice_Presidential_Portrait_%28cropped_1%29.jpg/400px-Kamala_Harris_Vice_Presidential_Portrait_%28cropped_1%29.jpg',
    'ron desantis': 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4f/Ron_DeSantis_official_photo.jpg/400px-Ron_DeSantis_official_photo.jpg',
    'josh shapiro': 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/79/Josh_Shapiro_December_2025_B.jpg/400px-Josh_Shapiro_December_2025_B.jpg',
  };
  return images[normalizeCandidateName(name)];
}

// Create slug from market name
function createSlug(name: string, id: string): string {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50);
  return `${slug}-${id}`;
}

/**
 * Get all markets (PostgreSQL version)
 */
export async function getMarketsAsync(options?: {
  category?: MarketCategory;
  status?: 'open' | 'all';
  limit?: number;
  changePeriod?: string;
}): Promise<Market[]> {
  const pool = getPool();
  const client = await pool.connect();

  try {
    // Get all markets from all sources
    const marketsResult = await client.query(`
      SELECT DISTINCT
        m.id, m.source, m.market_id, m.market_name, m.category,
        m.status, m.url, m.total_volume, m.end_date
      FROM markets m
      WHERE (m.market_name LIKE '%2028%' OR m.market_name LIKE '%2026%' OR m.market_name LIKE '%Next U.S. Presidential%')
        AND m.source IN ('Polymarket', 'Kalshi', 'PredictIt', 'Smarkets')
      ORDER BY m.total_volume DESC NULLS LAST
    `);

    // Group markets by canonical type
    const marketsByType = new Map<string, any[]>();
    for (const market of marketsResult.rows) {
      const canonicalType = getCanonicalMarketType(market.market_name);
      if (canonicalType) {
        if (!marketsByType.has(canonicalType)) {
          marketsByType.set(canonicalType, []);
        }
        marketsByType.get(canonicalType)!.push(market);
      }
    }

    const markets: Market[] = [];

    for (const [canonicalType, relatedMarkets] of marketsByType) {
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

      if (options?.category && category !== options.category) {
        continue;
      }

      // Aggregate contracts from all sources
      const contractsByCandidate = new Map<string, Contract>();

      for (const dbMarket of relatedMarkets) {
        // Get contracts with latest prices
        const contractsResult = await client.query(`
          SELECT
            c.id, c.source, c.market_id, c.contract_id, c.contract_name,
            ps.yes_price, ps.no_price, ps.volume, ps.snapshot_time
          FROM contracts c
          INNER JOIN LATERAL (
            SELECT yes_price, no_price, volume, snapshot_time
            FROM price_snapshots
            WHERE source = c.source AND market_id = c.market_id AND contract_id = c.contract_id
            ORDER BY snapshot_time DESC
            LIMIT 1
          ) ps ON true
          WHERE c.market_id = $1 AND c.source = $2
          AND ps.yes_price IS NOT NULL AND ps.yes_price >= 0.001
        `, [dbMarket.market_id, dbMarket.source]);

        for (const contract of contractsResult.rows) {
          const candidateName = extractCandidateName(contract.contract_name, contract.contract_id);
          if (!candidateName) continue;

          const normalizedName = normalizeCandidateName(candidateName);
          const price: MarketPrice = {
            source: contract.source as any,
            region: contract.source === 'Polymarket' ? 'International' :
                   contract.source === 'Smarkets' ? 'UK' : 'US',
            yesPrice: parseFloat(contract.yes_price),
            noPrice: contract.no_price ? parseFloat(contract.no_price) : (1 - parseFloat(contract.yes_price)),
            yesBid: null,
            yesAsk: null,
            volume: contract.volume ? parseFloat(contract.volume) : 0,
            lastUpdated: contract.snapshot_time,
          };

          if (contractsByCandidate.has(normalizedName)) {
            const existing = contractsByCandidate.get(normalizedName)!;
            if (!existing.prices.find(p => p.source === price.source)) {
              existing.prices.push(price);
              existing.totalVolume += price.volume || 0;
            }
          } else {
            contractsByCandidate.set(normalizedName, {
              id: `${canonicalType}-${normalizedName}`,
              name: candidateName,
              shortName: candidateName.split(' ')[0],
              imageUrl: getCandidateImageUrl(candidateName),
              prices: [price],
              aggregatedPrice: parseFloat(contract.yes_price),
              priceChange: 0,
              totalVolume: price.volume || 0,
            });
          }
        }
      }

      // Calculate aggregated prices
      const contracts = Array.from(contractsByCandidate.values()).map(contract => ({
        ...contract,
        aggregatedPrice: contract.prices.reduce((sum, p) => sum + p.yesPrice, 0) / contract.prices.length,
      }));

      contracts.sort((a, b) => b.aggregatedPrice - a.aggregatedPrice);

      if (contracts.length === 0) continue;

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
        lastUpdated: new Date().toISOString(),
      });
    }

    if (options?.limit) {
      return markets.slice(0, options.limit);
    }

    return markets;
  } finally {
    client.release();
  }
}

/**
 * Get a specific market by ID
 */
export async function getMarketAsync(idOrSlug: string, changePeriod?: string): Promise<Market | null> {
  const markets = await getMarketsAsync({ changePeriod });
  return markets.find(m => m.id === idOrSlug || m.slug === idOrSlug || m.slug.includes(idOrSlug)) || null;
}

/**
 * Get featured markets
 */
export async function getFeaturedMarketsAsync(): Promise<Market[]> {
  const allMarkets = await getMarketsAsync();
  const featured: Market[] = [];

  const presidential = allMarkets.find(m => m.category === 'presidential' && !m.name.toLowerCase().includes('party'));
  if (presidential) featured.push(presidential);

  const gopPrimary = allMarkets.find(m => m.category === 'primary-gop');
  if (gopPrimary) featured.push(gopPrimary);

  const demPrimary = allMarkets.find(m => m.category === 'primary-dem');
  if (demPrimary) featured.push(demPrimary);

  const house = allMarkets.find(m => m.category === 'house');
  if (house) featured.push(house);

  return featured.slice(0, 4);
}

/**
 * Get chart data (simplified for PostgreSQL)
 */
export async function getChartDataAsync(
  marketId: string,
  startDate?: string,
  endDate?: string,
): Promise<{ timestamp: string; values: Record<string, number> }[]> {
  const pool = getPool();
  const client = await pool.connect();

  try {
    // Map market ID to Polymarket market ID
    const polymarketMapping: Record<string, string> = {
      'presidential-2028': '31552',
      'presidential-winner-2028': '31552',
      'gop-primary-2028': '31875',
      'gop-nominee-2028': '31875',
      'dem-primary-2028': '30829',
      'dem-nominee-2028': '30829',
    };

    const dbMarketId = polymarketMapping[marketId] || marketId;

    let query = `
      SELECT
        DATE(snapshot_time) as date,
        c.contract_name,
        AVG(ps.yes_price) as avg_price
      FROM price_snapshots ps
      JOIN contracts c ON ps.source = c.source AND ps.market_id = c.market_id AND ps.contract_id = c.contract_id
      WHERE ps.source = 'Polymarket' AND ps.market_id = $1
    `;

    const params: any[] = [dbMarketId];
    let paramIndex = 2;

    if (startDate) {
      query += ` AND ps.snapshot_time >= $${paramIndex}`;
      params.push(startDate);
      paramIndex++;
    }

    if (endDate) {
      query += ` AND ps.snapshot_time <= $${paramIndex}`;
      params.push(endDate);
      paramIndex++;
    }

    query += ` GROUP BY DATE(snapshot_time), c.contract_name ORDER BY date`;

    const result = await client.query(query, params);

    // Group by date
    const byDate = new Map<string, Record<string, number>>();
    for (const row of result.rows) {
      const dateStr = row.date.toISOString().slice(0, 10);
      if (!byDate.has(dateStr)) {
        byDate.set(dateStr, {});
      }

      // Extract candidate name from contract name
      const candidateName = extractCandidateName(row.contract_name);
      if (candidateName) {
        const shortName = candidateName.split(' ').pop() || candidateName;
        byDate.get(dateStr)![shortName] = parseFloat(row.avg_price) * 100;
      }
    }

    return Array.from(byDate.entries()).map(([date, values]) => ({
      timestamp: `${date}T00:00:00Z`,
      values,
    }));
  } finally {
    client.release();
  }
}

/**
 * Check if PostgreSQL is available
 */
export function isPostgresAvailable(): boolean {
  return !!process.env.DATABASE_URL;
}

/**
 * Get stats (PostgreSQL version)
 */
export async function getStatsAsync() {
  const pool = getPool();
  const client = await pool.connect();

  try {
    const marketCount = await client.query('SELECT COUNT(DISTINCT market_id) as count FROM markets');
    const contractCount = await client.query('SELECT COUNT(*) as count FROM contracts');

    return {
      totalMarkets: parseInt(marketCount.rows[0].count),
      totalContracts: parseInt(contractCount.rows[0].count),
      totalVolume: 0,
      lastUpdated: new Date().toISOString(),
      sourceBreakdown: {
        PredictIt: 0,
        Kalshi: 0,
        Polymarket: 0,
        Smarkets: 0,
      },
    };
  } finally {
    client.release();
  }
}
