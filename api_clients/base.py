"""
Base classes and data structures for prediction market API clients.
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass, field, asdict
from datetime import datetime
from typing import Optional, List, Dict, Any
from enum import Enum


class MarketStatus(Enum):
    OPEN = "open"
    CLOSED = "closed"
    RESOLVED = "resolved"
    SUSPENDED = "suspended"
    UNKNOWN = "unknown"


@dataclass
class ContractData:
    """Normalized contract/outcome data across all platforms."""
    contract_id: str
    contract_name: str
    yes_price: float  # 0.0 to 1.0 (probability)
    no_price: float   # 0.0 to 1.0 (probability)
    yes_bid: Optional[float] = None  # Best bid for YES
    yes_ask: Optional[float] = None  # Best ask for YES
    no_bid: Optional[float] = None   # Best bid for NO
    no_ask: Optional[float] = None   # Best ask for NO
    volume: Optional[float] = None   # Total volume in USD
    volume_24h: Optional[float] = None  # 24h volume
    last_trade_price: Optional[float] = None
    last_updated: Optional[datetime] = None

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary with serializable datetime."""
        d = asdict(self)
        if d['last_updated']:
            d['last_updated'] = d['last_updated'].isoformat()
        return d


@dataclass
class MarketData:
    """Normalized market data across all platforms."""
    market_id: str
    market_name: str
    source: str  # Platform name
    category: str  # e.g., "politics", "elections"
    status: MarketStatus = MarketStatus.UNKNOWN
    contracts: List[ContractData] = field(default_factory=list)
    url: Optional[str] = None
    description: Optional[str] = None
    end_date: Optional[datetime] = None
    total_volume: Optional[float] = None
    last_updated: Optional[datetime] = None
    raw_data: Optional[Dict[str, Any]] = None  # Original API response

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary with serializable datetime."""
        d = {
            'market_id': self.market_id,
            'market_name': self.market_name,
            'source': self.source,
            'category': self.category,
            'status': self.status.value,
            'url': self.url,
            'description': self.description,
            'end_date': self.end_date.isoformat() if self.end_date else None,
            'total_volume': self.total_volume,
            'last_updated': self.last_updated.isoformat() if self.last_updated else None,
            'contracts': [c.to_dict() for c in self.contracts],
        }
        return d


class BaseMarketClient(ABC):
    """Abstract base class for prediction market API clients."""

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key
        self._session = None

    @property
    @abstractmethod
    def source_name(self) -> str:
        """Return the name of the data source."""
        pass

    @property
    @abstractmethod
    def base_url(self) -> str:
        """Return the base API URL."""
        pass

    @abstractmethod
    def get_political_markets(self) -> List[MarketData]:
        """
        Fetch all political/election markets.

        Returns:
            List of MarketData objects with normalized contract data.
        """
        pass

    @abstractmethod
    def get_market_prices(self, market_id: str) -> Optional[MarketData]:
        """
        Fetch current prices for a specific market.

        Args:
            market_id: Platform-specific market identifier.

        Returns:
            MarketData object or None if not found.
        """
        pass

    def normalize_price(self, price: Any, price_format: str = "decimal") -> float:
        """
        Normalize price to 0.0-1.0 probability scale.

        Args:
            price: Raw price value
            price_format: One of "decimal" (0.0-1.0), "cents" (0-100),
                         "percentage" (0-100), "fractional" (e.g., "5/1")

        Returns:
            Normalized probability between 0.0 and 1.0
        """
        if price is None:
            return 0.0

        if price_format == "decimal":
            return float(price)
        elif price_format == "cents":
            return float(price) / 100.0
        elif price_format == "percentage":
            return float(price) / 100.0
        elif price_format == "fractional":
            if isinstance(price, str) and "/" in price:
                num, denom = price.split("/")
                # Fractional odds to probability: 1 / (fractional + 1)
                return 1.0 / (float(num) / float(denom) + 1)
            return float(price)
        else:
            return float(price)

    def close(self):
        """Clean up resources."""
        if self._session:
            self._session.close()
            self._session = None
