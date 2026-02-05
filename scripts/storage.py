"""
Storage layer for election odds data using SQLite.
Provides idempotent upsert operations using provider record IDs as unique keys.
"""

import sqlite3
import json
import os
from datetime import datetime, timezone
from typing import List, Dict, Optional, Tuple
from pathlib import Path
from contextlib import contextmanager

# Default database path
DEFAULT_DB_PATH = Path(__file__).parent.parent / "data" / "election_odds.db"


class Storage:
    """SQLite storage with idempotent upsert support."""

    def __init__(self, db_path: Optional[str] = None):
        self.db_path = Path(db_path) if db_path else DEFAULT_DB_PATH
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self._init_schema()

    @contextmanager
    def _get_connection(self):
        """Context manager for database connections."""
        conn = sqlite3.connect(str(self.db_path))
        conn.row_factory = sqlite3.Row
        try:
            yield conn
            conn.commit()
        except Exception:
            conn.rollback()
            raise
        finally:
            conn.close()

    def _init_schema(self):
        """Initialize database schema."""
        with self._get_connection() as conn:
            cursor = conn.cursor()

            # Markets table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS markets (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    source TEXT NOT NULL,
                    market_id TEXT NOT NULL,
                    market_name TEXT NOT NULL,
                    category TEXT,
                    status TEXT,
                    url TEXT,
                    total_volume REAL,
                    end_date TEXT,
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(source, market_id)
                )
            """)

            # Contracts table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS contracts (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    source TEXT NOT NULL,
                    market_id TEXT NOT NULL,
                    contract_id TEXT NOT NULL,
                    contract_name TEXT NOT NULL,
                    short_name TEXT,
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(source, market_id, contract_id)
                )
            """)

            # Price snapshots table (time-series data)
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS price_snapshots (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    source TEXT NOT NULL,
                    market_id TEXT NOT NULL,
                    contract_id TEXT NOT NULL,
                    snapshot_time TEXT NOT NULL,
                    yes_price REAL,
                    no_price REAL,
                    yes_bid REAL,
                    yes_ask REAL,
                    volume REAL,
                    raw_data TEXT,
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(source, market_id, contract_id, snapshot_time)
                )
            """)

            # Sync checkpoints table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS sync_checkpoints (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    source TEXT NOT NULL,
                    sync_type TEXT NOT NULL,
                    window_start TEXT NOT NULL,
                    window_end TEXT NOT NULL,
                    status TEXT NOT NULL,
                    records_fetched INTEGER DEFAULT 0,
                    records_inserted INTEGER DEFAULT 0,
                    records_updated INTEGER DEFAULT 0,
                    records_deduped INTEGER DEFAULT 0,
                    error_message TEXT,
                    started_at TEXT,
                    completed_at TEXT,
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(source, sync_type, window_start, window_end)
                )
            """)

            # Create indexes for faster queries
            cursor.execute("""
                CREATE INDEX IF NOT EXISTS idx_price_snapshots_time
                ON price_snapshots(snapshot_time)
            """)
            cursor.execute("""
                CREATE INDEX IF NOT EXISTS idx_price_snapshots_source_market
                ON price_snapshots(source, market_id)
            """)
            cursor.execute("""
                CREATE INDEX IF NOT EXISTS idx_sync_checkpoints_source
                ON sync_checkpoints(source, sync_type, status)
            """)

    def upsert_market(self, source: str, market_id: str, market_name: str,
                      category: str = None, status: str = None, url: str = None,
                      total_volume: float = None, end_date: str = None) -> Tuple[int, bool]:
        """
        Upsert a market record. Returns (row_id, was_inserted).
        """
        now = datetime.now(timezone.utc).isoformat()
        with self._get_connection() as conn:
            cursor = conn.cursor()

            # Check if exists
            cursor.execute(
                "SELECT id FROM markets WHERE source = ? AND market_id = ?",
                (source, market_id)
            )
            existing = cursor.fetchone()

            if existing:
                cursor.execute("""
                    UPDATE markets SET
                        market_name = ?, category = ?, status = ?, url = ?,
                        total_volume = ?, end_date = ?, updated_at = ?
                    WHERE source = ? AND market_id = ?
                """, (market_name, category, status, url, total_volume, end_date, now,
                      source, market_id))
                return existing['id'], False
            else:
                cursor.execute("""
                    INSERT INTO markets (source, market_id, market_name, category, status,
                                        url, total_volume, end_date, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (source, market_id, market_name, category, status, url,
                      total_volume, end_date, now, now))
                return cursor.lastrowid, True

    def upsert_contract(self, source: str, market_id: str, contract_id: str,
                        contract_name: str, short_name: str = None) -> Tuple[int, bool]:
        """
        Upsert a contract record. Returns (row_id, was_inserted).
        """
        now = datetime.now(timezone.utc).isoformat()
        with self._get_connection() as conn:
            cursor = conn.cursor()

            cursor.execute(
                "SELECT id FROM contracts WHERE source = ? AND market_id = ? AND contract_id = ?",
                (source, market_id, contract_id)
            )
            existing = cursor.fetchone()

            if existing:
                cursor.execute("""
                    UPDATE contracts SET
                        contract_name = ?, short_name = ?, updated_at = ?
                    WHERE source = ? AND market_id = ? AND contract_id = ?
                """, (contract_name, short_name, now, source, market_id, contract_id))
                return existing['id'], False
            else:
                cursor.execute("""
                    INSERT INTO contracts (source, market_id, contract_id, contract_name,
                                          short_name, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                """, (source, market_id, contract_id, contract_name, short_name, now, now))
                return cursor.lastrowid, True

    def upsert_price_snapshot(self, source: str, market_id: str, contract_id: str,
                              snapshot_time: str, yes_price: float = None,
                              no_price: float = None, yes_bid: float = None,
                              yes_ask: float = None, volume: float = None,
                              raw_data: dict = None) -> Tuple[int, bool]:
        """
        Upsert a price snapshot. Returns (row_id, was_inserted).
        Uses (source, market_id, contract_id, snapshot_time) as unique key.
        """
        raw_json = json.dumps(raw_data) if raw_data else None

        with self._get_connection() as conn:
            cursor = conn.cursor()

            cursor.execute("""
                SELECT id FROM price_snapshots
                WHERE source = ? AND market_id = ? AND contract_id = ? AND snapshot_time = ?
            """, (source, market_id, contract_id, snapshot_time))
            existing = cursor.fetchone()

            if existing:
                cursor.execute("""
                    UPDATE price_snapshots SET
                        yes_price = ?, no_price = ?, yes_bid = ?, yes_ask = ?,
                        volume = ?, raw_data = ?
                    WHERE source = ? AND market_id = ? AND contract_id = ? AND snapshot_time = ?
                """, (yes_price, no_price, yes_bid, yes_ask, volume, raw_json,
                      source, market_id, contract_id, snapshot_time))
                return existing['id'], False
            else:
                cursor.execute("""
                    INSERT INTO price_snapshots (source, market_id, contract_id, snapshot_time,
                                                yes_price, no_price, yes_bid, yes_ask,
                                                volume, raw_data, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (source, market_id, contract_id, snapshot_time, yes_price, no_price,
                      yes_bid, yes_ask, volume, raw_json, datetime.now(timezone.utc).isoformat()))
                return cursor.lastrowid, True

    def create_sync_checkpoint(self, source: str, sync_type: str,
                               window_start: str, window_end: str) -> int:
        """Create a new sync checkpoint. Returns checkpoint ID."""
        now = datetime.now(timezone.utc).isoformat()
        with self._get_connection() as conn:
            cursor = conn.cursor()

            # Check if checkpoint already exists
            cursor.execute("""
                SELECT id, status FROM sync_checkpoints
                WHERE source = ? AND sync_type = ? AND window_start = ? AND window_end = ?
            """, (source, sync_type, window_start, window_end))
            existing = cursor.fetchone()

            if existing:
                if existing['status'] == 'completed':
                    return existing['id']  # Already done
                # Reset for retry
                cursor.execute("""
                    UPDATE sync_checkpoints SET
                        status = 'pending', started_at = NULL, completed_at = NULL,
                        records_fetched = 0, records_inserted = 0,
                        records_updated = 0, records_deduped = 0, error_message = NULL
                    WHERE id = ?
                """, (existing['id'],))
                return existing['id']

            cursor.execute("""
                INSERT INTO sync_checkpoints (source, sync_type, window_start, window_end,
                                             status, created_at)
                VALUES (?, ?, ?, ?, 'pending', ?)
            """, (source, sync_type, window_start, window_end, now))
            return cursor.lastrowid

    def update_sync_checkpoint(self, checkpoint_id: int, status: str = None,
                               records_fetched: int = None, records_inserted: int = None,
                               records_updated: int = None, records_deduped: int = None,
                               error_message: str = None):
        """Update a sync checkpoint with progress/status."""
        now = datetime.now(timezone.utc).isoformat()
        with self._get_connection() as conn:
            cursor = conn.cursor()

            updates = []
            params = []

            if status:
                updates.append("status = ?")
                params.append(status)
                if status == 'running':
                    updates.append("started_at = ?")
                    params.append(now)
                elif status in ('completed', 'failed'):
                    updates.append("completed_at = ?")
                    params.append(now)

            if records_fetched is not None:
                updates.append("records_fetched = ?")
                params.append(records_fetched)
            if records_inserted is not None:
                updates.append("records_inserted = ?")
                params.append(records_inserted)
            if records_updated is not None:
                updates.append("records_updated = ?")
                params.append(records_updated)
            if records_deduped is not None:
                updates.append("records_deduped = ?")
                params.append(records_deduped)
            if error_message is not None:
                updates.append("error_message = ?")
                params.append(error_message)

            if updates:
                params.append(checkpoint_id)
                cursor.execute(
                    f"UPDATE sync_checkpoints SET {', '.join(updates)} WHERE id = ?",
                    params
                )

    def get_pending_checkpoints(self, source: str = None, sync_type: str = None) -> List[dict]:
        """Get pending or failed checkpoints for resume."""
        with self._get_connection() as conn:
            cursor = conn.cursor()

            query = """
                SELECT * FROM sync_checkpoints
                WHERE status IN ('pending', 'failed', 'running')
            """
            params = []

            if source:
                query += " AND source = ?"
                params.append(source)
            if sync_type:
                query += " AND sync_type = ?"
                params.append(sync_type)

            query += " ORDER BY window_start ASC"

            cursor.execute(query, params)
            return [dict(row) for row in cursor.fetchall()]

    def get_completed_checkpoints(self, source: str = None,
                                  sync_type: str = None) -> List[dict]:
        """Get completed checkpoints."""
        with self._get_connection() as conn:
            cursor = conn.cursor()

            query = "SELECT * FROM sync_checkpoints WHERE status = 'completed'"
            params = []

            if source:
                query += " AND source = ?"
                params.append(source)
            if sync_type:
                query += " AND sync_type = ?"
                params.append(sync_type)

            query += " ORDER BY window_end DESC"

            cursor.execute(query, params)
            return [dict(row) for row in cursor.fetchall()]

    def get_last_sync_time(self, source: str = None) -> Optional[str]:
        """Get the last successful sync end time."""
        with self._get_connection() as conn:
            cursor = conn.cursor()

            if source:
                cursor.execute("""
                    SELECT MAX(window_end) as last_sync FROM sync_checkpoints
                    WHERE status = 'completed' AND source = ?
                """, (source,))
            else:
                cursor.execute("""
                    SELECT MAX(window_end) as last_sync FROM sync_checkpoints
                    WHERE status = 'completed'
                """)

            row = cursor.fetchone()
            return row['last_sync'] if row else None

    def get_price_history(self, source: str = None, market_id: str = None,
                          contract_id: str = None, start_date: str = None,
                          end_date: str = None, limit: int = 1000) -> List[dict]:
        """Get price history with optional filters."""
        with self._get_connection() as conn:
            cursor = conn.cursor()

            query = "SELECT * FROM price_snapshots WHERE 1=1"
            params = []

            if source:
                query += " AND source = ?"
                params.append(source)
            if market_id:
                query += " AND market_id = ?"
                params.append(market_id)
            if contract_id:
                query += " AND contract_id = ?"
                params.append(contract_id)
            if start_date:
                query += " AND snapshot_time >= ?"
                params.append(start_date)
            if end_date:
                query += " AND snapshot_time <= ?"
                params.append(end_date)

            query += " ORDER BY snapshot_time DESC LIMIT ?"
            params.append(limit)

            cursor.execute(query, params)
            return [dict(row) for row in cursor.fetchall()]

    def get_daily_counts(self, start_date: str, end_date: str,
                         source: str = None) -> List[dict]:
        """Get record counts per day for verification."""
        with self._get_connection() as conn:
            cursor = conn.cursor()

            # Use SUBSTR to extract date part from ISO timestamp (handles timezone offset)
            query = """
                SELECT
                    SUBSTR(snapshot_time, 1, 10) as date,
                    source,
                    COUNT(*) as record_count,
                    COUNT(DISTINCT market_id) as market_count,
                    COUNT(DISTINCT contract_id) as contract_count
                FROM price_snapshots
                WHERE SUBSTR(snapshot_time, 1, 10) >= ? AND SUBSTR(snapshot_time, 1, 10) <= ?
            """
            # Extract just the date part (YYYY-MM-DD) from input params
            params = [start_date[:10], end_date[:10]]

            if source:
                query += " AND source = ?"
                params.append(source)

            query += " GROUP BY SUBSTR(snapshot_time, 1, 10), source ORDER BY date, source"

            cursor.execute(query, params)
            return [dict(row) for row in cursor.fetchall()]

    def get_stats(self) -> dict:
        """Get overall database statistics."""
        with self._get_connection() as conn:
            cursor = conn.cursor()

            stats = {}

            cursor.execute("SELECT COUNT(*) as count FROM markets")
            stats['total_markets'] = cursor.fetchone()['count']

            cursor.execute("SELECT COUNT(*) as count FROM contracts")
            stats['total_contracts'] = cursor.fetchone()['count']

            cursor.execute("SELECT COUNT(*) as count FROM price_snapshots")
            stats['total_snapshots'] = cursor.fetchone()['count']

            cursor.execute("""
                SELECT MIN(snapshot_time) as earliest, MAX(snapshot_time) as latest
                FROM price_snapshots
            """)
            row = cursor.fetchone()
            stats['earliest_snapshot'] = row['earliest']
            stats['latest_snapshot'] = row['latest']

            cursor.execute("""
                SELECT source, COUNT(*) as count FROM price_snapshots GROUP BY source
            """)
            stats['snapshots_by_source'] = {row['source']: row['count'] for row in cursor.fetchall()}

            cursor.execute("""
                SELECT status, COUNT(*) as count FROM sync_checkpoints GROUP BY status
            """)
            stats['checkpoints_by_status'] = {row['status']: row['count'] for row in cursor.fetchall()}

            return stats


if __name__ == "__main__":
    # Test the storage
    storage = Storage()
    print("Database initialized at:", storage.db_path)
    print("Stats:", storage.get_stats())
