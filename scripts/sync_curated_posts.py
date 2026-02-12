#!/usr/bin/env python3
"""
Sync curated posts from CSV to Supabase.

Reads data/curated-posts.csv and upserts editorial fields into the
curated_posts table. Does NOT touch enriched fields (tweet_text, likes, etc.)
— those are only written by enrich_tweets.py.

Usage:
    python scripts/sync_curated_posts.py
    python scripts/sync_curated_posts.py --dry-run
    python scripts/sync_curated_posts.py --csv path/to/file.csv
"""

import argparse
import csv
import logging
import os
import sys

import psycopg2

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S',
)
logger = logging.getLogger(__name__)

DEFAULT_CSV = os.path.join(os.path.dirname(__file__), '..', 'data', 'curated-posts.csv')

UPSERT_SQL = """
    INSERT INTO curated_posts (tweet_id, candidate_name, topic, posted_at, editor_note, updated_at)
    VALUES (%s, %s, %s, %s, %s, NOW())
    ON CONFLICT (tweet_id) DO UPDATE SET
        candidate_name = EXCLUDED.candidate_name,
        topic = EXCLUDED.topic,
        posted_at = EXCLUDED.posted_at,
        editor_note = EXCLUDED.editor_note,
        updated_at = NOW()
    RETURNING (xmax = 0) as inserted
"""


def read_csv(csv_path: str) -> list[dict]:
    """Read curated posts from CSV file."""
    with open(csv_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        rows = list(reader)
    logger.info(f"Read {len(rows)} rows from {csv_path}")
    return rows


def sync(csv_path: str, database_url: str, dry_run: bool = False):
    """Sync CSV rows to Supabase curated_posts table."""
    rows = read_csv(csv_path)

    if dry_run:
        logger.info(f"[DRY RUN] Would upsert {len(rows)} rows")
        for row in rows[:5]:
            logger.info(f"  {row['tweet_id']} | {row['candidate_name']} | {row['topic']}")
        if len(rows) > 5:
            logger.info(f"  ... and {len(rows) - 5} more")
        return

    conn = psycopg2.connect(database_url)
    conn.autocommit = True

    inserted = 0
    updated = 0

    try:
        with conn.cursor() as cur:
            for row in rows:
                cur.execute(UPSERT_SQL, (
                    row['tweet_id'],
                    row['candidate_name'],
                    row['topic'],
                    row['posted_at'],
                    row.get('editor_note') or None,
                ))
                result = cur.fetchone()
                if result[0]:
                    inserted += 1
                else:
                    updated += 1

        logger.info(f"Done: {inserted} inserted, {updated} updated, {len(rows)} total")
    finally:
        conn.close()


def main():
    parser = argparse.ArgumentParser(description='Sync curated posts CSV to Supabase')
    parser.add_argument('--csv', default=DEFAULT_CSV, help='Path to CSV file')
    parser.add_argument('--dry-run', action='store_true', help='Preview without writing')
    args = parser.parse_args()

    database_url = os.environ.get('DATABASE_URL')
    if not database_url and not args.dry_run:
        logger.error("DATABASE_URL environment variable required")
        sys.exit(1)

    sync(args.csv, database_url, dry_run=args.dry_run)


if __name__ == '__main__':
    main()
