/**
 * TypeScript interfaces for the election map data package.
 *
 * All boundary properties match TopoJSON feature properties.
 * All results are keyed by GEOID strings.
 */

// ---------------------------------------------------------------------------
// Boundary Properties
// ---------------------------------------------------------------------------

export interface StateProperties {
  GEOID: string;    // "01" — 2-digit state FIPS
  STATEFP: string;  // "01" — same as GEOID
  STUSPS: string;   // "AL" — 2-letter postal abbreviation
  NAME: string;     // "Alabama" — full state name
}

export interface CountyProperties {
  GEOID: string;      // "01001" — 5-digit county FIPS
  STATEFP: string;    // "01" — 2-digit state FIPS
  COUNTYFP: string;   // "001" — 3-digit county FIPS
  NAME: string;       // "Autauga" — county name
  NAMELSAD: string;   // "Autauga County" — name with type suffix
  STUSPS: string;     // "AL" — state abbreviation
  STATE_NAME: string; // "Alabama" — full state name
}

export interface CDProperties {
  GEOID: string;    // "0101" — 4-digit CD GEOID (state + district)
  STATEFP: string;  // "01" — 2-digit state FIPS
  NAME: string;     // "Congressional District 1 (119th Congress), Alabama"
}

// ---------------------------------------------------------------------------
// Election Results
// ---------------------------------------------------------------------------

export interface ElectionResult {
  dem_votes: number;
  rep_votes: number;
  other_votes: number;
  totalvotes: number;
  dem_pct: number;   // 0.0–1.0
  rep_pct: number;   // 0.0–1.0
  margin: number;    // dem_pct - rep_pct (positive = DEM lead)
  winner: 'DEM' | 'REP' | 'OTHER';
}

export interface CandidateResult extends ElectionResult {
  dem_candidate: string | null;
  rep_candidate: string | null;
}

// ---------------------------------------------------------------------------
// Results File Schemas
// ---------------------------------------------------------------------------

export interface SingleYearResults<T extends ElectionResult = ElectionResult> {
  meta: {
    election: 'presidential' | 'senate' | 'house';
    year: number;
    geography: 'state' | 'county' | 'cd';
    generated: string;
    source: string;
  };
  results: Record<string, T>;
}

export interface HistoryResults {
  meta: {
    election: 'presidential';
    geography: 'state' | 'county';
    years: number[];
    generated: string;
    source: string;
  };
  candidates: Record<string, { dem: string; rep: string }>;
  results: Record<string, Record<string, ElectionResult>>;
}

// ---------------------------------------------------------------------------
// Lookups
// ---------------------------------------------------------------------------

export interface StateInfo {
  name: string;     // "Alabama"
  abbrev: string;   // "AL"
  slug: string;     // "alabama"
}

/** state-fips.json: FIPS → StateInfo */
export type StateFipsLookup = Record<string, StateInfo>;

/** candidates.json: year → { dem, rep } */
export type CandidateLookup = Record<string, { dem: string; rep: string }>;
