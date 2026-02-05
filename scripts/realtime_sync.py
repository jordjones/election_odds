#!/usr/bin/env python3
"""
Real-time sync script for accumulating fine-grained price data.

Run this script continuously to poll prediction market APIs and store
snapshots at regular intervals for fine-grained charting.

Usage:
    python realtime_sync.py                    # Run once
    python realtime_sync.py --continuous       # Run every 5 minutes
    python realtime_sync.py --interval 300     # Custom interval (seconds)
    python realtime_sync.py --status           # Show data coverage

Recommended: Run with cron or systemd for production:
    */5 * * * * cd /path/to/project && python scripts/realtime_sync.py
"""

import argparse
import asyncio
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
import logging

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from scripts.storage import Storage

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Import API clients
try:
    from api_clients.kalshi import KalshiClient
    from api_clients.predictit import PredictItClient
    from api_clients.polymarket import PolymarketClient
    from api_clients.smarkets import SmarketsClient
except ImportError as e:
    logger.error(f"Failed to import API clients: {e}")
    sys.exit(1)

# Presidential market identifiers for each source
PRESIDENTIAL_MARKETS = {
    'kalshi': {
        'series': 'PRES',  # Presidential series
        'market_pattern': '2028',
    },
    'predictit': {
        'market_id': 7456,  # 2028 Presidential winner
    },
    'polymarket': {
        'slug': 'presidential-election-winner-2028',
    },
}


async def sync_kalshi(storage: Storage) -> int:
    """Sync Kalshi presidential markets."""
    try:
        client = KalshiClient()
        snapshot_time = datetime.now(timezone.utc).isoformat()
        count = 0

        # Get presidential events
        events, _ = client.get_events(series_ticker='PRES', status='open')

        for event in events:
            if '2028' not in event.get('title', ''):
                continue

            markets = event.get('markets', [])
            for market in markets:
                market_id = f"kalshi_{market.get('ticker', 'unknown')}"

                # Upsert market
                storage.upsert_market(
                    source='Kalshi',
                    market_id=market_id,
                    market_name=market.get('title', ''),
                    category='presidential',
                    status='open',
                    url=f"https://kalshi.com/markets/{market.get('ticker')}"
                )

                # Get market details with prices
                yes_price = market.get('yes_price', market.get('last_price'))
                no_price = market.get('no_price', 1 - yes_price if yes_price else None)

                if yes_price is not None:
                    contract_id = market.get('ticker', 'unknown').lower()

                    storage.upsert_contract(
                        source='Kalshi',
                        market_id=market_id,
                        contract_id=contract_id,
                        contract_name=market.get('title', contract_id),
                    )

                    storage.upsert_price_snapshot(
                        source='Kalshi',
                        market_id=market_id,
                        contract_id=contract_id,
                        snapshot_time=snapshot_time,
                        yes_price=yes_price / 100 if yes_price > 1 else yes_price,
                        no_price=no_price / 100 if no_price and no_price > 1 else no_price,
                        volume=market.get('volume'),
                    )
                    count += 1

        logger.info(f"Kalshi: synced {count} contracts")
        return count

    except Exception as e:
        logger.error(f"Kalshi sync failed: {e}")
        return 0


async def sync_predictit(storage: Storage) -> int:
    """Sync PredictIt presidential markets."""
    try:
        client = PredictItClient()
        snapshot_time = datetime.now(timezone.utc).isoformat()
        count = 0

        # Get all markets and filter for presidential
        markets = client.get_markets()

        for market in markets:
            name = market.get('name', '').lower()
            if '2028' not in name or 'president' not in name:
                continue

            market_id = f"predictit_{market.get('id')}"

            storage.upsert_market(
                source='PredictIt',
                market_id=market_id,
                market_name=market.get('name', ''),
                category='presidential',
                status='open',
                url=market.get('url', '')
            )

            contracts = market.get('contracts', [])
            for contract in contracts:
                contract_id = str(contract.get('id', 'unknown')).lower()

                storage.upsert_contract(
                    source='PredictIt',
                    market_id=market_id,
                    contract_id=contract_id,
                    contract_name=contract.get('name', ''),
                    short_name=contract.get('shortName', '')
                )

                yes_price = contract.get('lastTradePrice') or contract.get('bestBuyYesCost')
                if yes_price is not None:
                    storage.upsert_price_snapshot(
                        source='PredictIt',
                        market_id=market_id,
                        contract_id=contract_id,
                        snapshot_time=snapshot_time,
                        yes_price=yes_price,
                        yes_bid=contract.get('bestBuyYesCost'),
                        yes_ask=contract.get('bestSellYesCost'),
                    )
                    count += 1

        logger.info(f"PredictIt: synced {count} contracts")
        return count

    except Exception as e:
        logger.error(f"PredictIt sync failed: {e}")
        return 0


async def sync_polymarket(storage: Storage) -> int:
    """Sync Polymarket presidential markets."""
    try:
        client = PolymarketClient()
        snapshot_time = datetime.now(timezone.utc).isoformat()
        count = 0

        # Get markets
        markets = client.get_markets(limit=100)

        for market in markets:
            name = market.get('question', '').lower()
            if '2028' not in name or 'president' not in name:
                continue

            market_id = f"polymarket_{market.get('id', 'unknown')}"

            storage.upsert_market(
                source='Polymarket',
                market_id=market_id,
                market_name=market.get('question', ''),
                category='presidential',
                status='open',
                url=f"https://polymarket.com/market/{market.get('slug', '')}"
            )

            # Polymarket tokens are the contracts
            tokens = market.get('tokens', [])
            for token in tokens:
                contract_id = token.get('token_id', 'unknown')

                storage.upsert_contract(
                    source='Polymarket',
                    market_id=market_id,
                    contract_id=contract_id,
                    contract_name=token.get('outcome', ''),
                )

                price = token.get('price')
                if price is not None:
                    storage.upsert_price_snapshot(
                        source='Polymarket',
                        market_id=market_id,
                        contract_id=contract_id,
                        snapshot_time=snapshot_time,
                        yes_price=float(price),
                    )
                    count += 1

        logger.info(f"Polymarket: synced {count} contracts")
        return count

    except Exception as e:
        logger.error(f"Polymarket sync failed: {e}")
        return 0


async def sync_all(storage: Storage) -> dict:
    """Sync all sources."""
    stats = {
        'kalshi': 0,
        'predictit': 0,
        'polymarket': 0,
        'total': 0,
        'timestamp': datetime.now(timezone.utc).isoformat()
    }

    # Run syncs (could parallelize, but being respectful to APIs)
    stats['kalshi'] = await sync_kalshi(storage)
    stats['predictit'] = await sync_predictit(storage)
    stats['polymarket'] = await sync_polymarket(storage)

    stats['total'] = stats['kalshi'] + stats['predictit'] + stats['polymarket']

    return stats


def show_status(storage: Storage):
    """Show current data coverage."""
    print("\n" + "=" * 60)
    print("Real-time Sync Data Coverage")
    print("=" * 60)

    with storage._get_connection() as conn:
        cursor = conn.cursor()

        # Get data density per source for recent data
        cursor.execute("""
            SELECT
                source,
                COUNT(*) as total_snapshots,
                COUNT(DISTINCT SUBSTR(snapshot_time, 1, 16)) as unique_timestamps,
                MIN(snapshot_time) as earliest,
                MAX(snapshot_time) as latest
            FROM price_snapshots
            WHERE snapshot_time >= datetime('now', '-1 day')
            GROUP BY source
            ORDER BY source
        """)

        print("\nLast 24 hours:")
        for row in cursor.fetchall():
            print(f"  {row['source']:20} | {row['unique_timestamps']:>5} timestamps | {row['total_snapshots']:>6} records")

        # Get hourly breakdown for today
        cursor.execute("""
            SELECT
                SUBSTR(snapshot_time, 1, 13) as hour,
                COUNT(DISTINCT source) as sources,
                COUNT(*) as records
            FROM price_snapshots
            WHERE snapshot_time >= datetime('now', '-12 hours')
            GROUP BY hour
            ORDER BY hour DESC
            LIMIT 12
        """)

        print("\nLast 12 hours (hourly):")
        for row in cursor.fetchall():
            print(f"  {row['hour']} | {row['sources']} sources | {row['records']} records")

    print("=" * 60 + "\n")


async def run_continuous(storage: Storage, interval: int):
    """Run sync continuously at specified interval."""
    logger.info(f"Starting continuous sync (interval: {interval}s)")

    while True:
        try:
            stats = await sync_all(storage)
            logger.info(f"Sync complete: {stats['total']} records at {stats['timestamp']}")
        except Exception as e:
            logger.error(f"Sync cycle failed: {e}")

        await asyncio.sleep(interval)


def main():
    parser = argparse.ArgumentParser(
        description='Real-time sync for fine-grained price data'
    )
    parser.add_argument('--continuous', action='store_true',
                       help='Run continuously')
    parser.add_argument('--interval', type=int, default=300,
                       help='Sync interval in seconds (default: 300 = 5 min)')
    parser.add_argument('--status', action='store_true',
                       help='Show data coverage status')
    parser.add_argument('--db', type=str, default=None,
                       help='Database path')

    args = parser.parse_args()

    storage = Storage(args.db)

    if args.status:
        show_status(storage)
        return

    if args.continuous:
        asyncio.run(run_continuous(storage, args.interval))
    else:
        stats = asyncio.run(sync_all(storage))
        print(f"\nSync complete: {stats}")
        show_status(storage)


if __name__ == '__main__':
    main()
