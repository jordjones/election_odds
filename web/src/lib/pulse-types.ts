/**
 * Types for the Candidate Pulse feature
 */

export type PulseTopic =
  | 'economy'
  | 'immigration'
  | 'foreign-policy'
  | 'healthcare'
  | 'climate'
  | 'culture-war'
  | 'campaign'
  | 'general';

export type PulseRace =
  | 'presidential-2028'
  | 'dem-nominee-2028'
  | 'gop-nominee-2028'
  | 'midterm-2026'
  | 'midterm-2026-az-dem'
  | 'midterm-2026-ga-gop'
  | 'midterm-2026-ia-gop'
  | 'midterm-2026-il-dem'
  | 'midterm-2026-ky-gop'
  | 'midterm-2026-la-gop'
  | 'midterm-2026-ma-dem'
  | 'midterm-2026-me-dem'
  | 'midterm-2026-me-gop'
  | 'midterm-2026-mi-dem'
  | 'midterm-2026-mi-gop'
  | 'midterm-2026-mn-dem'
  | 'midterm-2026-mn-gop'
  | 'midterm-2026-nc-gop'
  | 'midterm-2026-nh-gop'
  | 'midterm-2026-sc-gop'
  | 'midterm-2026-tx-gop'
  | 'midterm-2026-wy-gop';

export type PulseSortMode = 'recent' | 'popular' | 'odds-change';

export interface CuratedPost {
  /** Tweet ID from X */
  tweetId: string;
  /** Candidate display name (must match getTwitterHandle keys) */
  candidateName: string;
  /** Topic tag for filtering */
  topic: PulseTopic;
  /** ISO date string when the post was published */
  postedAt: string;
  /** Brief editorial note (why this post matters) */
  editorNote?: string;
  /** Whether this is a mock post (for dev/demo) */
  isMock?: boolean;
}

export interface MockPost {
  tweetId: string;
  candidateName: string;
  twitterHandle: string;
  topic: PulseTopic;
  postedAt: string;
  text: string;
  likes: number;
  retweets: number;
  editorNote?: string;
}

export interface PulseCandidate {
  name: string;
  slug: string;
  twitterHandle: string;
  postCount: number;
  latestPostAt: string;
  currentOdds?: number;
  oddsChange?: number;
}

export interface PulseFeedFilters {
  race?: PulseRace;
  candidate?: string;
  topic?: PulseTopic;
  sort?: PulseSortMode;
}

export interface PulseRaceOption {
  value: PulseRace;
  label: string;
  /** If set, this is a sub-category under the given parent */
  group?: PulseRace;
}

export const PULSE_RACES: PulseRaceOption[] = [
  { value: 'presidential-2028', label: '2028 Presidential' },
  { value: 'dem-nominee-2028', label: '2028 Dem Nominee' },
  { value: 'gop-nominee-2028', label: '2028 GOP Nominee' },
  { value: 'midterm-2026', label: '2026 Midterm Primaries' },
  // Sub-categories under midterm-2026 (sorted alphabetically by state)
  { value: 'midterm-2026-az-dem', label: 'AZ Dem Primary', group: 'midterm-2026' },
  { value: 'midterm-2026-ga-gop', label: 'GA GOP Primary', group: 'midterm-2026' },
  { value: 'midterm-2026-ia-gop', label: 'IA GOP Primary', group: 'midterm-2026' },
  { value: 'midterm-2026-il-dem', label: 'IL Dem Primary', group: 'midterm-2026' },
  { value: 'midterm-2026-ky-gop', label: 'KY GOP Primary', group: 'midterm-2026' },
  { value: 'midterm-2026-la-gop', label: 'LA GOP Primary', group: 'midterm-2026' },
  { value: 'midterm-2026-ma-dem', label: 'MA Dem Primary', group: 'midterm-2026' },
  { value: 'midterm-2026-me-dem', label: 'ME Dem Primary', group: 'midterm-2026' },
  { value: 'midterm-2026-me-gop', label: 'ME GOP Primary', group: 'midterm-2026' },
  { value: 'midterm-2026-mi-dem', label: 'MI Dem Primary', group: 'midterm-2026' },
  { value: 'midterm-2026-mi-gop', label: 'MI GOP Primary', group: 'midterm-2026' },
  { value: 'midterm-2026-mn-dem', label: 'MN Dem Primary', group: 'midterm-2026' },
  { value: 'midterm-2026-mn-gop', label: 'MN GOP Primary', group: 'midterm-2026' },
  { value: 'midterm-2026-nc-gop', label: 'NC GOP Primary', group: 'midterm-2026' },
  { value: 'midterm-2026-nh-gop', label: 'NH GOP Primary', group: 'midterm-2026' },
  { value: 'midterm-2026-sc-gop', label: 'SC GOP Primary', group: 'midterm-2026' },
  { value: 'midterm-2026-tx-gop', label: 'TX GOP Primary', group: 'midterm-2026' },
  { value: 'midterm-2026-wy-gop', label: 'WY GOP Primary', group: 'midterm-2026' },
];

/** Check if a candidate's races match the selected filter.
 *  - 'midterm-2026' matches any midterm-2026-* sub-race
 *  - All other values require an exact match in the array */
export function matchesRaceFilter(candidateRaces: PulseRace[], selectedRace: PulseRace): boolean {
  if (selectedRace === 'midterm-2026') {
    return candidateRaces.some((r) => r.startsWith('midterm-2026'));
  }
  return candidateRaces.includes(selectedRace);
}

export interface CuratedPostRow {
  tweet_id: string;
  candidate_name: string;
  topic: PulseTopic;
  posted_at: string;
  editor_note: string | null;
  tweet_text: string | null;
  likes: number | null;
  retweets: number | null;
  replies: number | null;
  views: number | null;
  enriched_at: string | null;
}

export const PULSE_TOPICS: { value: PulseTopic; label: string }[] = [
  { value: 'economy', label: 'Economy' },
  { value: 'immigration', label: 'Immigration' },
  { value: 'foreign-policy', label: 'Foreign Policy' },
  { value: 'healthcare', label: 'Healthcare' },
  { value: 'climate', label: 'Climate' },
  { value: 'culture-war', label: 'Culture War' },
  { value: 'campaign', label: 'Campaign' },
  { value: 'general', label: 'General' },
];
