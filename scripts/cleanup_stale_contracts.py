#!/usr/bin/env python3
"""
Remove stale duplicate contracts from the database.

When Polymarket reassigns contract IDs (common on negRisk events),
old contracts remain in the DB. This script identifies orphaned
contracts that no longer appear in the API and removes them along
with their price snapshots.

Usage:
    python scripts/cleanup_stale_contracts.py --dry-run
    python scripts/cleanup_stale_contracts.py --execute
"""

import argparse
import logging
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from scripts.storage_supabase import SupabaseStorage
from api_clients import PolymarketClient

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger(__name__)


def get_current_api_contract_ids() -> dict[str, set[str]]:
    """Fetch all current contract IDs from Polymarket's API, keyed by market_id."""
    client = PolymarketClient()
    markets = client.get_political_markets()

    api_contracts = {}
    for market in markets:
        contract_ids = {c.contract_id for c in market.contracts}
        api_contracts[market.market_id] = contract_ids

    return api_contracts


def find_stale_contracts(storage: SupabaseStorage, api_contracts: dict[str, set[str]]) -> list[tuple]:
    """Find DB contracts that no longer exist in the API response."""
    stale = []

    with storage.conn.cursor() as cur:
        # Get all Polymarket contracts from the DB
        cur.execute("""
            SELECT c.source, c.market_id, c.contract_id, c.contract_name,
                   (SELECT MAX(snapshot_time) FROM price_snapshots ps
                    WHERE ps.source = c.source AND ps.market_id = c.market_id
                    AND ps.contract_id = c.contract_id) as latest_snapshot,
                   (SELECT COUNT(*) FROM price_snapshots ps
                    WHERE ps.source = c.source AND ps.market_id = c.market_id
                    AND ps.contract_id = c.contract_id) as snapshot_count
            FROM contracts c
            WHERE c.source = 'Polymarket'
            ORDER BY c.market_id, c.contract_id
        """)

        for row in cur.fetchall():
            source, market_id, contract_id, contract_name, latest_snapshot, snapshot_count = row

            # If this market_id exists in the API but this contract_id doesn't, it's stale
            if market_id in api_contracts and contract_id not in api_contracts[market_id]:
                stale.append((source, market_id, contract_id, contract_name, latest_snapshot, snapshot_count))

    return stale


def delete_stale_contracts(storage: SupabaseStorage, stale: list[tuple], dry_run: bool = True):
    """Delete stale contracts and their snapshots."""
    if not stale:
        logger.info("No stale contracts found")
        return

    total_snapshots = sum(row[5] for row in stale)
    logger.info(f"Found {len(stale)} stale contracts with {total_snapshots} total snapshots")

    # Group by market for readable output
    by_market = {}
    for source, market_id, contract_id, contract_name, latest_snapshot, snapshot_count in stale:
        by_market.setdefault(market_id, []).append(
            (contract_id, contract_name, latest_snapshot, snapshot_count)
        )

    for market_id, contracts in sorted(by_market.items()):
        logger.info(f"  Market {market_id}: {len(contracts)} stale contracts")
        for contract_id, name, latest, count in contracts:
            logger.info(f"    {contract_id}: {name[:60]} (last: {str(latest)[:16]}, {count} snapshots)")

    if dry_run:
        logger.info(f"DRY RUN: Would delete {len(stale)} contracts and {total_snapshots} snapshots")
        return

    # Delete snapshots first (foreign key), then contracts
    deleted_snapshots = 0
    deleted_contracts = 0

    with storage.conn.cursor() as cur:
        for source, market_id, contract_id, _, _, _ in stale:
            cur.execute("""
                DELETE FROM price_snapshots
                WHERE source = %s AND market_id = %s AND contract_id = %s
            """, (source, market_id, contract_id))
            deleted_snapshots += cur.rowcount

            cur.execute("""
                DELETE FROM contracts
                WHERE source = %s AND market_id = %s AND contract_id = %s
            """, (source, market_id, contract_id))
            deleted_contracts += cur.rowcount

    logger.info(f"Deleted {deleted_contracts} contracts and {deleted_snapshots} snapshots")


def main():
    parser = argparse.ArgumentParser(description='Clean up stale duplicate contracts')
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument('--dry-run', action='store_true', help='Show what would be deleted')
    group.add_argument('--execute', action='store_true', help='Actually delete stale contracts')

    args = parser.parse_args()

    logger.info("Fetching current contract IDs from Polymarket API...")
    api_contracts = get_current_api_contract_ids()
    total_api = sum(len(v) for v in api_contracts.values())
    logger.info(f"Found {total_api} contracts across {len(api_contracts)} markets from API")

    storage = SupabaseStorage()
    try:
        logger.info("Finding stale contracts in database...")
        stale = find_stale_contracts(storage, api_contracts)
        delete_stale_contracts(storage, stale, dry_run=not args.execute)
    finally:
        storage.close()


if __name__ == "__main__":
    main()
