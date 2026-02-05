# API Inventory - electionbettingodds.com

**Last Updated:** 2026-02-05
**Method:** Playwright HAR capture across all critical flows

---

## Executive Summary

**Key Finding: This site has NO first-party APIs.**

The website is entirely **static HTML** with all betting odds data pre-rendered and embedded directly into the HTML pages. There are no:
- REST endpoints
- GraphQL endpoints
- WebSocket connections
- Server-Sent Events (SSE)
- AJAX/XHR calls to first-party servers

All dynamic behavior comes from:
1. Client-side auto-refresh (page reload every 5 minutes)
2. Google Charts for visualization (data embedded in JavaScript)
3. Third-party analytics/tracking services

---

## Traffic Analysis Summary

| Metric | Value |
|--------|-------|
| Total Requests Captured | 451 |
| Unique Hosts | 13 |
| First-Party Requests | 178 |
| Third-Party Requests | 273 |
| XHR/Fetch to First-Party | **0** |
| XHR/Fetch to Third-Party | 51 (all analytics) |

---

## First-Party Endpoints

### Document Requests (Static HTML)

All first-party requests are static HTML pages and images. No API endpoints exist.

| Method | Path Pattern | Content-Type | Purpose |
|--------|--------------|--------------|---------|
| GET | `/` | text/html | Homepage |
| GET | `/President2024.html` | text/html | 2024 Election page |
| GET | `/President2028.html` | text/html | 2028 Election by candidate |
| GET | `/President2028_4hr.html` | text/html | 4-hour filtered view |
| GET | `/President2028_week.html` | text/html | Weekly filtered view |
| GET | `/PresidentialParty2028.html` | text/html | 2028 by party |
| GET | `/House-Control-2026.html` | text/html | House control odds |
| GET | `/Senate-Control-2026.html` | text/html | Senate control odds |
| GET | `/DEMPrimary2028.html` | text/html | Democratic primary |
| GET | `/GOPPrimary2028.html` | text/html | Republican primary |
| GET | `/TrackRecord.html` | text/html | Historical accuracy |
| GET | `/about.html` | text/html | About/FAQ |

### Static Assets

| Type | Count | Example Path |
|------|-------|--------------|
| Images | 167 | `/images/candidates/*.jpg` |
| Documents | 11 | `/*.html` |

---

## Data Architecture

### How Data is Served

```
┌─────────────────────────────────────────────────────────────────────┐
│                    DATA FLOW ARCHITECTURE                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  [Betting Markets]     [Backend Process]      [Static HTML]        │
│  - Kalshi        ───►  (Unknown)         ───► Embedded data        │
│  - Polymarket          - Aggregation          in HTML tables       │
│  - Betfair             - HTML generation                           │
│  - PredictIt                                                       │
│  - Smarkets                                                        │
│                                                                     │
│                              │                                      │
│                              ▼                                      │
│                     [Web Server]                                    │
│                     Static file serving                             │
│                              │                                      │
│                              ▼                                      │
│                     [User Browser]                                  │
│                     - Renders HTML                                  │
│                     - Auto-refresh every 5 min                     │
│                     - Google Charts for viz                         │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Data Embedded in HTML

**Table Data:** Odds are directly in HTML `<table>` elements:
```html
<td>68.0%
    +0.0%
</td>
```

**Chart Data:** Historical data is embedded in JavaScript:
```javascript
google.charts.load('current', {packages: ['line']});
var data = new google.visualization.DataTable();
data.addColumn('datetime', 'X');
data.addColumn('number', 'Harris');
data.addColumn('number', 'Trump');
// ... more columns

data.addRows([
  [new Date(2021,0,20,22,19,22), 19.8, 5.8, ...],
  [new Date(2021,0,26,20,31,00), 20.3, 6.8, ...],
  // ... hundreds of data points
]);
```

---

## Auto-Refresh Mechanism

The site uses client-side auto-refresh:

```javascript
var timer = setInterval("autoRefresh()", 1000 * 5 * 60);
function autoRefresh() {
    self.location.reload(true);
}
```

**Behavior:**
- Full page reload every 5 minutes
- Forces cache bypass (`reload(true)`)
- Ensures data freshness without APIs

---

## API Endpoints by Feature

### Feature: View Odds

| Endpoint | Method | Type |
|----------|--------|------|
| N/A | - | Static HTML |

**Data Source:** Pre-rendered in HTML tables

### Feature: Historical Charts

| Endpoint | Method | Type |
|----------|--------|------|
| N/A | - | Static HTML with embedded JS |

**Data Source:** JavaScript DataTable embedded in page

### Feature: Time-Filtered Views

| Endpoint | Method | Type |
|----------|--------|------|
| `/*_4hr.html` | GET | Static HTML |
| `/*_week.html` | GET | Static HTML |

**Data Source:** Separate pre-generated HTML files

---

## Authentication

**None.** The site is entirely public with no authentication requirements.

| Auth Type | Used |
|-----------|------|
| Session cookies | ❌ |
| Bearer tokens | ❌ |
| API keys | ❌ |
| OAuth | ❌ |
| Basic auth | ❌ |

---

## Rate Limiting / Caching

### Observed Headers

No rate limiting headers observed. Standard caching:

| Header | Observed Value |
|--------|----------------|
| Cache-Control | Not explicitly set |
| ETag | Not observed |
| Last-Modified | Not observed |

The auto-refresh with `reload(true)` bypasses browser cache.

---

## Error Cases

No errors observed during capture (all 200 OK for first-party).

---

## Recommendations for Reverse Engineering

If building a client to consume this data:

1. **Scrape HTML tables** - Parse `<table>` elements for odds data
2. **Extract chart data** - Parse JavaScript for `data.addRows([...])` arrays
3. **Poll pages** - Refresh every 5 minutes (matching site behavior)
4. **Handle multiple pages** - Each race has separate HTML files

### Potential Data Structure

```json
{
  "candidate": "Vance",
  "markets": [
    {
      "name": "Kalshi",
      "region": "US",
      "bidAsk": "26.0-27.0%",
      "volume": 5952889
    },
    {
      "name": "Betfair",
      "region": "UK",
      "bidAsk": "21.7-22.7%",
      "volume": 954004
    }
  ],
  "aggregated": 24.5,
  "change": -0.1
}
```

---

## Conclusion

**electionbettingodds.com operates as a static site generator output, not a dynamic web application.**

The backend (not accessible) likely:
1. Polls betting market APIs (Polymarket, Kalshi, Betfair, PredictIt, Smarkets)
2. Aggregates and calculates combined odds
3. Generates static HTML files
4. Deploys to web server

The frontend simply serves these pre-generated files with no client-server API communication.
