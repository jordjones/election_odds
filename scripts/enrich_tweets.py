#!/usr/bin/env python3
"""
Enrich curated posts with X API v2 tweet metadata.

Fetches tweet text and public metrics (likes, retweets, replies, views)
for un-enriched or stale posts in the curated_posts table.

Usage:
    python scripts/enrich_tweets.py                  # enrich un-enriched only
    python scripts/enrich_tweets.py --stale-hours 24 # also re-enrich stale
    python scripts/enrich_tweets.py --force           # re-enrich all
"""

import argparse
import logging
import os
import sys
import time

import psycopg2
import requests

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S',
)
logger = logging.getLogger(__name__)

X_API_URL = 'https://api.twitter.com/2/tweets'
BATCH_SIZE = 100  # X API max per request
BATCH_DELAY = 2   # seconds between batches


def get_tweet_ids(database_url: str, stale_hours: int = 0, force: bool = False) -> list[str]:
    """Fetch tweet IDs that need enrichment."""
    conn = psycopg2.connect(database_url)
    conn.autocommit = True

    try:
        with conn.cursor() as cur:
            if force:
                cur.execute("SELECT tweet_id FROM curated_posts ORDER BY posted_at")
            elif stale_hours > 0:
                cur.execute("""
                    SELECT tweet_id FROM curated_posts
                    WHERE enriched_at IS NULL
                       OR enriched_at < NOW() - INTERVAL '%s hours'
                    ORDER BY posted_at
                """, (stale_hours,))
            else:
                cur.execute("""
                    SELECT tweet_id FROM curated_posts
                    WHERE enriched_at IS NULL
                    ORDER BY posted_at
                """)
            return [row[0] for row in cur.fetchall()]
    finally:
        conn.close()


def fetch_tweets(tweet_ids: list[str], bearer_token: str) -> dict:
    """Fetch tweet data from X API v2. Returns {tweet_id: data}."""
    results = {}
    errors = []

    for i in range(0, len(tweet_ids), BATCH_SIZE):
        batch = tweet_ids[i:i + BATCH_SIZE]
        batch_num = i // BATCH_SIZE + 1
        total_batches = (len(tweet_ids) + BATCH_SIZE - 1) // BATCH_SIZE
        logger.info(f"Fetching batch {batch_num}/{total_batches} ({len(batch)} tweets)")

        resp = requests.get(
            X_API_URL,
            params={
                'ids': ','.join(batch),
                'tweet.fields': 'text,public_metrics,created_at',
            },
            headers={'Authorization': f'Bearer {bearer_token}'},
        )

        if resp.status_code == 429:
            retry_after = int(resp.headers.get('retry-after', 60))
            logger.warning(f"Rate limited, waiting {retry_after}s")
            time.sleep(retry_after)
            # Retry this batch
            resp = requests.get(
                X_API_URL,
                params={
                    'ids': ','.join(batch),
                    'tweet.fields': 'text,public_metrics,created_at',
                },
                headers={'Authorization': f'Bearer {bearer_token}'},
            )

        if resp.status_code != 200:
            logger.error(f"X API error: {resp.status_code} {resp.text}")
            continue

        data = resp.json()

        # Process successful tweets
        for tweet in data.get('data', []):
            results[tweet['id']] = tweet

        # Log errors (deleted/suspended tweets)
        for err in data.get('errors', []):
            tweet_id = err.get('resource_id', err.get('value', 'unknown'))
            logger.warning(f"Tweet {tweet_id}: {err.get('detail', err.get('title', 'unknown error'))}")
            errors.append(tweet_id)

        # Rate limit pause between batches
        if i + BATCH_SIZE < len(tweet_ids):
            time.sleep(BATCH_DELAY)

    logger.info(f"Fetched {len(results)} tweets, {len(errors)} errors")
    return results


def update_enrichment(database_url: str, tweets: dict):
    """Update curated_posts with enriched data."""
    conn = psycopg2.connect(database_url)
    conn.autocommit = True

    updated = 0
    try:
        with conn.cursor() as cur:
            for tweet_id, tweet in tweets.items():
                metrics = tweet.get('public_metrics', {})
                cur.execute("""
                    UPDATE curated_posts SET
                        tweet_text = %s,
                        likes = %s,
                        retweets = %s,
                        replies = %s,
                        views = %s,
                        enriched_at = NOW(),
                        updated_at = NOW()
                    WHERE tweet_id = %s
                """, (
                    tweet.get('text'),
                    metrics.get('like_count'),
                    metrics.get('retweet_count'),
                    metrics.get('reply_count'),
                    metrics.get('impression_count'),
                    tweet_id,
                ))
                updated += 1

        logger.info(f"Updated {updated} rows in curated_posts")
    finally:
        conn.close()


def main():
    parser = argparse.ArgumentParser(description='Enrich curated posts with X API v2 data')
    parser.add_argument('--stale-hours', type=int, default=0,
                        help='Re-enrich posts older than N hours')
    parser.add_argument('--force', action='store_true',
                        help='Re-enrich all posts')
    args = parser.parse_args()

    database_url = os.environ.get('DATABASE_URL')
    if not database_url:
        logger.error("DATABASE_URL environment variable required")
        sys.exit(1)

    bearer_token = os.environ.get('X_BEARER_TOKEN')
    if not bearer_token:
        logger.error("X_BEARER_TOKEN environment variable required")
        sys.exit(1)

    tweet_ids = get_tweet_ids(database_url, stale_hours=args.stale_hours, force=args.force)
    logger.info(f"Found {len(tweet_ids)} tweets to enrich")

    if not tweet_ids:
        logger.info("Nothing to enrich")
        return

    tweets = fetch_tweets(tweet_ids, bearer_token)
    if tweets:
        update_enrichment(database_url, tweets)
    else:
        logger.warning("No tweet data fetched — nothing to update")


if __name__ == '__main__':
    main()
