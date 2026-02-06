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
    // Use bracket notation to prevent Next.js/webpack from replacing at build time
    const connectionString = (process.env as Record<string, string | undefined>)['DATABASE_URL'];
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
  let normalized = name
    .toLowerCase()
    .replace(/\./g, '')
    .replace(/[\u0027\u0060\u00B4\u2018\u2019\u201B\u2032\u02B9\u02BC]/g, "'")
    .replace(/\s+/g, ' ')
    .trim();

  const nameAliases: Record<string, string> = {
    'a ocasio-cortez': 'alexandria ocasio-cortez',
    'aoc': 'alexandria ocasio-cortez',
    'ocasio-cortez': 'alexandria ocasio-cortez',
    'donald j trump': 'donald trump',
    'donald j trump jr': 'donald trump jr',
    'm taylor greene': 'marjorie taylor greene',
    'mtg': 'marjorie taylor greene',
    'mayor pete': 'pete buttigieg',
    'j hawley': 'josh hawley',
    'g youngkin': 'glenn youngkin',
    "beto o'rourke": "beto o'rourke",
    'beto orourke': "beto o'rourke",
    'stephen smith': 'stephen a smith',
  };

  return nameAliases[normalized] || normalized;
}

// Get image URL for candidate
function getCandidateImageUrl(name: string): string | undefined {
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
    // Independents / Other
    'robert f kennedy jr': 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/66/Robert_F._Kennedy_Jr.%2C_official_portrait_%282025%29_%28cropped_3-4%29.jpg/400px-Robert_F._Kennedy_Jr.%2C_official_portrait_%282025%29_%28cropped_3-4%29.jpg',
    'robert f kennedy jr.': 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/66/Robert_F._Kennedy_Jr.%2C_official_portrait_%282025%29_%28cropped_3-4%29.jpg/400px-Robert_F._Kennedy_Jr.%2C_official_portrait_%282025%29_%28cropped_3-4%29.jpg',
    'elon musk': 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/34/Elon_Musk_Royal_Society_%28crop2%29.jpg/400px-Elon_Musk_Royal_Society_%28crop2%29.jpg',
    // Celebrities and business
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
    // Trump family
    'eric trump': 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/03/Consensus_2025_-_Eric_Trump_10_%283x4_cropped%29.jpg/400px-Consensus_2025_-_Eric_Trump_10_%283x4_cropped%29.jpg',
    'lara trump': 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e4/Lara_Trump_2025_%28cropped%29.jpg/400px-Lara_Trump_2025_%28cropped%29.jpg',
    'jared kushner': 'https://upload.wikimedia.org/wikipedia/commons/3/3e/Jared_Kushner_2025.jpg',
    // Media and business
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
    // Cabinet
    'pete hegseth': 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2f/Pete_Hegseth_Official_Portrait.jpg/400px-Pete_Hegseth_Official_Portrait.jpg',
    // State officials
    'mallory mcmorrow': 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b7/Mallory_McMorrow_%28cropped%29.jpg/400px-Mallory_McMorrow_%28cropped%29.jpg',
    'jocelyn benson': 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/57/SOS_Jocelyn_Benson_web.jpg/400px-SOS_Jocelyn_Benson_web.jpg',
    'garlin gilchrist': 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/73/8R4A9159_%2853359280492%29_%28Garlin_Gilchrist%29.jpg/400px-8R4A9159_%2853359280492%29_%28Garlin_Gilchrist%29.jpg',
    'peggy flanagan': 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c4/2023PeggyFlanaganLtGovMN.jpg/400px-2023PeggyFlanaganLtGovMN.jpg',
    'juliana stratton': 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a8/Juliana_Stratton_2023_%28cropped%29.jpg/400px-Juliana_Stratton_2023_%28cropped%29.jpg',
  };
  return candidateImages[normalizeCandidateName(name)];
}

// Create slug from market name
function createSlug(name: string, id: string): string {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50);
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
 * Get historical prices from electionbettingodds for change calculation (PostgreSQL version)
 */
async function getChartBasedPriceChangesAsync(
  client: any,
  dbMarketId: string,
  changePeriod: string
): Promise<Map<string, { current: number; historical: number }>> {
  const changeTimestamp = getChangePeriodTimestamp(changePeriod);
  const result = new Map<string, { current: number; historical: number }>();

  // Get the most recent prices from electionbettingodds (current)
  const currentPricesResult = await client.query(`
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
    WHERE c.source = 'electionbettingodds' AND c.market_id = $1
    AND ps.yes_price IS NOT NULL
  `, [dbMarketId]);

  // Get the historical prices (closest to the change period timestamp)
  const historicalPricesResult = await client.query(`
    SELECT
      c.contract_name,
      ps.yes_price
    FROM contracts c
    INNER JOIN (
      SELECT contract_id, market_id, source, yes_price, snapshot_time,
             ROW_NUMBER() OVER (PARTITION BY contract_id ORDER BY snapshot_time DESC) as rn
      FROM price_snapshots
      WHERE source = 'electionbettingodds' AND snapshot_time <= $1
    ) ps ON ps.contract_id = c.contract_id AND ps.market_id = c.market_id AND ps.source = c.source AND ps.rn = 1
    WHERE c.source = 'electionbettingodds' AND c.market_id = $2
    AND ps.yes_price IS NOT NULL
  `, [changeTimestamp, dbMarketId]);

  // Build the result map with current prices
  for (const row of currentPricesResult.rows) {
    result.set(row.contract_name.toLowerCase(), {
      current: parseFloat(row.yes_price),
      historical: parseFloat(row.yes_price),
    });
  }

  // Update with historical prices
  for (const row of historicalPricesResult.rows) {
    const key = row.contract_name.toLowerCase();
    if (result.has(key)) {
      result.get(key)!.historical = parseFloat(row.yes_price);
    }
  }

  return result;
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
  const changePeriod = options?.changePeriod || '1d';

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

      // Get chart-based price changes from electionbettingodds
      const eboMarketId = canonicalType === 'presidential-winner-2028' ? 'president_2028' :
                          canonicalType === 'gop-nominee-2028' ? 'president_2028' :
                          canonicalType === 'dem-nominee-2028' ? 'president_2028' : null;

      const chartPriceChanges = eboMarketId
        ? await getChartBasedPriceChangesAsync(client, eboMarketId, changePeriod)
        : new Map<string, { current: number; historical: number }>();

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

      // Calculate aggregated prices and price changes
      const contracts = Array.from(contractsByCandidate.values()).map(contract => {
        const avgPrice = contract.prices.reduce((sum, p) => sum + p.yesPrice, 0) / contract.prices.length;

        // Calculate price change from electionbettingodds chart data
        let priceChange = 0;
        const shortName = contract.name.split(' ').pop()?.toLowerCase() || '';
        const firstName = contract.name.split(' ')[0]?.toLowerCase() || '';
        // Also try last segment after hyphen (e.g. "Ocasio-Cortez" -> "cortez")
        const lastHyphenPart = shortName.includes('-') ? shortName.split('-').pop() || '' : '';
        const chartData = chartPriceChanges.get(shortName) ||
                          chartPriceChanges.get(firstName) ||
                          chartPriceChanges.get(contract.name.toLowerCase()) ||
                          (lastHyphenPart ? chartPriceChanges.get(lastHyphenPart) : undefined);
        if (chartData) {
          priceChange = chartData.current - chartData.historical;
        }

        return {
          ...contract,
          aggregatedPrice: avgPrice,
          priceChange,
        };
      });

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
  // Use bracket notation to prevent Next.js/webpack from replacing at build time
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return !!(process.env as any)['DATABASE_URL'];
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
