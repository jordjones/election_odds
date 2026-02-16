/**
 * PostgreSQL database adapter for Supabase
 * Used in production when DATABASE_URL is set
 */

import { Pool, PoolClient } from "pg";
import type { Market, Contract, MarketPrice, MarketCategory } from "./types";
import type { CuratedPostRow, PulseTopic } from "./pulse-types";

// PostgreSQL pool (lazy initialized)
let pool: Pool | null = null;

function getPool(): Pool {
  if (!pool) {
    // Use bracket notation to prevent Next.js/webpack from replacing at build time
    const connectionString = (
      process.env as Record<string, string | undefined>
    )["DATABASE_URL"];
    if (!connectionString) {
      throw new Error("DATABASE_URL not set");
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

  if (
    lowerName.includes("republican") &&
    (lowerName.includes("nomination") ||
      lowerName.includes("nominee") ||
      lowerName.includes("primary"))
  ) {
    return "primary-gop";
  }
  if (
    lowerName.includes("democratic") &&
    (lowerName.includes("nomination") ||
      lowerName.includes("nominee") ||
      lowerName.includes("primary"))
  ) {
    return "primary-dem";
  }
  if (lowerName.includes("president") && lowerName.includes("party")) {
    return "presidential";
  }
  if (lowerName.includes("president") || lowerName.includes("presidency")) {
    return "presidential";
  }
  if (lowerName.includes("house")) {
    return "house";
  }
  if (lowerName.includes("senate")) {
    return "senate";
  }
  return "other";
}

// Map canonical market types
function getCanonicalMarketType(marketName: string): string | null {
  const lower = marketName.toLowerCase();

  if (lower.includes("who will run") || lower.includes("will run for")) {
    return null;
  }

  if (
    lower.includes("district") ||
    /\b(alabama|alaska|arizona|arkansas|california|colorado|connecticut|delaware|florida|georgia|hawaii|idaho|illinois|indiana|iowa|kansas|kentucky|louisiana|maine|maryland|massachusetts|michigan|minnesota|mississippi|montana|nebraska|nevada|new hampshire|new jersey|new mexico|new york|north carolina|north dakota|ohio|oklahoma|oregon|pennsylvania|rhode island|south carolina|south dakota|tennessee|texas|utah|vermont|virginia|washington|west virginia|wisconsin|wyoming)\b/.test(
      lower,
    )
  ) {
    return null;
  }

  if (
    (lower.includes("presidential election winner") ||
      lower.includes("win the 2028 us presidential election") ||
      lower.includes("2028 presidential election winner") ||
      lower.includes("next u.s. presidential election winner")) &&
    !lower.includes("party")
  ) {
    return "presidential-winner-2028";
  }

  if (
    lower.includes("2028") &&
    (lower.includes("which party") ||
      lower.includes("party win") ||
      lower.includes("party wins") ||
      lower.includes("winning party")) &&
    (lower.includes("president") || lower.includes("winning party"))
  ) {
    return "presidential-party-2028";
  }

  if (
    ((lower.includes("2026") || lower.includes("midterm")) &&
      lower.includes("house") &&
      (lower.includes("which party") ||
        lower.includes("party win") ||
        lower.includes("control"))) ||
    (lower.includes("house of representatives") &&
      lower.includes("which party"))
  ) {
    return "house-control-2026";
  }

  if (
    (((lower.includes("2026") || lower.includes("midterm")) &&
      lower.includes("senate") &&
      (lower.includes("which party") ||
        lower.includes("party win") ||
        lower.includes("party control") ||
        lower.includes("control"))) ||
      (lower.includes("u.s. senate") && lower.includes("which party"))) &&
    !lower.includes("how many") &&
    !lower.includes("seats")
  ) {
    return "senate-control-2026";
  }

  if (
    lower.includes("republican") &&
    (lower.includes("presidential") || lower.includes("for president")) &&
    (lower.includes("nominee") || lower.includes("nomination"))
  ) {
    return "gop-nominee-2028";
  }

  if (
    lower.includes("democratic") &&
    (lower.includes("presidential") || lower.includes("for president")) &&
    (lower.includes("nominee") || lower.includes("nomination"))
  ) {
    return "dem-nominee-2028";
  }

  return null;
}

// Extract candidate name from contract
function extractCandidateName(
  contractName: string,
  contractId?: string,
): string | null {
  if (contractName.endsWith(" - No")) {
    return null;
  }

  const cleanName = contractName.replace(/ - Yes$/, "");

  // Handle Kalshi KXPRESPERSON contracts
  if (contractId && contractId.startsWith("KXPRESPERSON-28-")) {
    const KALSHI_PERSON_MAP: Record<string, string> = {
      JVAN: "JD Vance",
      GNEWS: "Gavin Newsom",
      MRUB: "Marco Rubio",
      AOCA: "Alexandria Ocasio-Cortez",
      DTRU: "Donald Trump",
      RDES: "Ron DeSantis",
      KHAR: "Kamala Harris",
      JSHA: "Josh Shapiro",
      PBUT: "Pete Buttigieg",
    };
    const suffix = contractId.replace("KXPRESPERSON-28-", "");
    return KALSHI_PERSON_MAP[suffix] || null;
  }

  const willMatch = cleanName.match(/Will (.+?) (win|be the|control)/i);
  if (willMatch) {
    let name = willMatch[1].trim();
    // Strip leading "the" for party names (e.g. "the Republicans" → "Republicans")
    name = name.replace(/^the\s+/i, "");
    if (
      /^Person [A-Z]{1,2}$/i.test(name) ||
      /^Player [A-Z]{1,2}$/i.test(name) ||
      name.toLowerCase() === "another person" ||
      name.toLowerCase() === "any other person" ||
      name.toLowerCase() === "another candidate"
    ) {
      return null;
    }
    // Check for party names after stripping "the"
    if (/^democrat(s|ic|ics|ic party)?$/i.test(name.trim()))
      return "Democratic Party";
    if (/^republican(s| party)?$/i.test(name.trim())) return "Republican Party";
    return name;
  }

  // Only return party names for party-control contracts (e.g., "Democrats" or "Republican Party"),
  // not for nominee contracts that happen to mention the party name
  const lowerClean = cleanName.toLowerCase();
  if (/^democrat(s|ic|ics|ic party)?$/i.test(cleanName.trim()))
    return "Democratic Party";
  if (/^republican(s| party)?$/i.test(cleanName.trim()))
    return "Republican Party";
  if (lowerClean.includes("a trump family member")) return null;
  if (cleanName.toLowerCase().startsWith("who will win")) return null;

  return cleanName;
}

// Normalize candidate name for matching
function normalizeCandidateName(name: string): string {
  let normalized = name
    .toLowerCase()
    .replace(/\./g, "")
    .replace(/[\u0027\u0060\u00B4\u2018\u2019\u201B\u2032\u02B9\u02BC]/g, "'")
    .replace(/\s+/g, " ")
    .trim();

  const nameAliases: Record<string, string> = {
    "a ocasio-cortez": "alexandria ocasio-cortez",
    aoc: "alexandria ocasio-cortez",
    "ocasio-cortez": "alexandria ocasio-cortez",
    "donald j trump": "donald trump",
    "donald j trump jr": "donald trump jr",
    "m taylor greene": "marjorie taylor greene",
    mtg: "marjorie taylor greene",
    "mayor pete": "pete buttigieg",
    "j hawley": "josh hawley",
    "g youngkin": "glenn youngkin",
    "beto o'rourke": "beto o'rourke",
    "beto orourke": "beto o'rourke",
    "stephen smith": "stephen a smith",
  };

  return nameAliases[normalized] || normalized;
}

// Get image URL for candidate
function getCandidateImageUrl(name: string): string | undefined {
  const candidateImages: Record<string, string> = {
    // Republicans
    "jd vance":
      "https://tile.loc.gov/storage-services/service/pnp/ppbd/11600/11612v.jpg",
    "donald trump":
      "https://upload.wikimedia.org/wikipedia/commons/thumb/5/56/Donald_Trump_official_portrait.jpg/400px-Donald_Trump_official_portrait.jpg",
    "donald trump jr":
      "https://upload.wikimedia.org/wikipedia/commons/thumb/1/19/Donald_Trump%2C_Jr._%2855021618832%29_%28cropped%29.jpg/400px-Donald_Trump%2C_Jr._%2855021618832%29_%28cropped%29.jpg",
    "marco rubio":
      "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f7/Official_portrait_of_Secretary_Marco_Rubio_%28cropped%29%282%29.jpg/400px-Official_portrait_of_Secretary_Marco_Rubio_%28cropped%29%282%29.jpg",
    "ron desantis":
      "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4f/Ron_DeSantis_official_photo.jpg/400px-Ron_DeSantis_official_photo.jpg",
    "nikki haley":
      "https://upload.wikimedia.org/wikipedia/commons/thumb/7/75/Nikki_Haley_official_photo.jpg/400px-Nikki_Haley_official_photo.jpg",
    "glenn youngkin":
      "https://upload.wikimedia.org/wikipedia/commons/thumb/2/27/Youngkin_Governor_Portrait.jpg/400px-Youngkin_Governor_Portrait.jpg",
    "vivek ramaswamy":
      "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d4/Vivek_Ramaswamy_December_2025.jpg/400px-Vivek_Ramaswamy_December_2025.jpg",
    "ted cruz":
      "https://upload.wikimedia.org/wikipedia/commons/thumb/8/81/Ted_Cruz_official_116th_portrait_%283x4_cropped%29.jpg/400px-Ted_Cruz_official_116th_portrait_%283x4_cropped%29.jpg",
    "josh hawley":
      "https://upload.wikimedia.org/wikipedia/commons/thumb/3/31/Josh_Hawley%2C_official_portrait%2C_116th_congress.jpg/400px-Josh_Hawley%2C_official_portrait%2C_116th_congress.jpg",
    "sarah sanders":
      "https://upload.wikimedia.org/wikipedia/commons/thumb/4/49/Governor_Sarah_Huckabee_Sanders_%28cropped%29.jpg/400px-Governor_Sarah_Huckabee_Sanders_%28cropped%29.jpg",
    "sarah huckabee sanders":
      "https://upload.wikimedia.org/wikipedia/commons/thumb/4/49/Governor_Sarah_Huckabee_Sanders_%28cropped%29.jpg/400px-Governor_Sarah_Huckabee_Sanders_%28cropped%29.jpg",
    "tulsi gabbard":
      "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7a/Director_Tulsi_Gabbard_Official_Portrait.jpg/400px-Director_Tulsi_Gabbard_Official_Portrait.jpg",
    "brian kemp":
      "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4f/Governor_Kemp_Speaks_%2850838807672%29_%28cropped%29.jpg/400px-Governor_Kemp_Speaks_%2850838807672%29_%28cropped%29.jpg",
    "greg abbott":
      "https://upload.wikimedia.org/wikipedia/commons/thumb/d/db/Greg_Abbott_at_NASA_2024_%28cropped%29.jpg/400px-Greg_Abbott_at_NASA_2024_%28cropped%29.jpg",
    "mike pence":
      "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b9/Mike_Pence_official_Vice_Presidential_portrait.jpg/400px-Mike_Pence_official_Vice_Presidential_portrait.jpg",
    "kristi noem":
      "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2a/Official_Portrait_of_Secretary_Kristi_Noem.jpg/400px-Official_Portrait_of_Secretary_Kristi_Noem.jpg",
    "rand paul":
      "https://upload.wikimedia.org/wikipedia/commons/thumb/7/78/Rand_Paul%2C_official_portrait%2C_112th_Congress_alternate.jpg/400px-Rand_Paul%2C_official_portrait%2C_112th_Congress_alternate.jpg",
    "tom cotton":
      "https://upload.wikimedia.org/wikipedia/commons/thumb/4/49/Tom_Cotton_official_Senate_photo.jpg/400px-Tom_Cotton_official_Senate_photo.jpg",
    "liz cheney":
      "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9a/Liz_Cheney_official_116th_Congress_portrait.jpg/400px-Liz_Cheney_official_116th_Congress_portrait.jpg",
    "elise stefanik":
      "https://upload.wikimedia.org/wikipedia/commons/8/89/Elise_Stefanik_portrait_%28118th_Congress%29.jpg",
    "matt gaetz":
      "https://upload.wikimedia.org/wikipedia/commons/thumb/3/37/Matt_Gaetz%2C_official_portrait%2C_116th_Congress.jpg/400px-Matt_Gaetz%2C_official_portrait%2C_116th_Congress.jpg",
    "marjorie taylor greene":
      "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e7/Marjorie_Taylor_Greene_117th_Congress_portrait.jpeg/400px-Marjorie_Taylor_Greene_117th_Congress_portrait.jpeg",
    "byron donalds":
      "https://upload.wikimedia.org/wikipedia/commons/5/53/Byron_Donalds_portrait_%28118th_Congress%29.jpg",
    "john thune":
      "https://upload.wikimedia.org/wikipedia/commons/thumb/1/15/John_Thune_117th_Congress_portrait.jpg/400px-John_Thune_117th_Congress_portrait.jpg",
    "katie britt":
      "https://upload.wikimedia.org/wikipedia/commons/3/3b/Katie_Boyd_Britt_official_Senate_photo.jpg",
    "thomas massie":
      "https://upload.wikimedia.org/wikipedia/commons/0/09/Thomas_Massie_official_portrait%2C_2022.jpg",
    "tucker carlson":
      "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3b/Tucker_Carlson_2025_%28cropped%29.jpg/400px-Tucker_Carlson_2025_%28cropped%29.jpg",
    "steve bannon":
      "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7b/Steve_Bannon_by_Gage_Skidmore.jpg/400px-Steve_Bannon_by_Gage_Skidmore.jpg",
    // Democrats
    "gavin newsom":
      "https://upload.wikimedia.org/wikipedia/commons/thumb/8/88/Governor_Gavin_Newsom_in_2025.jpg/400px-Governor_Gavin_Newsom_in_2025.jpg",
    "alexandria ocasio-cortez":
      "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4a/Alexandria_Ocasio-Cortez_Official_Portrait.jpg/400px-Alexandria_Ocasio-Cortez_Official_Portrait.jpg",
    "kamala harris":
      "https://upload.wikimedia.org/wikipedia/commons/thumb/3/35/Kamala_Harris_Vice_Presidential_Portrait_%28cropped_1%29.jpg/400px-Kamala_Harris_Vice_Presidential_Portrait_%28cropped_1%29.jpg",
    "josh shapiro":
      "https://upload.wikimedia.org/wikipedia/commons/thumb/7/79/Josh_Shapiro_December_2025_B.jpg/400px-Josh_Shapiro_December_2025_B.jpg",
    "pete buttigieg":
      "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2e/Pete_Buttigieg%2C_Secretary_of_Transportation.jpg/400px-Pete_Buttigieg%2C_Secretary_of_Transportation.jpg",
    "gretchen whitmer":
      "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2e/2025_Gretchen_Whitmer_%28cropped%29.jpg/400px-2025_Gretchen_Whitmer_%28cropped%29.jpg",
    "andy beshear":
      "https://upload.wikimedia.org/wikipedia/commons/thumb/c/cf/Andy_Beshear_2024_%28cropped%29.jpg/400px-Andy_Beshear_2024_%28cropped%29.jpg",
    "jb pritzker":
      "https://upload.wikimedia.org/wikipedia/commons/thumb/5/53/Governor_JB_Pritzker_official_portrait_2019_%28crop%29.jpg/400px-Governor_JB_Pritzker_official_portrait_2019_%28crop%29.jpg",
    "jon ossoff":
      "https://upload.wikimedia.org/wikipedia/commons/thumb/9/97/Jon_Ossoff_Senate_Portrait_2021.jpg/400px-Jon_Ossoff_Senate_Portrait_2021.jpg",
    "wes moore":
      "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c3/Wes_Moore_Official_Governor_Portrait.jpg/400px-Wes_Moore_Official_Governor_Portrait.jpg",
    "tim walz":
      "https://upload.wikimedia.org/wikipedia/commons/thumb/6/61/TimWalz2025.jpg/400px-TimWalz2025.jpg",
    "mark kelly":
      "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e1/Mark_Kelly%2C_Official_Portrait_117th.jpg/400px-Mark_Kelly%2C_Official_Portrait_117th.jpg",
    "cory booker":
      "https://upload.wikimedia.org/wikipedia/commons/thumb/2/24/Cory_Booker%2C_official_portrait_%28119th_Congress%29.jpg/400px-Cory_Booker%2C_official_portrait_%28119th_Congress%29.jpg",
    "amy klobuchar":
      "https://upload.wikimedia.org/wikipedia/commons/thumb/c/cc/Amy_Klobuchar_2025.jpg/400px-Amy_Klobuchar_2025.jpg",
    "bernie sanders":
      "https://upload.wikimedia.org/wikipedia/commons/thumb/d/de/Bernie_Sanders.jpg/400px-Bernie_Sanders.jpg",
    "elizabeth warren":
      "https://upload.wikimedia.org/wikipedia/commons/thumb/1/10/Elizabeth_Warren%2C_official_portrait%2C_116th_Congress_%28cropped%29.jpg/400px-Elizabeth_Warren%2C_official_portrait%2C_116th_Congress_%28cropped%29.jpg",
    "michelle obama":
      "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4b/Michelle_Obama_2013_official_portrait.jpg/400px-Michelle_Obama_2013_official_portrait.jpg",
    "john fetterman":
      "https://upload.wikimedia.org/wikipedia/commons/thumb/e/ea/John_Fetterman_official_portrait.jpg/400px-John_Fetterman_official_portrait.jpg",
    "barack obama":
      "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8d/President_Barack_Obama.jpg/400px-President_Barack_Obama.jpg",
    "hillary clinton":
      "https://upload.wikimedia.org/wikipedia/commons/thumb/2/27/Hillary_Clinton_official_Secretary_of_State_portrait_crop.jpg/400px-Hillary_Clinton_official_Secretary_of_State_portrait_crop.jpg",
    "andrew cuomo":
      "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0e/Governor_Andrew_Cuomo_in_2021.jpg/400px-Governor_Andrew_Cuomo_in_2021.jpg",
    "andrew yang":
      "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f6/Andrew_Yang_by_Gage_Skidmore.jpg/400px-Andrew_Yang_by_Gage_Skidmore.jpg",
    "beto o'rourke":
      "https://upload.wikimedia.org/wikipedia/commons/thumb/a/ad/Beto_O%27Rourke%2C_Official_portrait%2C_113th_Congress.jpg/400px-Beto_O%27Rourke%2C_Official_portrait%2C_113th_Congress.jpg",
    "chris murphy":
      "https://upload.wikimedia.org/wikipedia/commons/thumb/c/ca/Chris_Murphy%2C_official_portrait%2C_113th_Congress.jpg/400px-Chris_Murphy%2C_official_portrait%2C_113th_Congress.jpg",
    "elissa slotkin":
      "https://upload.wikimedia.org/wikipedia/commons/thumb/9/97/Elissa_Slotkin_2026_Official_Portrait.jpg/400px-Elissa_Slotkin_2026_Official_Portrait.jpg",
    "gina raimondo":
      "https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/Gina_Raimondo.jpg/400px-Gina_Raimondo.jpg",
    "erika kirk":
      "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3a/AmericaFest_2025_-_Erika_Kirk_23_%28cropped%29.jpg/400px-AmericaFest_2025_-_Erika_Kirk_23_%28cropped%29.jpg",
    "jared polis":
      "https://upload.wikimedia.org/wikipedia/commons/thumb/d/dc/Governor_Jared_Polis_2023_%28cropped%29.jpg/400px-Governor_Jared_Polis_2023_%28cropped%29.jpg",
    "rahm emanuel":
      "https://upload.wikimedia.org/wikipedia/commons/thumb/7/73/Ambassador-emanuel-portrait.jpg/400px-Ambassador-emanuel-portrait.jpg",
    "raphael warnock":
      "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a3/Raphael_Warnock_official_photo.jpg/400px-Raphael_Warnock_official_photo.jpg",
    "ro khanna":
      "https://upload.wikimedia.org/wikipedia/commons/thumb/1/16/Ro_Khanna%2C_official_portrait%2C_115th_Congress_%283x4%29.jpg/400px-Ro_Khanna%2C_official_portrait%2C_115th_Congress_%283x4%29.jpg",
    "roy cooper":
      "https://upload.wikimedia.org/wikipedia/commons/thumb/7/72/Gov._Cooper_Cropped.jpg/400px-Gov._Cooper_Cropped.jpg",
    "ruben gallego":
      "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b7/Senator_Ruben_Gallego_Official_Portrait.jpg/400px-Senator_Ruben_Gallego_Official_Portrait.jpg",
    "phil murphy":
      "https://upload.wikimedia.org/wikipedia/commons/thumb/7/70/Philip_D._Murphy_%28cropped%29.jpg/400px-Philip_D._Murphy_%28cropped%29.jpg",
    "jasmine crockett":
      "https://upload.wikimedia.org/wikipedia/commons/thumb/7/70/Congresswoman_Jasmine_Crockett_-_118th_Congress.png/400px-Congresswoman_Jasmine_Crockett_-_118th_Congress.png",
    "zohran mamdani":
      "https://upload.wikimedia.org/wikipedia/commons/thumb/5/59/Zohran_Mamdani_05.25.25_%28b%29_%28cropped%29.jpg/400px-Zohran_Mamdani_05.25.25_%28b%29_%28cropped%29.jpg",
    "james talarico":
      "https://upload.wikimedia.org/wikipedia/commons/thumb/5/58/James_Talarico_Press_Conference_3x4_%28cropped%29.jpg/400px-James_Talarico_Press_Conference_3x4_%28cropped%29.jpg",
    // Independents / Other
    "robert f kennedy jr":
      "https://upload.wikimedia.org/wikipedia/commons/thumb/6/66/Robert_F._Kennedy_Jr.%2C_official_portrait_%282025%29_%28cropped_3-4%29.jpg/400px-Robert_F._Kennedy_Jr.%2C_official_portrait_%282025%29_%28cropped_3-4%29.jpg",
    "robert f kennedy jr.":
      "https://upload.wikimedia.org/wikipedia/commons/thumb/6/66/Robert_F._Kennedy_Jr.%2C_official_portrait_%282025%29_%28cropped_3-4%29.jpg/400px-Robert_F._Kennedy_Jr.%2C_official_portrait_%282025%29_%28cropped_3-4%29.jpg",
    "elon musk":
      "https://upload.wikimedia.org/wikipedia/commons/thumb/3/34/Elon_Musk_Royal_Society_%28crop2%29.jpg/400px-Elon_Musk_Royal_Society_%28crop2%29.jpg",
    // Celebrities and business
    "jamie dimon":
      "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8c/Chancellor_Rachel_Reeves_meets_Jamie_Dimon_%2854838700663%29_%28cropped%29.jpg/400px-Chancellor_Rachel_Reeves_meets_Jamie_Dimon_%2854838700663%29_%28cropped%29.jpg",
    "ivanka trump":
      "https://upload.wikimedia.org/wikipedia/commons/thumb/e/ea/Ivanka_Trump_official_portrait_2020.jpg/400px-Ivanka_Trump_official_portrait_2020.jpg",
    "dwayne johnson":
      "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1f/Dwayne_Johnson_2014_%28cropped%29.jpg/400px-Dwayne_Johnson_2014_%28cropped%29.jpg",
    "dwayne 'the rock' johnson":
      "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1f/Dwayne_Johnson_2014_%28cropped%29.jpg/400px-Dwayne_Johnson_2014_%28cropped%29.jpg",
    "george clooney":
      "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8d/George_Clooney_2016.jpg/400px-George_Clooney_2016.jpg",
    "jon stewart":
      "https://upload.wikimedia.org/wikipedia/commons/thumb/f/fd/JonStewart-byPhilipRomano.jpg/400px-JonStewart-byPhilipRomano.jpg",
    "kim kardashian":
      "https://upload.wikimedia.org/wikipedia/commons/thumb/d/df/Kim_Kardashian_West_2014.jpg/400px-Kim_Kardashian_West_2014.jpg",
    "lebron james":
      "https://upload.wikimedia.org/wikipedia/commons/thumb/c/cf/LeBron_James_crop.jpg/400px-LeBron_James_crop.jpg",
    "mark cuban":
      "https://upload.wikimedia.org/wikipedia/commons/thumb/6/65/MarkCuban2023.jpg/400px-MarkCuban2023.jpg",
    "oprah winfrey":
      "https://upload.wikimedia.org/wikipedia/commons/thumb/b/bf/Oprah_in_2014.jpg/400px-Oprah_in_2014.jpg",
    oprah:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/b/bf/Oprah_in_2014.jpg/400px-Oprah_in_2014.jpg",
    "tom brady":
      "https://upload.wikimedia.org/wikipedia/commons/thumb/c/cb/Tom_Brady_2021.png/400px-Tom_Brady_2021.png",
    "chelsea clinton":
      "https://upload.wikimedia.org/wikipedia/commons/thumb/8/86/Chelsea_Clinton_by_Gage_Skidmore.jpg/400px-Chelsea_Clinton_by_Gage_Skidmore.jpg",
    "hunter biden":
      "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8a/Hunter_Biden_September_30%2C_2014.jpg/400px-Hunter_Biden_September_30%2C_2014.jpg",
    "stephen a smith":
      "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7d/Stephen_A._Smith_in_January_2023_%283x4_cropped_b%29.jpg/400px-Stephen_A._Smith_in_January_2023_%283x4_cropped_b%29.jpg",
    "stephen smith":
      "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7d/Stephen_A._Smith_in_January_2023_%283x4_cropped_b%29.jpg/400px-Stephen_A._Smith_in_January_2023_%283x4_cropped_b%29.jpg",
    mrbeast:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/c/ce/MrBeast_2023_%28cropped%29.jpg/400px-MrBeast_2023_%28cropped%29.jpg",
    // Trump family
    "eric trump":
      "https://upload.wikimedia.org/wikipedia/commons/thumb/0/03/Consensus_2025_-_Eric_Trump_10_%283x4_cropped%29.jpg/400px-Consensus_2025_-_Eric_Trump_10_%283x4_cropped%29.jpg",
    "lara trump":
      "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e4/Lara_Trump_2025_%28cropped%29.jpg/400px-Lara_Trump_2025_%28cropped%29.jpg",
    "jared kushner":
      "https://upload.wikimedia.org/wikipedia/commons/3/3e/Jared_Kushner_2025.jpg",
    // Media and business
    "dana white":
      "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d6/Dana_White_in_June_2025_%28cropped%29.jpg/400px-Dana_White_in_June_2025_%28cropped%29.jpg",
    "joe rogan":
      "https://upload.wikimedia.org/wikipedia/commons/thumb/d/dc/Joe_Rogan.png/400px-Joe_Rogan.png",
    "bob iger":
      "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e2/2022_Bob_Iger_%28cropped%29.jpg/400px-2022_Bob_Iger_%28cropped%29.jpg",
    "george conway":
      "https://upload.wikimedia.org/wikipedia/commons/1/1e/George_Conway_crop.png",
    "michael bloomberg":
      "https://upload.wikimedia.org/wikipedia/commons/thumb/1/10/Mike_Bloomberg_Headshot_%283x4_cropped%29.jpg/400px-Mike_Bloomberg_Headshot_%283x4_cropped%29.jpg",
    // Governors
    "john sununu":
      "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b3/GovJohnSununu1.jpg/400px-GovJohnSununu1.jpg",
    "kathy hochul":
      "https://upload.wikimedia.org/wikipedia/commons/thumb/2/25/Kathy_Hochul_March_2024.jpg/400px-Kathy_Hochul_March_2024.jpg",
    "maura healey":
      "https://upload.wikimedia.org/wikipedia/commons/thumb/3/39/Maura_Healey%2C_official_portrait%2C_governor.jpg/400px-Maura_Healey%2C_official_portrait%2C_governor.jpg",
    "janet mills":
      "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a8/Maine_congressional_delegation_meets_with_Gov_Janet_Mills_%28cropped%29.jpg/400px-Maine_congressional_delegation_meets_with_Gov_Janet_Mills_%28cropped%29.jpg",
    "mike braun":
      "https://upload.wikimedia.org/wikipedia/commons/thumb/7/77/Governor_Mike_Braun_DHS.jpg/400px-Governor_Mike_Braun_DHS.jpg",
    // Senators
    "marsha blackburn":
      "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c2/Sen._Marsha_Blackburn_%28R-TN%29_official_headshot_-_116th_Congress.jpg/400px-Sen._Marsha_Blackburn_%28R-TN%29_official_headshot_-_116th_Congress.jpg",
    "john cornyn":
      "https://upload.wikimedia.org/wikipedia/commons/thumb/6/60/John_Cornyn.jpg/400px-John_Cornyn.jpg",
    "joni ernst":
      "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3a/Joni_Ernst%2C_official_portrait%2C_116th_Congress_2_%281%29.jpg/400px-Joni_Ernst%2C_official_portrait%2C_116th_Congress_2_%281%29.jpg",
    "susan collins":
      "https://upload.wikimedia.org/wikipedia/commons/thumb/a/ae/Senator_Susan_Collins_2014_official_portrait.jpg/400px-Senator_Susan_Collins_2014_official_portrait.jpg",
    "ed markey":
      "https://upload.wikimedia.org/wikipedia/commons/thumb/9/94/Edward_Markey%2C_official_portrait%2C_114th_Congress.jpg/400px-Edward_Markey%2C_official_portrait%2C_114th_Congress.jpg",
    // Representatives
    "rashida tlaib":
      "https://upload.wikimedia.org/wikipedia/commons/thumb/5/58/Tlaib_Rashida_119th_Congress_%283x4_cropped%29.jpg/400px-Tlaib_Rashida_119th_Congress_%283x4_cropped%29.jpg",
    "ayanna pressley":
      "https://upload.wikimedia.org/wikipedia/commons/thumb/5/57/Rep._Ayanna_Pressley%2C_117th_Congress.jpg/400px-Rep._Ayanna_Pressley%2C_117th_Congress.jpg",
    "deb haaland":
      "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7e/Secretary_Deb_Haaland%2C_official_headshot.jpg/400px-Secretary_Deb_Haaland%2C_official_headshot.jpg",
    "jamie raskin":
      "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9b/Jamie_Raskin_Official_Portrait_2019.jpg/400px-Jamie_Raskin_Official_Portrait_2019.jpg",
    "seth moulton":
      "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3b/Seth_Moulton_%283x4_cropped%29.jpg/400px-Seth_Moulton_%283x4_cropped%29.jpg",
    "chip roy":
      "https://upload.wikimedia.org/wikipedia/commons/thumb/d/de/Chip_Roy_118th_Congress.jpg/400px-Chip_Roy_118th_Congress.jpg",
    "mike rogers":
      "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4c/Mike_Rogers_119th_Congress.jpg/400px-Mike_Rogers_119th_Congress.jpg",
    "nancy mace":
      "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0c/Nancy_Mace.jpg/400px-Nancy_Mace.jpg",
    "rich mccormick":
      "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e3/Rep._Rich_McCormick_official_photo%2C_118th_Congress_%281%29.jpg/400px-Rep._Rich_McCormick_official_photo%2C_118th_Congress_%281%29.jpg",
    "wesley hunt":
      "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5c/Rep._Wesley_Hunt_official_photo.jpg/400px-Rep._Wesley_Hunt_official_photo.jpg",
    "raja krishnamoorthi":
      "https://upload.wikimedia.org/wikipedia/commons/thumb/a/aa/Raja_Krishnamoorthi_official_photo.jpg/400px-Raja_Krishnamoorthi_official_photo.jpg",
    "robin kelly":
      "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0c/Rep._Robin_Kelly%2C_117th_Congress.jpg/400px-Rep._Robin_Kelly%2C_117th_Congress.jpg",
    "colin allred":
      "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2a/Colin_Allred%2C_official_portrait%2C_117th_Congress.jpg/400px-Colin_Allred%2C_official_portrait%2C_117th_Congress.jpg",
    "hakeem jeffries":
      "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a6/Rep-Hakeem-Jeffries-Official-Portrait_%28cropped%29.jpg/400px-Rep-Hakeem-Jeffries-Official-Portrait_%28cropped%29.jpg",
    // Cabinet
    "pete hegseth":
      "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2f/Pete_Hegseth_Official_Portrait.jpg/400px-Pete_Hegseth_Official_Portrait.jpg",
    // State officials
    "mallory mcmorrow":
      "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b7/Mallory_McMorrow_%28cropped%29.jpg/400px-Mallory_McMorrow_%28cropped%29.jpg",
    "jocelyn benson":
      "https://upload.wikimedia.org/wikipedia/commons/thumb/5/57/SOS_Jocelyn_Benson_web.jpg/400px-SOS_Jocelyn_Benson_web.jpg",
    "garlin gilchrist":
      "https://upload.wikimedia.org/wikipedia/commons/thumb/7/73/8R4A9159_%2853359280492%29_%28Garlin_Gilchrist%29.jpg/400px-8R4A9159_%2853359280492%29_%28Garlin_Gilchrist%29.jpg",
    "peggy flanagan":
      "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c4/2023PeggyFlanaganLtGovMN.jpg/400px-2023PeggyFlanaganLtGovMN.jpg",
    "juliana stratton":
      "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a8/Juliana_Stratton_2023_%28cropped%29.jpg/400px-Juliana_Stratton_2023_%28cropped%29.jpg",
    // More state officials
    "kelda roys":
      "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5b/Kelda_Helen_Roys.JPG/400px-Kelda_Helen_Roys.JPG",
    "jack schlossberg":
      "https://upload.wikimedia.org/wikipedia/commons/thumb/3/38/Jack_Schlossberg_wreath-laying_ceremony_to_commemorate_President_John_F._Kennedy_at_Arlington_National_Cemetery%2C_Virginia_on_October_17%2C_2024_%28cropped%29.jpg/400px-Jack_Schlossberg_wreath-laying_ceremony_to_commemorate_President_John_F._Kennedy_at_Arlington_National_Cemetery%2C_Virginia_on_October_17%2C_2024_%28cropped%29.jpg",
    // More Governors
    "chris sununu":
      "https://upload.wikimedia.org/wikipedia/commons/thumb/d/de/GOV_SUNUNU_OFFICIAL_PHOTO.jpg/400px-GOV_SUNUNU_OFFICIAL_PHOTO.jpg",
    "spencer cox":
      "https://upload.wikimedia.org/wikipedia/commons/thumb/9/94/Spencer_Cox_-_54856206905_%28cropped%29.jpg/400px-Spencer_Cox_-_54856206905_%28cropped%29.jpg",
    "tony evers":
      "https://upload.wikimedia.org/wikipedia/commons/thumb/0/08/Tony_Evers_-_2022_%28a%29.jpg/400px-Tony_Evers_-_2022_%28a%29.jpg",
    "laura kelly":
      "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0f/Laura_Kelly_official_photo.jpg/400px-Laura_Kelly_official_photo.jpg",
    // Trump Cabinet 2025
    "doug burgum":
      "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e0/Doug_Burgum_2025_DOI_portrait.jpg/400px-Doug_Burgum_2025_DOI_portrait.jpg",
    "susie wiles":
      "https://upload.wikimedia.org/wikipedia/commons/thumb/8/86/Susie_Wiles_%28crop%29.jpg/400px-Susie_Wiles_%28crop%29.jpg",
    "stephen miller":
      "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b4/P20250718DT-1296_President_Donald_Trump_delivers_remarks_at_a_dinner_for_GOP_Senators_%28cropped%29%28b%29.jpg/400px-P20250718DT-1296_President_Donald_Trump_delivers_remarks_at_a_dinner_for_GOP_Senators_%28cropped%29%28b%29.jpg",
    "kash patel":
      "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8d/Kash_Patel%2C_official_FBI_portrait_%28cropped_2%29.jpg/400px-Kash_Patel%2C_official_FBI_portrait_%28cropped_2%29.jpg",
    "pam bondi":
      "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e0/Pam_Bondi_official_portrait_%28cropped%29%282%29.jpg/400px-Pam_Bondi_official_portrait_%28cropped%29%282%29.jpg",
    "sean duffy":
      "https://upload.wikimedia.org/wikipedia/commons/thumb/6/60/Secretary_of_Transportation_Sean_Duffy_Official_Portrait.jpg/400px-Secretary_of_Transportation_Sean_Duffy_Official_Portrait.jpg",
    "linda mcmahon":
      "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4b/ED_Sec_Linda_McMahon.jpg/400px-ED_Sec_Linda_McMahon.jpg",
    "russell vought":
      "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d9/Russell_Vought%2C_official_portrait_%282025%29_%28cropped%29.jpg/400px-Russell_Vought%2C_official_portrait_%282025%29_%28cropped%29.jpg",
    "ben carson":
      "https://upload.wikimedia.org/wikipedia/commons/thumb/9/98/Ben_Carson_USDA.jpg/400px-Ben_Carson_USDA.jpg",
    // More Senators
    "tim scott":
      "https://upload.wikimedia.org/wikipedia/commons/thumb/b/bf/Tim_Scott_official_portrait.jpg/400px-Tim_Scott_official_portrait.jpg",
    "bill hagerty":
      "https://upload.wikimedia.org/wikipedia/commons/thumb/d/de/Bill_Hagerty_senatorial_portrait.jpg/400px-Bill_Hagerty_senatorial_portrait.jpg",
    "rick scott":
      "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1d/Official_Portrait_of_Senator_Rick_Scott_%28R-FL%29.jpg/400px-Official_Portrait_of_Senator_Rick_Scott_%28R-FL%29.jpg",
    // More Representatives
    "john james":
      "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b6/Rep._John_James_official_photo%2C_118th_Congress.jpg/400px-Rep._John_James_official_photo%2C_118th_Congress.jpg",
    "anna paulina luna":
      "https://upload.wikimedia.org/wikipedia/commons/thumb/6/66/Anna_Paulina_Luna.jpg/400px-Anna_Paulina_Luna.jpg",
    "jd scholten":
      "https://upload.wikimedia.org/wikipedia/commons/thumb/2/26/J.D._Scholten_Portrait.jpg/400px-J.D._Scholten_Portrait.jpg",
    "dan crenshaw":
      "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b5/Rep._Dan_Crenshaw%2C_official_portrait%2C_118th_Congress.jpg/400px-Rep._Dan_Crenshaw%2C_official_portrait%2C_118th_Congress.jpg",
    "joaquin castro":
      "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f0/Joaquin_Castro%2C_official_portrait%2C_118th_Congress.jpg/400px-Joaquin_Castro%2C_official_portrait%2C_118th_Congress.jpg",
    "al green":
      "https://upload.wikimedia.org/wikipedia/commons/thumb/2/28/Al_Green_Official_%28cropped%29.jpg/400px-Al_Green_Official_%28cropped%29.jpg",
    "haley stevens":
      "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5d/Haley_Stevens%2C_official_portrait%2C_116th_Congress.jpg/400px-Haley_Stevens%2C_official_portrait%2C_116th_Congress.jpg",
    // More state officials
    "ken paxton":
      "https://upload.wikimedia.org/wikipedia/commons/thumb/0/06/Ken_Paxton_%2854816860552%29_%28cropped%29.jpg/400px-Ken_Paxton_%2854816860552%29_%28cropped%29.jpg",
    "antonio delgado":
      "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0a/LG_Antonio_Delgado_Portrait.jpg/400px-LG_Antonio_Delgado_Portrait.jpg",
    "letitia james":
      "https://upload.wikimedia.org/wikipedia/commons/thumb/7/75/Letitia_James_Interview_Feb_2020.png/400px-Letitia_James_Interview_Feb_2020.png",
    "stacey abrams":
      "https://upload.wikimedia.org/wikipedia/commons/thumb/4/46/Stacey_Abrams_by_Gage_Skidmore.jpg/400px-Stacey_Abrams_by_Gage_Skidmore.jpg",
    "phil scott":
      "https://upload.wikimedia.org/wikipedia/commons/thumb/c/cc/Phil_Scott_2019.png/400px-Phil_Scott_2019.png",
    "charlie baker":
      "https://upload.wikimedia.org/wikipedia/commons/thumb/3/39/Charlie_Baker_official_photo_%28portrait_cropped%29.jpg/400px-Charlie_Baker_official_photo_%28portrait_cropped%29.jpg",
    "mandela barnes":
      "https://upload.wikimedia.org/wikipedia/commons/thumb/4/49/Mandela_Barnes_2022.jpg/400px-Mandela_Barnes_2022.jpg",
    // Additional Senators
    "michael bennet":
      "https://upload.wikimedia.org/wikipedia/commons/thumb/9/92/Senator_Mike_Bennett.jpg/400px-Senator_Mike_Bennett.jpg",
    // Former Cabinet
    "julian castro":
      "https://upload.wikimedia.org/wikipedia/commons/thumb/1/12/Juli%C3%A1n_Castro%27s_Official_HUD_Portrait_%283x4_cropped%29.jpg/400px-Juli%C3%A1n_Castro%27s_Official_HUD_Portrait_%283x4_cropped%29.jpg",
    // Media / Other
    "mike lindell":
      "https://upload.wikimedia.org/wikipedia/commons/thumb/9/93/Mike_Lindell_by_Gage_Skidmore_2.jpg/400px-Mike_Lindell_by_Gage_Skidmore_2.jpg",
    "michele tafoya":
      "https://upload.wikimedia.org/wikipedia/commons/thumb/6/68/MicheleTafoya2023.jpg/400px-MicheleTafoya2023.jpg",
    // Senate primary candidates (2026)
    // Georgia
    "mike collins":
      "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e8/Rep._Mike_Collins_official_photo%2C_118th_Congress.jpg/400px-Rep._Mike_Collins_official_photo%2C_118th_Congress.jpg",
    "buddy carter":
      "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b2/Buddy_Carter_117th_Congress_portrait.jpg/400px-Buddy_Carter_117th_Congress_portrait.jpg",
    "john king":
      "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/John_King_%28Georgia_politician%29.jpg/250px-John_King_%28Georgia_politician%29.jpg",
    "rick allen":
      "https://upload.wikimedia.org/wikipedia/commons/thumb/4/41/Rick_Allen_official_photo.jpg/400px-Rick_Allen_official_photo.jpg",
    "tyler harper":
      "https://upload.wikimedia.org/wikipedia/commons/thumb/3/30/Tyler_Harper_official_photo.jpg/349px-Tyler_Harper_official_photo.jpg",
    "doug collins":
      "https://upload.wikimedia.org/wikipedia/commons/thumb/6/69/Doug_Collins_official_photo.jpg/400px-Doug_Collins_official_photo.jpg",
    "brian jack":
      "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d1/Brian_Jack%2C_118th_Congress_portrait.jpg/400px-Brian_Jack%2C_118th_Congress_portrait.jpg",
    "brad raffensperger":
      "https://upload.wikimedia.org/wikipedia/commons/thumb/b/be/Brad_Raffensperger_official_photo.jpg/400px-Brad_Raffensperger_official_photo.jpg",
    // Iowa
    "ashley hinson":
      "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Ashley_Hinson_117th_Congress_Portrait.jpg/400px-Ashley_Hinson_117th_Congress_Portrait.jpg",
    "jim carlin":
      "https://upload.wikimedia.org/wikipedia/commons/thumb/e/ea/Jim_Carlin_Iowa_Senate.jpg/400px-Jim_Carlin_Iowa_Senate.jpg",
    // Kentucky
    "andy barr":
      "https://upload.wikimedia.org/wikipedia/commons/thumb/e/eb/Andy_Barr_official_congressional_photo.jpg/400px-Andy_Barr_official_congressional_photo.jpg",
    "nate morris":
      "https://upload.wikimedia.org/wikipedia/commons/thumb/6/68/Nate_Morris_Rubicon_%28cropped%29.jpg/400px-Nate_Morris_Rubicon_%28cropped%29.jpg",
    "daniel cameron":
      "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c3/Daniel_Cameron_official_photo.jpg/400px-Daniel_Cameron_official_photo.jpg",
    // Louisiana
    "julia letlow":
      "https://upload.wikimedia.org/wikipedia/commons/thumb/3/31/Julia_Letlow_117th_Congress_portrait.jpg/400px-Julia_Letlow_117th_Congress_portrait.jpg",
    "bill cassidy":
      "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b0/Bill_Cassidy_official_Senate_photo.jpg/400px-Bill_Cassidy_official_Senate_photo.jpg",
    "john fleming":
      "https://upload.wikimedia.org/wikipedia/commons/thumb/1/11/John_Fleming_Official.jpg/400px-John_Fleming_Official.jpg",
    "eric skrmetta":
      "https://upload.wikimedia.org/wikipedia/commons/thumb/c/ce/Eric_Skrmetta_official_portrait_%28cropped%29.jpg/400px-Eric_Skrmetta_official_portrait_%28cropped%29.jpg",
    "julie emerson":
      "https://upload.wikimedia.org/wikipedia/commons/thumb/6/65/Julie_Emerson_Louisiana_House.jpg/400px-Julie_Emerson_Louisiana_House.jpg",
    // Maine
    "graham platner":
      "https://upload.wikimedia.org/wikipedia/commons/thumb/c/cd/Graham_Platner_headshot.png/400px-Graham_Platner_headshot.png",
    // Michigan
    "abdul el-sayed":
      "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2c/Abdul_El-Sayed_headshot.jpg/400px-Abdul_El-Sayed_headshot.jpg",
    "dana nessel":
      "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7a/Dana_Nessel_official_portrait.jpg/308px-Dana_Nessel_official_portrait.jpg",
    "andy levin":
      "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d1/Andy_Levin%2C_official_portrait%2C_116th_Congress.jpg/400px-Andy_Levin%2C_official_portrait%2C_116th_Congress.jpg",
    "kristen mcdonald rivet":
      "https://upload.wikimedia.org/wikipedia/commons/thumb/e/ef/Kristen_McDonald_Rivet.jpg/400px-Kristen_McDonald_Rivet.jpg",
    "ronna mcdaniel":
      "https://upload.wikimedia.org/wikipedia/commons/thumb/0/03/Ronna_McDaniel_%2850556671898%29_%28cropped%29.jpg/400px-Ronna_McDaniel_%2850556671898%29_%28cropped%29.jpg",
    "bill huizenga":
      "https://upload.wikimedia.org/wikipedia/commons/thumb/b/bc/Bill_Huizenga_117th_Congress_portrait.jpg/400px-Bill_Huizenga_117th_Congress_portrait.jpg",
    "jonathan lindsey":
      "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4c/Jonathan_Lindsey_official_photo.jpg/400px-Jonathan_Lindsey_official_photo.jpg",
    // Minnesota
    "angie craig":
      "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2f/Angie_Craig%2C_official_portrait%2C_116th_Congress.jpg/400px-Angie_Craig%2C_official_portrait%2C_116th_Congress.jpg",
    "royce white":
      "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8c/Royce_White_at_Iowa_State_%28cropped%29.jpg/400px-Royce_White_at_Iowa_State_%28cropped%29.jpg",
    "scott brown":
      "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e7/Scott_Brown_official_portrait.jpg/400px-Scott_Brown_official_portrait.jpg",
    // North Carolina
    "wiley nickel":
      "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1a/Wiley_Nickel_118th_Congress_portrait.jpg/400px-Wiley_Nickel_118th_Congress_portrait.jpg",
    "alma adams":
      "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a3/Alma_Adams_official_portrait.jpg/400px-Alma_Adams_official_portrait.jpg",
    "sydney batch":
      "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e3/Sydney_Batch_NC_official_photo_%28cropped%29.jpg/400px-Sydney_Batch_NC_official_photo_%28cropped%29.jpg",
    "jeff jackson":
      "https://upload.wikimedia.org/wikipedia/commons/thumb/5/59/Jeff_Jackson_118th_Congress_portrait.jpg/400px-Jeff_Jackson_118th_Congress_portrait.jpg",
    "michael whatley":
      "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6a/Michael_Whatley_%28cropped%29.jpg/400px-Michael_Whatley_%28cropped%29.jpg",
    "brad knott":
      "https://upload.wikimedia.org/wikipedia/commons/thumb/9/94/Brad_Knott_119th_Congress_official_portrait.jpg/400px-Brad_Knott_119th_Congress_official_portrait.jpg",
    "phil berger":
      "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d2/Phil_Berger_official_photo.jpg/400px-Phil_Berger_official_photo.jpg",
    "dan bishop":
      "https://upload.wikimedia.org/wikipedia/commons/thumb/2/25/Dan_Bishop_117th_Congress_portrait.jpg/400px-Dan_Bishop_117th_Congress_portrait.jpg",
    "pat harrigan":
      "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6c/Pat_Harrigan_for_Congress.jpg/400px-Pat_Harrigan_for_Congress.jpg",
    "destin hall":
      "https://upload.wikimedia.org/wikipedia/commons/thumb/d/de/NC_Rep._Destin_Hall.jpg/400px-NC_Rep._Destin_Hall.jpg",
    "george holding":
      "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3b/George_Holding_official_photo.jpg/400px-George_Holding_official_photo.jpg",
    "richard hudson":
      "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a1/Richard_Hudson_117th_Congress_portrait.jpg/400px-Richard_Hudson_117th_Congress_portrait.jpg",
    "addison mcdowell":
      "https://upload.wikimedia.org/wikipedia/commons/thumb/e/ed/Addison_McDowell_119th_Congress_official_portrait.jpg/400px-Addison_McDowell_119th_Congress_official_portrait.jpg",
    "tim moore":
      "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b3/Tim_Moore_NC_Speaker.jpg/400px-Tim_Moore_NC_Speaker.jpg",
    "greg murphy":
      "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8e/Greg_Murphy_117th_Congress_portrait.jpg/400px-Greg_Murphy_117th_Congress_portrait.jpg",
    "mark robinson":
      "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f2/Mark_Robinson_official_photo_%28cropped%29.jpg/342px-Mark_Robinson_official_photo_%28cropped%29.jpg",
    // South Carolina
    "lindsey graham":
      "https://upload.wikimedia.org/wikipedia/commons/thumb/c/cd/Lindsey_Graham%2C_official_photo%2C_113th_Congress.jpg/400px-Lindsey_Graham%2C_official_photo%2C_113th_Congress.jpg",
    "terry virts":
      "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e5/Terry_Virts_official_portrait.jpg/400px-Terry_Virts_official_portrait.jpg",
    // Texas
    "beth van duyne":
      "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f1/Beth_Van_Duyne_117th_Congress_portrait.jpg/400px-Beth_Van_Duyne_117th_Congress_portrait.jpg",
    "ronny jackson":
      "https://upload.wikimedia.org/wikipedia/commons/thumb/2/23/Ronny_Jackson_117th_Congress_portrait.jpg/400px-Ronny_Jackson_117th_Congress_portrait.jpg",
    "dawn buckingham":
      "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5a/Dawn_Buckingham_official_photo_%28cropped%29.jpg/400px-Dawn_Buckingham_official_photo_%28cropped%29.jpg",
    // Wyoming
    "harriet hageman":
      "https://upload.wikimedia.org/wikipedia/commons/thumb/1/13/Harriet_Hageman_118th_Congress_portrait.jpg/400px-Harriet_Hageman_118th_Congress_portrait.jpg",
    "mark gordon":
      "https://upload.wikimedia.org/wikipedia/commons/thumb/7/71/Governor_Mark_Gordon.jpg/400px-Governor_Mark_Gordon.jpg",
    // Illinois
    "rod blagojevich":
      "https://upload.wikimedia.org/wikipedia/commons/thumb/e/ea/Rod_Blagojevich_official_photo.jpg/400px-Rod_Blagojevich_official_photo.jpg",
    // Party logos and generic labels
    "democratic party":
      "https://upload.wikimedia.org/wikipedia/commons/thumb/0/02/DemocraticLogo.svg/400px-DemocraticLogo.svg.png",
    "republican party":
      "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9b/Republicanlogo.svg/400px-Republicanlogo.svg.png",
    independent:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/6/63/No_flag.svg/400px-No_flag.svg.png",
    "any other":
      "https://upload.wikimedia.org/wikipedia/commons/thumb/6/63/No_flag.svg/400px-No_flag.svg.png",
  };
  return candidateImages[normalizeCandidateName(name)];
}

// Create slug from market name
function createSlug(name: string, id: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 50);
  return `${slug}-${id}`;
}

// Helper to get timestamp for change period
function getChangePeriodTimestamp(period: string): string {
  const now = new Date();
  switch (period) {
    case "1d":
      now.setDate(now.getDate() - 1);
      break;
    case "1w":
      now.setDate(now.getDate() - 7);
      break;
    case "30d":
      now.setDate(now.getDate() - 30);
      break;
    default:
      now.setDate(now.getDate() - 1);
  }
  return now.toISOString();
}

/**
 * Get price changes from Polymarket data (matches chart source).
 * Returns map of short candidate name (lowercase) -> { current, historical }
 */
async function getChartBasedPriceChangesAsync(
  client: any,
  polymarketMarketId: string,
  changePeriod: string,
): Promise<Map<string, { current: number; historical: number }>> {
  const changeTimestamp = getChangePeriodTimestamp(changePeriod);
  const result = new Map<string, { current: number; historical: number }>();

  // Get the most recent Polymarket prices (current) using DISTINCT ON for index efficiency
  const currentPricesResult = await client.query(
    `
    SELECT DISTINCT ON (ps.contract_id)
      c.contract_name,
      ps.yes_price
    FROM price_snapshots ps
    JOIN contracts c ON ps.source = c.source AND ps.market_id = c.market_id AND ps.contract_id = c.contract_id
    WHERE ps.source = 'Polymarket' AND ps.market_id = $1
      AND ps.yes_price IS NOT NULL
    ORDER BY ps.contract_id, ps.snapshot_time DESC
  `,
    [polymarketMarketId],
  );

  // Get the historical Polymarket prices (closest to the change period timestamp)
  const historicalPricesResult = await client.query(
    `
    SELECT DISTINCT ON (ps.contract_id)
      c.contract_name,
      ps.yes_price
    FROM price_snapshots ps
    JOIN contracts c ON ps.source = c.source AND ps.market_id = c.market_id AND ps.contract_id = c.contract_id
    WHERE ps.source = 'Polymarket' AND ps.market_id = $2
      AND ps.snapshot_time <= $1
      AND ps.yes_price IS NOT NULL
    ORDER BY ps.contract_id, ps.snapshot_time DESC
  `,
    [changeTimestamp, polymarketMarketId],
  );

  // Build the result map keyed by short chart name (lowercase)
  for (const row of currentPricesResult.rows) {
    const name = extractChartCandidateName(row.contract_name);
    if (!name) continue;
    result.set(name.toLowerCase(), {
      current: parseFloat(row.yes_price),
      historical: parseFloat(row.yes_price),
    });
  }

  // Update with historical prices
  for (const row of historicalPricesResult.rows) {
    const name = extractChartCandidateName(row.contract_name);
    if (!name) continue;
    const key = name.toLowerCase();
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
  status?: "open" | "all";
  limit?: number;
  changePeriod?: string;
}): Promise<Market[]> {
  const pool = getPool();
  const client = await pool.connect();
  const changePeriod = options?.changePeriod || "1d";

  try {
    // Get all markets from all sources
    const marketsResult = await client.query(`
      SELECT DISTINCT
        m.id, m.source, m.market_id, m.market_name, m.category,
        m.status, m.url, m.total_volume, m.end_date
      FROM markets m
      WHERE (m.market_name LIKE '%2028%' OR m.market_name LIKE '%2026%' OR m.market_name LIKE '%Next U.S. Presidential%' OR m.market_name LIKE '%midterm%')
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
        case "presidential-winner-2028":
          category = "presidential";
          marketName = "Presidential Election Winner 2028";
          break;
        case "presidential-party-2028":
          category = "presidential";
          marketName = "Which Party Wins the 2028 Presidential Election?";
          break;
        case "gop-nominee-2028":
          category = "primary-gop";
          marketName = "Republican Presidential Nominee 2028";
          break;
        case "dem-nominee-2028":
          category = "primary-dem";
          marketName = "Democratic Presidential Nominee 2028";
          break;
        case "house-control-2026":
          category = "house";
          marketName = "Which Party Wins the House in 2026?";
          break;
        case "senate-control-2026":
          category = "senate";
          marketName = "Which Party Wins the Senate in 2026?";
          break;
        default:
          continue;
      }

      if (options?.category && category !== options.category) {
        continue;
      }

      // Get price changes from Polymarket data (same source as charts)
      const polymarketMarket = relatedMarkets.find(
        (m) => m.source === "Polymarket",
      );
      const polymarketMarketId = polymarketMarket?.market_id || null;

      const chartPriceChanges = polymarketMarketId
        ? await getChartBasedPriceChangesAsync(
            client,
            polymarketMarketId,
            changePeriod,
          )
        : new Map<string, { current: number; historical: number }>();

      // Aggregate contracts from all sources — batched into one query
      const contractsByCandidate = new Map<string, Contract>();

      // Build WHERE conditions for all (market_id, source) pairs in this canonical type
      const conditions: string[] = [];
      const queryParams: any[] = [];
      let paramIdx = 1;
      for (const dbMarket of relatedMarkets) {
        conditions.push(
          `(c.market_id = $${paramIdx} AND c.source = $${paramIdx + 1})`,
        );
        queryParams.push(dbMarket.market_id, dbMarket.source);
        paramIdx += 2;
      }

      const contractsResult = await client.query(
        `
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
        WHERE (${conditions.join(" OR ")})
        AND ps.yes_price IS NOT NULL AND ps.yes_price >= 0.001
      `,
        queryParams,
      );

      for (const contract of contractsResult.rows) {
        const candidateName = extractCandidateName(
          contract.contract_name,
          contract.contract_id,
        );
        if (!candidateName) continue;

        const normalizedName = normalizeCandidateName(candidateName);
        const price: MarketPrice = {
          source: contract.source as any,
          region:
            contract.source === "Polymarket"
              ? "International"
              : contract.source === "Smarkets"
                ? "UK"
                : "US",
          yesPrice: parseFloat(contract.yes_price),
          noPrice: contract.no_price
            ? parseFloat(contract.no_price)
            : 1 - parseFloat(contract.yes_price),
          yesBid: null,
          yesAsk: null,
          volume: contract.volume ? parseFloat(contract.volume) : 0,
          lastUpdated: contract.snapshot_time,
        };

        if (contractsByCandidate.has(normalizedName)) {
          const existing = contractsByCandidate.get(normalizedName)!;
          if (!existing.prices.find((p) => p.source === price.source)) {
            existing.prices.push(price);
            existing.totalVolume += price.volume || 0;
          }
        } else {
          contractsByCandidate.set(normalizedName, {
            id: `${canonicalType}-${normalizedName}`,
            name: candidateName,
            shortName: candidateName.split(" ")[0],
            imageUrl: getCandidateImageUrl(candidateName),
            prices: [price],
            aggregatedPrice: parseFloat(contract.yes_price),
            priceChange: 0,
            totalVolume: price.volume || 0,
          });
        }
      }

      // Calculate aggregated prices and price changes
      const contracts = Array.from(contractsByCandidate.values()).map(
        (contract) => {
          const avgPrice =
            contract.prices.reduce((sum, p) => sum + p.yesPrice, 0) /
            contract.prices.length;

          // Calculate price change from electionbettingodds chart data
          let priceChange = 0;
          const shortName = contract.name.split(" ").pop()?.toLowerCase() || "";
          const firstName = contract.name.split(" ")[0]?.toLowerCase() || "";
          // Also try last segment after hyphen (e.g. "Ocasio-Cortez" -> "cortez")
          const lastHyphenPart = shortName.includes("-")
            ? shortName.split("-").pop() || ""
            : "";
          const chartData =
            chartPriceChanges.get(shortName) ||
            chartPriceChanges.get(firstName) ||
            chartPriceChanges.get(contract.name.toLowerCase()) ||
            (lastHyphenPart
              ? chartPriceChanges.get(lastHyphenPart)
              : undefined);
          if (chartData) {
            priceChange = chartData.current - chartData.historical;
          }

          return {
            ...contract,
            aggregatedPrice: avgPrice,
            priceChange,
          };
        },
      );

      contracts.sort((a, b) => b.aggregatedPrice - a.aggregatedPrice);

      if (contracts.length === 0) continue;

      const sourcesIncluded = [
        ...new Set(contracts.flatMap((c) => c.prices.map((p) => p.source))),
      ];

      markets.push({
        id: canonicalType,
        slug: createSlug(marketName, canonicalType),
        name: marketName,
        description: `Aggregated from ${sourcesIncluded.join(", ")}.`,
        category,
        status: "open",
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

// Max age (ms) a source price can lag behind the freshest source before being excluded from averages
const STALE_PRICE_THRESHOLD_MS = 48 * 60 * 60 * 1000; // 48 hours

// Filter prices to only include those within STALE_PRICE_THRESHOLD of the freshest
function getFreshPrices(prices: MarketPrice[]): MarketPrice[] {
  if (prices.length <= 1) return prices;
  const newest = Math.max(
    ...prices.map((p) => new Date(p.lastUpdated).getTime()),
  );
  const fresh = prices.filter(
    (p) =>
      newest - new Date(p.lastUpdated).getTime() <= STALE_PRICE_THRESHOLD_MS,
  );
  return fresh.length > 0 ? fresh : prices; // fallback to all if everything is stale
}

// For a set of contracts (e.g. "Democratic Party" and "Republican Party"),
// detect sources where all contracts have nearly the same yes_price — a sign
// of an illiquid/broken market — and exclude them from aggregation.
function excludeIlliquidSources(
  contractsList: { prices: MarketPrice[] }[],
): void {
  if (contractsList.length < 2) return;
  const allSources = new Set<string>();
  for (const c of contractsList) {
    for (const p of c.prices) allSources.add(p.source);
  }
  for (const source of allSources) {
    const sourcePrices = contractsList
      .map((c) => c.prices.find((p) => p.source === source)?.yesPrice)
      .filter((p): p is number => p !== undefined);
    if (sourcePrices.length < 2) continue;
    const spread = Math.max(...sourcePrices) - Math.min(...sourcePrices);
    if (spread < 0.05) {
      const hasOtherSources = contractsList.some((c) =>
        c.prices.some((p) => p.source !== source),
      );
      if (hasOtherSources) {
        for (const c of contractsList) {
          c.prices = c.prices.filter((p) => p.source !== source);
        }
      }
    }
  }
}

// All 2026 senate race states (Class II + OH special)
const SENATE_STATES_2026: Record<string, string> = {
  al: "Alabama",
  ak: "Alaska",
  ar: "Arkansas",
  co: "Colorado",
  de: "Delaware",
  fl: "Florida",
  ga: "Georgia",
  id: "Idaho",
  il: "Illinois",
  ia: "Iowa",
  ks: "Kansas",
  ky: "Kentucky",
  la: "Louisiana",
  me: "Maine",
  ma: "Massachusetts",
  mi: "Michigan",
  mn: "Minnesota",
  ms: "Mississippi",
  mt: "Montana",
  ne: "Nebraska",
  nh: "New Hampshire",
  nj: "New Jersey",
  nm: "New Mexico",
  nc: "North Carolina",
  oh: "Ohio",
  ok: "Oklahoma",
  or: "Oregon",
  ri: "Rhode Island",
  sc: "South Carolina",
  sd: "South Dakota",
  tn: "Tennessee",
  tx: "Texas",
  va: "Virginia",
  wv: "West Virginia",
  wy: "Wyoming",
};

/**
 * Get state senate race markets
 * Queries markets that match state + senate patterns, aggregates across sources
 */
export async function getStateSenateRacesAsync(options?: {
  states?: string[];
  changePeriod?: string;
}): Promise<Market[]> {
  const pool = getPool();
  const client = await pool.connect();
  const changePeriod = options?.changePeriod || "1d";

  try {
    const stateAbbrevs = options?.states || Object.keys(SENATE_STATES_2026);
    const markets: Market[] = [];

    for (const abbrev of stateAbbrevs) {
      const stateName = SENATE_STATES_2026[abbrev];
      if (!stateName) continue;

      const stateNameLower = stateName.toLowerCase();

      // Find markets that mention this state + senate, excluding primaries/nominations
      const marketsResult = await client.query(
        `
        SELECT DISTINCT
          m.id, m.source, m.market_id, m.market_name, m.category,
          m.status, m.url, m.total_volume, m.end_date
        FROM markets m
        WHERE LOWER(m.market_name) LIKE $1
          AND LOWER(m.market_name) LIKE '%senate%'
          AND LOWER(m.market_name) NOT LIKE '%primary%'
          AND LOWER(m.market_name) NOT LIKE '%nomin%'
          AND m.source IN ('Polymarket', 'Kalshi', 'PredictIt', 'Smarkets')
        ORDER BY m.total_volume DESC NULLS LAST
      `,
        [`%${stateNameLower}%`],
      );

      if (marketsResult.rows.length === 0) continue;

      // Aggregate contracts from all matching markets for this state
      const contractsByCandidate = new Map<string, Contract>();

      const conditions: string[] = [];
      const queryParams: any[] = [];
      let paramIdx = 1;
      for (const dbMarket of marketsResult.rows) {
        conditions.push(
          `(c.market_id = $${paramIdx} AND c.source = $${paramIdx + 1})`,
        );
        queryParams.push(dbMarket.market_id, dbMarket.source);
        paramIdx += 2;
      }

      const contractsResult = await client.query(
        `
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
        WHERE (${conditions.join(" OR ")})
        AND ps.yes_price IS NOT NULL AND ps.yes_price >= 0.001
      `,
        queryParams,
      );

      // Get historical prices for change calculation
      const changeTimestamp = getChangePeriodTimestamp(changePeriod);
      const historicalParams = [...queryParams];
      const historicalConditions = conditions.map((cond, i) => {
        // Shift param indices up by 1 to account for the timestamp param at $1
        return cond.replace(/\$(\d+)/g, (_, n) => `$${parseInt(n) + 1}`);
      });

      const historicalResult = await client.query(
        `
        SELECT DISTINCT ON (c.source, c.contract_id)
          c.source, c.contract_id, c.contract_name,
          ps.yes_price
        FROM contracts c
        INNER JOIN LATERAL (
          SELECT yes_price, snapshot_time
          FROM price_snapshots
          WHERE source = c.source AND market_id = c.market_id AND contract_id = c.contract_id
            AND snapshot_time <= $1
            AND yes_price IS NOT NULL
          ORDER BY snapshot_time DESC
          LIMIT 1
        ) ps ON true
        WHERE (${historicalConditions.join(" OR ")})
      `,
        [changeTimestamp, ...queryParams],
      );

      // Build historical price map: normalized name → average historical price
      const historicalByCandidate = new Map<string, number[]>();
      for (const row of historicalResult.rows) {
        const candidateName = extractCandidateName(
          row.contract_name,
          row.contract_id,
        );
        if (!candidateName) continue;
        const normalizedName = normalizeCandidateName(candidateName);
        if (!historicalByCandidate.has(normalizedName)) {
          historicalByCandidate.set(normalizedName, []);
        }
        historicalByCandidate
          .get(normalizedName)!
          .push(parseFloat(row.yes_price));
      }

      for (const contract of contractsResult.rows) {
        const candidateName = extractCandidateName(
          contract.contract_name,
          contract.contract_id,
        );
        if (!candidateName) continue;

        const normalizedName = normalizeCandidateName(candidateName);
        const price: MarketPrice = {
          source: contract.source as any,
          region:
            contract.source === "Polymarket"
              ? "International"
              : contract.source === "Smarkets"
                ? "UK"
                : "US",
          yesPrice: parseFloat(contract.yes_price),
          noPrice: contract.no_price
            ? parseFloat(contract.no_price)
            : 1 - parseFloat(contract.yes_price),
          yesBid: null,
          yesAsk: null,
          volume: contract.volume ? parseFloat(contract.volume) : 0,
          lastUpdated: contract.snapshot_time,
        };

        if (contractsByCandidate.has(normalizedName)) {
          const existing = contractsByCandidate.get(normalizedName)!;
          if (!existing.prices.find((p) => p.source === price.source)) {
            existing.prices.push(price);
            existing.totalVolume += price.volume || 0;
          }
        } else {
          contractsByCandidate.set(normalizedName, {
            id: `senate-${abbrev}-${normalizedName}`,
            name: candidateName,
            shortName: candidateName.split(" ")[0],
            imageUrl: getCandidateImageUrl(candidateName),
            prices: [price],
            aggregatedPrice: parseFloat(contract.yes_price),
            priceChange: 0,
            totalVolume: price.volume || 0,
          });
        }
      }

      // If we have both party-level contracts (Republican Party, Democratic Party)
      // and individual candidate contracts, keep party entries for consistency
      const PARTY_KEYS = [
        "republican party",
        "democratic party",
        "independent",
        "libertarian",
        "green party",
      ];
      const partyEntries = [...contractsByCandidate.keys()].filter((k) =>
        PARTY_KEYS.includes(k),
      );
      const candidateEntries = [...contractsByCandidate.keys()].filter(
        (k) => !PARTY_KEYS.includes(k),
      );
      if (partyEntries.length > 0 && candidateEntries.length > 0) {
        for (const key of candidateEntries) {
          contractsByCandidate.delete(key);
        }
      }

      // Remove illiquid sources (e.g. Kalshi showing 47/47 for both sides)
      excludeIlliquidSources(Array.from(contractsByCandidate.values()));

      // Calculate aggregated prices and price changes
      const contracts = Array.from(contractsByCandidate.values()).map(
        (contract) => {
          const freshPrices = getFreshPrices(contract.prices);
          const avgPrice =
            freshPrices.reduce((sum, p) => sum + p.yesPrice, 0) /
            freshPrices.length;
          const normalizedName = normalizeCandidateName(contract.name);
          const historicalPrices = historicalByCandidate.get(normalizedName);
          const historicalAvg =
            historicalPrices && historicalPrices.length > 0
              ? historicalPrices.reduce((a, b) => a + b, 0) /
                historicalPrices.length
              : avgPrice;

          return {
            ...contract,
            aggregatedPrice: avgPrice,
            priceChange: avgPrice - historicalAvg,
          };
        },
      );

      contracts.sort((a, b) => b.aggregatedPrice - a.aggregatedPrice);

      if (contracts.length === 0) continue;

      const sourcesIncluded = [
        ...new Set(contracts.flatMap((c) => c.prices.map((p) => p.source))),
      ];

      markets.push({
        id: `senate-race-${abbrev}`,
        slug: `senate-race-${abbrev}`,
        name: `${stateName} Senate Race 2026`,
        description: `Aggregated from ${sourcesIncluded.join(", ")}.`,
        category: "senate-race" as MarketCategory,
        status: "open",
        contracts,
        totalVolume: contracts.reduce((sum, c) => sum + c.totalVolume, 0),
        lastUpdated: new Date().toISOString(),
      });
    }

    // Sort by competitiveness (closest to 50/50)
    markets.sort((a, b) => {
      const topA = a.contracts[0]?.aggregatedPrice || 0;
      const topB = b.contracts[0]?.aggregatedPrice || 0;
      return Math.abs(topA - 0.5) - Math.abs(topB - 0.5);
    });

    return markets;
  } finally {
    client.release();
  }
}

// Map of state names for primary market matching
const STATE_NAMES_TO_ABBREV: Record<string, string> = Object.fromEntries(
  Object.entries(SENATE_STATES_2026).map(([abbrev, name]) => [
    name.toLowerCase(),
    abbrev,
  ]),
);

/**
 * Get senate primary markets
 * Queries markets matching senate + primary/nomination patterns, grouped by state+party
 */
export async function getSenatePrimariesAsync(options?: {
  changePeriod?: string;
}): Promise<Market[]> {
  const pool = getPool();
  const client = await pool.connect();
  const changePeriod = options?.changePeriod || "1d";

  try {
    // Find all senate primary/nomination markets (excluding non-US and misc)
    const marketsResult = await client.query(`
      SELECT DISTINCT
        m.id, m.source, m.market_id, m.market_name, m.category,
        m.status, m.url, m.total_volume, m.end_date
      FROM markets m
      WHERE LOWER(m.market_name) LIKE '%senate%'
        AND (LOWER(m.market_name) LIKE '%primary%' OR LOWER(m.market_name) LIKE '%nomin%')
        AND LOWER(m.market_name) NOT LIKE '%2028%'
        AND LOWER(m.market_name) NOT LIKE '%endorse%'
        AND LOWER(m.market_name) NOT LIKE '%closer%'
        AND LOWER(m.market_name) NOT LIKE '%margin%'
        AND LOWER(m.market_name) NOT LIKE '%2nd place%'
        AND LOWER(m.market_name) NOT LIKE '%3rd place%'
        AND m.source IN ('Polymarket', 'Kalshi', 'PredictIt', 'Smarkets')
      ORDER BY m.total_volume DESC NULLS LAST
    `);

    if (marketsResult.rows.length === 0) return [];

    // Group markets by state + party
    const primaryGroups = new Map<
      string,
      { state: string; stateAbbrev: string; party: string; dbMarkets: any[] }
    >();

    for (const dbMarket of marketsResult.rows) {
      const marketNameLower = dbMarket.market_name.toLowerCase();

      // Determine party
      let party: string;
      if (marketNameLower.includes("democrat")) {
        party = "Democratic";
      } else if (marketNameLower.includes("republican")) {
        party = "Republican";
      } else {
        continue; // Skip if can't determine party
      }

      // Determine state
      let foundState = "";
      let foundAbbrev = "";
      for (const [stateLower, abbrev] of Object.entries(
        STATE_NAMES_TO_ABBREV,
      )) {
        if (marketNameLower.includes(stateLower)) {
          foundState = SENATE_STATES_2026[abbrev];
          foundAbbrev = abbrev;
          break;
        }
      }
      if (!foundState) continue;

      const groupKey = `${foundAbbrev}-${party.toLowerCase()}`;
      if (!primaryGroups.has(groupKey)) {
        primaryGroups.set(groupKey, {
          state: foundState,
          stateAbbrev: foundAbbrev,
          party,
          dbMarkets: [],
        });
      }
      primaryGroups.get(groupKey)!.dbMarkets.push(dbMarket);
    }

    const markets: Market[] = [];

    for (const [groupKey, group] of primaryGroups) {
      const contractsByCandidate = new Map<string, Contract>();

      const conditions: string[] = [];
      const queryParams: any[] = [];
      let paramIdx = 1;
      for (const dbMarket of group.dbMarkets) {
        conditions.push(
          `(c.market_id = $${paramIdx} AND c.source = $${paramIdx + 1})`,
        );
        queryParams.push(dbMarket.market_id, dbMarket.source);
        paramIdx += 2;
      }

      const contractsResult = await client.query(
        `
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
        WHERE (${conditions.join(" OR ")})
        AND ps.yes_price IS NOT NULL AND ps.yes_price >= 0.001
      `,
        queryParams,
      );

      // Historical prices for change calculation
      const changeTimestamp = getChangePeriodTimestamp(changePeriod);
      const historicalParams = [...queryParams];
      const historicalConditions = conditions.map((cond) => {
        return cond.replace(/\$(\d+)/g, (_, n) => `$${parseInt(n) + 1}`);
      });

      const historicalResult = await client.query(
        `
        SELECT DISTINCT ON (c.source, c.contract_id)
          c.source, c.contract_id, c.contract_name,
          ps.yes_price
        FROM contracts c
        INNER JOIN LATERAL (
          SELECT yes_price, snapshot_time
          FROM price_snapshots
          WHERE source = c.source AND market_id = c.market_id AND contract_id = c.contract_id
            AND snapshot_time <= $1
            AND yes_price IS NOT NULL
          ORDER BY snapshot_time DESC
          LIMIT 1
        ) ps ON true
        WHERE (${historicalConditions.join(" OR ")})
      `,
        [changeTimestamp, ...queryParams],
      );

      const historicalByCandidate = new Map<string, number[]>();
      for (const row of historicalResult.rows) {
        const candidateName = extractCandidateName(
          row.contract_name,
          row.contract_id,
        );
        if (!candidateName) continue;
        const normalizedName = normalizeCandidateName(candidateName);
        if (!historicalByCandidate.has(normalizedName)) {
          historicalByCandidate.set(normalizedName, []);
        }
        historicalByCandidate
          .get(normalizedName)!
          .push(parseFloat(row.yes_price));
      }

      for (const contract of contractsResult.rows) {
        const candidateName = extractCandidateName(
          contract.contract_name,
          contract.contract_id,
        );
        if (!candidateName) continue;

        // Skip party names in primary contexts — we want individual candidates
        if (/^(Democratic|Republican) Party$/i.test(candidateName)) continue;

        const normalizedName = normalizeCandidateName(candidateName);
        const price: MarketPrice = {
          source: contract.source as any,
          region:
            contract.source === "Polymarket"
              ? "International"
              : contract.source === "Smarkets"
                ? "UK"
                : "US",
          yesPrice: parseFloat(contract.yes_price),
          noPrice: contract.no_price
            ? parseFloat(contract.no_price)
            : 1 - parseFloat(contract.yes_price),
          yesBid: null,
          yesAsk: null,
          volume: contract.volume ? parseFloat(contract.volume) : 0,
          lastUpdated: contract.snapshot_time,
        };

        if (contractsByCandidate.has(normalizedName)) {
          const existing = contractsByCandidate.get(normalizedName)!;
          if (!existing.prices.find((p) => p.source === price.source)) {
            existing.prices.push(price);
            existing.totalVolume += price.volume || 0;
          }
        } else {
          contractsByCandidate.set(normalizedName, {
            id: `senate-primary-${group.stateAbbrev}-${group.party.toLowerCase()}-${normalizedName.replace(/\s+/g, "-")}`,
            name: candidateName,
            shortName: candidateName.split(" ").pop() || candidateName,
            imageUrl: getCandidateImageUrl(candidateName),
            prices: [price],
            aggregatedPrice: parseFloat(contract.yes_price),
            priceChange: 0,
            totalVolume: price.volume || 0,
          });
        }
      }

      excludeIlliquidSources(Array.from(contractsByCandidate.values()));

      const contracts = Array.from(contractsByCandidate.values()).map(
        (contract) => {
          const freshPrices = getFreshPrices(contract.prices);
          const avgPrice =
            freshPrices.reduce((sum, p) => sum + p.yesPrice, 0) /
            freshPrices.length;
          const normalizedName = normalizeCandidateName(contract.name);
          const historicalPrices = historicalByCandidate.get(normalizedName);
          const historicalAvg =
            historicalPrices && historicalPrices.length > 0
              ? historicalPrices.reduce((a, b) => a + b, 0) /
                historicalPrices.length
              : avgPrice;

          return {
            ...contract,
            aggregatedPrice: avgPrice,
            priceChange: avgPrice - historicalAvg,
          };
        },
      );

      contracts.sort((a, b) => b.aggregatedPrice - a.aggregatedPrice);
      if (contracts.length === 0) continue;

      const sourcesIncluded = [
        ...new Set(contracts.flatMap((c) => c.prices.map((p) => p.source))),
      ];
      const partyLower = group.party.toLowerCase();
      const category = (
        partyLower === "democratic"
          ? "senate-primary-dem"
          : "senate-primary-gop"
      ) as MarketCategory;

      markets.push({
        id: `senate-primary-${group.stateAbbrev}-${partyLower}`,
        slug: `senate-primary-${group.stateAbbrev}-${partyLower}`,
        name: `${group.state} ${group.party} Senate Primary`,
        description: `Aggregated from ${sourcesIncluded.join(", ")}.`,
        category,
        status: "open",
        contracts,
        totalVolume: contracts.reduce((sum, c) => sum + c.totalVolume, 0),
        lastUpdated: new Date().toISOString(),
      });
    }

    // Sort by state name then party
    markets.sort((a, b) => a.name.localeCompare(b.name));

    return markets;
  } finally {
    client.release();
  }
}

/**
 * Get a specific market by ID
 */
export async function getMarketAsync(
  idOrSlug: string,
  changePeriod?: string,
): Promise<Market | null> {
  const markets = await getMarketsAsync({ changePeriod });
  return (
    markets.find(
      (m) =>
        m.id === idOrSlug || m.slug === idOrSlug || m.slug.includes(idOrSlug),
    ) || null
  );
}

/**
 * Get featured markets
 */
export async function getFeaturedMarketsAsync(): Promise<Market[]> {
  const allMarkets = await getMarketsAsync();
  const featured: Market[] = [];

  const presidential = allMarkets.find(
    (m) =>
      m.category === "presidential" && !m.name.toLowerCase().includes("party"),
  );
  if (presidential) featured.push(presidential);

  const gopPrimary = allMarkets.find((m) => m.category === "primary-gop");
  if (gopPrimary) featured.push(gopPrimary);

  const demPrimary = allMarkets.find((m) => m.category === "primary-dem");
  if (demPrimary) featured.push(demPrimary);

  const house = allMarkets.find((m) => m.category === "house");
  if (house) featured.push(house);

  return featured.slice(0, 4);
}

type ChartGranularity = "5min" | "15min" | "1hour" | "6hour" | "1day";

// Interval in milliseconds for each granularity
const GRANULARITY_MS: Record<ChartGranularity, number> = {
  "5min": 5 * 60 * 1000,
  "15min": 15 * 60 * 1000,
  "1hour": 60 * 60 * 1000,
  "6hour": 6 * 60 * 60 * 1000,
  "1day": 24 * 60 * 60 * 1000,
};

// Get time bucket string for a timestamp based on granularity
function getTimeBucket(
  timestamp: string,
  granularity: ChartGranularity,
): string {
  const date = new Date(timestamp);
  switch (granularity) {
    case "5min": {
      const mins = Math.floor(date.getMinutes() / 5) * 5;
      return `${date.toISOString().slice(0, 14)}${mins.toString().padStart(2, "0")}:00Z`;
    }
    case "15min": {
      const mins = Math.floor(date.getMinutes() / 15) * 15;
      return `${date.toISOString().slice(0, 14)}${mins.toString().padStart(2, "0")}:00Z`;
    }
    case "1hour":
      return `${date.toISOString().slice(0, 13)}:00:00Z`;
    case "6hour": {
      const hours = Math.floor(date.getHours() / 6) * 6;
      return `${date.toISOString().slice(0, 11)}${hours.toString().padStart(2, "0")}:00:00Z`;
    }
    case "1day":
    default:
      return `${date.toISOString().slice(0, 10)}T00:00:00Z`;
  }
}

// Interpolate between data points to fill gaps
function interpolateChartData(
  data: { timestamp: string; values: Record<string, number> }[],
  granularity: ChartGranularity,
): { timestamp: string; values: Record<string, number> }[] {
  if (data.length < 2) return data;

  const interval = GRANULARITY_MS[granularity];
  const result: { timestamp: string; values: Record<string, number> }[] = [];
  const allContracts = new Set<string>();

  for (const point of data) {
    for (const name of Object.keys(point.values)) {
      allContracts.add(name);
    }
  }

  for (let i = 0; i < data.length - 1; i++) {
    const current = data[i];
    const next = data[i + 1];
    const currentTime = new Date(current.timestamp).getTime();
    const nextTime = new Date(next.timestamp).getTime();

    result.push(current);

    const gap = nextTime - currentTime;
    const steps = Math.floor(gap / interval);

    if (steps > 1 && steps < 500) {
      for (let step = 1; step < steps; step++) {
        const t = step / steps;
        const interpolatedTime = new Date(currentTime + step * interval);
        const interpolatedValues: Record<string, number> = {};

        for (const name of allContracts) {
          const v1 = current.values[name];
          const v2 = next.values[name];
          if (v1 !== undefined && v2 !== undefined) {
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

  result.push(data[data.length - 1]);
  return result;
}

// Extract short candidate name for chart display from Polymarket contract names
function extractChartCandidateName(contractName: string): string | null {
  if (!contractName) return null;

  // Skip "No" contracts
  if (contractName.endsWith(" - No")) return null;

  // Remove " - Yes" suffix
  const cleanName = contractName.replace(/ - Yes$/, "");

  // Handle party control contracts (house/senate)
  const controlMatch = cleanName.match(/^Will the (.+?) (control|win)/i);
  if (controlMatch) {
    const partyName = controlMatch[1].trim();
    if (/democrat/i.test(partyName)) return "Democratic";
    if (/republican/i.test(partyName)) return "Republican";
  }

  const willMatch = cleanName.match(/^Will (.+?) (win|be) the 2028/i);
  if (willMatch) {
    const fullName = willMatch[1].trim();
    if (/^(Person|Party|Candidate)\s+[A-Z]{1,2}$/i.test(fullName)) return null;
    if (fullName.toLowerCase() === "another person") return null;

    // Special cases
    if (fullName === "Donald Trump Jr.") return "Trump_Jr";
    if (fullName.includes("'The Rock'")) return "Johnson";
    if (fullName === "Robert F. Kennedy Jr.") return "Kennedy";
    if (fullName === "Alexandria Ocasio-Cortez") return "Ocasio-Cortez";
    if (fullName === "Sarah Huckabee Sanders") return "S_Sanders";
    if (fullName === "Ivanka Trump") return "I_Trump";
    if (fullName === "Michelle Obama") return "M_Obama";
    if (fullName === "Hillary Clinton") return "H_Clinton";
    if (fullName === "Chelsea Clinton") return "C_Clinton";
    if (fullName === "Marjorie Taylor Greene") return "M_Greene";
    if (fullName === "Phil Murphy") return "P_Murphy";
    if (fullName === "Rand Paul") return "R_Paul";

    const parts = fullName.split(" ");
    return parts[parts.length - 1];
  }

  // Handle bare party names (PredictIt/Smarkets: "Democratic Party", "Republican Party")
  if (/^democrat/i.test(cleanName)) return "Democratic";
  if (/^republican/i.test(cleanName)) return "Republican";

  return null;
}

/**
 * Get chart data with granularity and interpolation (PostgreSQL version)
 */
export async function getChartDataAsync(
  marketId: string,
  startDate?: string,
  endDate?: string,
  granularity: ChartGranularity = "1day",
): Promise<{ timestamp: string; values: Record<string, number> }[]> {
  const pool = getPool();
  const client = await pool.connect();

  try {
    const polymarketMapping: Record<string, string> = {
      "presidential-2028": "31552",
      "presidential-winner-2028": "31552",
      "gop-primary-2028": "31875",
      "gop-nominee-2028": "31875",
      "dem-primary-2028": "30829",
      "dem-nominee-2028": "30829",
      "house-control-2026": "32225",
      "presidential-party-2028": "33228",
      "senate-control-2026": "32224",
    };

    const dbMarketId = polymarketMapping[marketId] || marketId;

    // For daily granularity, aggregate in SQL to avoid transferring 100K+ rows
    if (granularity === "1day") {
      let query = `
        SELECT
          DATE_TRUNC('day', ps.snapshot_time) as bucket,
          c.contract_name,
          AVG(ps.yes_price) as yes_price
        FROM price_snapshots ps
        JOIN contracts c ON ps.source = c.source AND ps.market_id = c.market_id AND ps.contract_id = c.contract_id
        WHERE ps.source = 'Polymarket' AND ps.market_id = $1
          AND ps.yes_price IS NOT NULL
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
      query += ` GROUP BY bucket, c.contract_name ORDER BY bucket ASC`;

      const result = await client.query(query, params);

      // Group pre-aggregated rows by bucket
      const byBucket = new Map<
        string,
        { timestamp: string; values: Record<string, number> }
      >();
      for (const row of result.rows) {
        const ts =
          row.bucket instanceof Date
            ? row.bucket.toISOString()
            : String(row.bucket);
        const bucketKey = `${ts.slice(0, 10)}T00:00:00Z`;
        if (!byBucket.has(bucketKey)) {
          byBucket.set(bucketKey, { timestamp: bucketKey, values: {} });
        }
        const name = extractChartCandidateName(row.contract_name);
        if (!name) continue;
        byBucket.get(bucketKey)!.values[name] = parseFloat(row.yes_price) * 100;
      }

      return Array.from(byBucket.values());
    }

    // For sub-daily granularity, fetch raw snapshots and bucket in JS
    let query = `
      SELECT
        ps.snapshot_time,
        c.contract_name,
        ps.yes_price
      FROM price_snapshots ps
      JOIN contracts c ON ps.source = c.source AND ps.market_id = c.market_id AND ps.contract_id = c.contract_id
      WHERE ps.source = 'Polymarket' AND ps.market_id = $1
        AND ps.yes_price IS NOT NULL
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

    query += ` ORDER BY ps.snapshot_time ASC`;

    const result = await client.query(query, params);

    // Group by time bucket based on granularity
    const byBucket = new Map<
      string,
      { values: Record<string, number[]>; timestamp: string }
    >();

    for (const row of result.rows) {
      const ts =
        row.snapshot_time instanceof Date
          ? row.snapshot_time.toISOString()
          : String(row.snapshot_time);

      const bucket = getTimeBucket(ts, granularity);

      if (!byBucket.has(bucket)) {
        byBucket.set(bucket, { values: {}, timestamp: bucket });
      }

      const entry = byBucket.get(bucket)!;
      const name = extractChartCandidateName(row.contract_name);
      if (!name) continue;

      const price = parseFloat(row.yes_price);
      if (!entry.values[name]) {
        entry.values[name] = [];
      }
      entry.values[name].push(price * 100);
    }

    // Average values within each bucket
    const chartData: { timestamp: string; values: Record<string, number> }[] =
      [];
    for (const [, entry] of byBucket) {
      const avgValues: Record<string, number> = {};
      for (const [name, prices] of Object.entries(entry.values)) {
        avgValues[name] = prices.reduce((a, b) => a + b, 0) / prices.length;
      }
      chartData.push({ timestamp: entry.timestamp, values: avgValues });
    }

    // Interpolate to fill gaps for sub-daily granularities
    if (chartData.length >= 2) {
      return interpolateChartData(chartData, granularity);
    }

    return chartData;
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
  return !!(process.env as any)["DATABASE_URL"];
}

/**
 * Get stats (PostgreSQL version)
 */
export async function getStatsAsync() {
  const pool = getPool();
  const client = await pool.connect();

  try {
    const marketCount = await client.query(
      "SELECT COUNT(DISTINCT market_id) as count FROM markets",
    );
    const contractCount = await client.query(
      "SELECT COUNT(*) as count FROM contracts",
    );

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

/**
 * Get curated posts from Supabase (PostgreSQL version)
 */
export async function getCuratedPostsAsync(options?: {
  candidate?: string;
  topic?: string;
  limit?: number;
}): Promise<CuratedPostRow[]> {
  const pool = getPool();
  const client = await pool.connect();

  try {
    const conditions: string[] = [];
    const params: (string | number)[] = [];
    let paramIdx = 1;

    if (options?.candidate) {
      conditions.push(`candidate_name = $${paramIdx++}`);
      params.push(options.candidate);
    }
    if (options?.topic) {
      conditions.push(`topic = $${paramIdx++}`);
      params.push(options.topic);
    }

    const where =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const limitClause = options?.limit ? `LIMIT $${paramIdx++}` : "";
    if (options?.limit) params.push(options.limit);

    const result = await client.query(
      `
      SELECT tweet_id, candidate_name, topic,
             posted_at::text as posted_at, editor_note,
             tweet_text, likes, retweets, replies, views,
             enriched_at::text as enriched_at
      FROM curated_posts
      ${where}
      ORDER BY posted_at DESC
      ${limitClause}
    `,
      params,
    );

    return result.rows as CuratedPostRow[];
  } finally {
    client.release();
  }
}

/**
 * Get curated post stats grouped by candidate and topic (PostgreSQL version)
 */
export async function getCuratedPostStatsAsync(): Promise<{
  candidateCounts: {
    candidate_name: string;
    count: number;
    latest_at: string;
  }[];
  topicCounts: { topic: PulseTopic; count: number }[];
}> {
  const pool = getPool();
  const client = await pool.connect();

  try {
    const candidateResult = await client.query(`
      SELECT candidate_name, COUNT(*)::int as count, MAX(posted_at)::text as latest_at
      FROM curated_posts
      GROUP BY candidate_name
      ORDER BY count DESC
    `);

    const topicResult = await client.query(`
      SELECT topic, COUNT(*)::int as count
      FROM curated_posts
      GROUP BY topic
      ORDER BY count DESC
    `);

    return {
      candidateCounts: candidateResult.rows,
      topicCounts: topicResult.rows as { topic: PulseTopic; count: number }[],
    };
  } finally {
    client.release();
  }
}
