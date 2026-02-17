/**
 * Current US governors by state (as of 2026).
 * 36 states have gubernatorial races in 2026.
 */

export type GovernorParty = 'R' | 'D';

export interface GovernorInfo {
  name: string;
  party: GovernorParty;
  since: number;
  upIn2026: boolean;
}

/** Map fill colors per party (light / dark) — same oklch hues as Senate map */
export const GOVERNOR_COLORS: Record<
  GovernorParty,
  { light: string; dark: string; label: string }
> = {
  R: {
    light: 'oklch(0.55 0.22 25)',
    dark: 'oklch(0.50 0.20 25)',
    label: 'Republican',
  },
  D: {
    light: 'oklch(0.55 0.20 255)',
    dark: 'oklch(0.50 0.18 255)',
    label: 'Democrat',
  },
};

export const HOVER_COLOR = 'oklch(0.80 0.18 90)';

/** 36 states with 2026 gubernatorial races */
export const GOVERNOR_RACE_STATES_2026 = new Set([
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'FL', 'GA', 'HI',
  'ID', 'IL', 'IA', 'KS', 'ME', 'MD', 'MA', 'MI', 'MN', 'NE',
  'NV', 'NH', 'NM', 'NY', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'VT', 'WI', 'WY',
]);

/**
 * All 50 governors, keyed by 2-letter state abbreviation.
 */
export const GOVERNOR_COMPOSITION: Record<string, GovernorInfo> = {
  AL: { name: 'Kay Ivey', party: 'R', since: 2017, upIn2026: true },
  AK: { name: 'Mike Dunleavy', party: 'R', since: 2018, upIn2026: true },
  AZ: { name: 'Katie Hobbs', party: 'D', since: 2023, upIn2026: true },
  AR: { name: 'Sarah Huckabee Sanders', party: 'R', since: 2023, upIn2026: true },
  CA: { name: 'Gavin Newsom', party: 'D', since: 2019, upIn2026: true },
  CO: { name: 'Jared Polis', party: 'D', since: 2019, upIn2026: true },
  CT: { name: 'Ned Lamont', party: 'D', since: 2019, upIn2026: true },
  DE: { name: 'Matt Meyer', party: 'D', since: 2025, upIn2026: false },
  FL: { name: 'Ron DeSantis', party: 'R', since: 2019, upIn2026: true },
  GA: { name: 'Brian Kemp', party: 'R', since: 2019, upIn2026: true },
  HI: { name: 'Josh Green', party: 'D', since: 2022, upIn2026: true },
  ID: { name: 'Brad Little', party: 'R', since: 2019, upIn2026: true },
  IL: { name: 'JB Pritzker', party: 'D', since: 2019, upIn2026: true },
  IN: { name: 'Mike Braun', party: 'R', since: 2025, upIn2026: false },
  IA: { name: 'Kim Reynolds', party: 'R', since: 2017, upIn2026: true },
  KS: { name: 'Laura Kelly', party: 'D', since: 2019, upIn2026: true },
  KY: { name: 'Andy Beshear', party: 'D', since: 2019, upIn2026: false },
  LA: { name: 'Jeff Landry', party: 'R', since: 2024, upIn2026: false },
  ME: { name: 'Janet Mills', party: 'D', since: 2019, upIn2026: true },
  MD: { name: 'Wes Moore', party: 'D', since: 2023, upIn2026: true },
  MA: { name: 'Maura Healey', party: 'D', since: 2023, upIn2026: true },
  MI: { name: 'Gretchen Whitmer', party: 'D', since: 2019, upIn2026: true },
  MN: { name: 'Tim Walz', party: 'D', since: 2019, upIn2026: true },
  MS: { name: 'Tate Reeves', party: 'R', since: 2020, upIn2026: false },
  MO: { name: 'Mike Kehoe', party: 'R', since: 2025, upIn2026: false },
  MT: { name: 'Greg Gianforte', party: 'R', since: 2021, upIn2026: false },
  NE: { name: 'Jim Pillen', party: 'R', since: 2023, upIn2026: true },
  NV: { name: 'Joe Lombardo', party: 'R', since: 2023, upIn2026: true },
  NH: { name: 'Kelly Ayotte', party: 'R', since: 2025, upIn2026: true },
  NJ: { name: 'Phil Murphy', party: 'D', since: 2018, upIn2026: false },
  NM: { name: 'Michelle Lujan Grisham', party: 'D', since: 2019, upIn2026: true },
  NY: { name: 'Kathy Hochul', party: 'D', since: 2021, upIn2026: true },
  NC: { name: 'Josh Stein', party: 'D', since: 2025, upIn2026: false },
  ND: { name: 'Kelly Armstrong', party: 'R', since: 2024, upIn2026: false },
  OH: { name: 'Mike DeWine', party: 'R', since: 2019, upIn2026: true },
  OK: { name: 'Kevin Stitt', party: 'R', since: 2019, upIn2026: true },
  OR: { name: 'Tina Kotek', party: 'D', since: 2023, upIn2026: true },
  PA: { name: 'Josh Shapiro', party: 'D', since: 2023, upIn2026: true },
  RI: { name: 'Dan McKee', party: 'D', since: 2021, upIn2026: true },
  SC: { name: 'Henry McMaster', party: 'R', since: 2017, upIn2026: true },
  SD: { name: 'Kristi Noem', party: 'R', since: 2019, upIn2026: true },
  TN: { name: 'Bill Lee', party: 'R', since: 2019, upIn2026: true },
  TX: { name: 'Greg Abbott', party: 'R', since: 2015, upIn2026: true },
  UT: { name: 'Spencer Cox', party: 'R', since: 2021, upIn2026: false },
  VT: { name: 'Phil Scott', party: 'R', since: 2017, upIn2026: true },
  VA: { name: 'Glenn Youngkin', party: 'R', since: 2022, upIn2026: false },
  WA: { name: 'Bob Ferguson', party: 'D', since: 2025, upIn2026: false },
  WV: { name: 'Patrick Morrisey', party: 'R', since: 2025, upIn2026: false },
  WI: { name: 'Tony Evers', party: 'D', since: 2019, upIn2026: true },
  WY: { name: 'Mark Gordon', party: 'R', since: 2019, upIn2026: true },
};

/** Summary counts for legend / stats display */
export function getGovernorStats() {
  const entries = Object.values(GOVERNOR_COMPOSITION);
  const rCount = entries.filter((e) => e.party === 'R').length;
  const dCount = entries.filter((e) => e.party === 'D').length;
  const racesIn2026 = entries.filter((e) => e.upIn2026).length;

  return { rCount, dCount, racesIn2026 };
}
