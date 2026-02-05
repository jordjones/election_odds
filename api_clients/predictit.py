"""
PredictIt API Client

PredictIt is a prediction market for political events.
API: Public, no authentication required.
Docs: None official, reverse-engineered endpoints.

Rate Limits: Unknown, be conservative (1 req/sec)
Data Freshness: Real-time prices
"""

import requests
from datetime import datetime
from typing import List, Optional, Dict, Any
from .base import BaseMarketClient, MarketData, ContractData, MarketStatus


class PredictItClient(BaseMarketClient):
    """Client for PredictIt prediction market API."""

    API_BASE = "https://www.predictit.org/api/marketdata"

    @property
    def source_name(self) -> str:
        return "PredictIt"

    @property
    def base_url(self) -> str:
        return self.API_BASE

    def __init__(self):
        super().__init__()
        self._session = requests.Session()
        self._session.headers.update({
            'User-Agent': 'Mozilla/5.0 (compatible; PredictionMarketAggregator/1.0)',
            'Accept': 'application/json',
        })

    def _make_request(self, endpoint: str) -> Optional[Dict[str, Any]]:
        """Make a GET request to the API."""
        try:
            url = f"{self.API_BASE}/{endpoint}"
            response = self._session.get(url, timeout=30)
            response.raise_for_status()
            return response.json()
        except requests.RequestException as e:
            print(f"[PredictIt] Request error: {e}")
            return None

    def _parse_contract(self, contract: Dict[str, Any]) -> ContractData:
        """Parse a contract from API response."""
        # PredictIt prices are in decimal format (0.0 to 1.0)
        yes_price = contract.get('lastTradePrice', 0.0)
        yes_bid = contract.get('bestSellYesCost', 0.0)  # Best price to sell YES
        yes_ask = contract.get('bestBuyYesCost', 0.0)   # Best price to buy YES
        no_bid = contract.get('bestSellNoCost', 0.0)    # Best price to sell NO
        no_ask = contract.get('bestBuyNoCost', 0.0)     # Best price to buy NO

        return ContractData(
            contract_id=str(contract.get('id')),
            contract_name=contract.get('name', ''),
            yes_price=yes_price,
            no_price=1.0 - yes_price if yes_price else 0.0,
            yes_bid=yes_bid,
            yes_ask=yes_ask,
            no_bid=no_bid,
            no_ask=no_ask,
            volume=None,  # PredictIt doesn't expose volume in public API
            last_trade_price=yes_price,
            last_updated=None
        )

    def _parse_market(self, market: Dict[str, Any]) -> MarketData:
        """Parse a market from API response."""
        # Parse timestamp
        timestamp_str = market.get('timeStamp', '')
        last_updated = None
        if timestamp_str:
            try:
                # Format: "2026-02-05T11:22:41.8466835"
                last_updated = datetime.fromisoformat(timestamp_str.split('.')[0])
            except ValueError:
                pass

        # Parse status
        status_str = market.get('status', 'Unknown').lower()
        status_map = {
            'open': MarketStatus.OPEN,
            'closed': MarketStatus.CLOSED,
            'resolved': MarketStatus.RESOLVED,
        }
        status = status_map.get(status_str, MarketStatus.UNKNOWN)

        # Parse contracts
        contracts = [
            self._parse_contract(c)
            for c in market.get('contracts', [])
        ]

        return MarketData(
            market_id=str(market.get('id')),
            market_name=market.get('name', ''),
            source=self.source_name,
            category="politics",
            status=status,
            contracts=contracts,
            url=market.get('url'),
            description=market.get('shortName'),
            last_updated=last_updated,
            raw_data=market
        )

    def get_all_markets(self) -> List[MarketData]:
        """Fetch all available markets."""
        data = self._make_request("all")
        if not data or 'markets' not in data:
            return []

        return [self._parse_market(m) for m in data['markets']]

    def get_political_markets(self) -> List[MarketData]:
        """
        Fetch all political/election markets.

        PredictIt is exclusively political, so this returns all markets.
        """
        return self.get_all_markets()

    def get_market_prices(self, market_id: str) -> Optional[MarketData]:
        """
        Fetch current prices for a specific market.

        Note: PredictIt doesn't have a single-market endpoint in public API,
        so we fetch all and filter.
        """
        all_markets = self.get_all_markets()
        for market in all_markets:
            if market.market_id == market_id:
                return market
        return None

    def get_markets_by_keyword(self, keyword: str) -> List[MarketData]:
        """Filter markets by keyword in name."""
        all_markets = self.get_all_markets()
        keyword_lower = keyword.lower()
        return [
            m for m in all_markets
            if keyword_lower in m.market_name.lower()
        ]


# Quick test
if __name__ == "__main__":
    client = PredictItClient()
    markets = client.get_political_markets()

    print(f"Found {len(markets)} markets\n")

    for market in markets[:3]:
        print(f"Market: {market.market_name}")
        print(f"  ID: {market.market_id}")
        print(f"  Status: {market.status.value}")
        print(f"  URL: {market.url}")
        print(f"  Contracts: {len(market.contracts)}")
        for contract in market.contracts[:3]:
            print(f"    - {contract.contract_name}: {contract.yes_price:.1%}")
        print()
