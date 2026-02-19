/** Party color utility — maps candidate/party names to consistent colors */

const PARTY_COLORS = {
  // Democrat
  dem: '#3b82f6',
  democratic: '#3b82f6',
  'democratic party': '#3b82f6',
  blue: '#3b82f6',

  // Republican
  gop: '#ef4444',
  republican: '#ef4444',
  'republican party': '#ef4444',
  red: '#ef4444',

  // Independent / Other
  independent: '#a855f7',
  other: '#71717a',
  green: '#22c55e',
  libertarian: '#f59e0b',
} as const;

/** Known candidate → party mapping */
const CANDIDATE_PARTY: Record<string, 'dem' | 'gop'> = {
  // Democrats
  'gavin newsom': 'dem',
  'alexandria ocasio-cortez': 'dem',
  'josh shapiro': 'dem',
  'kamala harris': 'dem',
  'andy beshear': 'dem',
  'jb pritzker': 'dem',
  'pete buttigieg': 'dem',
  'gretchen whitmer': 'dem',
  'democratic party': 'dem',

  // Republicans
  'jd vance': 'gop',
  'marco rubio': 'gop',
  'ron desantis': 'gop',
  'brian kemp': 'gop',
  'donald trump': 'gop',
  'ted cruz': 'gop',
  'nikki haley': 'gop',
  'glenn youngkin': 'gop',
  'republican party': 'gop',
};

export type PartyId = 'dem' | 'gop' | 'independent' | 'other';

/** Get hex color for a party or candidate name */
export function getPartyColor(nameOrParty: string): string {
  const lower = nameOrParty.toLowerCase().trim();

  // Direct party match
  if (lower in PARTY_COLORS) {
    return PARTY_COLORS[lower as keyof typeof PARTY_COLORS];
  }

  // Candidate lookup
  if (lower in CANDIDATE_PARTY) {
    const party = CANDIDATE_PARTY[lower];
    return PARTY_COLORS[party];
  }

  // Heuristic: check if name contains party keywords
  if (lower.includes('democrat') || lower.includes('dem ')) return PARTY_COLORS.dem;
  if (lower.includes('republican') || lower.includes('gop')) return PARTY_COLORS.gop;

  return PARTY_COLORS.other;
}

/** Get party ID for a candidate */
export function getPartyId(name: string): PartyId {
  const lower = name.toLowerCase().trim();
  if (lower in CANDIDATE_PARTY) return CANDIDATE_PARTY[lower];
  if (lower.includes('democrat') || lower.includes('dem ')) return 'dem';
  if (lower.includes('republican') || lower.includes('gop')) return 'gop';
  return 'other';
}

/** Tailwind bg class for party */
export function getPartyBgClass(party: PartyId): string {
  switch (party) {
    case 'dem': return 'bg-blue-500';
    case 'gop': return 'bg-red-500';
    case 'independent': return 'bg-purple-500';
    default: return 'bg-zinc-500';
  }
}

/** Tailwind text class for party */
export function getPartyTextClass(party: PartyId): string {
  switch (party) {
    case 'dem': return 'text-blue-400';
    case 'gop': return 'text-red-400';
    case 'independent': return 'text-purple-400';
    default: return 'text-zinc-400';
  }
}

/** Party display label */
export function getPartyLabel(party: PartyId): string {
  switch (party) {
    case 'dem': return 'Democrat';
    case 'gop': return 'Republican';
    case 'independent': return 'Independent';
    default: return 'Other';
  }
}
