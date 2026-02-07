"""
Centralized category_tag classifier for prediction markets.

Assigns a single category_tag to each market based on name, description,
and optional source-specific hints (Polymarket tags, Kalshi category).

Priority order (first match wins):
  1. Ukraine
  2. Trump
  3. US Elections
  4. US Politics
  5. Global Elections
  6. Global Politics
  7. Geopolitics
  8. Sports
  9. Crypto
  10. Culture
  11. Tech
  12. Finance
  -- Other (fallback)
"""

import re
from typing import Optional, Dict, Any, Set


# --- Keyword sets ---

UKRAINE_KEYWORDS = [
    'ukraine', 'ukrainian', 'zelenskyy', 'zelensky',
    'crimea', 'crimean', 'donbas', 'donbass', 'donetsk', 'luhansk',
    'kupiansk', 'pokrovsk', 'myrnohrad', 'vovchansk', 'sloviansk',
    'rodynske', 'sumy', 'lyman',
    'kyiv', 'kherson', 'zaporizhzhia', 'kharkiv',
]

TRUMP_KEYWORDS = ['trump']

# US state names for detecting US context
US_STATES = [
    'alabama', 'alaska', 'arizona', 'arkansas', 'california', 'colorado',
    'connecticut', 'delaware', 'florida', 'georgia', 'hawaii', 'idaho',
    'illinois', 'indiana', 'iowa', 'kansas', 'kentucky', 'louisiana',
    'maine', 'maryland', 'massachusetts', 'michigan', 'minnesota',
    'mississippi', 'missouri', 'montana', 'nebraska', 'nevada',
    'new hampshire', 'new jersey', 'new mexico', 'new york',
    'north carolina', 'north dakota', 'ohio', 'oklahoma', 'oregon',
    'pennsylvania', 'rhode island', 'south carolina', 'south dakota',
    'tennessee', 'texas', 'utah', 'vermont', 'virginia', 'washington',
    'west virginia', 'wisconsin', 'wyoming',
    'district of columbia',
]

# Election-specific keywords
ELECTION_KEYWORDS = [
    'election', 'midterm', 'nominee', 'nomination', 'primary',
    'presidential winner', 'presidential election',
    'governor winner', 'governor election', 'gubernatorial', 'governorship',
    'senate winner', 'senate election', 'senate race', 'senate nomination',
    'house race', 'house election', 'house seats',
    'attorney general winner', 'attorney general race', 'attorney general nomination',
    'secretary of state winner', 'lieutenant governor',
    'balance of power', 'popular vote',
    'electoral vote', 'ballot', 'runoff',
    'will win the presidency', 'us presidency',
    'who will win the 2028', 'who will win the 2026',
    'which party will win', 'which party will control',
    'democratic nominee', 'republican nominee',
    'democratic presidential', 'republican presidential',
    'mayoral election', 'winning party',
    'blue wave', 'blue tsunami', 'red wave',
    'closest governor race',
    'run for president', 'run for senate', 'run for governor',
    'presidential run', 'announce a run',
    'win outright',
]

# US Politics (non-election) keywords
US_POLITICS_KEYWORDS = [
    'supreme court', 'scotus', 'cabinet',
    'executive order', 'tariff', 'impeach',
    'legislation', 'pardon', 'fbi', 'doj', 'cia', 'irs',
    'attorney general', 'speaker of the house',
    'department of education', 'obamacare',
    'insurrection act', 'habeas corpus', 'martial law',
    '25th amendment', 'constitutional amendment',
    'veto', 'filibuster', 'contempt resolution',
    'articles of impeachment', 'congress',
    'approval rating', 'government spending', 'government employees',
    'dhs appropriations', 'redistrict',
    'deport', 'ice agent', 'gold card',
    'abolish the fed', 'fed chair', 'federal reserve',
    'national debt', 'deficit',
    'birthright citizenship', 'tiktok ban',
    'mt. rushmore', 'mt rushmore',
    'kennedy center', 'nick fuentes',
    'us test scores',
    'tariffs', 'gold card',
]

# Non-US countries, regions, and leader names for global detection
NON_US_COUNTRIES = [
    'uk ', 'united kingdom', 'britain', 'british', 'england', 'scotland', 'scottish', 'wales',
    'france', 'french', 'germany', 'german',
    'italy', 'italian', 'spain', 'spanish',
    'japan', 'japanese', 'china', 'chinese',
    'india', 'indian', 'australia', 'australian',
    'canada', 'canadian', 'mexico', 'mexican',
    'brazil', 'brazilian', 'colombia', 'colombian',
    'argentina', 'argentine', 'peru', 'peruvian',
    'turkey', 'turkish', 'hungary', 'hungarian',
    'poland', 'polish', 'greece', 'greek',
    'portugal', 'portuguese',
    'israel', 'israeli', 'iran', 'iranian',
    'saudi arabia', 'saudi', 'qatar', 'syria', 'syrian',
    'north korea', 'south korea', 'korean',
    'taiwan', 'taiwanese',
    'thailand', 'philippines', 'philippine', 'malaysia', 'malaysian',
    'bangladesh', 'bangladeshi',
    'dominican republic', 'costa rica',
    'guatemala', 'guatemalan', 'paraguay', 'paraguayan',
    'mongolia', 'mongolian', 'moldova', 'moldovan',
    'kenya', 'kenyan', 'ghana', 'ghanaian', 'nigeria', 'nigerian',
    'guinea-bissau', 'papua new guinea',
    'slovenia', 'slovenian', 'slovak', 'finland', 'finnish',
    'netherlands', 'dutch', 'norway', 'norwegian',
    'denmark', 'greenland',
    'venezuela', 'panama',
    'eu ', 'european union',
    'somaliland', 'bougainville', 'quebec',
    'alberta',
    'african leader', 'asian leader', 'european leader',
    'hamas', 'hezbollah', 'palestine', 'palestinian',
    # Non-US leaders
    'macron', 'starmer', 'erdogan', 'erdoğan', 'netanyahu',
    'xi jinping', 'kim jong', 'putin',
    'modi', 'milei', 'poilievre', 'lecornu',
    'sheinbaum', 'orbán', 'orban',
    'lai ching-te', 'lee jae-myung', 'yoon',
    'andrew tate', 'sarkozy',
    'al-sharaa', 'akhannouch', 'khamenei',
    'g7 leader',
    'un secretary-general', 'un secretary general',
    'prime minister',
    # Non-US cities
    'london mayoral', 'paris mayoral', 'chicago mayoral',
]

GEOPOLITICS_KEYWORDS = [
    'nato', 'sanction', 'treaty', 'alliance',
    'invasion', 'ceasefire', 'diplomacy', 'diplomatic',
    'territorial', 'territory', 'annex',
    'normalize relations', 'nuclear deal',
    'strait of hormuz', 'use of force',
    'travel advisory',
    'secede', 'secession', 'independence referendum',
    'leaving the eu', 'leave the eu',
    'recognize.*sovereignty',
]

SPORTS_KEYWORDS = [
    'nba', 'nfl', 'nhl', 'mlb', 'fifa', 'mls',
    'world cup', 'olympics', 'olympic',
    'premier league', 'epl', 'champions league',
    'bundesliga', 'la liga', 'serie a', 'ligue 1',
    'carabao cup', 'süper lig', 'super lig',
    'ballon d\'or', 'top goalscorer', 'top scorer',
    'relegated', 'top 4 finish',
    'pro football championship',
    'wrexham', 'the masters',
    'messi', 'lionel messi',
    'coach of the year', 'rookie of the year',
    'defensive player', 'offensive player',
    'most improved player', 'sixth man',
    'art ross trophy', 'calder memorial', 'selke trophy',
    'hart memorial', 'jack adams', 'james norris', 'vezina',
    'presidents\' trophy',
    'clutch player', 'comeback player', 'protector of the year',
    'win totals', 'worst record',
    'winning conference', 'winning division',
    'transgender.*sports teams',  # Kalshi: sports context but really SCOTUS
]

CRYPTO_KEYWORDS = [
    'crypto', 'bitcoin', 'btc', 'ethereum', 'eth ',
    'solana', 'defi', 'nft', 'blockchain',
    'token by', 'launch a token',
    'microstr.*bitcoin',  # MicroStrategy Bitcoin
]

CULTURE_KEYWORDS = [
    'oscar', 'grammy', 'emmy', 'tony award',
    'box office', 'celebrity',
    'taylor swift', 'travis kelce',
    'person of the decade', 'person of the year',
    'nobel', 'ballon',
    'gta 6', 'gta vi',
    'harvey weinstein', 'epstein',
    'song in 2026',
    'bitboy',
    'ohtani',
]

TECH_KEYWORDS = [
    'artificial intelligence', ' ai ', 'ai model',
    'spacex', 'starship',
    'waymo', 'self-driving',
    'gpt-', 'gpt ads', 'claude 5', 'grok 5',
    'openai', 'anthropic',
    'agi before',
    'frontiermath',
    'macbook', 'apple release',
    'supersonic flight',
    'tesla', 'optimus',
    'sam altman',
    'discord ipo',
]

FINANCE_KEYWORDS = [
    'stock', 's&p 500', 's&p500',
    'gdp', 'recession',
    'interest rate', 'inflation',
    'circuit breaker', 'nyse',
    'ipo closing', 'ipo market cap',
    'capital gains tax',
    'corporate tax',
    'credit card interest',
    'richest person',
    'wealth tax',
    'amazon', 'monopoly',
    'congestion pricing',
    'primary energy consumption',
]

# US district pattern (e.g., TX-18, VA-03, IL-02, NJ-11)
US_DISTRICT_PATTERN = re.compile(
    r'\b[A-Z]{2}-(?:AL|\d{1,2})\b', re.IGNORECASE
)


def _get_polymarket_tags(raw_data: Optional[Dict[str, Any]]) -> Set[str]:
    """Extract tag labels from Polymarket raw_data."""
    if not raw_data:
        return set()
    tags = raw_data.get('tags', [])
    if not isinstance(tags, list):
        return set()
    return {t.get('label', '').lower() for t in tags if isinstance(t, dict)}


def _get_kalshi_category(raw_data: Optional[Dict[str, Any]]) -> str:
    """Extract category from Kalshi raw_data."""
    if not raw_data:
        return ''
    return (raw_data.get('category', '') or '').lower()


def _has_any(text: str, keywords: list) -> bool:
    """Check if text contains any of the keywords."""
    for kw in keywords:
        if kw in text:
            return True
    return False


def _has_any_regex(text: str, patterns: list) -> bool:
    """Check if text matches any regex pattern."""
    for pat in patterns:
        if re.search(pat, text, re.IGNORECASE):
            return True
    return False


def _is_us_context(text: str) -> bool:
    """Detect if the market is about US politics/elections."""
    # Explicit US mentions
    if any(x in text for x in ['u.s.', 'united states', 'us ', 'american']):
        return True
    # US state names
    if _has_any(text, US_STATES):
        return True
    # US district patterns (TX-18, VA-03, etc.)
    if US_DISTRICT_PATTERN.search(text):
        return True
    # US-specific terms
    if any(x in text for x in [
        'democrat', 'republican', 'gop', 'congress',
        'the house', 'the senate', 'house seats', 'senate seats',
        'house members', 'senate votes',
        'midterm', 'speaker of the house',
        'scotus', 'supreme court',
        'presidential election winner', 'presidential nominee',
        'winning party', '2028 presidency', 'us presidency',
        'presidency, house', 'president of the united states',
        'cabinet member', 'obamacare', 'aca subsidies',
        'ice agent', 'dhs ', 'department of',
        'fed chair', 'federal reserve',
        'elon musk', 'bernie sanders', 'aoc',
        'joe manchin', 'kamala harris', 'joe biden',
        'mitch mcconnell', 'mike johnson', 'tulsi gabbard',
        'pam bondi', 'kash patel', 'kristi noem',
        'susie wiles', 'stephen miller', 'nick fuentes',
        'george conway', 'jack schlossberg', 'jesse ventura',
        'gavin newsom', 'mamdani', 'zohran',
        'los angeles', 'nyc', 'new york city',
        'tiktok', 'weed reschedule',
        'obama', 'clinton',
        'redistrict', 'kennedy center',
        'impeach',  # impeachment is inherently US congress
        'articles of impeachment',
        'contempt resolution',
        'jerome powell',
        'blue wave', 'blue tsunami', 'red wave',
        'presidential election', '2028 presidential',
        'popular vote', 'electoral vote',
        'leave office',  # US political figures leaving office
        'jd vance', 'tim walz',
        'speaker by',
        'governor of',
        'los angeles mayor',
        'texas', 'abortion case',
        'rojas',
        'bernie endorse',
        'acquire tiktok',
        'governor race', 'closest governor',
        'ocasio-cortez', 'ocasio',
        'fed abolished', 'fed governor',
        'lisa cook',
        'register any party',
        'tariffs generate',
    ]):
        return True
    return False


def _is_non_us_context(text: str) -> bool:
    """Detect if the market is about non-US context."""
    return _has_any(text, NON_US_COUNTRIES)


def _is_election_context(text: str) -> bool:
    """Detect if the market is about an election/race/nomination."""
    return _has_any(text, ELECTION_KEYWORDS)


def classify_category_tag(
    name: str,
    description: str = "",
    source: str = "",
    raw_data: Optional[Dict[str, Any]] = None,
) -> str:
    """
    Classify a market into a category_tag.

    Priority order (first match wins):
      1. Ukraine
      2. Trump
      3. US Elections
      4. US Politics
      5. Global Elections
      6. Global Politics
      7. Geopolitics
      8. Sports
      9. Crypto
      10. Culture
      11. Tech
      12. Finance
      -- Other
    """
    text = f"{name} {description}".lower()
    pm_tags = _get_polymarket_tags(raw_data) if source == 'Polymarket' else set()
    kalshi_cat = _get_kalshi_category(raw_data) if source == 'Kalshi' else ''

    # 1. Ukraine (highest priority — even above Trump)
    if _has_any(text, UKRAINE_KEYWORDS):
        return 'Ukraine'

    # 2. Trump
    if _has_any(text, TRUMP_KEYWORDS):
        return 'Trump'

    # 3. US Elections
    if _is_election_context(text) and _is_us_context(text):
        return 'US Elections'

    # 4. US Politics (non-election US political topics)
    if _has_any(text, US_POLITICS_KEYWORDS) and _is_us_context(text):
        return 'US Politics'

    # 5. Global Elections
    if _is_election_context(text) and _is_non_us_context(text):
        return 'Global Elections'
    if 'global elections' in pm_tags or 'world elections' in pm_tags:
        return 'Global Elections'

    # 6. Global Politics
    if _is_non_us_context(text):
        # Non-US context, not an election — Global Politics
        return 'Global Politics'
    if 'world' in pm_tags or 'geopolitics' in pm_tags:
        return 'Global Politics'

    # 7. Geopolitics
    if _has_any_regex(text, GEOPOLITICS_KEYWORDS):
        return 'Geopolitics'

    # 8. Sports
    if _has_any(text, SPORTS_KEYWORDS) or 'sports' in pm_tags or 'soccer' in pm_tags:
        return 'Sports'
    if kalshi_cat in ('sports',):
        return 'Sports'

    # 9. Crypto
    if _has_any_regex(text, CRYPTO_KEYWORDS) or 'crypto' in pm_tags:
        return 'Crypto'

    # 10. Culture
    if _has_any(text, CULTURE_KEYWORDS) or 'culture' in pm_tags or 'movies' in pm_tags:
        return 'Culture'

    # 11. Tech
    if _has_any(text, TECH_KEYWORDS) or 'tech' in pm_tags:
        return 'Tech'

    # 12. Finance
    if _has_any(text, FINANCE_KEYWORDS) or kalshi_cat == 'economics':
        return 'Finance'
    if 'finance' in pm_tags:
        return 'Finance'

    # Broad US catch-all: if US context detected but no specific category matched
    if _is_us_context(text):
        if _is_election_context(text):
            return 'US Elections'
        return 'US Politics'

    # Fallback: use Kalshi category or Polymarket tags as hints
    if kalshi_cat in ('elections', 'politics'):
        return 'US Politics'  # Kalshi is US-focused
    if 'politics' in pm_tags or 'elections' in pm_tags:
        return 'US Politics'

    return 'Other'
