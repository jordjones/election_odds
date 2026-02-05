# Features Inventory - electionbettingodds.com

**Last Updated:** 2026-02-05

## Core Features

### 1. Multi-Market Odds Aggregation
**Description:** Aggregates betting odds from multiple prediction markets and displays them in a unified interface.

**Supported Markets:**
| Market | Region | Flag | Example Data |
|--------|--------|------|--------------|
| Kalshi | US | 🇺🇸 | $9,310,566 bet volume |
| Polymarket | International | 🌎 | $3,949,874 bet volume |
| Betfair | UK | 🇬🇧 | $954,004 bet volume |
| PredictIt | US | 🇺🇸 | $733,204 bet volume |
| Smarkets | UK | 🇬🇧 | $169,055 bet volume |

**Data Points Shown:**
- Market name with regional flag
- Bid-Ask range (e.g., "26.0-27.0%")
- Total $ bet per market
- Aggregated probability with change indicator (e.g., "24.5% -0.1%")

---

### 2. Presidential Election Odds
**Coverage:**
- 2028 Presidential Election (by candidate)
- 2028 Presidential Election (by party)
- Historical 2024 data (archived with charts)

**Candidates Tracked (2028):**
- JD Vance (leading at 24.5%)
- Gavin Newsom
- Ron DeSantis
- AOC
- Many others (141 rows of candidates)

---

### 3. Congressional Election Odds
**Coverage:**
- House Control 2026
- Senate Control 2026

---

### 4. Primary Election Odds
**Coverage:**
- 2028 Democratic Primary Nominee
- 2028 Republican Primary Nominee

---

### 5. Special Events/Decisions
**Coverage:**
- Supreme Court decisions (e.g., Trump tariffs ruling)
- Current volume: $13,260,426 bet

---

### 6. Historical Charts
**Technology:** Google Charts (via gstatic.com loader)
**Features:**
- Interactive time-series visualization
- Embedded in iframes (4 iframes on charts page)
- SVG-based rendering (3 SVG elements detected)
- Main container: `#WIN_chart_div`

**Chart Types:**
- Line charts for odds over time
- Range controls for date selection

---

### 7. Time-Based Filtering
**Dropdown Options:**
| Option | URL Suffix | Description |
|--------|------------|-------------|
| Last 4 hours | `_4hr.html` | Most recent changes |
| Last day | `.html` (default) | Daily snapshot |
| Last week | `_week.html` | Weekly view |
| Charts | `.html#chart` | Jump to charts |

**Example Dropdowns (3 detected on homepage):**
1. Supreme Court tariff ruling filter
2. Presidency 2028 by party filter
3. Presidency 2028 by candidate filter

---

### 8. Track Record / Accuracy History
**Purpose:** Demonstrates historical accuracy of betting odds predictions

**Data Included:**
- 808 historical predictions
- Brier score calculations
- Elections from 2016 onwards
- Win/loss outcomes

**Example Data:**
| Year | Type | State | Candidate | EBO Probability | Won? | Brier Score |
|------|------|-------|-----------|-----------------|------|-------------|
| 2016 | Brexit | UK | Leave | 24.9% | Won 1 | 0.5640 |
| 2016 | General | AK | Clinton | 14.5% | Lost 0 | 0.0210 |

---

### 9. Candidate Detail Views
**Trigger:** Click on candidate name or "details" link
**URL Pattern:** Links to external betting platforms for detailed market info

---

## Feature Matrix

| Feature | Homepage | Charts | Track Record | Race Pages |
|---------|----------|--------|--------------|------------|
| Odds Tables | ✅ | ✅ | - | ✅ |
| Multi-Market Comparison | ✅ | - | - | ✅ |
| Time Filtering | ✅ | - | - | ✅ |
| Interactive Charts | - | ✅ | - | ✅ (via link) |
| Historical Accuracy | - | - | ✅ | - |
| Candidate Photos | ✅ | - | - | ✅ |
| Volume Tracking | ✅ | - | - | ✅ |
| Change Indicators (+/-) | ✅ | - | - | ✅ |

---

## Data Update Frequency

Based on time filter options, data appears to update:
- Real-time/near real-time (4-hour option suggests frequent updates)
- Likely automated aggregation from source APIs

---

## What the Site Does NOT Do

1. **No user accounts** - No authentication required, public access only
2. **No direct betting** - Links out to platforms, doesn't facilitate bets
3. **No personalization** - No saved preferences or watchlists
4. **No push notifications** - No alerts for odds changes
5. **No API access** - No documented public API for developers
6. **No mobile app** - Web-only experience
7. **No commenting/community** - Pure data display, no social features
