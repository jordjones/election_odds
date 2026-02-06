#!/usr/bin/env python3
"""
Backfill historical price data from Polymarket CLOB API.

This script fetches real historical price data using Polymarket's
/prices-history endpoint.

Usage:
    python backfill_polymarket_history.py                    # Fetch max history
    python backfill_polymarket_history.py --interval 30d    # Last 30 days
    python backfill_polymarket_history.py --fidelity 60     # Hourly data points
"""

import argparse
import sys
import time
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Optional

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


def backfill_polymarket_history(
    interval: str = "max",
    fidelity: int = 60,
    rate_limit_delay: float = 0.5
) -> Dict[str, int]:
    """
    Backfill historical price data from Polymarket.

    Args:
        interval: Time interval - "max", "1d", "1w", "30d", etc.
        fidelity: Data resolution in minutes
        rate_limit_delay: Delay between API calls in seconds

    Returns:
        Dict with statistics about the backfill
    """
    storage = Storage()
    client = PolymarketClient()

    stats = {
        'markets_processed': 0,
        'tokens_processed': 0,
        'data_points_fetched': 0,
        'data_points_inserted': 0,
        'errors': 0,
    }

    logger.info(f"Starting Polymarket historical backfill (interval={interval}, fidelity={fidelity})")

    # Get all token IDs for political markets
    logger.info("Fetching token IDs for political markets...")
    token_map = client.get_all_token_ids()
    logger.info(f"Found {len(token_map)} markets with token IDs")

    for market_id, tokens in token_map.items():
        stats['markets_processed'] += 1
        logger.info(f"Processing market {market_id} ({len(tokens)} tokens)")

        for contract_name, token_id in tokens.items():
            stats['tokens_processed'] += 1

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
                    continue

                stats['data_points_fetched'] += len(history)
                logger.info(f"  {contract_name[:40]}...: {len(history)} data points")

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
                                stats['data_points_inserted'] += 1
                        except Exception as e:
                            logger.debug(f"    Insert error: {e}")

                # Rate limiting
                time.sleep(rate_limit_delay)

            except Exception as e:
                stats['errors'] += 1
                logger.error(f"  Error fetching {contract_name}: {e}")

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
        '--delay',
        type=float,
        default=0.5,
        help='Delay between API calls in seconds (default: 0.5)'
    )

    args = parser.parse_args()

    stats = backfill_polymarket_history(
        interval=args.interval,
        fidelity=args.fidelity,
        rate_limit_delay=args.delay
    )

    print(f"\nBackfill Summary:")
    print(f"  Markets processed: {stats['markets_processed']}")
    print(f"  Tokens processed: {stats['tokens_processed']}")
    print(f"  Data points fetched: {stats['data_points_fetched']}")
    print(f"  Data points inserted: {stats['data_points_inserted']}")
    print(f"  Errors: {stats['errors']}")


if __name__ == "__main__":
    main()
