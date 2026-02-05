#!/usr/bin/env python3
"""
Backfill script for historical election odds data.

Usage:
    python backfill.py --from 2025-08-01 --to 2026-02-05 --window 7d --concurrency 2
    python backfill.py --resume  # Resume pending checkpoints
    python backfill.py --status  # Show backfill status
"""

import argparse
import sys
import os
import json
import time
import logging
from datetime import datetime, timedelta, timezone
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import List, Dict, Optional, Tuple
import traceback

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from scripts.storage import Storage
from api_clients import PredictItClient, KalshiClient, PolymarketClient, SmarketsClient

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger(__name__)

# Audit samples directory
AUDIT_SAMPLES_DIR = Path(__file__).parent.parent / "audit" / "api_samples"
AUDIT_SAMPLES_DIR.mkdir(parents=True, exist_ok=True)


def parse_window(window_str: str) -> timedelta:
    """Parse window string like '7d', '1d', '12h' into timedelta."""
    if window_str.endswith('d'):
        return timedelta(days=int(window_str[:-1]))
    elif window_str.endswith('h'):
        return timedelta(hours=int(window_str[:-1]))
    elif window_str.endswith('m'):
        return timedelta(minutes=int(window_str[:-1]))
    else:
        raise ValueError(f"Invalid window format: {window_str}. Use '7d', '1d', '12h', etc.")


def parse_date(date_str: str, tz_name: str = "America/Chicago") -> datetime:
    """Parse date string to datetime in specified timezone."""
    try:
        import zoneinfo
        tz = zoneinfo.ZoneInfo(tz_name)
    except ImportError:
        # Fallback for older Python
        tz = timezone(timedelta(hours=-6))  # CST approximation

    dt = datetime.strptime(date_str, "%Y-%m-%d")
    return dt.replace(tzinfo=tz)


def save_sample_response(source: str, endpoint: str, data: dict, window_start: str):
    """Save a sample API response for debugging."""
    safe_endpoint = endpoint.replace('/', '_').replace('?', '_')[:50]
    filename = f"{source}_{safe_endpoint}_{window_start[:10]}.json"
    filepath = AUDIT_SAMPLES_DIR / filename

    try:
        with open(filepath, 'w') as f:
            json.dump({
                'source': source,
                'endpoint': endpoint,
                'window_start': window_start,
                'captured_at': datetime.now(timezone.utc).isoformat(),
                'data': data
            }, f, indent=2, default=str)
        logger.debug(f"Saved sample response to {filepath}")
    except Exception as e:
        logger.warning(f"Failed to save sample response: {e}")


class BackfillJob:
    """Handles backfill operations for all sources."""

    def __init__(self, storage: Storage, concurrency: int = 2):
        self.storage = storage
        self.concurrency = concurrency
        self.clients = self._init_clients()

    def _init_clients(self) -> Dict:
        """Initialize API clients."""
        clients = {}

        try:
            clients['PredictIt'] = PredictItClient()
            logger.info("PredictIt client initialized")
        except Exception as e:
            logger.warning(f"Failed to init PredictIt client: {e}")

        try:
            clients['Kalshi'] = KalshiClient()
            logger.info("Kalshi client initialized")
        except Exception as e:
            logger.warning(f"Failed to init Kalshi client: {e}")

        try:
            clients['Polymarket'] = PolymarketClient()
            logger.info("Polymarket client initialized")
        except Exception as e:
            logger.warning(f"Failed to init Polymarket client: {e}")

        try:
            clients['Smarkets'] = SmarketsClient()
            logger.info("Smarkets client initialized")
        except Exception as e:
            logger.warning(f"Failed to init Smarkets client: {e}")

        return clients

    def generate_windows(self, start_date: datetime, end_date: datetime,
                        window_size: timedelta) -> List[Tuple[datetime, datetime]]:
        """Generate time windows for backfill."""
        windows = []
        current = start_date

        while current < end_date:
            window_end = min(current + window_size, end_date)
            windows.append((current, window_end))
            current = window_end

        return windows

    def fetch_source_data(self, source: str, window_start: datetime,
                         window_end: datetime, checkpoint_id: int) -> Dict:
        """Fetch data from a single source for a time window."""
        client = self.clients.get(source)
        if not client:
            return {'error': f'No client for {source}', 'fetched': 0, 'inserted': 0, 'updated': 0, 'deduped': 0}

        stats = {'fetched': 0, 'inserted': 0, 'updated': 0, 'deduped': 0}
        snapshot_time = window_end.isoformat()

        try:
            self.storage.update_sync_checkpoint(checkpoint_id, status='running')

            logger.info(f"[{source}] Fetching data for window {window_start.date()} to {window_end.date()}")

            # Fetch markets based on source
            if source == 'PredictIt':
                markets = client.get_political_markets()
            elif source == 'Kalshi':
                markets = client.get_political_markets()
            elif source == 'Polymarket':
                markets = client.get_political_markets()
            elif source == 'Smarkets':
                markets = client.get_political_markets()
            else:
                markets = []

            # Save sample response (first window only)
            if markets and stats['fetched'] == 0:
                sample_data = {
                    'market_count': len(markets),
                    'sample_market': markets[0].__dict__ if markets else None
                }
                save_sample_response(source, 'markets', sample_data, window_start.isoformat())

            for market in markets:
                stats['fetched'] += 1

                # Upsert market (convert status enum to string)
                status_str = market.status.value if hasattr(market.status, 'value') else str(market.status)
                _, market_inserted = self.storage.upsert_market(
                    source=source,
                    market_id=market.market_id,
                    market_name=market.market_name,
                    category=market.category,
                    status=status_str,
                    url=market.url,
                    total_volume=market.total_volume
                )

                # Upsert contracts and price snapshots
                for contract in market.contracts:
                    _, contract_inserted = self.storage.upsert_contract(
                        source=source,
                        market_id=market.market_id,
                        contract_id=contract.contract_id,
                        contract_name=contract.contract_name
                    )

                    # Upsert price snapshot
                    _, snapshot_inserted = self.storage.upsert_price_snapshot(
                        source=source,
                        market_id=market.market_id,
                        contract_id=contract.contract_id,
                        snapshot_time=snapshot_time,
                        yes_price=contract.yes_price,
                        no_price=contract.no_price,
                        yes_bid=contract.yes_bid,
                        yes_ask=contract.yes_ask,
                        volume=contract.volume,
                        raw_data={
                            'market_name': market.market_name,
                            'contract_name': contract.contract_name,
                            'last_updated': contract.last_updated
                        }
                    )

                    if snapshot_inserted:
                        stats['inserted'] += 1
                    else:
                        stats['deduped'] += 1

            self.storage.update_sync_checkpoint(
                checkpoint_id,
                status='completed',
                records_fetched=stats['fetched'],
                records_inserted=stats['inserted'],
                records_updated=stats['updated'],
                records_deduped=stats['deduped']
            )

            logger.info(f"[{source}] Window complete: fetched={stats['fetched']}, "
                       f"inserted={stats['inserted']}, deduped={stats['deduped']}")

        except Exception as e:
            error_msg = f"{type(e).__name__}: {str(e)}"
            logger.error(f"[{source}] Error: {error_msg}")
            logger.debug(traceback.format_exc())

            self.storage.update_sync_checkpoint(
                checkpoint_id,
                status='failed',
                error_message=error_msg,
                records_fetched=stats['fetched'],
                records_inserted=stats['inserted'],
                records_updated=stats['updated'],
                records_deduped=stats['deduped']
            )
            stats['error'] = error_msg

        return stats

    def run_backfill(self, start_date: datetime, end_date: datetime,
                    window_size: timedelta, sources: List[str] = None):
        """Run backfill for specified date range and sources."""
        if sources is None:
            sources = list(self.clients.keys())

        windows = self.generate_windows(start_date, end_date, window_size)
        logger.info(f"Backfill: {len(windows)} windows x {len(sources)} sources = {len(windows) * len(sources)} tasks")

        # Create checkpoints for all windows
        tasks = []
        for source in sources:
            for window_start, window_end in windows:
                checkpoint_id = self.storage.create_sync_checkpoint(
                    source=source,
                    sync_type='backfill',
                    window_start=window_start.isoformat(),
                    window_end=window_end.isoformat()
                )
                tasks.append((source, window_start, window_end, checkpoint_id))

        # Filter to only pending/failed tasks
        pending_tasks = []
        for source, window_start, window_end, checkpoint_id in tasks:
            checkpoints = self.storage.get_completed_checkpoints(source=source)
            checkpoint_keys = {(c['window_start'], c['window_end']) for c in checkpoints}
            if (window_start.isoformat(), window_end.isoformat()) not in checkpoint_keys:
                pending_tasks.append((source, window_start, window_end, checkpoint_id))

        if not pending_tasks:
            logger.info("All windows already completed!")
            return

        logger.info(f"Running {len(pending_tasks)} pending tasks with concurrency={self.concurrency}")

        total_stats = {'fetched': 0, 'inserted': 0, 'updated': 0, 'deduped': 0, 'errors': 0}

        with ThreadPoolExecutor(max_workers=self.concurrency) as executor:
            futures = {
                executor.submit(self.fetch_source_data, source, ws, we, cp_id): (source, ws, we)
                for source, ws, we, cp_id in pending_tasks
            }

            for future in as_completed(futures):
                source, ws, we = futures[future]
                try:
                    stats = future.result()
                    total_stats['fetched'] += stats.get('fetched', 0)
                    total_stats['inserted'] += stats.get('inserted', 0)
                    total_stats['updated'] += stats.get('updated', 0)
                    total_stats['deduped'] += stats.get('deduped', 0)
                    if 'error' in stats:
                        total_stats['errors'] += 1
                except Exception as e:
                    logger.error(f"Task failed [{source}]: {e}")
                    total_stats['errors'] += 1

        logger.info(f"Backfill complete: {total_stats}")

    def resume_backfill(self):
        """Resume any pending or failed checkpoints."""
        pending = self.storage.get_pending_checkpoints(sync_type='backfill')

        if not pending:
            logger.info("No pending checkpoints to resume")
            return

        logger.info(f"Resuming {len(pending)} pending checkpoints")

        total_stats = {'fetched': 0, 'inserted': 0, 'updated': 0, 'deduped': 0, 'errors': 0}

        with ThreadPoolExecutor(max_workers=self.concurrency) as executor:
            futures = {}
            for cp in pending:
                source = cp['source']
                window_start = datetime.fromisoformat(cp['window_start'])
                window_end = datetime.fromisoformat(cp['window_end'])

                future = executor.submit(
                    self.fetch_source_data, source, window_start, window_end, cp['id']
                )
                futures[future] = (source, window_start, window_end)

            for future in as_completed(futures):
                source, ws, we = futures[future]
                try:
                    stats = future.result()
                    total_stats['fetched'] += stats.get('fetched', 0)
                    total_stats['inserted'] += stats.get('inserted', 0)
                    total_stats['updated'] += stats.get('updated', 0)
                    total_stats['deduped'] += stats.get('deduped', 0)
                    if 'error' in stats:
                        total_stats['errors'] += 1
                except Exception as e:
                    logger.error(f"Resume task failed [{source}]: {e}")
                    total_stats['errors'] += 1

        logger.info(f"Resume complete: {total_stats}")

    def show_status(self):
        """Show current backfill status."""
        stats = self.storage.get_stats()

        print("\n=== Database Statistics ===")
        print(f"Total Markets: {stats['total_markets']}")
        print(f"Total Contracts: {stats['total_contracts']}")
        print(f"Total Price Snapshots: {stats['total_snapshots']}")
        print(f"Earliest Snapshot: {stats['earliest_snapshot']}")
        print(f"Latest Snapshot: {stats['latest_snapshot']}")

        print("\nSnapshots by Source:")
        for source, count in stats.get('snapshots_by_source', {}).items():
            print(f"  {source}: {count:,}")

        print("\nCheckpoints by Status:")
        for status, count in stats.get('checkpoints_by_status', {}).items():
            print(f"  {status}: {count}")

        # Show pending checkpoints
        pending = self.storage.get_pending_checkpoints()
        if pending:
            print(f"\nPending/Failed Checkpoints: {len(pending)}")
            for cp in pending[:5]:
                print(f"  [{cp['source']}] {cp['window_start'][:10]} - {cp['window_end'][:10]}: {cp['status']}")
            if len(pending) > 5:
                print(f"  ... and {len(pending) - 5} more")


def main():
    parser = argparse.ArgumentParser(description='Backfill historical election odds data')
    parser.add_argument('--from', dest='from_date', type=str,
                       help='Start date (YYYY-MM-DD), default: 2025-08-01')
    parser.add_argument('--to', dest='to_date', type=str,
                       help='End date (YYYY-MM-DD), default: today')
    parser.add_argument('--window', type=str, default='7d',
                       help='Window size (e.g., 7d, 1d, 12h), default: 7d')
    parser.add_argument('--concurrency', type=int, default=2,
                       help='Number of concurrent fetch operations, default: 2')
    parser.add_argument('--sources', type=str, nargs='+',
                       help='Sources to backfill (PredictIt, Kalshi, Polymarket, Smarkets)')
    parser.add_argument('--resume', action='store_true',
                       help='Resume pending/failed checkpoints')
    parser.add_argument('--status', action='store_true',
                       help='Show backfill status')
    parser.add_argument('--db', type=str,
                       help='Database path (default: data/election_odds.db)')
    parser.add_argument('--verbose', '-v', action='store_true',
                       help='Enable verbose logging')

    args = parser.parse_args()

    if args.verbose:
        logging.getLogger().setLevel(logging.DEBUG)

    # Initialize storage
    storage = Storage(args.db)
    job = BackfillJob(storage, concurrency=args.concurrency)

    if args.status:
        job.show_status()
        return

    if args.resume:
        job.resume_backfill()
        return

    # Parse dates
    from_date = parse_date(args.from_date or '2025-08-01')
    to_date = parse_date(args.to_date or datetime.now().strftime('%Y-%m-%d'))
    window_size = parse_window(args.window)

    logger.info(f"Backfill: {from_date.date()} to {to_date.date()}, window={args.window}")

    job.run_backfill(
        start_date=from_date,
        end_date=to_date,
        window_size=window_size,
        sources=args.sources
    )

    # Show final status
    job.show_status()


if __name__ == '__main__':
    main()
