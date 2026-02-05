#!/usr/bin/env python3
"""
Unified Prediction Market Aggregator

Fetches odds from multiple prediction markets in parallel,
normalizes the data, detects arbitrage opportunities, and exports results.

Usage:
    python aggregator.py [--output-dir ./output] [--format csv,json]
"""

import argparse
import asyncio
import json
import os
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime
from typing import List, Dict, Any, Optional, Tuple
from dataclasses import dataclass

import pandas as pd

from api_clients import (
    PredictItClient,
    KalshiClient,
    PolymarketClient,
    SmarketsClient,
    BetfairClient,
    MarketData,
    ContractData,
)


@dataclass
class AggregatedMarket:
    """Cross-platform market data for arbitrage detection."""
    canonical_name: str  # Normalized market name
    sources: Dict[str, MarketData]  # source_name -> MarketData
    best_yes_price: float
    best_no_price: float
    best_yes_source: str
    best_no_source: str
    arbitrage_spread: float  # Positive = arbitrage opportunity
    total_volume: float


class MarketAggregator:
    """Aggregates market data from multiple prediction market platforms."""

    def __init__(self, include_betfair: bool = False):
        """
        Initialize the aggregator.

        Args:
            include_betfair: Whether to include Betfair (requires auth)
        """
        self.clients = {
            'PredictIt': PredictItClient(),
            'Kalshi': KalshiClient(),
            'Polymarket': PolymarketClient(),
            'Smarkets': SmarketsClient(),
        }

        if include_betfair:
            betfair = BetfairClient()
            if betfair.is_configured():
                self.clients['Betfair'] = betfair
            else:
                print("[Warning] Betfair not configured - skipping")

        self.results: Dict[str, List[MarketData]] = {}
        self.errors: Dict[str, str] = {}

    def fetch_all(self, max_workers: int = 4) -> Dict[str, List[MarketData]]:
        """
        Fetch markets from all platforms in parallel.

        Args:
            max_workers: Maximum concurrent API calls

        Returns:
            Dictionary of source_name -> list of MarketData
        """
        print("Fetching markets from all platforms...")
        self.results = {}
        self.errors = {}

        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            futures = {
                executor.submit(self._fetch_from_source, name, client): name
                for name, client in self.clients.items()
            }

            for future in as_completed(futures):
                source_name = futures[future]
                try:
                    markets = future.result()
                    self.results[source_name] = markets
                    print(f"  {source_name}: {len(markets)} markets")
                except Exception as e:
                    self.errors[source_name] = str(e)
                    print(f"  {source_name}: ERROR - {e}")

        return self.results

    def _fetch_from_source(self, name: str, client) -> List[MarketData]:
        """Fetch markets from a single source."""
        try:
            return client.get_political_markets()
        except Exception as e:
            raise Exception(f"Failed to fetch from {name}: {e}")

    def to_dataframe(self) -> pd.DataFrame:
        """
        Convert all results to a flat DataFrame.

        Returns:
            DataFrame with columns:
                source, market_id, market_name, contract_id, contract_name,
                yes_price, no_price, yes_bid, yes_ask, volume, last_updated
        """
        rows = []

        for source_name, markets in self.results.items():
            for market in markets:
                for contract in market.contracts:
                    rows.append({
                        'source': source_name,
                        'market_id': market.market_id,
                        'market_name': market.market_name,
                        'contract_id': contract.contract_id,
                        'contract_name': contract.contract_name,
                        'yes_price': contract.yes_price,
                        'no_price': contract.no_price,
                        'yes_bid': contract.yes_bid,
                        'yes_ask': contract.yes_ask,
                        'volume': contract.volume,
                        'market_volume': market.total_volume,
                        'status': market.status.value,
                        'url': market.url,
                        'last_updated': datetime.now().isoformat(),
                    })

        return pd.DataFrame(rows)

    def to_json(self) -> List[Dict]:
        """Convert all results to JSON-serializable format."""
        output = []

        for source_name, markets in self.results.items():
            for market in markets:
                output.append(market.to_dict())

        return output

    def find_matching_markets(self) -> List[AggregatedMarket]:
        """
        Find markets that exist across multiple platforms.

        Uses fuzzy matching on market/contract names to identify
        the same event across different sources.
        """
        # Build index of normalized names
        name_index: Dict[str, List[Tuple[str, MarketData, ContractData]]] = {}

        for source_name, markets in self.results.items():
            for market in markets:
                for contract in market.contracts:
                    # Normalize the name
                    normalized = self._normalize_name(
                        f"{market.market_name} {contract.contract_name}"
                    )

                    if normalized not in name_index:
                        name_index[normalized] = []
                    name_index[normalized].append((source_name, market, contract))

        # Find matches (same normalized name, different sources)
        aggregated = []

        for normalized_name, entries in name_index.items():
            sources = set(e[0] for e in entries)
            if len(sources) < 2:
                continue  # Need at least 2 sources

            # Aggregate data
            agg = self._aggregate_entries(normalized_name, entries)
            if agg:
                aggregated.append(agg)

        # Sort by arbitrage opportunity (descending)
        aggregated.sort(key=lambda x: x.arbitrage_spread, reverse=True)

        return aggregated

    def _normalize_name(self, name: str) -> str:
        """Normalize a market/contract name for matching."""
        import re

        name = name.lower()

        # Remove common suffixes/prefixes
        patterns = [
            r'\b(to win|will win|wins?|winner)\b',
            r'\b(the|a|an)\b',
            r'\b(2024|2025|2026|2027|2028|2029|2030)\b',
            r'\b(presidential|president|election|nominee|nomination)\b',
            r'\b(republican|democratic|gop|dem)\b',
            r'[^\w\s]',  # Remove punctuation
        ]

        for pattern in patterns:
            name = re.sub(pattern, '', name)

        # Collapse whitespace
        name = ' '.join(name.split())

        return name.strip()

    def _aggregate_entries(self, name: str,
                          entries: List[Tuple[str, MarketData, ContractData]]
                          ) -> Optional[AggregatedMarket]:
        """Aggregate entries from different sources."""
        sources: Dict[str, MarketData] = {}
        prices: List[Tuple[str, float, float]] = []  # (source, yes, no)
        total_volume = 0

        for source_name, market, contract in entries:
            if source_name not in sources:
                sources[source_name] = market

            yes_price = contract.yes_price or 0
            no_price = contract.no_price or (1 - yes_price)

            if yes_price > 0:
                prices.append((source_name, yes_price, no_price))

            if contract.volume:
                total_volume += contract.volume

        if len(prices) < 2:
            return None

        # Find best prices
        best_yes = max(prices, key=lambda x: x[1])
        best_no = max(prices, key=lambda x: x[2])

        # Calculate arbitrage spread
        # If you can buy YES cheap and sell YES expensive (via NO),
        # arbitrage = best_yes_sell - best_yes_buy
        # = (1 - best_no_price) - worst_yes_price
        arbitrage = (1 - best_no[2]) - min(p[1] for p in prices)

        return AggregatedMarket(
            canonical_name=name,
            sources=sources,
            best_yes_price=best_yes[1],
            best_no_price=best_no[2],
            best_yes_source=best_yes[0],
            best_no_source=best_no[0],
            arbitrage_spread=arbitrage,
            total_volume=total_volume,
        )

    def detect_arbitrage(self, min_spread: float = 0.02) -> List[AggregatedMarket]:
        """
        Find arbitrage opportunities.

        Args:
            min_spread: Minimum price spread to report (default 2%)

        Returns:
            List of markets with arbitrage opportunities
        """
        matches = self.find_matching_markets()
        return [m for m in matches if m.arbitrage_spread >= min_spread]

    def export(self, output_dir: str = ".", formats: List[str] = None):
        """
        Export results to files.

        Args:
            output_dir: Directory to write files
            formats: List of formats ('csv', 'json'). Default: both
        """
        if formats is None:
            formats = ['csv', 'json']

        os.makedirs(output_dir, exist_ok=True)
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')

        if 'csv' in formats:
            df = self.to_dataframe()
            csv_path = os.path.join(output_dir, f'markets_{timestamp}.csv')
            df.to_csv(csv_path, index=False)
            print(f"Exported CSV: {csv_path}")

            # Also export latest (no timestamp)
            latest_csv = os.path.join(output_dir, 'markets_latest.csv')
            df.to_csv(latest_csv, index=False)

        if 'json' in formats:
            data = self.to_json()
            json_path = os.path.join(output_dir, f'markets_{timestamp}.json')
            with open(json_path, 'w') as f:
                json.dump(data, f, indent=2, default=str)
            print(f"Exported JSON: {json_path}")

            # Also export latest
            latest_json = os.path.join(output_dir, 'markets_latest.json')
            with open(latest_json, 'w') as f:
                json.dump(data, f, indent=2, default=str)

        # Export summary
        summary = {
            'timestamp': datetime.now().isoformat(),
            'sources': list(self.results.keys()),
            'total_markets': sum(len(m) for m in self.results.values()),
            'total_contracts': sum(
                sum(len(m.contracts) for m in markets)
                for markets in self.results.values()
            ),
            'errors': self.errors,
        }
        summary_path = os.path.join(output_dir, 'summary.json')
        with open(summary_path, 'w') as f:
            json.dump(summary, f, indent=2)


def main():
    parser = argparse.ArgumentParser(
        description='Aggregate prediction market data from multiple sources'
    )
    parser.add_argument(
        '--output-dir', '-o',
        default='./output',
        help='Output directory (default: ./output)'
    )
    parser.add_argument(
        '--format', '-f',
        default='csv,json',
        help='Output formats, comma-separated (default: csv,json)'
    )
    parser.add_argument(
        '--include-betfair',
        action='store_true',
        help='Include Betfair (requires env vars)'
    )
    parser.add_argument(
        '--find-arbitrage',
        action='store_true',
        help='Look for arbitrage opportunities'
    )
    parser.add_argument(
        '--min-spread',
        type=float,
        default=0.02,
        help='Minimum arbitrage spread to report (default: 0.02 = 2%%)'
    )

    args = parser.parse_args()

    # Initialize aggregator
    aggregator = MarketAggregator(include_betfair=args.include_betfair)

    # Fetch all markets
    aggregator.fetch_all()

    # Export results
    formats = [f.strip() for f in args.format.split(',')]
    aggregator.export(args.output_dir, formats)

    # Print summary
    print("\n=== Summary ===")
    for source, markets in aggregator.results.items():
        total_contracts = sum(len(m.contracts) for m in markets)
        print(f"  {source}: {len(markets)} markets, {total_contracts} contracts")

    # Find arbitrage if requested
    if args.find_arbitrage:
        print("\n=== Arbitrage Detection ===")
        opportunities = aggregator.detect_arbitrage(args.min_spread)
        if opportunities:
            for opp in opportunities[:10]:
                print(f"\n  {opp.canonical_name}")
                print(f"    Best YES: {opp.best_yes_price:.1%} ({opp.best_yes_source})")
                print(f"    Best NO: {opp.best_no_price:.1%} ({opp.best_no_source})")
                print(f"    Spread: {opp.arbitrage_spread:.1%}")
                print(f"    Sources: {', '.join(opp.sources.keys())}")
        else:
            print(f"  No opportunities found with spread >= {args.min_spread:.1%}")

    print(f"\nResults saved to: {args.output_dir}")


if __name__ == '__main__':
    main()
