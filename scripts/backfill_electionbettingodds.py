#!/usr/bin/env python3
"""
Backfill historical odds from electionbettingodds.com

This script fetches historical aggregated odds data from electionbettingodds.com
using the ?date= parameter to access historical snapshots.

Usage:
    python backfill_electionbettingodds.py --from 2025-08-01 --to 2026-02-05 --concurrency 2
    python backfill_electionbettingodds.py --resume  # Resume failed/pending checkpoints
    python backfill_electionbettingodds.py --status  # Show sync status

Discovery findings:
- Date parameter: /?date=YYYY-MM-DD returns historical data
- Page structure: HTML tables with candidate odds and market breakdowns
- Google Charts: Contains time-series data in addRows format
- robots.txt: 404 (no restrictions found)
- Wayback Machine: 20+ archived snapshots available as fallback
"""

import argparse
import asyncio
import json
import re
import os
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import List, Dict, Optional, Tuple
from dataclasses import dataclass, field
import logging

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

try:
    import aiohttp
    from bs4 import BeautifulSoup
except ImportError:
    print("Installing required packages...")
    os.system("pip install aiohttp beautifulsoup4")
    import aiohttp
    from bs4 import BeautifulSoup

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
PAGES_TO_SCRAPE = [
    "/",  # Home page with current odds
    "/President2028.html",  # 2028 presidential
]
USER_AGENT = "Mozilla/5.0 (compatible; ResearchBot/1.0; Educational/Research)"
RATE_LIMIT_DELAY = 2.0  # seconds between requests
MAX_RETRIES = 3
RETRY_DELAY = 5.0  # seconds


@dataclass
class CandidateOdds:
    """Single candidate odds data."""
    candidate_name: str
    odds_pct: float
    change_pct: Optional[float] = None
    market_breakdown: Dict[str, Dict] = field(default_factory=dict)


@dataclass
class PageSnapshot:
    """Full page snapshot data."""
    url: str
    date: str
    last_updated: Optional[str] = None
    market_name: Optional[str] = None
    total_bet: Optional[float] = None
    candidates: List[CandidateOdds] = field(default_factory=list)
    chart_data: List[List] = field(default_factory=list)
    raw_html_size: int = 0


def parse_odds_page(html: str, url: str, date: str) -> PageSnapshot:
    """
    Parse electionbettingodds.com HTML page to extract odds data.

    Extracts:
    - Candidate names (from image src)
    - Odds percentages
    - Market breakdowns (from tooltips)
    - Last updated timestamp
    - Chart data (if present)
    """
    soup = BeautifulSoup(html, 'html.parser')
    snapshot = PageSnapshot(url=url, date=date, raw_html_size=len(html))

    # Extract last updated timestamp
    # Pattern: "Last updated: 12:35PM EST on Feb 01, 2026"
    last_updated_match = re.search(r'Last updated:\s*([^<]+)', html, re.I)
    if last_updated_match:
        snapshot.last_updated = last_updated_match.group(1).strip()

    # Extract market name and total bet from main tooltip
    # Pattern: "US Presidency 2028" with "$248,220,477 bet so far"
    market_tooltip = soup.find('div', class_='tooltip')
    if market_tooltip:
        market_title = market_tooltip.find('span', style=lambda s: s and 'font-size: 21pt' in s)
        if market_title:
            snapshot.market_name = market_title.get_text(strip=True)

        bet_match = re.search(r'\$([0-9,]+)\s*bet so far', str(market_tooltip))
        if bet_match:
            snapshot.total_bet = float(bet_match.group(1).replace(',', ''))

    # Extract candidate odds from candidate-tooltip divs
    candidate_tooltips = soup.find_all('div', class_='candidate-tooltip')
    for tooltip in candidate_tooltips:
        try:
            candidate = parse_candidate_tooltip(tooltip)
            if candidate:
                snapshot.candidates.append(candidate)
        except Exception as e:
            logger.warning(f"Error parsing candidate tooltip: {e}")

    # Extract Google Charts data if present
    chart_data = extract_chart_data(html)
    if chart_data:
        snapshot.chart_data = chart_data

    return snapshot


def parse_candidate_tooltip(tooltip_div) -> Optional[CandidateOdds]:
    """Parse a candidate tooltip div to extract odds data."""
    # Get candidate name from image src
    img = tooltip_div.find('img')
    if not img:
        return None

    img_src = img.get('src', '')
    # Extract name from /Vance.png -> Vance
    name_match = re.search(r'/([^/]+)\.png', img_src)
    if not name_match:
        return None

    candidate_name = name_match.group(1)

    # Get main odds percentage from sibling td
    # The structure is: <tr><td>tooltip with image</td><td>percentage</td></tr>
    # Navigate up to the containing td, then find next sibling td
    parent_td = tooltip_div.find_parent('td')
    if not parent_td:
        return None

    # Find the sibling td (next one contains the odds)
    odds_td = parent_td.find_next_sibling('td')
    if not odds_td:
        return None

    # Find the large percentage text - look for any p with percentage
    odds_pct = None
    for p_tag in odds_td.find_all('p'):
        p_text = p_tag.get_text(strip=True)
        odds_match = re.search(r'([\d.]+)%', p_text)
        if odds_match:
            odds_pct = float(odds_match.group(1))
            break

    if odds_pct is None:
        return None

    # Get change percentage from span with percentage
    change_pct = None
    for span_tag in odds_td.find_all('span'):
        span_text = span_tag.get_text(strip=True)
        change_match = re.search(r'([+-]?[\d.]+)%', span_text)
        if change_match:
            change_pct = float(change_match.group(1))
            break

    # Get market breakdown from inner tooltip
    market_breakdown = {}
    tooltip_text = tooltip_div.find('span', class_='tooltiptext')
    if tooltip_text:
        rows = tooltip_text.find_all('tr')
        for row in rows:
            cells = row.find_all('td')
            if len(cells) >= 5:
                market_name = cells[0].get_text(strip=True)
                range_text = cells[2].get_text(strip=True)
                bet_text = cells[4].get_text(strip=True)

                if market_name and range_text and '%' in range_text:
                    # Parse range like "26.0-27.0%"
                    range_match = re.search(r'([\d.]+)-([\d.]+)%', range_text)
                    if range_match:
                        market_breakdown[market_name] = {
                            'bid': float(range_match.group(1)),
                            'ask': float(range_match.group(2)),
                            'total_bet': bet_text
                        }

    return CandidateOdds(
        candidate_name=candidate_name,
        odds_pct=odds_pct,
        change_pct=change_pct,
        market_breakdown=market_breakdown
    )


def extract_chart_data(html: str) -> List[List]:
    """
    Extract Google Charts time-series data from page.

    Pattern: addRows([[new Date(2024,10,15,19,12,46),26.2,7.0,...]])
    """
    # Find addRows call with data
    add_rows_match = re.search(
        r'\.addRows?\s*\(\s*(\[\[.*?\]\])\s*\)',
        html,
        re.DOTALL
    )

    if not add_rows_match:
        return []

    rows_str = add_rows_match.group(1)

    # Parse the JavaScript array
    # Convert new Date(year,month,day,hour,min,sec) to ISO string
    def parse_date(match):
        parts = [int(x) for x in match.group(1).split(',')]
        # JavaScript months are 0-indexed
        if len(parts) >= 3:
            year = parts[0]
            month = parts[1] + 1  # Convert to 1-indexed
            day = parts[2]
            hour = parts[3] if len(parts) > 3 else 0
            minute = parts[4] if len(parts) > 4 else 0
            second = parts[5] if len(parts) > 5 else 0
            dt = datetime(year, month, day, hour, minute, second)
            return f'"{dt.isoformat()}"'
        return match.group(0)

    # Replace new Date(...) with ISO strings
    rows_json = re.sub(r'new Date\(([\d,]+)\)', parse_date, rows_str)

    # Clean up trailing commas (JavaScript allows them, JSON doesn't)
    rows_json = re.sub(r',\s*\]', ']', rows_json)

    try:
        return json.loads(rows_json)
    except json.JSONDecodeError as e:
        logger.warning(f"Failed to parse chart data: {e}")
        return []


async def fetch_page(
    session: aiohttp.ClientSession,
    url: str,
    retries: int = MAX_RETRIES
) -> Optional[str]:
    """Fetch a page with retry logic."""
    for attempt in range(retries):
        try:
            async with session.get(url, timeout=30) as response:
                if response.status == 200:
                    return await response.text()
                elif response.status == 404:
                    logger.warning(f"Page not found: {url}")
                    return None
                else:
                    logger.warning(f"HTTP {response.status} for {url}")
        except Exception as e:
            logger.warning(f"Attempt {attempt + 1} failed for {url}: {e}")
            if attempt < retries - 1:
                await asyncio.sleep(RETRY_DELAY * (attempt + 1))

    return None


async def fetch_historical_date(
    session: aiohttp.ClientSession,
    date: str,
    pages: List[str] = PAGES_TO_SCRAPE
) -> List[PageSnapshot]:
    """Fetch all pages for a specific date."""
    snapshots = []

    for page_path in pages:
        # Construct URL with date parameter
        url = f"{BASE_URL}{page_path}?date={date}"

        logger.info(f"Fetching: {url}")
        html = await fetch_page(session, url)

        if html:
            snapshot = parse_odds_page(html, url, date)
            snapshots.append(snapshot)
            logger.info(f"  Parsed {len(snapshot.candidates)} candidates")

        # Rate limiting
        await asyncio.sleep(RATE_LIMIT_DELAY)

    return snapshots


def store_snapshot(storage: Storage, snapshot: PageSnapshot) -> Tuple[int, int]:
    """Store a page snapshot in the database. Returns (inserted, updated) counts."""
    inserted = 0
    updated = 0

    # Determine market_id from URL
    if '/President2028' in snapshot.url:
        market_id = 'president_2028'
        market_name = snapshot.market_name or 'US Presidency 2028'
    else:
        market_id = 'general'
        market_name = 'Election Betting Odds'

    # Upsert market
    storage.upsert_market(
        source=SOURCE_NAME,
        market_id=market_id,
        market_name=market_name,
        category='elections',
        status='open',
        url=snapshot.url.split('?')[0],  # Base URL without date param
        total_volume=snapshot.total_bet
    )

    # Store each candidate's odds as a price snapshot
    for candidate in snapshot.candidates:
        # Use candidate name as contract_id
        contract_id = candidate.candidate_name.lower().replace(' ', '_')

        # Upsert contract
        storage.upsert_contract(
            source=SOURCE_NAME,
            market_id=market_id,
            contract_id=contract_id,
            contract_name=candidate.candidate_name,
            short_name=candidate.candidate_name
        )

        # Create snapshot timestamp from date + last_updated
        snapshot_time = f"{snapshot.date}T00:00:00Z"
        if snapshot.last_updated:
            # Try to parse the last_updated time
            time_match = re.search(r'(\d+):(\d+)(AM|PM)', snapshot.last_updated)
            if time_match:
                hour = int(time_match.group(1))
                minute = int(time_match.group(2))
                ampm = time_match.group(3)
                if ampm == 'PM' and hour != 12:
                    hour += 12
                elif ampm == 'AM' and hour == 12:
                    hour = 0
                snapshot_time = f"{snapshot.date}T{hour:02d}:{minute:02d}:00Z"

        # Upsert price snapshot
        _, was_inserted = storage.upsert_price_snapshot(
            source=SOURCE_NAME,
            market_id=market_id,
            contract_id=contract_id,
            snapshot_time=snapshot_time,
            yes_price=candidate.odds_pct / 100.0,  # Convert to decimal
            raw_data={
                'odds_pct': candidate.odds_pct,
                'change_pct': candidate.change_pct,
                'market_breakdown': candidate.market_breakdown,
                'last_updated': snapshot.last_updated
            }
        )

        if was_inserted:
            inserted += 1
        else:
            updated += 1

    return inserted, updated


async def backfill_date_range(
    storage: Storage,
    start_date: str,
    end_date: str,
    concurrency: int = 2
) -> Dict:
    """Backfill a date range with controlled concurrency."""
    # Generate date list
    start = datetime.strptime(start_date, '%Y-%m-%d')
    end = datetime.strptime(end_date, '%Y-%m-%d')

    dates = []
    current = start
    while current <= end:
        dates.append(current.strftime('%Y-%m-%d'))
        current += timedelta(days=1)

    logger.info(f"Backfilling {len(dates)} days from {start_date} to {end_date}")

    # Create checkpoint
    checkpoint_id = storage.create_sync_checkpoint(
        source=SOURCE_NAME,
        sync_type='backfill',
        window_start=start_date,
        window_end=end_date
    )

    storage.update_sync_checkpoint(checkpoint_id, status='running')

    stats = {
        'dates_processed': 0,
        'dates_failed': 0,
        'records_inserted': 0,
        'records_updated': 0,
        'total_candidates': 0
    }

    # Process dates with semaphore for concurrency control
    semaphore = asyncio.Semaphore(concurrency)

    async with aiohttp.ClientSession(
        headers={'User-Agent': USER_AGENT}
    ) as session:

        async def process_date(date: str):
            async with semaphore:
                try:
                    snapshots = await fetch_historical_date(session, date)

                    for snapshot in snapshots:
                        inserted, updated = store_snapshot(storage, snapshot)
                        stats['records_inserted'] += inserted
                        stats['records_updated'] += updated
                        stats['total_candidates'] += len(snapshot.candidates)

                    stats['dates_processed'] += 1
                    logger.info(f"Completed {date}: {stats['dates_processed']}/{len(dates)}")

                except Exception as e:
                    logger.error(f"Failed to process {date}: {e}")
                    stats['dates_failed'] += 1

        # Process all dates
        tasks = [process_date(date) for date in dates]
        await asyncio.gather(*tasks)

    # Update checkpoint
    if stats['dates_failed'] == 0:
        storage.update_sync_checkpoint(
            checkpoint_id,
            status='completed',
            records_fetched=stats['dates_processed'],
            records_inserted=stats['records_inserted'],
            records_updated=stats['records_updated']
        )
    else:
        storage.update_sync_checkpoint(
            checkpoint_id,
            status='failed',
            records_fetched=stats['dates_processed'],
            records_inserted=stats['records_inserted'],
            records_updated=stats['records_updated'],
            error_message=f"{stats['dates_failed']} dates failed"
        )

    return stats


async def resume_backfill(storage: Storage, concurrency: int = 2) -> Dict:
    """Resume any pending or failed backfill checkpoints."""
    pending = storage.get_pending_checkpoints(
        source=SOURCE_NAME,
        sync_type='backfill'
    )

    if not pending:
        logger.info("No pending checkpoints to resume")
        return {}

    total_stats = {
        'checkpoints_resumed': 0,
        'dates_processed': 0,
        'records_inserted': 0,
        'records_updated': 0
    }

    for checkpoint in pending:
        logger.info(f"Resuming checkpoint: {checkpoint['window_start']} to {checkpoint['window_end']}")

        stats = await backfill_date_range(
            storage,
            checkpoint['window_start'],
            checkpoint['window_end'],
            concurrency
        )

        total_stats['checkpoints_resumed'] += 1
        total_stats['dates_processed'] += stats.get('dates_processed', 0)
        total_stats['records_inserted'] += stats.get('records_inserted', 0)
        total_stats['records_updated'] += stats.get('records_updated', 0)

    return total_stats


def show_status(storage: Storage):
    """Show current backfill status."""
    print("\n" + "=" * 60)
    print("ElectionBettingOdds Backfill Status")
    print("=" * 60)

    # Get overall stats
    stats = storage.get_stats()
    print(f"\nTotal records: {stats.get('total_snapshots', 0)}")
    print(f"By source: {stats.get('snapshots_by_source', {})}")

    # Get checkpoints
    completed = storage.get_completed_checkpoints(source=SOURCE_NAME)
    pending = storage.get_pending_checkpoints(source=SOURCE_NAME)

    print(f"\nCompleted checkpoints: {len(completed)}")
    for cp in completed[:5]:
        print(f"  - {cp['window_start']} to {cp['window_end']}: "
              f"{cp['records_inserted']} inserted, {cp['records_updated']} updated")

    if pending:
        print(f"\nPending/Failed checkpoints: {len(pending)}")
        for cp in pending:
            print(f"  - {cp['window_start']} to {cp['window_end']}: {cp['status']}")

    # Get date coverage
    ebo_stats = storage.get_price_history(
        source=SOURCE_NAME,
        limit=1
    )
    if ebo_stats:
        daily = storage.get_daily_counts(
            start_date='2025-08-01',
            end_date='2026-02-05',
            source=SOURCE_NAME
        )
        print(f"\nDaily coverage: {len(daily)} days with data")
        if daily:
            print(f"  First: {daily[-1]['date']} ({daily[-1]['record_count']} records)")
            print(f"  Last:  {daily[0]['date']} ({daily[0]['record_count']} records)")

    print("=" * 60 + "\n")


def main():
    parser = argparse.ArgumentParser(
        description='Backfill historical odds from electionbettingodds.com'
    )
    parser.add_argument('--from', dest='from_date',
                       help='Start date (YYYY-MM-DD)', default='2025-08-01')
    parser.add_argument('--to', dest='to_date',
                       help='End date (YYYY-MM-DD)',
                       default=datetime.now().strftime('%Y-%m-%d'))
    parser.add_argument('--concurrency', type=int, default=2,
                       help='Number of concurrent requests')
    parser.add_argument('--resume', action='store_true',
                       help='Resume pending/failed checkpoints')
    parser.add_argument('--status', action='store_true',
                       help='Show current sync status')
    parser.add_argument('--db', type=str, default=None,
                       help='Database path (optional)')

    args = parser.parse_args()

    # Initialize storage
    storage = Storage(args.db)

    if args.status:
        show_status(storage)
        return

    if args.resume:
        stats = asyncio.run(resume_backfill(storage, args.concurrency))
        print(f"\nResume complete: {stats}")
    else:
        stats = asyncio.run(backfill_date_range(
            storage,
            args.from_date,
            args.to_date,
            args.concurrency
        ))
        print(f"\nBackfill complete: {stats}")

    show_status(storage)


if __name__ == '__main__':
    main()
