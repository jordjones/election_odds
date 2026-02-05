"""
Kalshi API Client

Kalshi is a CFTC-regulated prediction market.
API: REST API with public and authenticated endpoints.
Docs: https://trading-api.readme.io/

Rate Limits: 10 requests/second for public endpoints
Data Freshness: Real-time
Auth: API key required for trading, public endpoints for market data
"""

import requests
import time
from datetime import datetime
from typing import List, Optional, Dict, Any
from .base import BaseMarketClient, MarketData, ContractData, MarketStatus


class KalshiClient(BaseMarketClient):
    """Client for Kalshi prediction market API."""

    # Kalshi API endpoints
    API_BASE = "https://api.elections.kalshi.com/trade-api/v2"
    DEMO_API_BASE = "https://demo-api.kalshi.co/trade-api/v2"

    # Political event categories
    POLITICAL_SERIES = [
        "PRES", "KXPRES",  # Presidential
        "SENATE", "KXSENATE",  # Senate
        "HOUSE", "KXHOUSE",  # House
        "SCOTUS",  # Supreme Court
        "CONGRESS",
    ]

    @property
    def source_name(self) -> str:
        return "Kalshi"

    @property
    def base_url(self) -> str:
        return self.API_BASE

    def __init__(self, api_key: Optional[str] = None, use_demo: bool = False):
        super().__init__(api_key)
        self._base = self.DEMO_API_BASE if use_demo else self.API_BASE
        self._session = requests.Session()
        self._session.headers.update({
            'User-Agent': 'Mozilla/5.0 (compatible; PredictionMarketAggregator/1.0)',
            'Accept': 'application/json',
            'Content-Type': 'application/json',
        })
        if api_key:
            self._session.headers['Authorization'] = f'Bearer {api_key}'

    def _make_request(self, endpoint: str, params: Optional[Dict] = None) -> Optional[Dict[str, Any]]:
        """Make a GET request to the API with rate limiting."""
        try:
            url = f"{self._base}/{endpoint}"
            response = self._session.get(url, params=params, timeout=30)

            # Handle rate limiting
            if response.status_code == 429:
                retry_after = int(response.headers.get('Retry-After', 1))
                time.sleep(retry_after)
                response = self._session.get(url, params=params, timeout=30)

            response.raise_for_status()
            time.sleep(0.15)  # 6-7 requests/second to stay under limit
            return response.json()
        except requests.RequestException as e:
            print(f"[Kalshi] Request error for {endpoint}: {e}")
            return None

    def _parse_market(self, event: Dict[str, Any], markets: List[Dict]) -> MarketData:
        """Parse an event and its markets from API response."""
        # Parse contracts from markets
        contracts = []
        total_volume = 0

        for market in markets:
            # Kalshi prices are in cents (0-100)
            yes_price = market.get('yes_bid', 0) / 100.0
            no_price = market.get('no_bid', 0) / 100.0
            yes_ask = market.get('yes_ask', 0) / 100.0
            no_ask = market.get('no_ask', 0) / 100.0
            volume = market.get('volume', 0)
            total_volume += volume

            contract = ContractData(
                contract_id=market.get('ticker', ''),
                contract_name=market.get('title', market.get('subtitle', '')),
                yes_price=yes_price,
                no_price=no_price,
                yes_bid=yes_price,
                yes_ask=yes_ask,
                no_bid=no_price,
                no_ask=no_ask,
                volume=volume,
                last_trade_price=market.get('last_price', 0) / 100.0 if market.get('last_price') else None,
            )
            contracts.append(contract)

        # Parse status
        status_str = event.get('status', 'unknown').lower()
        status_map = {
            'open': MarketStatus.OPEN,
            'active': MarketStatus.OPEN,
            'closed': MarketStatus.CLOSED,
            'settled': MarketStatus.RESOLVED,
            'finalized': MarketStatus.RESOLVED,
        }
        status = status_map.get(status_str, MarketStatus.UNKNOWN)

        return MarketData(
            market_id=event.get('event_ticker', event.get('ticker', '')),
            market_name=event.get('title', ''),
            source=self.source_name,
            category=event.get('category', 'politics'),
            status=status,
            contracts=contracts,
            url=f"https://kalshi.com/events/{event.get('event_ticker', '')}",
            description=event.get('subtitle', ''),
            total_volume=total_volume,
            last_updated=datetime.now(),
            raw_data=event
        )

    def get_events(self, series_ticker: Optional[str] = None,
                   status: str = "open", limit: int = 100,
                   cursor: Optional[str] = None) -> tuple[List[Dict], Optional[str]]:
        """
        Fetch events from Kalshi with pagination support.
        Returns (events, next_cursor).
        """
        params = {
            'status': status,
            'limit': limit,
        }
        if series_ticker:
            params['series_ticker'] = series_ticker
        if cursor:
            params['cursor'] = cursor

        data = self._make_request("events", params)
        if not data:
            return [], None
        return data.get('events', []), data.get('cursor')

    def get_all_events_paginated(self, status: str = "open",
                                  max_events: int = 1000) -> List[Dict]:
        """Fetch all events with automatic pagination."""
        all_events = []
        cursor = None

        while len(all_events) < max_events:
            events, next_cursor = self.get_events(status=status, limit=100, cursor=cursor)
            if not events:
                break
            all_events.extend(events)
            if not next_cursor:
                break
            cursor = next_cursor

        return all_events[:max_events]

    def get_markets_for_event(self, event_ticker: str) -> List[Dict]:
        """Fetch markets for a specific event."""
        params = {'event_ticker': event_ticker}
        data = self._make_request("markets", params)
        if not data:
            return []
        return data.get('markets', [])

    def get_all_markets(self, status: str = "open", limit: int = 200) -> List[Dict]:
        """Fetch all markets."""
        params = {
            'status': status,
            'limit': limit,
        }
        data = self._make_request("markets", params)
        if not data:
            return []
        return data.get('markets', [])

    def get_political_markets(self, max_events: int = 500) -> List[MarketData]:
        """Fetch all political/election markets with pagination."""
        results = []

        # Fetch events first with pagination, then get their markets
        events = self.get_all_events_paginated(max_events=max_events)

        # Filter for political events
        political_keywords = [
            'president', 'trump', 'vance', 'harris', 'newsom', 'desantis',
            'election', 'congress', 'senate', 'house', 'tariff', 'scotus',
            'impeach', 'border', 'deport', 'cabinet', 'fed chair', 'secretary',
            'speaker', 'governor', 'nominee', 'primary'
        ]

        political_events = []
        for event in events:
            category = event.get('category', '').lower()
            title = event.get('title', '').lower()
            ticker = event.get('event_ticker', '').lower()

            is_political = (
                category in ['politics', 'elections'] or
                any(kw in title or kw in ticker for kw in political_keywords)
            )

            if is_political:
                political_events.append(event)

        # Get markets for each political event
        for event in political_events:
            event_ticker = event.get('event_ticker', '')
            if not event_ticker:
                continue

            markets = self.get_markets_for_event(event_ticker)
            if not markets:
                continue

            market_data = self._parse_market(event, markets)
            results.append(market_data)

        return results

    def get_market_prices(self, market_id: str) -> Optional[MarketData]:
        """Fetch current prices for a specific market/event."""
        # Try to get as event first
        markets = self.get_markets_for_event(market_id)
        if markets:
            event_data = {
                'event_ticker': market_id,
                'title': markets[0].get('event_title', ''),
                'status': markets[0].get('status', 'open'),
            }
            return self._parse_market(event_data, markets)

        # Try as individual market ticker
        data = self._make_request(f"markets/{market_id}")
        if data and 'market' in data:
            market = data['market']
            return self._parse_market(
                {'event_ticker': market_id, 'title': market.get('title', '')},
                [market]
            )

        return None


# Quick test
if __name__ == "__main__":
    client = KalshiClient()
    markets = client.get_political_markets()

    print(f"Found {len(markets)} political markets\n")

    for market in markets[:5]:
        print(f"Market: {market.market_name}")
        print(f"  ID: {market.market_id}")
        print(f"  Volume: ${market.total_volume:,.0f}" if market.total_volume else "  Volume: N/A")
        print(f"  Contracts: {len(market.contracts)}")
        for contract in market.contracts[:3]:
            print(f"    - {contract.contract_name}: YES={contract.yes_price:.1%}")
        print()
