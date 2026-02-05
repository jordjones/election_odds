#!/usr/bin/env python3
"""
Incremental sync script for election odds data.

Syncs data from the last successful sync time (with 15-minute buffer) to now.

Usage:
    python sync.py                    # Sync since last successful sync
    python sync.py --since 2026-02-01 # Sync since specific date
    python sync.py --full             # Full sync (all sources, current data)
"""

import argparse
import sys
import json
import logging
from datetime import datetime, timedelta, timezone
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import List, Dict, Optional

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

# Buffer time to subtract from last sync to ensure no gaps
SYNC_BUFFER = timedelta(minutes=15)


class IncrementalSync:
    """Handles incremental sync operations."""

    def __init__(self, storage: Storage, concurrency: int = 4):
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

    def save_sample_response(self, source: str, data: dict):
        """Save a sample API response for debugging."""
        AUDIT_SAMPLES_DIR.mkdir(parents=True, exist_ok=True)
        timestamp = datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')
        filename = f"{source}_sync_{timestamp}.json"
        filepath = AUDIT_SAMPLES_DIR / filename

        try:
            with open(filepath, 'w') as f:
                json.dump({
                    'source': source,
                    'sync_type': 'incremental',
                    'captured_at': datetime.now(timezone.utc).isoformat(),
                    'data': data
                }, f, indent=2, default=str)
            logger.debug(f"Saved sample response to {filepath}")
        except Exception as e:
            logger.warning(f"Failed to save sample response: {e}")

    def sync_source(self, source: str, since: datetime) -> Dict:
        """Sync data from a single source."""
        client = self.clients.get(source)
        if not client:
            return {'error': f'No client for {source}', 'fetched': 0, 'inserted': 0, 'updated': 0, 'deduped': 0}

        now = datetime.now(timezone.utc)
        snapshot_time = now.isoformat()

        # Create checkpoint
        checkpoint_id = self.storage.create_sync_checkpoint(
            source=source,
            sync_type='incremental',
            window_start=since.isoformat(),
            window_end=snapshot_time
        )

        stats = {'fetched': 0, 'inserted': 0, 'updated': 0, 'deduped': 0}

        try:
            self.storage.update_sync_checkpoint(checkpoint_id, status='running')

            logger.info(f"[{source}] Syncing since {since.isoformat()}")

            # Fetch markets
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

            # Save sample response
            if markets:
                sample_data = {
                    'market_count': len(markets),
                    'sample_markets': [m.__dict__ for m in markets[:3]]
                }
                self.save_sample_response(source, sample_data)

            for market in markets:
                stats['fetched'] += 1

                # Upsert market (convert status enum to string)
                status_str = market.status.value if hasattr(market.status, 'value') else str(market.status)
                self.storage.upsert_market(
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
                    self.storage.upsert_contract(
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

            logger.info(f"[{source}] Sync complete: fetched={stats['fetched']}, "
                       f"inserted={stats['inserted']}, deduped={stats['deduped']}")

        except Exception as e:
            error_msg = f"{type(e).__name__}: {str(e)}"
            logger.error(f"[{source}] Sync error: {error_msg}")

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

    def run_sync(self, since: datetime = None, sources: List[str] = None):
        """Run incremental sync for all sources."""
        if sources is None:
            sources = list(self.clients.keys())

        # Determine sync start time
        if since is None:
            last_sync = self.storage.get_last_sync_time()
            if last_sync:
                since = datetime.fromisoformat(last_sync) - SYNC_BUFFER
                logger.info(f"Syncing since last successful sync: {since.isoformat()} (with {SYNC_BUFFER} buffer)")
            else:
                # No previous sync, sync last 24 hours
                since = datetime.now(timezone.utc) - timedelta(hours=24)
                logger.info(f"No previous sync found, syncing last 24 hours since {since.isoformat()}")

        total_stats = {'fetched': 0, 'inserted': 0, 'updated': 0, 'deduped': 0, 'errors': 0}

        with ThreadPoolExecutor(max_workers=self.concurrency) as executor:
            futures = {
                executor.submit(self.sync_source, source, since): source
                for source in sources
            }

            for future in as_completed(futures):
                source = futures[future]
                try:
                    stats = future.result()
                    total_stats['fetched'] += stats.get('fetched', 0)
                    total_stats['inserted'] += stats.get('inserted', 0)
                    total_stats['updated'] += stats.get('updated', 0)
                    total_stats['deduped'] += stats.get('deduped', 0)
                    if 'error' in stats:
                        total_stats['errors'] += 1
                except Exception as e:
                    logger.error(f"Sync failed [{source}]: {e}")
                    total_stats['errors'] += 1

        logger.info(f"Sync complete: {total_stats}")
        return total_stats

    def show_status(self):
        """Show current sync status."""
        stats = self.storage.get_stats()
        last_sync = self.storage.get_last_sync_time()

        print("\n=== Sync Status ===")
        print(f"Last Successful Sync: {last_sync or 'Never'}")
        print(f"Total Price Snapshots: {stats['total_snapshots']:,}")
        print(f"Earliest: {stats['earliest_snapshot']}")
        print(f"Latest: {stats['latest_snapshot']}")

        print("\nSnapshots by Source:")
        for source, count in stats.get('snapshots_by_source', {}).items():
            print(f"  {source}: {count:,}")


def main():
    parser = argparse.ArgumentParser(description='Incremental sync for election odds data')
    parser.add_argument('--since', type=str,
                       help='Sync since date (YYYY-MM-DD or ISO format)')
    parser.add_argument('--sources', type=str, nargs='+',
                       help='Sources to sync (PredictIt, Kalshi, Polymarket, Smarkets)')
    parser.add_argument('--full', action='store_true',
                       help='Full sync (ignore last sync time)')
    parser.add_argument('--status', action='store_true',
                       help='Show sync status')
    parser.add_argument('--concurrency', type=int, default=4,
                       help='Number of concurrent sync operations, default: 4')
    parser.add_argument('--db', type=str,
                       help='Database path (default: data/election_odds.db)')
    parser.add_argument('--verbose', '-v', action='store_true',
                       help='Enable verbose logging')

    args = parser.parse_args()

    if args.verbose:
        logging.getLogger().setLevel(logging.DEBUG)

    # Initialize storage
    storage = Storage(args.db)
    sync = IncrementalSync(storage, concurrency=args.concurrency)

    if args.status:
        sync.show_status()
        return

    # Determine since time
    since = None
    if args.since:
        if 'T' in args.since:
            since = datetime.fromisoformat(args.since)
        else:
            since = datetime.strptime(args.since, '%Y-%m-%d').replace(tzinfo=timezone.utc)
    elif args.full:
        since = datetime.now(timezone.utc) - timedelta(hours=24)

    sync.run_sync(since=since, sources=args.sources)
    sync.show_status()


if __name__ == '__main__':
    main()
