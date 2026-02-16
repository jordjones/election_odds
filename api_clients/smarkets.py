"""
Smarkets API Client

Smarkets is a UK-based betting exchange.
API: Public REST API
Docs: https://docs.smarkets.com/

Rate Limits: Unknown, be conservative (1 req/sec)
Data Freshness: Real-time
Auth: Not required for market data
"""

import requests
from datetime import datetime
from typing import List, Optional, Dict, Any
from .base import BaseMarketClient, MarketData, ContractData, MarketStatus


class SmarketsClient(BaseMarketClient):
    """Client for Smarkets betting exchange API."""

    API_BASE = "https://api.smarkets.com/v3"

    # US Politics event IDs
    US_POLITICS_EVENTS = [
        "924650",    # USA parent
        "44136685",  # 2028 Presidential Election
        "44136686",  # 2028 Presidential Election Winner
        "44255012",  # 2028 Winning Party
        "44276743",  # 2026 Midterms
        "44276763",  # House control 2026
        "44807396",  # Senate control 2026
        "44766117",  # 2028 Dem Nominee
        "44766118",  # 2028 GOP Nominee
        "784698",    # Donald Trump
    ]

    @property
    def source_name(self) -> str:
        return "Smarkets"

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

    def _make_request(self, endpoint: str, params: Optional[Dict] = None) -> Optional[Dict[str, Any]]:
        """Make a GET request to the API."""
        try:
            url = f"{self.API_BASE}/{endpoint}"
            response = self._session.get(url, params=params, timeout=30)
            response.raise_for_status()
            return response.json()
        except requests.RequestException as e:
            print(f"[Smarkets] Request error for {endpoint}: {e}")
            return None

    def get_events(self, type_domain: str = "politics",
                   state: str = "upcoming", limit: int = 50) -> List[Dict]:
        """Fetch events from Smarkets."""
        params = {
            'type_domain': type_domain,
            'state': state,
            'limit': limit,
        }

        data = self._make_request("events/", params)
        if not data:
            return []
        return data.get('events', [])

    def get_event(self, event_id: str) -> Optional[Dict]:
        """Fetch a specific event."""
        data = self._make_request(f"events/{event_id}/")
        if not data:
            return None
        return data.get('event') or data

    def get_markets(self, event_id: str) -> List[Dict]:
        """Fetch markets for an event."""
        data = self._make_request(f"events/{event_id}/markets/")
        if not data:
            return []
        return data.get('markets', [])

    def get_contracts(self, market_id: str) -> List[Dict]:
        """Fetch contracts for a market."""
        data = self._make_request(f"markets/{market_id}/contracts/")
        if not data:
            return []
        return data.get('contracts', [])

    def get_quotes(self, market_id: str) -> Dict[str, Dict]:
        """Fetch quotes (prices) for a market's contracts."""
        data = self._make_request(f"markets/{market_id}/quotes/")
        if not data:
            return {}
        return data

    def get_volumes(self, market_id: str) -> Dict[str, Any]:
        """Fetch volumes for a market.

        Returns dict with 'market_volume' (int) for the total market volume.
        The Smarkets API returns volume at market level, not per-contract.
        """
        data = self._make_request(f"markets/{market_id}/volumes/")
        if not data:
            return {}
        volumes_list = data.get('volumes', [])
        market_volume = 0
        for v in volumes_list:
            if str(v.get('market_id', '')) == str(market_id):
                market_volume = v.get('volume', 0)
                break
        return {'market_volume': market_volume}

    def _parse_price(self, price_bp: int) -> float:
        """Convert basis points (0-10000) to probability (0-1)."""
        return price_bp / 10000.0

    def _parse_contracts(self, market_id: str) -> tuple[List[ContractData], int]:
        """Parse contracts with prices for a market.

        Returns (contracts, market_volume) since Smarkets reports volume at market level.
        """
        contracts_data = self.get_contracts(market_id)
        quotes_data = self.get_quotes(market_id)
        volumes_data = self.get_volumes(market_id)
        market_volume = volumes_data.get('market_volume', 0)

        contracts = []
        for contract in contracts_data:
            contract_id = contract.get('id', '')
            quote = quotes_data.get(contract_id, {})

            # Get best bid/offer
            bids = quote.get('bids', [])
            offers = quote.get('offers', [])

            best_bid = self._parse_price(bids[0]['price']) if bids else 0.0
            best_offer = self._parse_price(offers[0]['price']) if offers else 0.0

            # Mid price
            if best_bid > 0 and best_offer > 0:
                yes_price = (best_bid + best_offer) / 2
            elif best_offer > 0:
                yes_price = best_offer
            elif best_bid > 0:
                yes_price = best_bid
            else:
                yes_price = 0.0

            contracts.append(ContractData(
                contract_id=contract_id,
                contract_name=contract.get('name', ''),
                yes_price=yes_price,
                no_price=1.0 - yes_price if yes_price else 0.0,
                yes_bid=best_bid,
                yes_ask=best_offer,
                no_bid=1.0 - best_offer if best_offer else 0.0,
                no_ask=1.0 - best_bid if best_bid else 0.0,
                volume=None,  # Smarkets only provides market-level volume
            ))

        return contracts, market_volume

    def _parse_market(self, event: Dict, market: Dict) -> MarketData:
        """Parse market data."""
        market_id = market.get('id', '')
        contracts, market_volume = self._parse_contracts(market_id)

        # Use market-level volume from the API (in pence, convert to pounds)
        total_volume = market_volume / 100.0 if market_volume else 0

        # Parse status
        state = market.get('state', 'unknown').lower()
        status_map = {
            'open': MarketStatus.OPEN,
            'closed': MarketStatus.CLOSED,
            'settled': MarketStatus.RESOLVED,
            'suspended': MarketStatus.SUSPENDED,
        }
        status = status_map.get(state, MarketStatus.UNKNOWN)

        return MarketData(
            market_id=market_id,
            market_name=market.get('name', event.get('name', '')),
            source=self.source_name,
            category="politics",
            status=status,
            contracts=contracts,
            url=f"https://smarkets.com{event.get('full_slug', '')}",
            description=market.get('description'),
            total_volume=total_volume if total_volume > 0 else None,  # GBP
            last_updated=datetime.now(),
            raw_data={'event': event, 'market': market}
        )

    def get_political_markets(self) -> List[MarketData]:
        """Fetch all political/election markets."""
        results = []

        # Get all politics events
        all_events = self.get_events(type_domain="politics", limit=100)

        # Filter for US politics
        us_events = []
        for event in all_events:
            slug = event.get('full_slug', '').lower()
            name = event.get('name', '').lower()
            if '/us' in slug or 'america' in name or event.get('id') in self.US_POLITICS_EVENTS:
                us_events.append(event)

        # Get markets for each event
        for event in us_events:
            event_id = event.get('id')
            if not event_id:
                continue

            markets = self.get_markets(event_id)
            for market in markets:
                if market.get('state') != 'open':
                    continue

                market_data = self._parse_market(event, market)
                if market_data.contracts:  # Only add if has contracts
                    results.append(market_data)

        return results

    def get_market_prices(self, market_id: str) -> Optional[MarketData]:
        """Fetch current prices for a specific market."""
        # Get market info
        data = self._make_request(f"markets/{market_id}/")
        if not data or 'market' not in data:
            return None

        market = data['market']
        event_id = market.get('event_id')
        event = self.get_event(event_id) if event_id else {}

        return self._parse_market(event, market)


# Quick test
if __name__ == "__main__":
    client = SmarketsClient()
    markets = client.get_political_markets()

    print(f"Found {len(markets)} political markets\n")

    for market in markets[:5]:
        print(f"Market: {market.market_name}")
        print(f"  ID: {market.market_id}")
        print(f"  URL: {market.url}")
        print(f"  Contracts: {len(market.contracts)}")
        for contract in market.contracts[:3]:
            print(f"    - {contract.contract_name}: YES={contract.yes_price:.1%}")
        print()
