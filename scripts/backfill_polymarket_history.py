#!/usr/bin/env python3
"""
Backfill historical price data from Polymarket CLOB API.

This script fetches real historical price data using Polymarket's
/prices-history endpoint.

Usage:
    python backfill_polymarket_history.py                    # Fetch max history
    python backfill_polymarket_history.py --interval 30d    # Last 30 days
    python backfill_polymarket_history.py --fidelity 60     # Hourly data points
    python backfill_polymarket_history.py --workers 8       # Use 8 parallel workers
"""

import argparse
import sys
import time
import logging
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from pathlib import Path
from threading import Lock
from typing import Dict, List, Optional, Tuple

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from scripts.storage import Storage
from api_clients import PolymarketClient

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger(__name__)

# Thread-safe stats
stats_lock = Lock()
stats = {
    'markets_processed': 0,
    'tokens_processed': 0,
    'data_points_fetched': 0,
    'data_points_inserted': 0,
    'errors': 0,
}


def process_token(
    market_id: str,
    contract_name: str,
    token_id: str,
    interval: str,
    fidelity: int,
    storage: Storage
) -> Tuple[int, int, int]:
    """
    Process a single token - fetch and store its historical data.

    Returns:
        Tuple of (data_points_fetched, data_points_inserted, errors)
    """
    client = PolymarketClient()
    fetched = 0
    inserted = 0
    errors = 0

    try:
        # Ensure contract exists in database
        storage.upsert_contract(
            source='Polymarket',
            market_id=market_id,
            contract_id=token_id,
            contract_name=contract_name
        )

        # Fetch historical data
        history = client.get_price_history(
            token_id=token_id,
            interval=interval,
            fidelity=fidelity
        )

        if not history:
            logger.warning(f"  No history for {contract_name[:40]}...")
            return (0, 0, 0)

        fetched = len(history)
        logger.info(f"  {contract_name[:40]}...: {fetched} data points")

        # Store each data point
        for point in history:
            timestamp = point.get('t')
            price = point.get('p')

            if timestamp and price is not None:
                # Convert Unix timestamp to ISO format
                dt = datetime.fromtimestamp(timestamp, tz=timezone.utc)
                snapshot_time = dt.isoformat()

                # Store as price snapshot
                try:
                    _, was_inserted = storage.upsert_price_snapshot(
                        source='Polymarket',
                        market_id=market_id,
                        contract_id=token_id,
                        snapshot_time=snapshot_time,
                        yes_price=float(price),
                        no_price=1.0 - float(price),
                    )
                    if was_inserted:
                        inserted += 1
                except Exception as e:
                    logger.debug(f"    Insert error: {e}")

    except Exception as e:
        errors = 1
        logger.error(f"  Error fetching {contract_name}: {e}")

    return (fetched, inserted, errors)


def backfill_polymarket_history(
    interval: str = "max",
    fidelity: int = 60,
    num_workers: int = 4
) -> Dict[str, int]:
    """
    Backfill historical price data from Polymarket.

    Args:
        interval: Time interval - "max", "1d", "1w", "30d", etc.
        fidelity: Data resolution in minutes
        num_workers: Number of parallel workers

    Returns:
        Dict with statistics about the backfill
    """
    storage = Storage()
    client = PolymarketClient()

    global stats
    stats = {
        'markets_processed': 0,
        'tokens_processed': 0,
        'data_points_fetched': 0,
        'data_points_inserted': 0,
        'errors': 0,
    }

    logger.info(f"Starting Polymarket historical backfill (interval={interval}, fidelity={fidelity}, workers={num_workers})")

    # Get all token IDs for political markets
    logger.info("Fetching token IDs for political markets...")
    token_map = client.get_all_token_ids()
    logger.info(f"Found {len(token_map)} markets with token IDs")

    # Flatten token map into a list of tasks
    tasks = []
    for market_id, tokens in token_map.items():
        for contract_name, token_id in tokens.items():
            tasks.append((market_id, contract_name, token_id))

    logger.info(f"Total tokens to process: {len(tasks)}")

    # Process tokens in parallel
    with ThreadPoolExecutor(max_workers=num_workers) as executor:
        futures = {
            executor.submit(
                process_token,
                market_id, contract_name, token_id,
                interval, fidelity, storage
            ): (market_id, contract_name)
            for market_id, contract_name, token_id in tasks
        }

        for future in as_completed(futures):
            market_id, contract_name = futures[future]
            try:
                fetched, inserted, errors = future.result()
                with stats_lock:
                    stats['tokens_processed'] += 1
                    stats['data_points_fetched'] += fetched
                    stats['data_points_inserted'] += inserted
                    stats['errors'] += errors
            except Exception as e:
                logger.error(f"Worker error for {contract_name}: {e}")
                with stats_lock:
                    stats['errors'] += 1

    # Count markets processed
    stats['markets_processed'] = len(token_map)

    logger.info(f"Backfill complete: {stats}")
    return stats


def main():
    parser = argparse.ArgumentParser(
        description='Backfill historical price data from Polymarket'
    )
    parser.add_argument(
        '--interval',
        default='max',
        help='Time interval: "max", "1d", "1w", "30d" (default: max)'
    )
    parser.add_argument(
        '--fidelity',
        type=int,
        default=60,
        help='Data resolution in minutes (default: 60)'
    )
    parser.add_argument(
        '--workers',
        type=int,
        default=4,
        help='Number of parallel workers (default: 4)'
    )

    args = parser.parse_args()

    result = backfill_polymarket_history(
        interval=args.interval,
        fidelity=args.fidelity,
        num_workers=args.workers
    )

    print(f"\nBackfill Summary:")
    print(f"  Markets processed: {result['markets_processed']}")
    print(f"  Tokens processed: {result['tokens_processed']}")
    print(f"  Data points fetched: {result['data_points_fetched']}")
    print(f"  Data points inserted: {result['data_points_inserted']}")
    print(f"  Errors: {result['errors']}")


if __name__ == "__main__":
    main()
