#!/usr/bin/env python3
"""
Backfill historical odds from electionbettingodds.com

This script extracts historical time-series data from the Google Charts
embedded in electionbettingodds.com pages.

Usage:
    python backfill_electionbettingodds.py
    python backfill_electionbettingodds.py --status

Discovery findings:
- The ?date= parameter does NOT return historical data (returns current data)
- Google Charts data embedded in pages contains real historical time-series
- Data goes back to November 2024 with hourly/bi-hourly snapshots
"""

import argparse
import asyncio
import json
import re
import os
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import List, Dict, Optional, Tuple
from dataclasses import dataclass, field
import logging

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

try:
    import aiohttp
except ImportError:
    print("Installing required packages...")
    os.system("pip install aiohttp")
    import aiohttp

from scripts.storage import Storage

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler(Path(__file__).parent.parent / 'audit' / 'backfill_electionbettingodds.log')
    ]
)
logger = logging.getLogger(__name__)

# Constants
BASE_URL = "https://electionbettingodds.com"
SOURCE_NAME = "electionbettingodds"
USER_AGENT = "Mozilla/5.0 (compatible; ResearchBot/1.0; Educational/Research)"

# Pages with chart data
CHART_PAGES = [
    ("/President2028.html", "president_2028", "US Presidency 2028"),
]


@dataclass
class ChartDataPoint:
    """Single point in time-series chart data."""
    timestamp: datetime
    values: List[float]


def extract_chart_data(html: str) -> Tuple[List[str], List[ChartDataPoint]]:
    """
    Extract Google Charts time-series data from page HTML.

    Returns (candidate_names, data_points)
    """
    # Find the addRows data - it spans many lines
    # Pattern: data.addRows([[new Date(2024,10,15,19,12,46),26.2,7.0,...], ...])
    # Look for .addRows([ and capture everything until ]]);
    add_rows_match = re.search(
        r'\.addRows\(\[(\[new Date.*?)\]\s*\)',
        html,
        re.DOTALL
    )

    if not add_rows_match:
        logger.warning("No addRows data found in page")
        return [], []

    rows_str = '[' + add_rows_match.group(1) + ']'

    # Extract candidate names from column headers
    # Pattern: data.addColumn('number', 'Vance');
    candidates = re.findall(r"addColumn\s*\(\s*'number'\s*,\s*'([^']+)'", html)

    if not candidates:
        # Try alternative pattern
        candidates = re.findall(r"addColumn\('number','([^']+)'\)", html)

    logger.info(f"Found {len(candidates)} candidates: {candidates[:5]}...")

    # Parse each row
    data_points = []

    # Find all [new Date(...), values...] entries
    row_pattern = r'\[new Date\((\d+),(\d+),(\d+),(\d+),(\d+),(\d+)\)((?:,[\d.]+)+),?\]'

    for match in re.finditer(row_pattern, rows_str):
        year = int(match.group(1))
        month = int(match.group(2)) + 1  # JavaScript months are 0-indexed
        day = int(match.group(3))
        hour = int(match.group(4))
        minute = int(match.group(5))
        second = int(match.group(6))

        values_str = match.group(7)
        values = [float(v) for v in values_str.split(',') if v.strip()]

        try:
            timestamp = datetime(year, month, day, hour, minute, second, tzinfo=timezone.utc)
            data_points.append(ChartDataPoint(timestamp=timestamp, values=values))
        except ValueError as e:
            logger.warning(f"Invalid date: {year}-{month}-{day} {hour}:{minute}:{second}: {e}")
            continue

    logger.info(f"Extracted {len(data_points)} data points")

    return candidates, data_points


async def fetch_page(url: str) -> Optional[str]:
    """Fetch a page."""
    async with aiohttp.ClientSession(headers={'User-Agent': USER_AGENT}) as session:
        try:
            async with session.get(url, timeout=30) as response:
                if response.status == 200:
                    return await response.text()
                else:
                    logger.error(f"HTTP {response.status} for {url}")
                    return None
        except Exception as e:
            logger.error(f"Error fetching {url}: {e}")
            return None


def store_chart_data(
    storage: Storage,
    market_id: str,
    market_name: str,
    candidates: List[str],
    data_points: List[ChartDataPoint]
) -> Tuple[int, int]:
    """Store extracted chart data. Returns (inserted, updated) counts."""
    inserted = 0
    updated = 0

    # Upsert market
    storage.upsert_market(
        source=SOURCE_NAME,
        market_id=market_id,
        market_name=market_name,
        category='elections',
        status='open',
        url=f"{BASE_URL}/President2028.html"
    )

    # Upsert contracts
    for candidate in candidates:
        contract_id = candidate.lower().replace(' ', '_').replace('.', '')
        storage.upsert_contract(
            source=SOURCE_NAME,
            market_id=market_id,
            contract_id=contract_id,
            contract_name=candidate,
            short_name=candidate
        )

    # Store each data point
    for point in data_points:
        snapshot_time = point.timestamp.isoformat()

        for i, candidate in enumerate(candidates):
            if i >= len(point.values):
                continue

            contract_id = candidate.lower().replace(' ', '_').replace('.', '')
            value = point.values[i]

            # Value is already a percentage (e.g., 26.2 = 26.2%)
            yes_price = value / 100.0

            _, was_inserted = storage.upsert_price_snapshot(
                source=SOURCE_NAME,
                market_id=market_id,
                contract_id=contract_id,
                snapshot_time=snapshot_time,
                yes_price=yes_price,
                raw_data={'chart_value': value}
            )

            if was_inserted:
                inserted += 1
            else:
                updated += 1

    return inserted, updated


async def backfill_from_charts(storage: Storage) -> Dict:
    """Extract and store historical data from Google Charts."""
    stats = {
        'pages_processed': 0,
        'candidates_found': 0,
        'data_points': 0,
        'records_inserted': 0,
        'records_updated': 0,
    }

    for page_path, market_id, market_name in CHART_PAGES:
        url = f"{BASE_URL}{page_path}"
        logger.info(f"Fetching {url}")

        html = await fetch_page(url)
        if not html:
            continue

        candidates, data_points = extract_chart_data(html)

        if not candidates or not data_points:
            logger.warning(f"No chart data found in {url}")
            continue

        stats['pages_processed'] += 1
        stats['candidates_found'] += len(candidates)
        stats['data_points'] += len(data_points)

        # Get date range
        if data_points:
            earliest = min(p.timestamp for p in data_points)
            latest = max(p.timestamp for p in data_points)
            logger.info(f"Data range: {earliest.date()} to {latest.date()}")

        # Store data
        inserted, updated = store_chart_data(
            storage, market_id, market_name, candidates, data_points
        )

        stats['records_inserted'] += inserted
        stats['records_updated'] += updated

        # Create checkpoint
        if data_points:
            checkpoint_id = storage.create_sync_checkpoint(
                source=SOURCE_NAME,
                sync_type='chart_extract',
                window_start=earliest.isoformat(),
                window_end=latest.isoformat()
            )
            storage.update_sync_checkpoint(
                checkpoint_id,
                status='completed',
                records_fetched=len(data_points),
                records_inserted=inserted,
                records_updated=updated
            )

    return stats


def show_status(storage: Storage):
    """Show current backfill status."""
    print("\n" + "=" * 60)
    print("ElectionBettingOdds Backfill Status")
    print("=" * 60)

    # Get overall stats
    stats = storage.get_stats()
    ebo_count = stats.get('snapshots_by_source', {}).get('electionbettingodds', 0)
    print(f"\nElectionBettingOdds records: {ebo_count:,}")

    # Get date range
    with storage._get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT
                MIN(snapshot_time) as earliest,
                MAX(snapshot_time) as latest,
                COUNT(DISTINCT contract_id) as candidates,
                COUNT(DISTINCT SUBSTR(snapshot_time, 1, 10)) as days
            FROM price_snapshots
            WHERE source = ?
        """, (SOURCE_NAME,))
        row = cursor.fetchone()

        if row['earliest']:
            print(f"Date range: {row['earliest'][:10]} to {row['latest'][:10]}")
            print(f"Candidates: {row['candidates']}")
            print(f"Days with data: {row['days']}")

        # Check for variation
        cursor.execute("""
            SELECT contract_id,
                   MIN(yes_price) as min_p,
                   MAX(yes_price) as max_p,
                   COUNT(DISTINCT ROUND(yes_price, 4)) as unique_vals
            FROM price_snapshots
            WHERE source = ?
            GROUP BY contract_id
            ORDER BY max_p DESC
            LIMIT 5
        """, (SOURCE_NAME,))

        print("\nTop 5 candidates (price variation):")
        for row in cursor.fetchall():
            print(f"  {row['contract_id']}: {row['min_p']*100:.1f}% - {row['max_p']*100:.1f}% ({row['unique_vals']} unique values)")

    print("=" * 60 + "\n")


def clear_old_data(storage: Storage):
    """Clear previously scraped flat data."""
    with storage._get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM price_snapshots WHERE source = ?", (SOURCE_NAME,))
        cursor.execute("DELETE FROM contracts WHERE source = ?", (SOURCE_NAME,))
        cursor.execute("DELETE FROM markets WHERE source = ?", (SOURCE_NAME,))
        cursor.execute("DELETE FROM sync_checkpoints WHERE source = ?", (SOURCE_NAME,))
        deleted = cursor.rowcount
        logger.info(f"Cleared {deleted} old records")


def main():
    parser = argparse.ArgumentParser(
        description='Backfill historical odds from electionbettingodds.com charts'
    )
    parser.add_argument('--status', action='store_true',
                       help='Show current sync status')
    parser.add_argument('--clear', action='store_true',
                       help='Clear existing data before backfill')
    parser.add_argument('--db', type=str, default=None,
                       help='Database path (optional)')

    args = parser.parse_args()

    # Initialize storage
    storage = Storage(args.db)

    if args.status:
        show_status(storage)
        return

    if args.clear:
        logger.info("Clearing old data...")
        clear_old_data(storage)

    # Run backfill
    logger.info("Starting chart data extraction...")
    stats = asyncio.run(backfill_from_charts(storage))

    print(f"\nBackfill complete:")
    print(f"  Pages processed: {stats['pages_processed']}")
    print(f"  Candidates found: {stats['candidates_found']}")
    print(f"  Data points extracted: {stats['data_points']}")
    print(f"  Records inserted: {stats['records_inserted']}")
    print(f"  Records updated: {stats['records_updated']}")

    show_status(storage)


if __name__ == '__main__':
    main()
