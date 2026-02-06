"""
Supabase/PostgreSQL storage adapter for election odds data.

This module provides the same interface as storage.py but uses
PostgreSQL (Supabase) instead of SQLite.
"""

import os
import logging
from datetime import datetime
from typing import Optional, Tuple, List, Dict, Any

import psycopg2
from psycopg2.extras import execute_values

logger = logging.getLogger(__name__)


class SupabaseStorage:
    """PostgreSQL storage adapter for Supabase."""

    def __init__(self, database_url: Optional[str] = None):
        """Initialize connection to Supabase PostgreSQL."""
        self.database_url = database_url or os.environ.get('DATABASE_URL')
        if not self.database_url:
            raise ValueError("DATABASE_URL environment variable required")

        self._conn = None

    @property
    def conn(self):
        """Lazy connection initialization."""
        if self._conn is None or self._conn.closed:
            self._conn = psycopg2.connect(self.database_url)
            self._conn.autocommit = True
        return self._conn

    def close(self):
        """Close the database connection."""
        if self._conn and not self._conn.closed:
            self._conn.close()

    def upsert_market(
        self,
        source: str,
        market_id: str,
        market_name: str,
        category: Optional[str] = None,
        status: Optional[str] = None,
        url: Optional[str] = None,
        total_volume: Optional[float] = None,
        end_date: Optional[str] = None,
    ) -> Tuple[int, bool]:
        """Insert or update a market record."""
        with self.conn.cursor() as cur:
            cur.execute("""
                INSERT INTO markets (source, market_id, market_name, category, status, url, total_volume, end_date, updated_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, NOW())
                ON CONFLICT (source, market_id) DO UPDATE SET
                    market_name = EXCLUDED.market_name,
                    category = EXCLUDED.category,
                    status = EXCLUDED.status,
                    url = EXCLUDED.url,
                    total_volume = EXCLUDED.total_volume,
                    end_date = EXCLUDED.end_date,
                    updated_at = NOW()
                RETURNING id, (xmax = 0) as inserted
            """, (source, market_id, market_name, category, status, url, total_volume, end_date))
            row = cur.fetchone()
            return row[0], row[1]

    def upsert_contract(
        self,
        source: str,
        market_id: str,
        contract_id: str,
        contract_name: str,
        short_name: Optional[str] = None,
    ) -> Tuple[int, bool]:
        """Insert or update a contract record."""
        with self.conn.cursor() as cur:
            cur.execute("""
                INSERT INTO contracts (source, market_id, contract_id, contract_name, short_name, updated_at)
                VALUES (%s, %s, %s, %s, %s, NOW())
                ON CONFLICT (source, market_id, contract_id) DO UPDATE SET
                    contract_name = EXCLUDED.contract_name,
                    short_name = EXCLUDED.short_name,
                    updated_at = NOW()
                RETURNING id, (xmax = 0) as inserted
            """, (source, market_id, contract_id, contract_name, short_name))
            row = cur.fetchone()
            return row[0], row[1]

    def upsert_price_snapshot(
        self,
        source: str,
        market_id: str,
        contract_id: str,
        snapshot_time: str,
        yes_price: Optional[float] = None,
        no_price: Optional[float] = None,
        yes_bid: Optional[float] = None,
        yes_ask: Optional[float] = None,
        no_bid: Optional[float] = None,
        no_ask: Optional[float] = None,
        volume: Optional[float] = None,
    ) -> Tuple[int, bool]:
        """Insert or update a price snapshot."""
        with self.conn.cursor() as cur:
            cur.execute("""
                INSERT INTO price_snapshots (source, market_id, contract_id, snapshot_time, yes_price, no_price, yes_bid, yes_ask, no_bid, no_ask, volume)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (source, market_id, contract_id, snapshot_time) DO UPDATE SET
                    yes_price = EXCLUDED.yes_price,
                    no_price = EXCLUDED.no_price,
                    yes_bid = EXCLUDED.yes_bid,
                    yes_ask = EXCLUDED.yes_ask,
                    no_bid = EXCLUDED.no_bid,
                    no_ask = EXCLUDED.no_ask,
                    volume = EXCLUDED.volume
                RETURNING id, (xmax = 0) as inserted
            """, (source, market_id, contract_id, snapshot_time, yes_price, no_price, yes_bid, yes_ask, no_bid, no_ask, volume))
            row = cur.fetchone()
            return row[0], row[1]

    def bulk_upsert_price_snapshots(self, snapshots: List[Dict[str, Any]]) -> int:
        """Bulk insert price snapshots for better performance."""
        if not snapshots:
            return 0

        with self.conn.cursor() as cur:
            # Prepare data
            values = [
                (
                    s['source'], s['market_id'], s['contract_id'], s['snapshot_time'],
                    s.get('yes_price'), s.get('no_price'), s.get('yes_bid'),
                    s.get('yes_ask'), s.get('no_bid'), s.get('no_ask'), s.get('volume')
                )
                for s in snapshots
            ]

            execute_values(cur, """
                INSERT INTO price_snapshots (source, market_id, contract_id, snapshot_time, yes_price, no_price, yes_bid, yes_ask, no_bid, no_ask, volume)
                VALUES %s
                ON CONFLICT (source, market_id, contract_id, snapshot_time) DO UPDATE SET
                    yes_price = EXCLUDED.yes_price,
                    no_price = EXCLUDED.no_price,
                    volume = EXCLUDED.volume
            """, values)

            return len(values)

    def get_latest_snapshot_time(self, source: str) -> Optional[str]:
        """Get the most recent snapshot time for a source."""
        with self.conn.cursor() as cur:
            cur.execute("""
                SELECT MAX(snapshot_time) FROM price_snapshots WHERE source = %s
            """, (source,))
            row = cur.fetchone()
            return row[0] if row else None

    def get_stats(self) -> Dict[str, Any]:
        """Get database statistics."""
        with self.conn.cursor() as cur:
            stats = {}

            cur.execute("SELECT COUNT(*) FROM markets")
            stats['markets'] = cur.fetchone()[0]

            cur.execute("SELECT COUNT(*) FROM contracts")
            stats['contracts'] = cur.fetchone()[0]

            cur.execute("SELECT COUNT(*) FROM price_snapshots")
            stats['price_snapshots'] = cur.fetchone()[0]

            cur.execute("""
                SELECT source, COUNT(*) as count
                FROM price_snapshots
                GROUP BY source
            """)
            stats['by_source'] = {row[0]: row[1] for row in cur.fetchall()}

            return stats
