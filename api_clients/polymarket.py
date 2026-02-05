"""
Polymarket API Client

Polymarket is a decentralized prediction market built on Polygon.
API: Public REST API (gamma-api) and CLOB API.
Docs: https://docs.polymarket.com/

Rate Limits: Generally lenient, ~100 requests/minute
Data Freshness: Real-time (CLOB prices)
Auth: Not required for read-only market data
"""

import requests
import json
from datetime import datetime
from typing import List, Optional, Dict, Any
from .base import BaseMarketClient, MarketData, ContractData, MarketStatus


class PolymarketClient(BaseMarketClient):
    """Client for Polymarket prediction market API."""

    # API endpoints
    GAMMA_API = "https://gamma-api.polymarket.com"
    CLOB_API = "https://clob.polymarket.com"

    # Keywords to identify political markets
    POLITICAL_KEYWORDS = [
        'president', 'presidential', 'election', 'elect',
        'trump', 'biden', 'harris', 'vance', 'newsom', 'desantis', 'aoc',
        'congress', 'senate', 'house', 'representative',
        'democrat', 'democratic', 'republican', 'gop',
        'governor', 'cabinet', 'impeach',
        'scotus', 'supreme court',
        'tariff', 'executive order',
        'primary', 'nominee', 'nomination',
    ]

    @property
    def source_name(self) -> str:
        return "Polymarket"

    @property
    def base_url(self) -> str:
        return self.GAMMA_API

    def __init__(self):
        super().__init__()
        self._session = requests.Session()
        self._session.headers.update({
            'User-Agent': 'Mozilla/5.0 (compatible; PredictionMarketAggregator/1.0)',
            'Accept': 'application/json',
        })

    def _make_request(self, base: str, endpoint: str,
                      params: Optional[Dict] = None) -> Optional[Any]:
        """Make a GET request to the API."""
        try:
            url = f"{base}/{endpoint}"
            response = self._session.get(url, params=params, timeout=30)
            response.raise_for_status()
            return response.json()
        except requests.RequestException as e:
            print(f"[Polymarket] Request error for {endpoint}: {e}")
            return None

    def _is_political(self, event: Dict[str, Any]) -> bool:
        """Check if an event is political based on keywords."""
        title = event.get('title', '').lower()
        description = event.get('description', '').lower()
        text = f"{title} {description}"
        return any(kw in text for kw in self.POLITICAL_KEYWORDS)

    def _parse_market_prices(self, market: Dict[str, Any]) -> tuple:
        """Parse outcome prices from market data."""
        try:
            prices_str = market.get('outcomePrices', '[]')
            if isinstance(prices_str, str):
                prices = json.loads(prices_str)
            else:
                prices = prices_str or []

            if len(prices) >= 2:
                yes_price = float(prices[0]) if prices[0] else 0.0
                no_price = float(prices[1]) if prices[1] else 0.0
            elif len(prices) == 1:
                yes_price = float(prices[0]) if prices[0] else 0.0
                no_price = 1.0 - yes_price
            else:
                yes_price = 0.0
                no_price = 0.0

            return yes_price, no_price
        except (json.JSONDecodeError, ValueError, IndexError):
            return 0.0, 0.0

    def _parse_outcomes(self, market: Dict[str, Any]) -> List[str]:
        """Parse outcome names from market data."""
        try:
            outcomes_str = market.get('outcomes', '["Yes", "No"]')
            if isinstance(outcomes_str, str):
                return json.loads(outcomes_str)
            return outcomes_str or ['Yes', 'No']
        except json.JSONDecodeError:
            return ['Yes', 'No']

    def _parse_contract(self, market: Dict[str, Any]) -> ContractData:
        """Parse a single market into a contract."""
        yes_price, no_price = self._parse_market_prices(market)

        volume = None
        if market.get('volumeNum'):
            volume = float(market['volumeNum'])
        elif market.get('volume'):
            try:
                volume = float(market['volume'])
            except (ValueError, TypeError):
                pass

        return ContractData(
            contract_id=market.get('id', market.get('conditionId', '')),
            contract_name=market.get('question', market.get('title', '')),
            yes_price=yes_price,
            no_price=no_price,
            yes_bid=yes_price,  # CLOB would have better bid/ask
            yes_ask=yes_price,
            no_bid=no_price,
            no_ask=no_price,
            volume=volume,
            volume_24h=market.get('volume24hr'),
            last_trade_price=market.get('lastTradePrice'),
        )

    def _parse_event(self, event: Dict[str, Any]) -> MarketData:
        """Parse an event into MarketData."""
        # Parse contracts from nested markets
        contracts = []
        markets = event.get('markets', [])

        for market in markets:
            contract = self._parse_contract(market)
            contracts.append(contract)

        # If no nested markets, treat the event as a single contract
        if not contracts and event.get('outcomePrices'):
            contracts.append(self._parse_contract(event))

        # Parse status
        if event.get('closed'):
            status = MarketStatus.CLOSED
        elif event.get('active'):
            status = MarketStatus.OPEN
        elif event.get('archived'):
            status = MarketStatus.RESOLVED
        else:
            status = MarketStatus.UNKNOWN

        # Parse dates
        end_date = None
        if event.get('endDate'):
            try:
                end_date = datetime.fromisoformat(
                    event['endDate'].replace('Z', '+00:00')
                )
            except ValueError:
                pass

        total_volume = event.get('volume', 0)
        if isinstance(total_volume, str):
            try:
                total_volume = float(total_volume)
            except ValueError:
                total_volume = 0

        return MarketData(
            market_id=str(event.get('id', '')),
            market_name=event.get('title', ''),
            source=self.source_name,
            category="politics",
            status=status,
            contracts=contracts,
            url=f"https://polymarket.com/event/{event.get('slug', '')}",
            description=event.get('description', '')[:500] if event.get('description') else None,
            end_date=end_date,
            total_volume=total_volume,
            last_updated=datetime.now(),
            raw_data=event
        )

    def get_events(self, active: bool = True, closed: bool = False,
                   limit: int = 100, offset: int = 0) -> List[Dict]:
        """Fetch events from gamma API."""
        params = {
            'active': str(active).lower(),
            'closed': str(closed).lower(),
            'limit': limit,
            'offset': offset,
        }

        data = self._make_request(self.GAMMA_API, "events", params)
        return data if data else []

    def get_all_events(self, max_events: int = 500) -> List[Dict]:
        """Fetch all events with pagination."""
        all_events = []
        offset = 0
        limit = 100

        while len(all_events) < max_events:
            events = self.get_events(limit=limit, offset=offset)
            if not events:
                break
            all_events.extend(events)
            offset += limit
            if len(events) < limit:
                break

        return all_events[:max_events]

    def get_political_markets(self) -> List[MarketData]:
        """Fetch all political/election markets."""
        all_events = self.get_all_events(max_events=500)

        political_events = [e for e in all_events if self._is_political(e)]

        return [self._parse_event(e) for e in political_events]

    def get_market_prices(self, market_id: str) -> Optional[MarketData]:
        """Fetch current prices for a specific market/event."""
        # Try gamma API first
        data = self._make_request(self.GAMMA_API, f"events/{market_id}")
        if data:
            return self._parse_event(data)

        # Try by slug
        data = self._make_request(self.GAMMA_API, "events", {'slug': market_id})
        if data and len(data) > 0:
            return self._parse_event(data[0])

        return None

    def get_clob_market(self, token_id: str) -> Optional[Dict]:
        """Fetch CLOB orderbook data for a specific token."""
        data = self._make_request(self.CLOB_API, f"markets/{token_id}")
        return data

    def get_clob_prices(self, condition_id: str) -> Optional[Dict]:
        """Fetch CLOB prices for a condition."""
        data = self._make_request(self.CLOB_API, "prices",
                                  {'condition_ids': condition_id})
        return data


# Quick test
if __name__ == "__main__":
    client = PolymarketClient()
    markets = client.get_political_markets()

    print(f"Found {len(markets)} political markets\n")

    for market in markets[:5]:
        print(f"Market: {market.market_name}")
        print(f"  ID: {market.market_id}")
        print(f"  URL: {market.url}")
        print(f"  Volume: ${market.total_volume:,.0f}" if market.total_volume else "  Volume: N/A")
        print(f"  Contracts: {len(market.contracts)}")
        for contract in market.contracts[:3]:
            print(f"    - {contract.contract_name[:50]}: YES={contract.yes_price:.1%}")
        print()
