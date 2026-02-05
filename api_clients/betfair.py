"""
Betfair Exchange API Client

Betfair is a UK-based betting exchange.
API: Authenticated REST API (requires API key + session token)
Docs: https://developer.betfair.com/

Rate Limits:
  - 12 requests/second per API endpoint
  - Polling: 1 request per second for price updates
Data Freshness: Real-time
Auth: Required - API key + username/password for session token

SETUP REQUIRED:
1. Create Betfair account at https://www.betfair.com
2. Apply for API access at https://developer.betfair.com/
3. Generate API key in your account settings
4. Store credentials securely (environment variables or config file)

ENVIRONMENT VARIABLES:
- BETFAIR_APP_KEY: Your Betfair API application key
- BETFAIR_USERNAME: Betfair account username
- BETFAIR_PASSWORD: Betfair account password
"""

import os
import requests
from datetime import datetime
from typing import List, Optional, Dict, Any
from .base import BaseMarketClient, MarketData, ContractData, MarketStatus


class BetfairClient(BaseMarketClient):
    """Client for Betfair Exchange API."""

    # API endpoints
    AUTH_URL = "https://identitysso.betfair.com/api/login"
    EXCHANGE_URL = "https://api.betfair.com/exchange/betting/rest/v1.0"

    # Event Type IDs
    POLITICS_EVENT_TYPE_ID = "2378961"  # Politics

    @property
    def source_name(self) -> str:
        return "Betfair"

    @property
    def base_url(self) -> str:
        return self.EXCHANGE_URL

    def __init__(self, app_key: Optional[str] = None,
                 username: Optional[str] = None,
                 password: Optional[str] = None):
        super().__init__(api_key=app_key)

        # Get credentials from env vars if not provided
        self.app_key = app_key or os.environ.get('BETFAIR_APP_KEY')
        self.username = username or os.environ.get('BETFAIR_USERNAME')
        self.password = password or os.environ.get('BETFAIR_PASSWORD')

        self._session_token = None
        self._session = requests.Session()

        if self.app_key:
            self._session.headers.update({
                'X-Application': self.app_key,
                'Accept': 'application/json',
                'Content-Type': 'application/json',
            })

    def is_configured(self) -> bool:
        """Check if API credentials are configured."""
        return bool(self.app_key and self.username and self.password)

    def login(self) -> bool:
        """Authenticate with Betfair and get session token."""
        if not self.is_configured():
            print("[Betfair] Missing credentials. Set BETFAIR_APP_KEY, BETFAIR_USERNAME, BETFAIR_PASSWORD")
            return False

        try:
            response = requests.post(
                self.AUTH_URL,
                headers={
                    'X-Application': self.app_key,
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                data={
                    'username': self.username,
                    'password': self.password,
                },
                timeout=30
            )
            response.raise_for_status()
            data = response.json()

            if data.get('status') == 'SUCCESS':
                self._session_token = data.get('token')
                self._session.headers['X-Authentication'] = self._session_token
                print("[Betfair] Login successful")
                return True
            else:
                print(f"[Betfair] Login failed: {data.get('error', 'Unknown error')}")
                return False

        except requests.RequestException as e:
            print(f"[Betfair] Login error: {e}")
            return False

    def _make_request(self, operation: str, params: Dict) -> Optional[Any]:
        """Make a POST request to the Exchange API."""
        if not self._session_token:
            if not self.login():
                return None

        try:
            url = f"{self.EXCHANGE_URL}/{operation}/"
            response = self._session.post(url, json=params, timeout=30)
            response.raise_for_status()
            return response.json()
        except requests.RequestException as e:
            print(f"[Betfair] Request error for {operation}: {e}")
            return None

    def list_event_types(self) -> List[Dict]:
        """List all event types (sports/categories)."""
        data = self._make_request("listEventTypes", {"filter": {}})
        return data if data else []

    def list_events(self, event_type_id: str) -> List[Dict]:
        """List events for an event type."""
        params = {
            "filter": {
                "eventTypeIds": [event_type_id],
            },
            "maxResults": 100,
        }
        data = self._make_request("listEvents", params)
        return data if data else []

    def list_market_catalogue(self, event_id: str, max_results: int = 100) -> List[Dict]:
        """List markets for an event."""
        params = {
            "filter": {
                "eventIds": [event_id],
            },
            "maxResults": max_results,
            "marketProjection": ["RUNNER_DESCRIPTION", "EVENT", "MARKET_START_TIME"],
        }
        data = self._make_request("listMarketCatalogue", params)
        return data if data else []

    def list_market_book(self, market_ids: List[str]) -> List[Dict]:
        """Get current prices for markets."""
        params = {
            "marketIds": market_ids,
            "priceProjection": {
                "priceData": ["EX_BEST_OFFERS", "EX_TRADED"],
            },
        }
        data = self._make_request("listMarketBook", params)
        return data if data else []

    def _fractional_to_probability(self, decimal_odds: float) -> float:
        """Convert decimal odds to probability."""
        if decimal_odds <= 1:
            return 1.0
        return 1.0 / decimal_odds

    def _parse_runner(self, runner: Dict, runner_catalog: Dict) -> ContractData:
        """Parse a runner (selection) into contract data."""
        # Get prices from EX_BEST_OFFERS
        ex = runner.get('ex', {})
        back_prices = ex.get('availableToBack', [])
        lay_prices = ex.get('availableToLay', [])

        # Best back = what you can bet to win (someone offering to lay)
        # Best lay = what you can bet to lose (someone offering to back)
        best_back = back_prices[0]['price'] if back_prices else None
        best_lay = lay_prices[0]['price'] if lay_prices else None

        # Convert to probability
        back_prob = self._fractional_to_probability(best_back) if best_back else 0.0
        lay_prob = self._fractional_to_probability(best_lay) if best_lay else 0.0

        # Mid price
        if back_prob > 0 and lay_prob > 0:
            yes_price = (back_prob + lay_prob) / 2
        elif back_prob > 0:
            yes_price = back_prob
        elif lay_prob > 0:
            yes_price = lay_prob
        else:
            yes_price = 0.0

        # Get traded volume
        traded_volume = runner.get('totalMatched', 0)

        return ContractData(
            contract_id=str(runner.get('selectionId', '')),
            contract_name=runner_catalog.get('runnerName', ''),
            yes_price=yes_price,
            no_price=1.0 - yes_price,
            yes_bid=back_prob,  # What backers are offering
            yes_ask=lay_prob,    # What layers want
            volume=traded_volume,
            last_trade_price=runner.get('lastPriceTraded'),
        )

    def _parse_market(self, catalog: Dict, book: Optional[Dict]) -> MarketData:
        """Parse market catalog and book into MarketData."""
        market_id = catalog.get('marketId', '')
        event = catalog.get('event', {})

        # Parse runners
        contracts = []
        runners_catalog = {r['selectionId']: r for r in catalog.get('runners', [])}

        if book:
            for runner in book.get('runners', []):
                selection_id = runner.get('selectionId')
                runner_cat = runners_catalog.get(selection_id, {})
                contracts.append(self._parse_runner(runner, runner_cat))

        # Parse status
        status_str = book.get('status', 'UNKNOWN') if book else 'UNKNOWN'
        status_map = {
            'OPEN': MarketStatus.OPEN,
            'SUSPENDED': MarketStatus.SUSPENDED,
            'CLOSED': MarketStatus.CLOSED,
        }
        status = status_map.get(status_str, MarketStatus.UNKNOWN)

        # Total volume
        total_volume = book.get('totalMatched', 0) if book else 0

        return MarketData(
            market_id=market_id,
            market_name=catalog.get('marketName', ''),
            source=self.source_name,
            category="politics",
            status=status,
            contracts=contracts,
            url=f"https://www.betfair.com/exchange/plus/politics/market/{market_id}",
            description=event.get('name'),
            total_volume=total_volume,
            last_updated=datetime.now(),
            raw_data={'catalog': catalog, 'book': book}
        )

    def get_political_markets(self) -> List[MarketData]:
        """Fetch all political/election markets."""
        if not self.is_configured():
            print("[Betfair] Not configured - returning empty list")
            print("  Set environment variables: BETFAIR_APP_KEY, BETFAIR_USERNAME, BETFAIR_PASSWORD")
            return []

        results = []

        # Get politics events
        events = self.list_events(self.POLITICS_EVENT_TYPE_ID)

        for event_data in events:
            event = event_data.get('event', {})
            event_id = event.get('id')
            if not event_id:
                continue

            # Get markets for event
            catalogs = self.list_market_catalogue(event_id)

            if not catalogs:
                continue

            # Get current prices
            market_ids = [c['marketId'] for c in catalogs]
            books = self.list_market_book(market_ids)
            books_map = {b['marketId']: b for b in books}

            for catalog in catalogs:
                market_id = catalog['marketId']
                book = books_map.get(market_id)
                market_data = self._parse_market(catalog, book)
                results.append(market_data)

        return results

    def get_market_prices(self, market_id: str) -> Optional[MarketData]:
        """Fetch current prices for a specific market."""
        if not self.is_configured():
            return None

        # Get market book
        books = self.list_market_book([market_id])
        if not books:
            return None

        book = books[0]

        # Create minimal catalog (we don't have full data)
        catalog = {
            'marketId': market_id,
            'marketName': 'Unknown',
            'runners': [],
        }

        return self._parse_market(catalog, book)


# Configuration instructions
def print_setup_instructions():
    print("""
    ╔══════════════════════════════════════════════════════════════════╗
    ║                    BETFAIR API SETUP                              ║
    ╠══════════════════════════════════════════════════════════════════╣
    ║ 1. Create a Betfair account:                                      ║
    ║    https://www.betfair.com                                        ║
    ║                                                                    ║
    ║ 2. Apply for API access:                                          ║
    ║    https://developer.betfair.com/                                  ║
    ║    - Register as a developer                                       ║
    ║    - Create an application to get your APP_KEY                     ║
    ║                                                                    ║
    ║ 3. Set environment variables:                                      ║
    ║    export BETFAIR_APP_KEY="your_app_key"                           ║
    ║    export BETFAIR_USERNAME="your_username"                         ║
    ║    export BETFAIR_PASSWORD="your_password"                         ║
    ║                                                                    ║
    ║ Note: For non-UK users, you may need to use a VPN or              ║
    ║       regional Betfair site (.com.au, etc.)                        ║
    ╚══════════════════════════════════════════════════════════════════╝
    """)


# Quick test
if __name__ == "__main__":
    client = BetfairClient()

    if not client.is_configured():
        print_setup_instructions()
    else:
        markets = client.get_political_markets()
        print(f"Found {len(markets)} political markets\n")

        for market in markets[:5]:
            print(f"Market: {market.market_name}")
            print(f"  ID: {market.market_id}")
            print(f"  Volume: £{market.total_volume:,.0f}" if market.total_volume else "  Volume: N/A")
            print(f"  Contracts: {len(market.contracts)}")
            for contract in market.contracts[:3]:
                print(f"    - {contract.contract_name}: {contract.yes_price:.1%}")
            print()
