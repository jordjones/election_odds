"""
Prediction Market API Clients

Unified interface for fetching odds from multiple prediction markets:
- PredictIt (public, no auth)
- Kalshi (public market data, auth for trading)
- Polymarket (public, no auth)
- Smarkets (public, no auth)
- Betfair (requires API key + account)
"""

from .base import BaseMarketClient, MarketData, ContractData, MarketStatus
from .predictit import PredictItClient
from .kalshi import KalshiClient
from .polymarket import PolymarketClient
from .smarkets import SmarketsClient
from .betfair import BetfairClient

__all__ = [
    'BaseMarketClient',
    'MarketData',
    'ContractData',
    'MarketStatus',
    'PredictItClient',
    'KalshiClient',
    'PolymarketClient',
    'SmarketsClient',
    'BetfairClient',
]
