# Data Backfill: electionbettingodds.com

This document describes the backfill system for scraping historical odds data from electionbettingodds.com.

## Overview

[electionbettingodds.com](https://electionbettingodds.com) is an aggregator that combines odds from multiple prediction markets (Kalshi, Betfair, PredictIt, Smarkets, Polymarket) into a single view. The site provides:

- Aggregated odds for presidential and other elections
- Market-by-market breakdowns with bid/ask ranges
- Historical data accessible via date parameter
- Google Charts with time-series data

## Discovery Findings

Discovery was conducted on 2026-02-05 using `scripts/scrape_discover.py`. Key findings:

| Aspect | Finding |
|--------|---------|
| robots.txt | 404 (no restrictions) |
| Date parameter | `?date=YYYY-MM-DD` returns historical snapshots |
| Data format | HTML tables with embedded market data |
| Chart data | Google Charts `addRows` with time-series |
| Wayback Machine | 20+ archived snapshots available |

### Pages Available

- `/` - Home page with current featured odds
- `/President2028.html` - 2028 presidential election by candidate
- `/PresidentialParty2028.html` - 2028 by party
- `/DEMPrimary2028.html` - Democratic primary
- `/GOPPrimary2028.html` - Republican primary
- `/House-Control-2026.html` - House control
- `/Senate-Control-2026.html` - Senate control

### Data Structure

Each page contains:

1. **Last Updated Timestamp**: e.g., "Last updated: 12:35PM EST on Feb 01, 2026"
2. **Market Summary**: Title and total amount bet
3. **Candidate Table**: Image, odds percentage, change
4. **Market Tooltips**: Breakdown by source market with bid/ask ranges

Example candidate data structure:
```
Candidate: Vance
Odds: 24.5%
Change: -0.1%
Markets:
  - Kalshi: 26.0-27.0% (bid-ask), $5,952,889 bet
  - Betfair: 21.7-22.7%, $954,004 bet
  - PredictIt: 26.0-28.0%, $733,204 bet
  - Smarkets: 21.7-22.7%, $169,055 bet
```

## Scripts

### backfill_electionbettingodds.py

Main backfill script for historical data.

```bash
# Full backfill from August 2025 to present
python scripts/backfill_electionbettingodds.py \
    --from 2025-08-01 \
    --to 2026-02-05 \
    --concurrency 2

# Resume failed/pending checkpoints
python scripts/backfill_electionbettingodds.py --resume

# Check status
python scripts/backfill_electionbettingodds.py --status
```

**Options:**
- `--from`: Start date (YYYY-MM-DD), default: 2025-08-01
- `--to`: End date (YYYY-MM-DD), default: today
- `--concurrency`: Parallel requests (default: 2, respect rate limits)
- `--resume`: Resume pending/failed checkpoints
- `--status`: Show sync status
- `--db`: Custom database path

### verify_backfill_ebo.py

Verification script for data quality.

```bash
# Run verification
python scripts/verify_backfill_ebo.py --from 2025-08-01 --to 2026-02-05

# Output as JSON
python scripts/verify_backfill_ebo.py --json
```

**Checks performed:**
- Date coverage (missing days)
- Candidate consistency (duplicates)
- Data quality (null values, outliers)
- Checkpoint status

## Data Storage

Data is stored in the same SQLite database as API data:

```
data/election_odds.db
```

### Schema

Uses the existing `storage.py` schema with source = "electionbettingodds":

- **markets**: One row per market (president_2028, general, etc.)
- **contracts**: One row per candidate
- **price_snapshots**: One row per candidate per day
- **sync_checkpoints**: Tracks backfill progress

### Unique Keys

- Market: `(source, market_id)`
- Contract: `(source, market_id, contract_id)`
- Snapshot: `(source, market_id, contract_id, snapshot_time)`

## Rate Limiting

The scraper implements respectful rate limiting:

- 2-second delay between requests
- Max 2 concurrent requests
- 3 retries with exponential backoff
- Identifiable User-Agent

## Idempotency

All operations are idempotent using upsert logic:

1. Check if record exists by unique key
2. If exists: update with new data
3. If not: insert new record

Re-running the same backfill will update existing records without creating duplicates.

## Checkpoints

Progress is tracked via sync_checkpoints table:

| Status | Description |
|--------|-------------|
| pending | Created but not started |
| running | Currently processing |
| completed | Successfully finished |
| failed | Error occurred, can be resumed |

Resume with `--resume` flag to retry failed checkpoints.

## Logging

Logs are written to:
- Console (INFO level)
- `audit/backfill_electionbettingodds.log`

## Example Output

```
$ python scripts/backfill_electionbettingodds.py --status

============================================================
ElectionBettingOdds Backfill Status
============================================================

Total records: 12,543
By source: {'electionbettingodds': 5234, 'kalshi': 1555, ...}

Completed checkpoints: 3
  - 2025-08-01 to 2025-08-31: 542 inserted, 0 updated
  - 2025-09-01 to 2025-09-30: 513 inserted, 0 updated
  - 2025-10-01 to 2025-10-31: 558 inserted, 0 updated

Daily coverage: 93 days with data
  First: 2025-08-01 (18 records)
  Last:  2026-02-05 (18 records)
============================================================
```

## Fallback: Wayback Machine

If date parameter fails, the Wayback Machine can be used:

```python
# CDX API query
url = "https://web.archive.org/cdx/search/cdx"
params = {
    "url": "electionbettingodds.com",
    "output": "json",
    "from": "20250801",
    "to": "20260205"
}

# Access archived snapshot
snapshot_url = f"https://web.archive.org/web/{timestamp}/{original_url}"
```

See `audit/samples/wayback_cdx_sample.json` for available timestamps.

## Troubleshooting

### "No data for date X"

1. Check if date parameter works: `curl "https://electionbettingodds.com/?date=YYYY-MM-DD"`
2. Try Wayback Machine fallback
3. Some dates may genuinely have no data (weekends, holidays)

### "Parsing error"

1. Check HTML structure hasn't changed
2. Review `audit/samples/*.html` for expected format
3. Update parser regexes if needed

### "Rate limited"

1. Increase `RATE_LIMIT_DELAY`
2. Reduce `--concurrency` to 1
3. Wait and retry later

## Future Improvements

- [ ] Add Wayback Machine fallback for missing dates
- [ ] Extract Google Charts time-series data
- [ ] Support additional pages (primaries, control markets)
- [ ] Real-time monitoring with alerts
