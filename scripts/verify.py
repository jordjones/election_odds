#!/usr/bin/env python3
"""
Verification script for election odds data.

Compares record counts per day from stored database vs what the API returns.
Reports gaps and anomalies.

Usage:
    python verify.py --from 2025-08-01 --to 2026-02-05
    python verify.py --last-week
    python verify.py --gaps-only
"""

import argparse
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Dict, List, Optional
from collections import defaultdict

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from scripts.storage import Storage


def get_expected_sources() -> List[str]:
    """Get list of expected data sources."""
    return ['PredictIt', 'Kalshi', 'Polymarket', 'Smarkets']


def verify_date_range(storage: Storage, start_date: str, end_date: str,
                     show_details: bool = True) -> Dict:
    """Verify data coverage for a date range."""
    daily_counts = storage.get_daily_counts(start_date, end_date)

    # Organize by date
    by_date = defaultdict(dict)
    for row in daily_counts:
        by_date[row['date']][row['source']] = {
            'records': row['record_count'],
            'markets': row['market_count'],
            'contracts': row['contract_count']
        }

    # Generate expected date range
    start = datetime.strptime(start_date[:10], '%Y-%m-%d')
    end = datetime.strptime(end_date[:10], '%Y-%m-%d')
    expected_dates = []
    current = start
    while current <= end:
        expected_dates.append(current.strftime('%Y-%m-%d'))
        current += timedelta(days=1)

    expected_sources = get_expected_sources()

    # Analyze gaps
    gaps = []
    anomalies = []

    for date in expected_dates:
        if date not in by_date:
            gaps.append({'date': date, 'type': 'missing_day', 'sources': expected_sources})
        else:
            date_data = by_date[date]
            missing_sources = [s for s in expected_sources if s not in date_data]
            if missing_sources:
                gaps.append({'date': date, 'type': 'missing_sources', 'sources': missing_sources})

            # Check for anomalies (unusually low counts)
            for source, counts in date_data.items():
                if counts['records'] < 10:  # Suspiciously low
                    anomalies.append({
                        'date': date,
                        'source': source,
                        'type': 'low_count',
                        'records': counts['records']
                    })

    # Summary statistics
    total_records = sum(
        counts['records']
        for date_data in by_date.values()
        for counts in date_data.values()
    )

    result = {
        'start_date': start_date,
        'end_date': end_date,
        'expected_days': len(expected_dates),
        'days_with_data': len(by_date),
        'total_records': total_records,
        'gaps': gaps,
        'anomalies': anomalies,
        'by_date': dict(by_date) if show_details else None
    }

    return result


def print_verification_report(result: Dict, gaps_only: bool = False):
    """Print a formatted verification report."""
    print("\n" + "=" * 60)
    print("ELECTION ODDS DATA VERIFICATION REPORT")
    print("=" * 60)

    print(f"\nDate Range: {result['start_date']} to {result['end_date']}")
    print(f"Expected Days: {result['expected_days']}")
    print(f"Days with Data: {result['days_with_data']}")
    print(f"Total Records: {result['total_records']:,}")

    coverage_pct = (result['days_with_data'] / result['expected_days'] * 100) if result['expected_days'] > 0 else 0
    print(f"Coverage: {coverage_pct:.1f}%")

    # Gaps
    if result['gaps']:
        print(f"\n--- GAPS ({len(result['gaps'])}) ---")
        for gap in result['gaps'][:20]:
            if gap['type'] == 'missing_day':
                print(f"  {gap['date']}: MISSING (all sources)")
            else:
                print(f"  {gap['date']}: Missing sources: {', '.join(gap['sources'])}")
        if len(result['gaps']) > 20:
            print(f"  ... and {len(result['gaps']) - 20} more gaps")
    else:
        print("\n--- No gaps detected ---")

    # Anomalies
    if result['anomalies']:
        print(f"\n--- ANOMALIES ({len(result['anomalies'])}) ---")
        for anom in result['anomalies'][:10]:
            print(f"  {anom['date']} [{anom['source']}]: Only {anom['records']} records")
        if len(result['anomalies']) > 10:
            print(f"  ... and {len(result['anomalies']) - 10} more anomalies")
    else:
        print("\n--- No anomalies detected ---")

    # Daily breakdown (if not gaps_only)
    if not gaps_only and result.get('by_date'):
        print("\n--- DAILY BREAKDOWN ---")
        print(f"{'Date':<12} {'PredictIt':>12} {'Kalshi':>12} {'Polymarket':>12} {'Smarkets':>12}")
        print("-" * 64)

        sorted_dates = sorted(result['by_date'].keys())
        for date in sorted_dates[-30:]:  # Last 30 days
            row = result['by_date'][date]
            pi = row.get('PredictIt', {}).get('records', 0)
            ka = row.get('Kalshi', {}).get('records', 0)
            pm = row.get('Polymarket', {}).get('records', 0)
            sm = row.get('Smarkets', {}).get('records', 0)
            print(f"{date:<12} {pi:>12,} {ka:>12,} {pm:>12,} {sm:>12,}")

        if len(sorted_dates) > 30:
            print(f"... showing last 30 of {len(sorted_dates)} days")

    # Summary
    print("\n" + "=" * 60)
    if not result['gaps'] and not result['anomalies']:
        print("STATUS: PASS - Data appears complete")
    elif result['gaps']:
        print(f"STATUS: FAIL - {len(result['gaps'])} gaps detected")
    else:
        print(f"STATUS: WARN - {len(result['anomalies'])} anomalies detected")
    print("=" * 60)


def verify_sync_checkpoints(storage: Storage) -> Dict:
    """Verify sync checkpoint integrity."""
    stats = storage.get_stats()
    pending = storage.get_pending_checkpoints()
    completed = storage.get_completed_checkpoints()

    return {
        'total_checkpoints': sum(stats.get('checkpoints_by_status', {}).values()),
        'completed': stats.get('checkpoints_by_status', {}).get('completed', 0),
        'pending': stats.get('checkpoints_by_status', {}).get('pending', 0),
        'failed': stats.get('checkpoints_by_status', {}).get('failed', 0),
        'running': stats.get('checkpoints_by_status', {}).get('running', 0),
        'pending_details': pending[:5],
        'last_completed': completed[0] if completed else None
    }


def print_checkpoint_report(result: Dict):
    """Print checkpoint verification report."""
    print("\n--- SYNC CHECKPOINTS ---")
    print(f"Total: {result['total_checkpoints']}")
    print(f"Completed: {result['completed']}")
    print(f"Pending: {result['pending']}")
    print(f"Failed: {result['failed']}")
    print(f"Running: {result['running']}")

    if result['last_completed']:
        lc = result['last_completed']
        print(f"\nLast Completed: {lc['source']} @ {lc['window_end']}")

    if result['pending_details']:
        print("\nPending/Failed Checkpoints:")
        for cp in result['pending_details']:
            print(f"  [{cp['source']}] {cp['window_start'][:10]} - {cp['window_end'][:10]}: {cp['status']}")


def main():
    parser = argparse.ArgumentParser(description='Verify election odds data coverage')
    parser.add_argument('--from', dest='from_date', type=str,
                       help='Start date (YYYY-MM-DD)')
    parser.add_argument('--to', dest='to_date', type=str,
                       help='End date (YYYY-MM-DD)')
    parser.add_argument('--last-week', action='store_true',
                       help='Verify last 7 days')
    parser.add_argument('--last-month', action='store_true',
                       help='Verify last 30 days')
    parser.add_argument('--gaps-only', action='store_true',
                       help='Only show gaps, not daily breakdown')
    parser.add_argument('--checkpoints', action='store_true',
                       help='Also verify sync checkpoints')
    parser.add_argument('--db', type=str,
                       help='Database path (default: data/election_odds.db)')

    args = parser.parse_args()

    # Initialize storage
    storage = Storage(args.db)

    # Determine date range
    if args.last_week:
        end_date = datetime.now().strftime('%Y-%m-%d')
        start_date = (datetime.now() - timedelta(days=7)).strftime('%Y-%m-%d')
    elif args.last_month:
        end_date = datetime.now().strftime('%Y-%m-%d')
        start_date = (datetime.now() - timedelta(days=30)).strftime('%Y-%m-%d')
    else:
        start_date = args.from_date or '2025-08-01'
        end_date = args.to_date or datetime.now().strftime('%Y-%m-%d')

    # Run verification
    result = verify_date_range(storage, start_date, end_date, show_details=not args.gaps_only)
    print_verification_report(result, gaps_only=args.gaps_only)

    # Checkpoint verification
    if args.checkpoints:
        checkpoint_result = verify_sync_checkpoints(storage)
        print_checkpoint_report(checkpoint_result)

    # Exit code
    if result['gaps']:
        sys.exit(1)
    sys.exit(0)


if __name__ == '__main__':
    main()
