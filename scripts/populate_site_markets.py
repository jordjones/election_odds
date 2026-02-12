#!/usr/bin/env python3
"""
Populate the site_markets table from existing markets in the database.

Uses the same canonical type matching logic as the web frontend
(getCanonicalMarketType in db-pg.ts) to classify markets.

Usage:
    python scripts/populate_site_markets.py
    python scripts/populate_site_markets.py --dry-run
"""

import argparse
import logging
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from scripts.storage_supabase import SupabaseStorage

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger(__name__)

# US state names for filtering out state-level markets
US_STATES = [
    'alabama', 'alaska', 'arizona', 'arkansas', 'california', 'colorado',
    'connecticut', 'delaware', 'florida', 'georgia', 'hawaii', 'idaho',
    'illinois', 'indiana', 'iowa', 'kansas', 'kentucky', 'louisiana',
    'maine', 'maryland', 'massachusetts', 'michigan', 'minnesota',
    'mississippi', 'montana', 'nebraska', 'nevada', 'new hampshire',
    'new jersey', 'new mexico', 'new york', 'north carolina', 'north dakota',
    'ohio', 'oklahoma', 'oregon', 'pennsylvania', 'rhode island',
    'south carolina', 'south dakota', 'tennessee', 'texas', 'utah',
    'vermont', 'virginia', 'washington', 'west virginia', 'wisconsin',
    'wyoming',
]

STATE_PATTERN = re.compile(r'\b(' + '|'.join(US_STATES) + r')\b')


def get_canonical_market_type(market_name: str) -> str | None:
    """
    Classify a market name into a canonical type.

    Mirrors getCanonicalMarketType() in web/src/lib/db-pg.ts for national markets,
    plus senate primaries and VP nominees.
    """
    lower = market_name.lower()

    # Exclude "who will run" / "will run for" markets
    if 'who will run' in lower or 'will run for' in lower:
        return None

    # Senate primaries — check BEFORE state exclusion since these contain state names
    if ('senate' in lower and
            ('nomination' in lower or 'primary winner' in lower) and
            # Exclude derivative markets (margin, percentage, endorsement, place, closer)
            'margin' not in lower and 'percentage' not in lower and
            'endorse' not in lower and 'place' not in lower and
            'closer' not in lower and 'order of finish' not in lower):
        return 'senate-primary-2026'

    # VP nominee 2028
    if ('vp nominee' in lower or 'vice president' in lower) and '2028' in lower:
        return 'vp-nominee-2028'

    # Exclude state-level and district markets (for remaining national types)
    if 'district' in lower or STATE_PATTERN.search(lower):
        return None

    # Presidential winner 2028
    if (('presidential election winner' in lower or
         'win the 2028 us presidential election' in lower or
         '2028 presidential election winner' in lower or
         'next u.s. presidential election winner' in lower) and
            'party' not in lower):
        return 'presidential-winner-2028'

    # Presidential party 2028
    if ('2028' in lower and
            ('which party' in lower or 'party win' in lower or 'party wins' in lower or 'winning party' in lower) and
            ('president' in lower or 'winning party' in lower)):
        return 'presidential-party-2028'

    # House control 2026
    if (('2026' in lower or 'midterm' in lower) and 'house' in lower and
            ('which party' in lower or 'party win' in lower or 'control' in lower)):
        return 'house-control-2026'

    # Senate control 2026
    if (('2026' in lower or 'midterm' in lower) and 'senate' in lower and
            ('which party' in lower or 'party win' in lower or 'party control' in lower or 'control' in lower) and
            'how many' not in lower and 'seats' not in lower):
        return 'senate-control-2026'

    # GOP nominee 2028
    if ('republican' in lower and
            ('presidential' in lower or 'for president' in lower) and
            ('nominee' in lower or 'nomination' in lower)):
        return 'gop-nominee-2028'

    # Dem nominee 2028
    if ('democratic' in lower and
            ('presidential' in lower or 'for president' in lower) and
            ('nominee' in lower or 'nomination' in lower)):
        return 'dem-nominee-2028'

    return None


def main():
    parser = argparse.ArgumentParser(description='Populate site_markets from existing markets')
    parser.add_argument('--dry-run', action='store_true',
                        help='Show what would be inserted without writing')
    args = parser.parse_args()

    storage = SupabaseStorage()

    try:
        # Fetch all markets
        with storage.conn.cursor() as cur:
            cur.execute("SELECT source, market_id, market_name FROM markets")
            all_markets = cur.fetchall()

        logger.info(f"Found {len(all_markets)} total markets in database")

        # Classify each market
        site_entries = []
        for source, market_id, market_name in all_markets:
            canonical = get_canonical_market_type(market_name)
            if canonical:
                site_entries.append((source, market_id, canonical, market_name))

        logger.info(f"Classified {len(site_entries)} markets as site markets:")
        by_type = {}
        for source, market_id, canonical, market_name in site_entries:
            by_type.setdefault(canonical, []).append((source, market_id, market_name))

        for canonical_type, markets in sorted(by_type.items()):
            logger.info(f"  {canonical_type}: {len(markets)} markets")
            for source, market_id, market_name in markets:
                logger.info(f"    [{source}] {market_id}: {market_name}")

        if args.dry_run:
            logger.info("Dry run — no changes made")
            return

        # Insert into site_markets
        with storage.conn.cursor() as cur:
            inserted = 0
            for source, market_id, canonical, _name in site_entries:
                cur.execute("""
                    INSERT INTO site_markets (source, market_id, canonical_type)
                    VALUES (%s, %s, %s)
                    ON CONFLICT (source, market_id) DO UPDATE SET
                        canonical_type = EXCLUDED.canonical_type,
                        is_active = true
                    RETURNING (xmax = 0) as inserted
                """, (source, market_id, canonical))
                row = cur.fetchone()
                if row and row[0]:
                    inserted += 1

            logger.info(f"Inserted {inserted} new rows, updated {len(site_entries) - inserted} existing rows")

    finally:
        storage.close()


if __name__ == "__main__":
    main()
