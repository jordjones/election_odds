#!/usr/bin/env python3
"""
Thin out non-site price_snapshots to twice-daily resolution.

For markets NOT in site_markets, keeps only the first and last snapshot
per day per (source, market_id, contract_id). All other snapshots are deleted.

Site market snapshots are never touched.
Markets and contracts tables are never touched.

Usage:
    python scripts/cleanup_supabase.py --dry-run
    python scripts/cleanup_supabase.py --execute
"""

import argparse
import logging
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

# Query to find non-site snapshots beyond the first per day.
# Keeps exactly 1 per (source, market_id, contract_id, date): the earliest.
THINNING_QUERY = """
WITH ranked AS (
    SELECT ps.id,
           ROW_NUMBER() OVER (
               PARTITION BY ps.source, ps.market_id, ps.contract_id,
                            (ps.snapshot_time AT TIME ZONE 'UTC')::date
               ORDER BY ps.snapshot_time ASC
           ) AS rn
    FROM price_snapshots ps
    WHERE NOT EXISTS (
        SELECT 1 FROM site_markets sm
        WHERE sm.source = ps.source AND sm.market_id = ps.market_id
          AND sm.is_active = true
    )
)
SELECT id FROM ranked WHERE rn > 1
"""


def preview_cleanup(storage):
    """Show how many non-site snapshots would be thinned."""
    with storage.conn.cursor() as cur:
        # Total non-site snapshots
        cur.execute("""
            SELECT COUNT(*) FROM price_snapshots ps
            WHERE NOT EXISTS (
                SELECT 1 FROM site_markets sm
                WHERE sm.source = ps.source AND sm.market_id = ps.market_id
                  AND sm.is_active = true
            )
        """)
        non_site_total = cur.fetchone()[0]

        # Non-site snapshots to delete (not first or last of day)
        cur.execute(f"SELECT COUNT(*) FROM ({THINNING_QUERY}) sub")
        to_delete = cur.fetchone()[0]

        to_keep = non_site_total - to_delete

        # Site market snapshots (untouched)
        cur.execute("""
            SELECT COUNT(*) FROM price_snapshots ps
            WHERE EXISTS (
                SELECT 1 FROM site_markets sm
                WHERE sm.source = ps.source AND sm.market_id = ps.market_id
                  AND sm.is_active = true
            )
        """)
        site_total = cur.fetchone()[0]

        cur.execute("SELECT COUNT(*) FROM price_snapshots")
        total = cur.fetchone()[0]

    logger.info("=== Cleanup Preview ===")
    logger.info(f"Total price_snapshots:     {total:,}")
    logger.info(f"  Site market snapshots:    {site_total:,} (untouched)")
    logger.info(f"  Non-site snapshots:       {non_site_total:,}")
    logger.info(f"    To delete (excess):     {to_delete:,}")
    logger.info(f"    To keep (1/day):        {to_keep:,}")
    logger.info(f"  Final total after cleanup: {total - to_delete:,}")

    return to_delete


def execute_cleanup(storage):
    """Delete excess non-site snapshots in batches."""
    storage.conn.autocommit = False

    try:
        with storage.conn.cursor() as cur:
            total_deleted = 0
            while True:
                cur.execute(f"""
                    DELETE FROM price_snapshots
                    WHERE id IN (
                        {THINNING_QUERY}
                        LIMIT 10000
                    )
                """)
                deleted = cur.rowcount
                storage.conn.commit()
                total_deleted += deleted
                if deleted > 0:
                    logger.info(f"  Deleted {total_deleted:,} snapshots so far...")
                if deleted < 10000:
                    break

            logger.info(f"  Total deleted: {total_deleted:,}")

    except Exception:
        storage.conn.rollback()
        raise
    finally:
        storage.conn.autocommit = True


def main():
    parser = argparse.ArgumentParser(
        description='Thin non-site price_snapshots to twice-daily resolution')
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument('--dry-run', action='store_true',
                       help='Show what would be deleted without making changes')
    group.add_argument('--execute', action='store_true',
                       help='Actually delete excess snapshots')

    args = parser.parse_args()

    storage = SupabaseStorage()

    try:
        # Check site_markets is populated
        with storage.conn.cursor() as cur:
            cur.execute("SELECT COUNT(*) FROM site_markets WHERE is_active = true")
            sm_count = cur.fetchone()[0]

        if sm_count == 0:
            logger.error("site_markets table is empty! Run populate_site_markets.py first.")
            sys.exit(1)

        logger.info(f"site_markets: {sm_count} active entries")

        to_delete = preview_cleanup(storage)

        if args.dry_run:
            logger.info("Dry run complete — no changes made. Use --execute to delete.")
            return

        if to_delete == 0:
            logger.info("Nothing to thin — non-site data is already at twice-daily resolution.")
            return

        logger.info(f"Thinning {to_delete:,} excess non-site snapshots...")
        execute_cleanup(storage)

        # Final count
        with storage.conn.cursor() as cur:
            cur.execute("SELECT COUNT(*) FROM price_snapshots")
            final = cur.fetchone()[0]
        logger.info(f"Final price_snapshots count: {final:,}")
        logger.info("Cleanup complete.")

    finally:
        storage.close()


if __name__ == "__main__":
    main()
