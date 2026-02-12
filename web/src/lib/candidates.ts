/**
 * Shared candidate utilities — Twitter handles, avatars, etc.
 * Extracted from CandidateRow.tsx so Pulse features can reuse them.
 */

/** Get X (Twitter) handle for a candidate */
export function getTwitterHandle(name: string): string | undefined {
  const handles: Record<string, string> = {
    // Top candidates
    'JD Vance': 'JDVance',
    'Gavin Newsom': 'GavinNewsom',
    'Marco Rubio': 'marcorubio',
    'Alexandria Ocasio-Cortez': 'AOC',
    'Josh Shapiro': 'GovernorShapiro',
    'Pete Buttigieg': 'PeteButtigieg',
    'Gretchen Whitmer': 'GovWhitmer',
    'Ron DeSantis': 'RonDeSantis',
    'Nikki Haley': 'NikkiHaley',
    'Donald Trump': 'realDonaldTrump',
    'Donald Trump Jr.': 'DonaldJTrumpJr',
    'Kamala Harris': 'KamalaHarris',
    'Vivek Ramaswamy': 'VivekGRamaswamy',
    'Tim Walz': 'Tim_Walz',
    'Andy Beshear': 'AndyBeshearKY',
    'JB Pritzker': 'GovPritzker',
    'Wes Moore': 'iamwesmoore',
    'Jon Ossoff': 'ossoff',
    'Glenn Youngkin': 'GlennYoungkin',
    'Tulsi Gabbard': 'TulsiGabbard',
    'Tucker Carlson': 'TuckerCarlson',
    'Ted Cruz': 'tedcruz',
    'Josh Hawley': 'HawleyMO',
    'Sarah Sanders': 'SarahHuckabee',
    'Brian Kemp': 'BrianKempGA',
    'Kristi Noem': 'KristiNoem',
    'Mike Pence': 'Mike_Pence',
    'Rand Paul': 'RandPaul',
    'Tom Cotton': 'SenTomCotton',
    'Robert F. Kennedy Jr.': 'RobertKennedyJr',
    'Elon Musk': 'elonmusk',

    // Democrats
    'Michelle Obama': 'MichelleObama',
    'Barack Obama': 'BarackObama',
    'Hillary Clinton': 'HillaryClinton',
    'Bernie Sanders': 'BernieSanders',
    'Elizabeth Warren': 'ewarren',
    'Amy Klobuchar': 'amyklobuchar',
    'Cory Booker': 'CoryBooker',
    'Mark Kelly': 'SenMarkKelly',
    'John Fetterman': 'SenFettermanPA',
    'Raphael Warnock': 'SenatorWarnock',
    'Chris Murphy': 'ChrisMurphyCT',
    'Ro Khanna': 'RoKhanna',
    'Ruben Gallego': 'RubenGallego',
    'Phil Murphy': 'GovMurphy',
    'Jared Polis': 'GovofCO',
    'Roy Cooper': 'RoyCooperNC',
    'Andrew Cuomo': 'andrewcuomo',
    'Andrew Yang': 'AndrewYang',
    'Elissa Slotkin': 'ElissaSlotkin',
    'Jasmine Crockett': 'JasmineCrockett',
    'Zohran Mamdani': 'ZohranKMamdani',
    'James Talarico': 'jamestalarico',
    'Rahm Emanuel': 'RahmEmanuel',
    'Gina Raimondo': 'GinaRaimondo',
    'Hakeem Jeffries': 'RepJeffries',
    'Stacey Abrams': 'staceyabrams',

    // Republicans
    'Greg Abbott': 'GregAbbott_TX',
    'Matt Gaetz': 'mattgaetz',
    'Marjorie Taylor Greene': 'RepMTG',
    'Byron Donalds': 'ByronDonalds',
    'Elise Stefanik': 'EliseStefanik',
    'John Thune': 'SenJohnThune',
    'Katie Britt': 'SenKatieBritt',
    'Thomas Massie': 'RepThomasMassie',
    'Steve Bannon': 'SteveBannon',
    'Tim Scott': 'SenatorTimScott',
    'Rick Scott': 'SenRickScott',
    'Bill Hagerty': 'SenatorHagerty',
    'Joni Ernst': 'SenJoniErnst',
    'Dan Crenshaw': 'DanCrenshawTX',
    'Liz Cheney': 'Liz_Cheney',

    // Business/Media
    'Jamie Dimon': 'jamie_dimon',
    'Mark Cuban': 'mcuban',
    'Oprah Winfrey': 'Oprah',
    'Dwayne Johnson': 'TheRock',
    "Dwayne 'The Rock' Johnson": 'TheRock',
    'Kim Kardashian': 'KimKardashian',
    'LeBron James': 'KingJames',
    'Tom Brady': 'TomBrady',
    'Jon Stewart': 'jonstewart',
    'Joe Rogan': 'joerogan',
    'Dana White': 'danawhite',
    'MrBeast': 'MrBeast',
    'Stephen A. Smith': 'stephenasmith',
    'Stephen Smith': 'stephenasmith',
    'Chelsea Clinton': 'ChelseaClinton',
    'George Clooney': 'GeorgeClooney',

    // Trump family
    'Ivanka Trump': 'IvankaTrump',
    'Eric Trump': 'EricTrump',
    'Lara Trump': 'LaraLeaTrump',

    // Cabinet/Admin
    'Pete Hegseth': 'PeteHegseth',
    'Kash Patel': 'Kash_Patel',
    'Doug Burgum': 'DougBurgum',
    'Ben Carson': 'RealBenCarson',
    'Linda McMahon': 'LindaMcMahon',

    // Senate Primary Candidates
    'Lindsey Graham': 'LindseyGrahamSC',
    'Susan Collins': 'SenatorCollins',
    'Ken Paxton': 'KenPaxtonTX',
    'John Cornyn': 'JohnCornyn',
    'Ashley Hinson': 'RepAshleyHinson',
    'Harriet Hageman': 'RepHageman',
    'Mike Rogers': 'MikeRogersForMI',
    'Michele Tafoya': 'Michele_Tafoya',
    'Mike Collins': 'MikeCollinsGA',
    'Michael Whatley': 'WhatleyNC',
    'John Sununu': 'SununuSenator',
    'Julia Letlow': 'jbletlow',
    'Peggy Flanagan': 'peggyflanagan',
    'Ed Markey': 'SenMarkey',
    'Mallory McMorrow': 'MalloryMcMorrow',
    'Raja Krishnamoorthi': 'CongressmanRaja',
    'Andy Barr': 'RepAndyBarr',
    'Seth Moulton': 'sethmoulton',
    'Juliana Stratton': 'JulianaStratton',
    'Janet Mills': 'GovJanetMills',
    'Abdul El-Sayed': 'AbdulElSayed',
    'Haley Stevens': 'HaleyforMI',
    'Daniel Cameron': 'DanielCameronKY',
    'Angie Craig': 'RepAngieCraig',
    'Bill Cassidy': 'BillCassidy',
    'Wesley Hunt': 'WesleyHuntTX',
    'Scott Brown': 'SenScottBrown',
    'Graham Platner': 'grahamformaine',
  };

  return handles[name];
}

/** Get all known candidate names that have Twitter handles */
export function getCandidatesWithHandles(): string[] {
  const handles: Record<string, string> = {};
  // Re-use the same map — call getTwitterHandle to check
  const names = [
    'JD Vance', 'Gavin Newsom', 'Marco Rubio', 'Alexandria Ocasio-Cortez',
    'Josh Shapiro', 'Pete Buttigieg', 'Gretchen Whitmer', 'Ron DeSantis',
    'Nikki Haley', 'Donald Trump', 'Kamala Harris', 'Vivek Ramaswamy',
    'Tim Walz', 'Andy Beshear', 'JB Pritzker', 'Wes Moore', 'Jon Ossoff',
    'Glenn Youngkin', 'Tulsi Gabbard', 'Tucker Carlson', 'Ted Cruz',
    'Josh Hawley', 'Sarah Sanders', 'Brian Kemp', 'Kristi Noem',
    'Mike Pence', 'Rand Paul', 'Tom Cotton', 'Robert F. Kennedy Jr.',
    'Elon Musk', 'Michelle Obama', 'Barack Obama', 'Hillary Clinton',
    'Bernie Sanders', 'Elizabeth Warren', 'Amy Klobuchar', 'Cory Booker',
    'Mark Kelly', 'John Fetterman', 'Raphael Warnock',
  ];
  return names;
}

/** Get all election races a candidate participates in.
 *  A candidate can appear in multiple races (e.g. a DEM nominee also appears in
 *  presidential-2028, or a senate candidate also in a specific state primary). */
import type { PulseRace } from '@/lib/pulse-types';

const CANDIDATE_RACES_MAP: Record<string, PulseRace[]> = {
  // --- 2026 Midterm Primary candidates (by state race) ---
  // AZ Dem
  'Ruben Gallego':          ['midterm-2026-az-dem'],
  // GA GOP
  'Mike Collins':           ['midterm-2026-ga-gop'],
  // IA GOP
  'Ashley Hinson':          ['midterm-2026-ia-gop'],
  // IL Dem
  'Raja Krishnamoorthi':    ['midterm-2026-il-dem'],
  'Juliana Stratton':       ['midterm-2026-il-dem'],
  // KY GOP
  'Andy Barr':              ['midterm-2026-ky-gop'],
  'Daniel Cameron':         ['midterm-2026-ky-gop'],
  // LA GOP
  'Julia Letlow':           ['midterm-2026-la-gop'],
  'Bill Cassidy':           ['midterm-2026-la-gop'],
  // MA Dem
  'Ed Markey':              ['midterm-2026-ma-dem'],
  'Seth Moulton':           ['midterm-2026-ma-dem'],
  // ME Dem
  'Janet Mills':            ['midterm-2026-me-dem'],
  'Graham Platner':         ['midterm-2026-me-dem'],
  // ME GOP
  'Susan Collins':          ['midterm-2026-me-gop'],
  // MI Dem
  'Mallory McMorrow':       ['midterm-2026-mi-dem'],
  'Abdul El-Sayed':         ['midterm-2026-mi-dem'],
  'Haley Stevens':          ['midterm-2026-mi-dem'],
  'Elissa Slotkin':         ['midterm-2026-mi-dem'],
  // MI GOP
  'Mike Rogers':            ['midterm-2026-mi-gop'],
  // MN Dem
  'Peggy Flanagan':         ['midterm-2026-mn-dem'],
  'Angie Craig':            ['midterm-2026-mn-dem'],
  // MN GOP
  'Michele Tafoya':         ['midterm-2026-mn-gop'],
  // NC GOP
  'Michael Whatley':        ['midterm-2026-nc-gop'],
  // NH GOP
  'John Sununu':            ['midterm-2026-nh-gop'],
  'Scott Brown':            ['midterm-2026-nh-gop'],
  // SC GOP
  'Lindsey Graham':         ['midterm-2026-sc-gop'],
  // TX GOP
  'Ken Paxton':             ['midterm-2026-tx-gop'],
  'John Cornyn':            ['midterm-2026-tx-gop'],
  'Wesley Hunt':            ['midterm-2026-tx-gop'],
  // WY GOP
  'Harriet Hageman':        ['midterm-2026-wy-gop'],

  // --- 2028 Dem Nominee candidates (also in presidential) ---
  'Gavin Newsom':           ['presidential-2028', 'dem-nominee-2028'],
  'Alexandria Ocasio-Cortez': ['presidential-2028', 'dem-nominee-2028'],
  'Josh Shapiro':           ['presidential-2028', 'dem-nominee-2028'],
  'Pete Buttigieg':         ['presidential-2028', 'dem-nominee-2028'],
  'Gretchen Whitmer':       ['presidential-2028', 'dem-nominee-2028'],
  'Kamala Harris':          ['presidential-2028', 'dem-nominee-2028'],
  'Andy Beshear':           ['presidential-2028', 'dem-nominee-2028'],
  'JB Pritzker':            ['presidential-2028', 'dem-nominee-2028'],
  'Wes Moore':              ['presidential-2028', 'dem-nominee-2028'],
  'Jon Ossoff':             ['presidential-2028', 'dem-nominee-2028'],
  'Michelle Obama':         ['presidential-2028', 'dem-nominee-2028'],
  'Barack Obama':           ['presidential-2028', 'dem-nominee-2028'],
  'Bernie Sanders':         ['presidential-2028', 'dem-nominee-2028'],
  'Cory Booker':            ['presidential-2028', 'dem-nominee-2028'],
  'Mark Kelly':             ['presidential-2028', 'dem-nominee-2028'],
  'John Fetterman':         ['presidential-2028', 'dem-nominee-2028'],
  'Raphael Warnock':        ['presidential-2028', 'dem-nominee-2028'],
  'Chris Murphy':           ['presidential-2028', 'dem-nominee-2028'],
  'Ro Khanna':              ['presidential-2028', 'dem-nominee-2028'],
  'Phil Murphy':            ['presidential-2028', 'dem-nominee-2028'],
  'Jared Polis':            ['presidential-2028', 'dem-nominee-2028'],
  'Roy Cooper':             ['presidential-2028', 'dem-nominee-2028'],
  'Andrew Cuomo':           ['presidential-2028', 'dem-nominee-2028'],
  'Andrew Yang':            ['presidential-2028', 'dem-nominee-2028'],
  'Jasmine Crockett':       ['presidential-2028', 'dem-nominee-2028'],
  'Zohran Mamdani':         ['presidential-2028', 'dem-nominee-2028'],
  'James Talarico':         ['presidential-2028', 'dem-nominee-2028'],
  'Rahm Emanuel':           ['presidential-2028', 'dem-nominee-2028'],
  'Gina Raimondo':          ['presidential-2028', 'dem-nominee-2028'],
  'Hakeem Jeffries':        ['presidential-2028', 'dem-nominee-2028'],
  'Stacey Abrams':          ['presidential-2028', 'dem-nominee-2028'],
  'Tim Walz':               ['presidential-2028', 'dem-nominee-2028'],
  'Elizabeth Warren':        ['presidential-2028', 'dem-nominee-2028'],
  'Amy Klobuchar':          ['presidential-2028', 'dem-nominee-2028'],
  'Hillary Clinton':        ['presidential-2028', 'dem-nominee-2028'],

  // --- 2028 GOP Nominee candidates (also in presidential) ---
  'JD Vance':               ['presidential-2028', 'gop-nominee-2028'],
  'Ron DeSantis':           ['presidential-2028', 'gop-nominee-2028'],
  'Marco Rubio':            ['presidential-2028', 'gop-nominee-2028'],
  'Vivek Ramaswamy':        ['presidential-2028', 'gop-nominee-2028'],
  'Nikki Haley':            ['presidential-2028', 'gop-nominee-2028'],
  'Glenn Youngkin':         ['presidential-2028', 'gop-nominee-2028'],
  'Tulsi Gabbard':          ['presidential-2028', 'gop-nominee-2028'],
  'Tucker Carlson':         ['presidential-2028', 'gop-nominee-2028'],
  'Ted Cruz':               ['presidential-2028', 'gop-nominee-2028'],
  'Josh Hawley':            ['presidential-2028', 'gop-nominee-2028'],
  'Sarah Sanders':          ['presidential-2028', 'gop-nominee-2028'],
  'Brian Kemp':             ['presidential-2028', 'gop-nominee-2028'],
  'Kristi Noem':            ['presidential-2028', 'gop-nominee-2028'],
  'Mike Pence':             ['presidential-2028', 'gop-nominee-2028'],
  'Rand Paul':              ['presidential-2028', 'gop-nominee-2028'],
  'Tom Cotton':             ['presidential-2028', 'gop-nominee-2028'],
  'Greg Abbott':            ['presidential-2028', 'gop-nominee-2028'],
  'Tim Scott':              ['presidential-2028', 'gop-nominee-2028'],
  'Rick Scott':             ['presidential-2028', 'gop-nominee-2028'],
  'Bill Hagerty':           ['presidential-2028', 'gop-nominee-2028'],
  'Joni Ernst':             ['presidential-2028', 'gop-nominee-2028'],
  'Dan Crenshaw':           ['presidential-2028', 'gop-nominee-2028'],
  'Katie Britt':            ['presidential-2028', 'gop-nominee-2028'],
  'Byron Donalds':          ['presidential-2028', 'gop-nominee-2028'],
  'Elise Stefanik':         ['presidential-2028', 'gop-nominee-2028'],
  'Thomas Massie':          ['presidential-2028', 'gop-nominee-2028'],
  'Matt Gaetz':             ['presidential-2028', 'gop-nominee-2028'],
  'Marjorie Taylor Greene': ['presidential-2028', 'gop-nominee-2028'],
  'John Thune':             ['presidential-2028', 'gop-nominee-2028'],
  'Donald Trump Jr.':       ['presidential-2028', 'gop-nominee-2028'],

  // --- Presidential only (not running in a party primary) ---
  'Donald Trump':           ['presidential-2028'],
  'Elon Musk':              ['presidential-2028'],
  'Robert F. Kennedy Jr.':  ['presidential-2028'],
  'Ivanka Trump':           ['presidential-2028'],
  'Eric Trump':             ['presidential-2028'],
  'Lara Trump':             ['presidential-2028'],
  'Pete Hegseth':           ['presidential-2028'],
  'Kash Patel':             ['presidential-2028'],
  'Doug Burgum':            ['presidential-2028'],
  'Ben Carson':             ['presidential-2028'],
  'Linda McMahon':          ['presidential-2028'],
  'Steve Bannon':           ['presidential-2028'],
  'Liz Cheney':             ['presidential-2028'],
  'Jamie Dimon':            ['presidential-2028'],
  'Mark Cuban':             ['presidential-2028'],
  'Oprah Winfrey':          ['presidential-2028'],
  'Dwayne Johnson':         ['presidential-2028'],
  "Dwayne 'The Rock' Johnson": ['presidential-2028'],
  'Kim Kardashian':         ['presidential-2028'],
  'LeBron James':           ['presidential-2028'],
  'Tom Brady':              ['presidential-2028'],
  'Jon Stewart':            ['presidential-2028'],
  'Joe Rogan':              ['presidential-2028'],
  'Dana White':             ['presidential-2028'],
  'MrBeast':                ['presidential-2028'],
  'Stephen A. Smith':       ['presidential-2028'],
  'Stephen Smith':          ['presidential-2028'],
  'Chelsea Clinton':        ['presidential-2028'],
  'George Clooney':         ['presidential-2028'],
};

const DEFAULT_RACES: PulseRace[] = ['presidential-2028'];

export function getCandidateRaces(name: string): PulseRace[] {
  return CANDIDATE_RACES_MAP[name] || DEFAULT_RACES;
}

/** Convert candidate name to URL-safe slug */
export function candidateNameToSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/['.]/g, '')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

/** Convert slug back to display name (best-effort lookup) */
export function slugToCandidateName(slug: string): string | undefined {
  const map: Record<string, string> = {};
  const allNames = [
    'JD Vance', 'Gavin Newsom', 'Marco Rubio', 'Alexandria Ocasio-Cortez',
    'Josh Shapiro', 'Pete Buttigieg', 'Gretchen Whitmer', 'Ron DeSantis',
    'Nikki Haley', 'Donald Trump', 'Donald Trump Jr.', 'Kamala Harris',
    'Vivek Ramaswamy', 'Tim Walz', 'Andy Beshear', 'JB Pritzker',
    'Wes Moore', 'Jon Ossoff', 'Glenn Youngkin', 'Tulsi Gabbard',
    'Tucker Carlson', 'Ted Cruz', 'Josh Hawley', 'Sarah Sanders',
    'Brian Kemp', 'Kristi Noem', 'Mike Pence', 'Rand Paul', 'Tom Cotton',
    'Robert F. Kennedy Jr.', 'Elon Musk', 'Michelle Obama', 'Barack Obama',
    'Hillary Clinton', 'Bernie Sanders', 'Elizabeth Warren', 'Amy Klobuchar',
    'Cory Booker', 'Mark Kelly', 'John Fetterman', 'Raphael Warnock',
    'Chris Murphy', 'Ro Khanna', 'Ruben Gallego', 'Phil Murphy',
    'Jared Polis', 'Roy Cooper', 'Andrew Cuomo', 'Andrew Yang',
    'Elissa Slotkin', 'Jasmine Crockett', 'Zohran Mamdani', 'James Talarico',
    'Rahm Emanuel', 'Gina Raimondo', 'Hakeem Jeffries', 'Stacey Abrams',
    'Greg Abbott', 'Matt Gaetz', 'Marjorie Taylor Greene', 'Byron Donalds',
    'Elise Stefanik', 'John Thune', 'Katie Britt', 'Thomas Massie',
    'Steve Bannon', 'Tim Scott', 'Rick Scott', 'Bill Hagerty', 'Joni Ernst',
    'Dan Crenshaw', 'Liz Cheney', 'Jamie Dimon', 'Mark Cuban',
    'Oprah Winfrey', 'Dwayne Johnson', 'Kim Kardashian', 'LeBron James',
    'Tom Brady', 'Jon Stewart', 'Joe Rogan', 'Dana White', 'MrBeast',
    'Stephen A. Smith', 'Chelsea Clinton', 'George Clooney',
    'Ivanka Trump', 'Eric Trump', 'Lara Trump', 'Pete Hegseth',
    'Kash Patel', 'Doug Burgum', 'Ben Carson', 'Linda McMahon',
    // Senate Primary Candidates
    'Lindsey Graham', 'Susan Collins', 'Ken Paxton', 'John Cornyn',
    'Ashley Hinson', 'Harriet Hageman', 'Mike Rogers', 'Michele Tafoya',
    'Mike Collins', 'Michael Whatley', 'John Sununu', 'Julia Letlow',
    'Peggy Flanagan', 'Ed Markey', 'Mallory McMorrow',
    'Raja Krishnamoorthi', 'Andy Barr', 'Seth Moulton', 'Juliana Stratton',
    'Janet Mills', 'Abdul El-Sayed', 'Haley Stevens', 'Daniel Cameron',
    'Angie Craig', 'Bill Cassidy', 'Wesley Hunt', 'Scott Brown',
    'Graham Platner',
  ];
  for (const name of allNames) {
    map[candidateNameToSlug(name)] = name;
  }
  return map[slug];
}
