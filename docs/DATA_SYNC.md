# Data Sync Documentation

This document explains how the election odds data synchronization system works.

## Overview

The data sync system fetches prediction market data from multiple sources (PredictIt, Kalshi, Polymarket, Smarkets) and stores it in a local SQLite database for historical tracking and analysis.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Prediction Market APIs                        │
│   PredictIt │ Kalshi │ Polymarket │ Smarkets │ (Betfair)        │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                    API Clients (Python)                          │
│   - Rate limiting (Kalshi: 10 req/s, others: 1 req/s)           │
│   - Pagination support (cursor/offset based)                     │
│   - Price normalization (cents → decimal, basis points, etc.)   │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Storage Layer (SQLite)                        │
│   - markets: Market metadata                                     │
│   - contracts: Contract/outcome metadata                         │
│   - price_snapshots: Time-series price data                     │
│   - sync_checkpoints: Resumable sync tracking                   │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Next.js API Routes                            │
│   /api/markets, /api/charts, etc.                               │
│   (reads from SQLite instead of mock data)                      │
└─────────────────────────────────────────────────────────────────┘
```

## Database Schema

### Tables

**markets**
- `source` + `market_id` = unique key
- Stores market metadata (name, category, status, volume)

**contracts**
- `source` + `market_id` + `contract_id` = unique key
- Stores contract/outcome metadata

**price_snapshots**
- `source` + `market_id` + `contract_id` + `snapshot_time` = unique key
- Time-series price data (yes_price, no_price, bid, ask, volume)
- Enables historical charting

**sync_checkpoints**
- Tracks sync progress for resumability
- `source` + `sync_type` + `window_start` + `window_end` = unique key
- Status: pending, running, completed, failed

## Scripts

### Backfill (`scripts/backfill.py`)

Fetches historical data for a date range with resumable checkpoints.

```bash
# Full backfill from 2025-08-01 to today
python scripts/backfill.py --from 2025-08-01 --to 2026-02-05 --window 7d --concurrency 2

# Resume interrupted backfill
python scripts/backfill.py --resume

# Check backfill status
python scripts/backfill.py --status

# Backfill specific sources only
python scripts/backfill.py --from 2025-08-01 --sources PredictIt Kalshi
```

**Options:**
- `--from DATE`: Start date (YYYY-MM-DD), default: 2025-08-01
- `--to DATE`: End date (YYYY-MM-DD), default: today
- `--window SIZE`: Window size (7d, 1d, 12h), default: 7d
- `--concurrency N`: Parallel fetch threads, default: 2
- `--sources LIST`: Specific sources to backfill
- `--resume`: Resume pending/failed checkpoints
- `--status`: Show current backfill status
- `--db PATH`: Custom database path

### Incremental Sync (`scripts/sync.py`)

Fetches data since the last successful sync (with 15-minute buffer).

```bash
# Sync since last successful sync
python scripts/sync.py

# Sync since specific date
python scripts/sync.py --since 2026-02-01

# Full sync (all current data)
python scripts/sync.py --full

# Check sync status
python scripts/sync.py --status
```

**Options:**
- `--since DATE`: Sync since date (YYYY-MM-DD or ISO format)
- `--sources LIST`: Specific sources to sync
- `--full`: Full sync ignoring last sync time
- `--concurrency N`: Parallel sync threads, default: 4
- `--status`: Show current sync status

### Verification (`scripts/verify.py`)

Checks data coverage and reports gaps/anomalies.

```bash
# Verify full date range
python scripts/verify.py --from 2025-08-01 --to 2026-02-05

# Verify last week
python scripts/verify.py --last-week

# Show only gaps (no daily breakdown)
python scripts/verify.py --gaps-only

# Include checkpoint verification
python scripts/verify.py --checkpoints
```

## Idempotent Upserts

All data operations use idempotent upserts to ensure:
1. **No duplicates**: Same record inserted twice = no change
2. **Updates work**: Re-fetching updates existing records
3. **Resumable**: Interrupted syncs can resume without data corruption

Unique keys:
- Markets: `(source, market_id)`
- Contracts: `(source, market_id, contract_id)`
- Price Snapshots: `(source, market_id, contract_id, snapshot_time)`

## Sync Checkpoints

Checkpoints enable:
1. **Resume**: Failed backfills resume where they left off
2. **Tracking**: Know exactly what's been synced
3. **Debugging**: See which windows failed and why

Checkpoint statuses:
- `pending`: Created, not yet started
- `running`: Currently being processed
- `completed`: Successfully finished
- `failed`: Error occurred (see error_message)

## Instrumentation

### Logging

All scripts log:
- Request parameters (date range, cursor/page)
- Per-window counts (fetched, inserted, updated, deduped)
- Errors with stack traces (verbose mode)

### Sample Responses

Raw API responses are saved to `/audit/api_samples/` for debugging:
```
audit/api_samples/
├── PredictIt_markets_2025-08-01.json
├── Kalshi_events_2025-08-01.json
├── Polymarket_sync_20260205_123456.json
└── ...
```

## Typical Workflow

### Initial Setup

```bash
# 1. Run backfill for historical data
python scripts/backfill.py --from 2025-08-01 --to 2026-02-05 --window 7d

# 2. Verify data coverage
python scripts/verify.py --from 2025-08-01 --to 2026-02-05

# 3. Resume if any gaps
python scripts/backfill.py --resume
```

### Ongoing Sync

```bash
# Run periodically (e.g., every 5 minutes via cron)
python scripts/sync.py

# Or manually after outage
python scripts/sync.py --since 2026-02-04
```

### Cron Setup

```cron
# Sync every 5 minutes
*/5 * * * * cd /path/to/election_odds && python scripts/sync.py >> logs/sync.log 2>&1

# Verify daily
0 6 * * * cd /path/to/election_odds && python scripts/verify.py --last-week >> logs/verify.log 2>&1
```

## Data Sources

| Source | Rate Limit | Pagination | Notes |
|--------|------------|------------|-------|
| PredictIt | ~1 req/s | None (all data) | Returns all markets in one call |
| Kalshi | 10 req/s | Cursor-based | 100 events per page |
| Polymarket | ~100 req/min | Offset-based | 100 events per page |
| Smarkets | ~1 req/s | None | Hierarchical: events → markets |
| Betfair | 12 req/s | Yes | Requires authentication |

## Troubleshooting

### Common Issues

1. **"Rate limited" errors**
   - Reduce `--concurrency` to 1
   - Check if API is down

2. **"No data for source X"**
   - Check if source API is accessible
   - Verify API credentials (Betfair)
   - Check `/audit/api_samples/` for raw responses

3. **"Checkpoints stuck in running"**
   - Process may have crashed
   - Run `python scripts/backfill.py --resume`

4. **"Gaps in data"**
   - Run `python scripts/verify.py --gaps-only`
   - Re-run backfill for specific date range

### Debug Mode

```bash
# Enable verbose logging
python scripts/backfill.py --verbose --from 2025-08-01 --to 2025-08-07
```

## Database Location

Default: `data/election_odds.db`

Override with `--db` flag:
```bash
python scripts/sync.py --db /custom/path/data.db
```
