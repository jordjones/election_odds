/**
 * Current US Senate composition after the 2024 election (119th Congress).
 * Sanders (I-VT) and King (I-ME) caucus with Democrats.
 */

export type Party = 'R' | 'D' | 'I';
export type DelegationType = 'solid-r' | 'solid-d' | 'split';

export interface Senator {
  name: string;
  party: Party;
}

export interface StateDelegation {
  senators: [Senator, Senator];
  delegation: DelegationType;
}

/** Map fill colors per delegation type (light / dark) */
export const DELEGATION_COLORS: Record<
  DelegationType,
  { light: string; dark: string; label: string }
> = {
  'solid-r': {
    light: 'oklch(0.55 0.22 25)',
    dark: 'oklch(0.50 0.20 25)',
    label: 'Republican',
  },
  'solid-d': {
    light: 'oklch(0.55 0.20 255)',
    dark: 'oklch(0.50 0.18 255)',
    label: 'Democrat',
  },
  split: {
    light: 'oklch(0.65 0.15 310)',
    dark: 'oklch(0.55 0.15 310)',
    label: 'Split Delegation',
  },
};

export const HOVER_COLOR = 'oklch(0.80 0.18 90)';

/**
 * All 100 senators, keyed by 2-letter state abbreviation (matches STUSPS).
 * Reflects 2024 election results: MT, OH, WV flipped R; NE, PA, AZ held.
 */
export const SENATE_COMPOSITION: Record<string, StateDelegation> = {
  AL: {
    senators: [
      { name: 'Tommy Tuberville', party: 'R' },
      { name: 'Katie Britt', party: 'R' },
    ],
    delegation: 'solid-r',
  },
  AK: {
    senators: [
      { name: 'Lisa Murkowski', party: 'R' },
      { name: 'Dan Sullivan', party: 'R' },
    ],
    delegation: 'solid-r',
  },
  AZ: {
    senators: [
      { name: 'Ruben Gallego', party: 'D' },
      { name: 'Mark Kelly', party: 'D' },
    ],
    delegation: 'solid-d',
  },
  AR: {
    senators: [
      { name: 'John Boozman', party: 'R' },
      { name: 'Tom Cotton', party: 'R' },
    ],
    delegation: 'solid-r',
  },
  CA: {
    senators: [
      { name: 'Adam Schiff', party: 'D' },
      { name: 'Alex Padilla', party: 'D' },
    ],
    delegation: 'solid-d',
  },
  CO: {
    senators: [
      { name: 'Michael Bennet', party: 'D' },
      { name: 'John Hickenlooper', party: 'D' },
    ],
    delegation: 'solid-d',
  },
  CT: {
    senators: [
      { name: 'Richard Blumenthal', party: 'D' },
      { name: 'Chris Murphy', party: 'D' },
    ],
    delegation: 'solid-d',
  },
  DE: {
    senators: [
      { name: 'Lisa Blunt Rochester', party: 'D' },
      { name: 'Chris Coons', party: 'D' },
    ],
    delegation: 'solid-d',
  },
  FL: {
    senators: [
      { name: 'Rick Scott', party: 'R' },
      { name: 'Ashley Moody', party: 'R' },
    ],
    delegation: 'solid-r',
  },
  GA: {
    senators: [
      { name: 'Jon Ossoff', party: 'D' },
      { name: 'Raphael Warnock', party: 'D' },
    ],
    delegation: 'solid-d',
  },
  HI: {
    senators: [
      { name: 'Brian Schatz', party: 'D' },
      { name: 'Mazie Hirono', party: 'D' },
    ],
    delegation: 'solid-d',
  },
  ID: {
    senators: [
      { name: 'Mike Crapo', party: 'R' },
      { name: 'Jim Risch', party: 'R' },
    ],
    delegation: 'solid-r',
  },
  IL: {
    senators: [
      { name: 'Dick Durbin', party: 'D' },
      { name: 'Tammy Duckworth', party: 'D' },
    ],
    delegation: 'solid-d',
  },
  IN: {
    senators: [
      { name: 'Jim Banks', party: 'R' },
      { name: 'Todd Young', party: 'R' },
    ],
    delegation: 'solid-r',
  },
  IA: {
    senators: [
      { name: 'Joni Ernst', party: 'R' },
      { name: 'Chuck Grassley', party: 'R' },
    ],
    delegation: 'solid-r',
  },
  KS: {
    senators: [
      { name: 'Jerry Moran', party: 'R' },
      { name: 'Roger Marshall', party: 'R' },
    ],
    delegation: 'solid-r',
  },
  KY: {
    senators: [
      { name: 'Mitch McConnell', party: 'R' },
      { name: 'Rand Paul', party: 'R' },
    ],
    delegation: 'solid-r',
  },
  LA: {
    senators: [
      { name: 'Bill Cassidy', party: 'R' },
      { name: 'John Kennedy', party: 'R' },
    ],
    delegation: 'solid-r',
  },
  ME: {
    senators: [
      { name: 'Susan Collins', party: 'R' },
      { name: 'Angus King', party: 'I' },
    ],
    delegation: 'split',
  },
  MD: {
    senators: [
      { name: 'Angela Alsobrooks', party: 'D' },
      { name: 'Chris Van Hollen', party: 'D' },
    ],
    delegation: 'solid-d',
  },
  MA: {
    senators: [
      { name: 'Ed Markey', party: 'D' },
      { name: 'Elizabeth Warren', party: 'D' },
    ],
    delegation: 'solid-d',
  },
  MI: {
    senators: [
      { name: 'Elissa Slotkin', party: 'D' },
      { name: 'Gary Peters', party: 'D' },
    ],
    delegation: 'solid-d',
  },
  MN: {
    senators: [
      { name: 'Amy Klobuchar', party: 'D' },
      { name: 'Tina Smith', party: 'D' },
    ],
    delegation: 'solid-d',
  },
  MS: {
    senators: [
      { name: 'Roger Wicker', party: 'R' },
      { name: 'Cindy Hyde-Smith', party: 'R' },
    ],
    delegation: 'solid-r',
  },
  MO: {
    senators: [
      { name: 'Josh Hawley', party: 'R' },
      { name: 'Eric Schmitt', party: 'R' },
    ],
    delegation: 'solid-r',
  },
  MT: {
    senators: [
      { name: 'Tim Sheehy', party: 'R' },
      { name: 'Steve Daines', party: 'R' },
    ],
    delegation: 'solid-r',
  },
  NE: {
    senators: [
      { name: 'Deb Fischer', party: 'R' },
      { name: 'Pete Ricketts', party: 'R' },
    ],
    delegation: 'solid-r',
  },
  NV: {
    senators: [
      { name: 'Jacky Rosen', party: 'D' },
      { name: 'Catherine Cortez Masto', party: 'D' },
    ],
    delegation: 'solid-d',
  },
  NH: {
    senators: [
      { name: 'Jeanne Shaheen', party: 'D' },
      { name: 'Maggie Hassan', party: 'D' },
    ],
    delegation: 'solid-d',
  },
  NJ: {
    senators: [
      { name: 'Andy Kim', party: 'D' },
      { name: 'Cory Booker', party: 'D' },
    ],
    delegation: 'solid-d',
  },
  NM: {
    senators: [
      { name: 'Martin Heinrich', party: 'D' },
      { name: 'Ben Ray Lujan', party: 'D' },
    ],
    delegation: 'solid-d',
  },
  NY: {
    senators: [
      { name: 'Kirsten Gillibrand', party: 'D' },
      { name: 'Chuck Schumer', party: 'D' },
    ],
    delegation: 'solid-d',
  },
  NC: {
    senators: [
      { name: 'Thom Tillis', party: 'R' },
      { name: 'Ted Budd', party: 'R' },
    ],
    delegation: 'solid-r',
  },
  ND: {
    senators: [
      { name: 'John Hoeven', party: 'R' },
      { name: 'Kevin Cramer', party: 'R' },
    ],
    delegation: 'solid-r',
  },
  OH: {
    senators: [
      { name: 'Bernie Moreno', party: 'R' },
      { name: 'Jon Husted', party: 'R' },
    ],
    delegation: 'solid-r',
  },
  OK: {
    senators: [
      { name: 'Markwayne Mullin', party: 'R' },
      { name: 'James Lankford', party: 'R' },
    ],
    delegation: 'solid-r',
  },
  OR: {
    senators: [
      { name: 'Ron Wyden', party: 'D' },
      { name: 'Jeff Merkley', party: 'D' },
    ],
    delegation: 'solid-d',
  },
  PA: {
    senators: [
      { name: 'Dave McCormick', party: 'R' },
      { name: 'John Fetterman', party: 'D' },
    ],
    delegation: 'split',
  },
  RI: {
    senators: [
      { name: 'Sheldon Whitehouse', party: 'D' },
      { name: 'Jack Reed', party: 'D' },
    ],
    delegation: 'solid-d',
  },
  SC: {
    senators: [
      { name: 'Lindsey Graham', party: 'R' },
      { name: 'Tim Scott', party: 'R' },
    ],
    delegation: 'solid-r',
  },
  SD: {
    senators: [
      { name: 'John Thune', party: 'R' },
      { name: 'Mike Rounds', party: 'R' },
    ],
    delegation: 'solid-r',
  },
  TN: {
    senators: [
      { name: 'Marsha Blackburn', party: 'R' },
      { name: 'Bill Hagerty', party: 'R' },
    ],
    delegation: 'solid-r',
  },
  TX: {
    senators: [
      { name: 'Ted Cruz', party: 'R' },
      { name: 'John Cornyn', party: 'R' },
    ],
    delegation: 'solid-r',
  },
  UT: {
    senators: [
      { name: 'Mike Lee', party: 'R' },
      { name: 'John Curtis', party: 'R' },
    ],
    delegation: 'solid-r',
  },
  VT: {
    senators: [
      { name: 'Bernie Sanders', party: 'I' },
      { name: 'Peter Welch', party: 'D' },
    ],
    delegation: 'solid-d',
  },
  VA: {
    senators: [
      { name: 'Tim Kaine', party: 'D' },
      { name: 'Mark Warner', party: 'D' },
    ],
    delegation: 'solid-d',
  },
  WA: {
    senators: [
      { name: 'Maria Cantwell', party: 'D' },
      { name: 'Patty Murray', party: 'D' },
    ],
    delegation: 'solid-d',
  },
  WV: {
    senators: [
      { name: 'Jim Justice', party: 'R' },
      { name: 'Shelley Moore Capito', party: 'R' },
    ],
    delegation: 'solid-r',
  },
  WI: {
    senators: [
      { name: 'Tammy Baldwin', party: 'D' },
      { name: 'Ron Johnson', party: 'R' },
    ],
    delegation: 'split',
  },
  WY: {
    senators: [
      { name: 'John Barrasso', party: 'R' },
      { name: 'Cynthia Lummis', party: 'R' },
    ],
    delegation: 'solid-r',
  },
};

/** Summary counts for legend / stats display */
export function getSenateStats() {
  const entries = Object.values(SENATE_COMPOSITION);
  const solidR = entries.filter((e) => e.delegation === 'solid-r').length;
  const solidD = entries.filter((e) => e.delegation === 'solid-d').length;
  const split = entries.filter((e) => e.delegation === 'split').length;

  // Count individual seats
  let rSeats = 0;
  let dSeats = 0;
  let iSeats = 0;
  for (const state of entries) {
    for (const s of state.senators) {
      if (s.party === 'R') rSeats++;
      else if (s.party === 'D') dSeats++;
      else iSeats++;
    }
  }

  return { solidR, solidD, split, rSeats, dSeats, iSeats };
}
