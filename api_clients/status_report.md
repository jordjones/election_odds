# API Status Report - Prediction Market Data Sources

**Last Updated:** 2026-02-05
**Test Environment:** Python 3.12, macOS

---

## Summary

| Platform | API Status | Auth Required | Rate Limit | Data Freshness | Political Markets |
|----------|------------|---------------|------------|----------------|-------------------|
| PredictIt | ✅ Live | No | ~1 req/sec | Real-time | 234 |
| Kalshi | ✅ Live | No (read) | 10 req/sec | Real-time | 128 |
| Polymarket | ✅ Live | No | ~100 req/min | Real-time | 346 |
| Smarkets | ✅ Live | No | ~1 req/sec | Real-time | 10 |
| Betfair | ⚠️ Auth Required | Yes | 12 req/sec | Real-time | Unknown |

---

## 1. PredictIt

**Website:** https://www.predictit.org
**API Endpoint:** `https://www.predictit.org/api/marketdata/all`
**Documentation:** None official (reverse-engineered)

### Status: ✅ LIVE

### Authentication
- **Required:** No
- **Method:** N/A (public endpoint)

### Rate Limits
- **Documented:** None
- **Observed:** Conservative use recommended (~1 request/second)

### Data Format
- **Format:** JSON
- **Price Format:** Decimal (0.0 to 1.0)
- **Volume:** Not exposed in public API

### Endpoints Used

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/marketdata/all` | GET | All markets with current prices |

### Sample Response Structure
```json
{
  "markets": [
    {
      "id": 8152,
      "name": "Who will win the 2028 Republican presidential nomination?",
      "status": "Open",
      "contracts": [
        {
          "id": 31925,
          "name": "JD Vance",
          "lastTradePrice": 0.49,
          "bestBuyYesCost": 0.50,
          "bestBuyNoCost": 0.51,
          "bestSellYesCost": 0.49,
          "bestSellNoCost": 0.50
        }
      ]
    }
  ]
}
```

### Gotchas
1. No official API documentation
2. Volume data not available publicly
3. Platform may be winding down (verify current status)
4. All markets are political (no filtering needed)

---

## 2. Kalshi

**Website:** https://kalshi.com
**API Base:** `https://api.elections.kalshi.com/trade-api/v2`
**Documentation:** https://trading-api.readme.io/

### Status: ✅ LIVE

### Authentication
- **Required:** No for market data, Yes for trading
- **Method:** Bearer token (for authenticated endpoints)

### Rate Limits
- **Documented:** 10 requests/second per endpoint
- **Observed:** 429 errors when exceeding; includes `Retry-After` header

### Data Format
- **Format:** JSON
- **Price Format:** Cents (0-100), divide by 100 for probability
- **Volume:** Available per market

### Endpoints Used

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/events` | GET | List all events |
| `/markets?event_ticker={id}` | GET | Markets for specific event |

### Sample Response Structure
```json
{
  "events": [
    {
      "event_ticker": "KXPRESPARTY-2028",
      "title": "Which party will win the 2028 presidential election?",
      "category": "Politics",
      "status": "open"
    }
  ]
}
```

### Gotchas
1. Rate limiting is strict - add delays between requests
2. Categories include: Politics, Elections, Economics, etc.
3. Event ticker naming conventions vary
4. Some markets have complex multi-leg structures

---

## 3. Polymarket

**Website:** https://polymarket.com
**API Base (Gamma):** `https://gamma-api.polymarket.com`
**API Base (CLOB):** `https://clob.polymarket.com`
**Documentation:** https://docs.polymarket.com/

### Status: ✅ LIVE

### Authentication
- **Required:** No for market data
- **Method:** N/A

### Rate Limits
- **Documented:** Generally lenient
- **Observed:** ~100 requests/minute without issues

### Data Format
- **Format:** JSON
- **Price Format:** Decimal strings (e.g., "0.55")
- **Volume:** Available in USD

### Endpoints Used

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/events` | GET | List events with filtering |
| `/markets/{id}` | GET | Specific market details |

### Sample Response Structure
```json
{
  "id": "30829",
  "title": "Democratic Presidential Nominee 2028",
  "volume": 19891039.315251,
  "markets": [
    {
      "question": "Will Gavin Newsom win?",
      "outcomePrices": "[\"0.33\", \"0.67\"]",
      "outcomes": "[\"Yes\", \"No\"]"
    }
  ]
}
```

### Gotchas
1. Two APIs: gamma-api (metadata) and CLOB (orderbook)
2. Outcome prices are JSON strings that need parsing
3. Many non-political markets - filter by keywords
4. Blockchain-based, may have latency in settlement

---

## 4. Smarkets

**Website:** https://smarkets.com
**API Base:** `https://api.smarkets.com/v3`
**Documentation:** https://docs.smarkets.com/

### Status: ✅ LIVE

### Authentication
- **Required:** No for market data
- **Method:** N/A

### Rate Limits
- **Documented:** Unknown
- **Observed:** Conservative use recommended

### Data Format
- **Format:** JSON
- **Price Format:** Basis points (0-10000), divide by 10000 for probability
- **Volume:** Available in pence (divide by 100 for pounds)

### Endpoints Used

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/events/` | GET | List events by type_domain |
| `/events/{id}/markets/` | GET | Markets for event |
| `/markets/{id}/contracts/` | GET | Contracts for market |
| `/markets/{id}/quotes/` | GET | Current prices |

### Sample Response Structure
```json
{
  "markets": [
    {
      "id": "83359513",
      "name": "2028 Presidential Election Winner",
      "state": "open"
    }
  ]
}
```

### Gotchas
1. Hierarchical structure: Events → Markets → Contracts → Quotes
2. UK-focused, fewer US markets than other platforms
3. Price in basis points requires conversion
4. Need multiple API calls to get full market data

---

## 5. Betfair

**Website:** https://www.betfair.com
**API Base:** `https://api.betfair.com/exchange/betting/rest/v1.0`
**Documentation:** https://developer.betfair.com/

### Status: ⚠️ REQUIRES AUTHENTICATION

### Authentication
- **Required:** Yes (API key + username/password)
- **Method:** Session token via SSOID

### Setup Process
1. Create Betfair account
2. Apply for API access at developer.betfair.com
3. Create application to get APP_KEY
4. Use login endpoint to get session token

### Rate Limits
- **Documented:** 12 requests/second per endpoint
- **Observed:** N/A (not tested without auth)

### Data Format
- **Format:** JSON
- **Price Format:** Decimal odds (e.g., 2.5 = 40% implied probability)
- **Volume:** Available in GBP

### Endpoints Used

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/listEventTypes` | POST | List sports/categories |
| `/listEvents` | POST | Events for category |
| `/listMarketCatalogue` | POST | Markets for event |
| `/listMarketBook` | POST | Current prices |

### Environment Variables Required
```bash
export BETFAIR_APP_KEY="your_app_key"
export BETFAIR_USERNAME="your_username"
export BETFAIR_PASSWORD="your_password"
```

### Gotchas
1. Authentication required for all endpoints
2. Regional restrictions (may need VPN for some users)
3. Politics event type ID: 2378961
4. Decimal odds conversion: probability = 1 / odds

---

## Data Normalization

All clients normalize data to a common schema:

### MarketData
```python
{
    'market_id': str,      # Platform-specific ID
    'market_name': str,    # Human-readable name
    'source': str,         # Platform name
    'category': str,       # 'politics', 'elections', etc.
    'status': str,         # 'open', 'closed', 'resolved'
    'contracts': [...],    # List of ContractData
    'url': str,            # Link to market page
    'total_volume': float, # Total USD volume
    'last_updated': str,   # ISO timestamp
}
```

### ContractData
```python
{
    'contract_id': str,
    'contract_name': str,
    'yes_price': float,    # 0.0 to 1.0 probability
    'no_price': float,     # 0.0 to 1.0 probability
    'yes_bid': float,      # Best bid for YES
    'yes_ask': float,      # Best ask for YES
    'volume': float,       # USD volume
}
```

---

## Recommendations

1. **For Real-Time Data:** Use Kalshi or Polymarket (best coverage + API)
2. **For US Markets:** PredictIt has cleaner data structure
3. **For International:** Smarkets and Betfair have global coverage
4. **Rate Limiting:** Implement exponential backoff for all clients
5. **Caching:** Cache responses for 30-60 seconds to reduce API calls

---

## Known Issues

1. **PredictIt:** May be shutting down - monitor CFTC status
2. **Kalshi:** Aggressive rate limiting, add delays
3. **Polymarket:** Blockchain delays possible
4. **Smarkets:** Fewer US political markets
5. **Betfair:** Requires account, regional restrictions
