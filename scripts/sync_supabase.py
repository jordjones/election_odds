#!/usr/bin/env python3
"""
Sync election odds data to Supabase.

This script fetches current prices from prediction market APIs
and stores them in Supabase PostgreSQL.

Usage:
    python sync_supabase.py --source polymarket
    python sync_supabase.py --source kalshi
    python sync_supabase.py --source predictit
    python sync_supabase.py --all
"""

import argparse
import logging
import sys
from datetime import datetime, timezone
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from scripts.storage_supabase import SupabaseStorage
from api_clients import PolymarketClient, KalshiClient, PredictItClient

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger(__name__)


def sync_polymarket(storage: SupabaseStorage) -> dict:
    """Sync data from Polymarket."""
    client = PolymarketClient()
    stats = {'markets': 0, 'contracts': 0, 'snapshots': 0}

    logger.info("Fetching Polymarket political markets...")
    markets = client.get_political_markets()
    logger.info(f"Found {len(markets)} political markets")

    snapshot_time = datetime.now(timezone.utc).isoformat()

    for market in markets:
        try:
            # Upsert market
            storage.upsert_market(
                source='Polymarket',
                market_id=market.market_id,
                market_name=market.market_name,
                category=market.category,
                status=market.status.value if hasattr(market.status, 'value') else str(market.status),
                url=market.url,
                total_volume=market.total_volume,
            )
            stats['markets'] += 1

            # Upsert contracts and prices
            for contract in market.contracts:
                storage.upsert_contract(
                    source='Polymarket',
                    market_id=market.market_id,
                    contract_id=contract.contract_id,
                    contract_name=contract.contract_name,
                )
                stats['contracts'] += 1

                storage.upsert_price_snapshot(
                    source='Polymarket',
                    market_id=market.market_id,
                    contract_id=contract.contract_id,
                    snapshot_time=snapshot_time,
                    yes_price=contract.yes_price,
                    no_price=contract.no_price,
                    volume=contract.volume,
                )
                stats['snapshots'] += 1

        except Exception as e:
            logger.error(f"Error processing market {market.market_id}: {e}")

    return stats


def sync_kalshi(storage: SupabaseStorage) -> dict:
    """Sync data from Kalshi."""
    client = KalshiClient()
    stats = {'markets': 0, 'contracts': 0, 'snapshots': 0}

    logger.info("Fetching Kalshi political markets...")
    markets = client.get_political_markets()
    logger.info(f"Found {len(markets)} political markets")

    snapshot_time = datetime.now(timezone.utc).isoformat()

    for market in markets:
        try:
            storage.upsert_market(
                source='Kalshi',
                market_id=market.market_id,
                market_name=market.market_name,
                category=market.category,
                status=market.status.value if hasattr(market.status, 'value') else str(market.status),
                url=market.url,
                total_volume=market.total_volume,
            )
            stats['markets'] += 1

            for contract in market.contracts:
                storage.upsert_contract(
                    source='Kalshi',
                    market_id=market.market_id,
                    contract_id=contract.contract_id,
                    contract_name=contract.contract_name,
                )
                stats['contracts'] += 1

                storage.upsert_price_snapshot(
                    source='Kalshi',
                    market_id=market.market_id,
                    contract_id=contract.contract_id,
                    snapshot_time=snapshot_time,
                    yes_price=contract.yes_price,
                    no_price=contract.no_price,
                    yes_bid=contract.yes_bid,
                    yes_ask=contract.yes_ask,
                    volume=contract.volume,
                )
                stats['snapshots'] += 1

        except Exception as e:
            logger.error(f"Error processing market {market.market_id}: {e}")

    return stats


def sync_predictit(storage: SupabaseStorage) -> dict:
    """Sync data from PredictIt."""
    client = PredictItClient()
    stats = {'markets': 0, 'contracts': 0, 'snapshots': 0}

    logger.info("Fetching PredictIt political markets...")
    markets = client.get_political_markets()
    logger.info(f"Found {len(markets)} political markets")

    snapshot_time = datetime.now(timezone.utc).isoformat()

    for market in markets:
        try:
            storage.upsert_market(
                source='PredictIt',
                market_id=market.market_id,
                market_name=market.market_name,
                category=market.category,
                status=market.status.value if hasattr(market.status, 'value') else str(market.status),
                url=market.url,
                total_volume=market.total_volume,
            )
            stats['markets'] += 1

            for contract in market.contracts:
                storage.upsert_contract(
                    source='PredictIt',
                    market_id=market.market_id,
                    contract_id=contract.contract_id,
                    contract_name=contract.contract_name,
                )
                stats['contracts'] += 1

                storage.upsert_price_snapshot(
                    source='PredictIt',
                    market_id=market.market_id,
                    contract_id=contract.contract_id,
                    snapshot_time=snapshot_time,
                    yes_price=contract.yes_price,
                    no_price=contract.no_price,
                    yes_bid=contract.yes_bid,
                    yes_ask=contract.yes_ask,
                    volume=contract.volume,
                )
                stats['snapshots'] += 1

        except Exception as e:
            logger.error(f"Error processing market {market.market_id}: {e}")

    return stats


def main():
    parser = argparse.ArgumentParser(description='Sync election odds to Supabase')
    parser.add_argument('--source', choices=['polymarket', 'kalshi', 'predictit', 'all'],
                        default='all', help='Data source to sync')

    args = parser.parse_args()

    storage = SupabaseStorage()

    try:
        total_stats = {'markets': 0, 'contracts': 0, 'snapshots': 0}

        if args.source in ['polymarket', 'all']:
            stats = sync_polymarket(storage)
            logger.info(f"Polymarket: {stats}")
            for k, v in stats.items():
                total_stats[k] += v

        if args.source in ['kalshi', 'all']:
            stats = sync_kalshi(storage)
            logger.info(f"Kalshi: {stats}")
            for k, v in stats.items():
                total_stats[k] += v

        if args.source in ['predictit', 'all']:
            stats = sync_predictit(storage)
            logger.info(f"PredictIt: {stats}")
            for k, v in stats.items():
                total_stats[k] += v

        logger.info(f"Total: {total_stats}")

    finally:
        storage.close()


if __name__ == "__main__":
    main()
