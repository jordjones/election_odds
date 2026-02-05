#!/usr/bin/env python3
"""
Verification script for electionbettingodds.com backfill data.

Checks:
1. Data coverage by date
2. Candidate consistency
3. Gap detection
4. Data quality (null values, outliers)
"""

import argparse
import sys
from datetime import datetime, timedelta
from pathlib import Path
from typing import List, Dict

sys.path.insert(0, str(Path(__file__).parent.parent))

from scripts.storage import Storage

SOURCE_NAME = "electionbettingodds"


def check_date_coverage(storage: Storage, start_date: str, end_date: str) -> Dict:
    """Check which dates have data and identify gaps."""
    daily = storage.get_daily_counts(
        start_date=start_date,
        end_date=end_date,
        source=SOURCE_NAME
    )

    # Build set of dates with data
    dates_with_data = {row['date'] for row in daily}

    # Generate expected dates
    start = datetime.strptime(start_date, '%Y-%m-%d')
    end = datetime.strptime(end_date, '%Y-%m-%d')

    expected_dates = set()
    current = start
    while current <= end:
        expected_dates.add(current.strftime('%Y-%m-%d'))
        current += timedelta(days=1)

    missing_dates = expected_dates - dates_with_data
    extra_dates = dates_with_data - expected_dates

    return {
        'expected_days': len(expected_dates),
        'days_with_data': len(dates_with_data),
        'missing_dates': sorted(missing_dates),
        'extra_dates': sorted(extra_dates),
        'coverage_pct': len(dates_with_data) / len(expected_dates) * 100 if expected_dates else 0,
        'daily_counts': {row['date']: row['record_count'] for row in daily}
    }


def check_candidate_consistency(storage: Storage) -> Dict:
    """Check for candidate naming consistency and data quality."""
    with storage._get_connection() as conn:
        cursor = conn.cursor()

        # Get all contracts for this source
        cursor.execute("""
            SELECT c.contract_id, c.contract_name, COUNT(*) as snapshot_count
            FROM contracts c
            JOIN price_snapshots ps ON c.source = ps.source
                AND c.market_id = ps.market_id
                AND c.contract_id = ps.contract_id
            WHERE c.source = ?
            GROUP BY c.contract_id, c.contract_name
            ORDER BY snapshot_count DESC
        """, (SOURCE_NAME,))

        candidates = [dict(row) for row in cursor.fetchall()]

        # Check for potential duplicates (similar names)
        potential_dupes = []
        names = [c['contract_name'].lower() for c in candidates]
        for i, name1 in enumerate(names):
            for j, name2 in enumerate(names[i+1:], i+1):
                if name1 in name2 or name2 in name1:
                    potential_dupes.append((candidates[i]['contract_name'],
                                           candidates[j]['contract_name']))

        return {
            'total_candidates': len(candidates),
            'candidates': candidates[:20],  # Top 20
            'potential_duplicates': potential_dupes
        }


def check_data_quality(storage: Storage) -> Dict:
    """Check for data quality issues."""
    with storage._get_connection() as conn:
        cursor = conn.cursor()

        # Check for null prices
        cursor.execute("""
            SELECT COUNT(*) as count FROM price_snapshots
            WHERE source = ? AND yes_price IS NULL
        """, (SOURCE_NAME,))
        null_prices = cursor.fetchone()['count']

        # Check for outlier prices (should be between 0 and 1)
        cursor.execute("""
            SELECT COUNT(*) as count FROM price_snapshots
            WHERE source = ? AND (yes_price < 0 OR yes_price > 1)
        """, (SOURCE_NAME,))
        outlier_prices = cursor.fetchone()['count']

        # Check price distribution
        cursor.execute("""
            SELECT
                CASE
                    WHEN yes_price < 0.01 THEN '<1%'
                    WHEN yes_price < 0.05 THEN '1-5%'
                    WHEN yes_price < 0.10 THEN '5-10%'
                    WHEN yes_price < 0.25 THEN '10-25%'
                    WHEN yes_price < 0.50 THEN '25-50%'
                    ELSE '>50%'
                END as range,
                COUNT(*) as count
            FROM price_snapshots
            WHERE source = ?
            GROUP BY range
            ORDER BY range
        """, (SOURCE_NAME,))
        distribution = {row['range']: row['count'] for row in cursor.fetchall()}

        # Check timestamps
        cursor.execute("""
            SELECT MIN(snapshot_time) as earliest, MAX(snapshot_time) as latest
            FROM price_snapshots
            WHERE source = ?
        """, (SOURCE_NAME,))
        time_range = cursor.fetchone()

        return {
            'null_prices': null_prices,
            'outlier_prices': outlier_prices,
            'price_distribution': distribution,
            'earliest_snapshot': time_range['earliest'],
            'latest_snapshot': time_range['latest']
        }


def check_sync_checkpoints(storage: Storage) -> Dict:
    """Check sync checkpoint status."""
    completed = storage.get_completed_checkpoints(source=SOURCE_NAME)
    pending = storage.get_pending_checkpoints(source=SOURCE_NAME)

    return {
        'completed_checkpoints': len(completed),
        'pending_checkpoints': len(pending),
        'total_records_synced': sum(
            (cp.get('records_inserted', 0) or 0) + (cp.get('records_updated', 0) or 0)
            for cp in completed
        ),
        'failed_checkpoints': [
            {
                'window': f"{cp['window_start']} to {cp['window_end']}",
                'error': cp.get('error_message')
            }
            for cp in pending if cp['status'] == 'failed'
        ]
    }


def print_report(
    coverage: Dict,
    consistency: Dict,
    quality: Dict,
    checkpoints: Dict
):
    """Print verification report."""
    print("\n" + "=" * 70)
    print("ElectionBettingOdds Backfill Verification Report")
    print("=" * 70)

    print("\n## Date Coverage")
    print(f"  Expected days:    {coverage['expected_days']}")
    print(f"  Days with data:   {coverage['days_with_data']}")
    print(f"  Coverage:         {coverage['coverage_pct']:.1f}%")

    if coverage['missing_dates']:
        print(f"\n  Missing dates ({len(coverage['missing_dates'])}):")
        for date in coverage['missing_dates'][:10]:
            print(f"    - {date}")
        if len(coverage['missing_dates']) > 10:
            print(f"    ... and {len(coverage['missing_dates']) - 10} more")

    print("\n## Candidate Consistency")
    print(f"  Total candidates: {consistency['total_candidates']}")
    print("\n  Top candidates by snapshot count:")
    for c in consistency['candidates'][:10]:
        print(f"    - {c['contract_name']}: {c['snapshot_count']} snapshots")

    if consistency['potential_duplicates']:
        print(f"\n  Potential duplicates to review:")
        for dup in consistency['potential_duplicates'][:5]:
            print(f"    - {dup[0]} / {dup[1]}")

    print("\n## Data Quality")
    print(f"  Null prices:      {quality['null_prices']}")
    print(f"  Outlier prices:   {quality['outlier_prices']}")
    print(f"  Time range:       {quality['earliest_snapshot']} to {quality['latest_snapshot']}")
    print("\n  Price distribution:")
    for range_name, count in sorted(quality['price_distribution'].items()):
        print(f"    {range_name:>8}: {count:>6}")

    print("\n## Sync Checkpoints")
    print(f"  Completed:        {checkpoints['completed_checkpoints']}")
    print(f"  Pending/Failed:   {checkpoints['pending_checkpoints']}")
    print(f"  Total synced:     {checkpoints['total_records_synced']}")

    if checkpoints['failed_checkpoints']:
        print("\n  Failed checkpoints:")
        for cp in checkpoints['failed_checkpoints']:
            print(f"    - {cp['window']}: {cp['error']}")

    print("\n" + "=" * 70)

    # Summary verdict
    issues = []
    if coverage['coverage_pct'] < 90:
        issues.append(f"Low coverage ({coverage['coverage_pct']:.1f}%)")
    if quality['null_prices'] > 0:
        issues.append(f"{quality['null_prices']} null prices")
    if quality['outlier_prices'] > 0:
        issues.append(f"{quality['outlier_prices']} outlier prices")
    if checkpoints['pending_checkpoints'] > 0:
        issues.append(f"{checkpoints['pending_checkpoints']} pending checkpoints")

    if issues:
        print("\n⚠️  Issues found:")
        for issue in issues:
            print(f"    - {issue}")
    else:
        print("\n✅ All checks passed!")

    print("=" * 70 + "\n")


def main():
    parser = argparse.ArgumentParser(
        description='Verify electionbettingodds.com backfill data'
    )
    parser.add_argument('--from', dest='from_date',
                       help='Start date (YYYY-MM-DD)', default='2025-08-01')
    parser.add_argument('--to', dest='to_date',
                       help='End date (YYYY-MM-DD)',
                       default=datetime.now().strftime('%Y-%m-%d'))
    parser.add_argument('--db', type=str, default=None,
                       help='Database path (optional)')
    parser.add_argument('--json', action='store_true',
                       help='Output as JSON')

    args = parser.parse_args()

    storage = Storage(args.db)

    # Run checks
    coverage = check_date_coverage(storage, args.from_date, args.to_date)
    consistency = check_candidate_consistency(storage)
    quality = check_data_quality(storage)
    checkpoints = check_sync_checkpoints(storage)

    if args.json:
        import json
        print(json.dumps({
            'coverage': coverage,
            'consistency': consistency,
            'quality': quality,
            'checkpoints': checkpoints
        }, indent=2, default=str))
    else:
        print_report(coverage, consistency, quality, checkpoints)


if __name__ == '__main__':
    main()
