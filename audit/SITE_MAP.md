# Site Map - electionbettingodds.com

**Last Updated:** 2026-02-05
**Base URL:** https://electionbettingodds.com

## Navigation Structure

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          PRIMARY NAVIGATION                             │
├─────────────────────────────────────────────────────────────────────────┤
│  Home  │  Charts  │  Track Record  │  House  │  Senate  │ 2028 Races   │
│                                    │ Control │ Control  │              │
└─────────────────────────────────────────────────────────────────────────┘
```

### Main Navigation Links

| Link Text | URL | Description |
|-----------|-----|-------------|
| Home | `/` | Main landing page with all current odds |
| Charts | `/President2024.html#chart` | Historical charts for 2024 election |
| Track Record | `/TrackRecord.html` | Historical accuracy of betting odds |
| House Control | `/House-Control-2026.html` | 2026 House control betting odds |
| Senate Control | `/Senate-Control-2026.html` | 2026 Senate control betting odds |
| DEM Nom | `/DEMPrimary2028.html` | 2028 Democratic nominee odds |
| GOP Nom | `/GOPPrimary2028.html` | 2028 Republican nominee odds |
| General by Party | `/PresidentialParty2028.html` | 2028 Presidential odds by party |
| By Candidate | `/President2028.html` | 2028 Presidential odds by candidate |

### Secondary Navigation / Footer Links

| Link Text | URL | Description |
|-----------|-----|-------------|
| Why This Beats Polls | `/about.html` | Methodology explanation |
| How People Bet | `/about.html#whyBetfair` | Betting platform info |
| About these odds and FAQ | `/about.html` | FAQ section |

---

## Page Inventory

### 1. Homepage (`/`)
- **Title:** Election Betting Odds by Maxim Lott and John Stossel
- **Screenshot:** `01_homepage.png`, `02_page_3_Home.png`
- **Content:**
  - 31 data tables with current betting odds
  - Aggregated odds from multiple betting markets
  - Covers: Supreme Court decisions, 2028 Presidency by party, 2028 Presidential candidates
- **Key Sections:**
  - Supreme Court tariff ruling odds
  - 2028 Presidency by party
  - 2028 Presidency by candidate (extensive list)

### 2. About/FAQ Page (`/about.html`)
- **Title:** Election Betting Odds by Maxim Lott
- **Screenshot:** `02_page_1_About_these_odds_and_FAQ.png`, `04_about_page.png`
- **Content:**
  - FAQ section
  - Explanation of betting markets
  - References to: Polymarket, PredictIt, Betfair, Kalshi

### 3. Charts Page (`/President2024.html#chart`)
- **Title:** Election Betting Odds by Maxim Lott and John Stossel
- **Screenshot:** `02_page_4_Charts.png`, `03_charts_page.png`
- **Content:**
  - 5 data tables
  - 4 embedded iframes (Google Charts)
  - Interactive time-series charts using Google Charts library
  - Chart container: `#WIN_chart_div`

### 4. Track Record Page (`/TrackRecord.html`)
- **Title:** Election Betting Odds by Maxim Lott
- **Screenshot:** `02_page_5_Track_Record.png`, `05_track_record.png`
- **Content:**
  - 2 tables (13 rows + 808 rows)
  - Historical accuracy data
  - Brier score calculations
  - Data from 2016+ elections

### 5. House Control 2026 (`/House-Control-2026.html`)
- **Title:** Election Betting Odds by Maxim Lott and John Stossel
- **Screenshot:** `02_page_6_House_Control.png`
- **Content:**
  - 6 data tables
  - House control betting odds

### 6. Senate Control 2026 (`/Senate-Control-2026.html`)
- **Title:** Election Betting Odds by Maxim Lott and John Stossel
- **Screenshot:** `02_page_7_Senate_Control.png`
- **Content:**
  - 6 data tables
  - Senate control betting odds

### 7. DEM Primary 2028 (`/DEMPrimary2028.html`)
- **Title:** Election Betting Odds by Maxim Lott and John Stossel
- **Screenshot:** `02_page_8_DEM_Nom.png`
- **Content:**
  - 19 data tables
  - Democratic nominee betting odds

### 8. GOP Primary 2028 (`/GOPPrimary2028.html`)
- **Title:** Election Betting Odds by Maxim Lott and John Stossel
- **Screenshot:** `02_page_9_GOP_Nom.png`
- **Content:**
  - 23 data tables
  - Republican nominee betting odds

### 9. Presidential Party 2028 (`/PresidentialParty2028.html`)
- **Title:** Election Betting Odds by Maxim Lott and John Stossel
- **Screenshot:** `02_page_10_General_by_Party.png`
- **Content:**
  - 6 data tables
  - Odds by party (DEM vs GOP)

### 10. President 2028 By Candidate (`/President2028.html`)
- **Title:** Election Betting Odds by Maxim Lott and John Stossel
- **Screenshot:** `02_page_11_By_Candidate.png`
- **Content:**
  - 28 data tables
  - Individual candidate odds (Vance, Newsom, DeSantis, AOC, etc.)

---

## URL Patterns

| Pattern | Example | Description |
|---------|---------|-------------|
| `/{Topic}.html` | `/TrackRecord.html` | Standard page |
| `/{Topic}_{timeframe}.html` | `/President2028_4hr.html` | Time-filtered view |
| `/{Topic}.html#chart` | `/President2028.html#chart` | Charts section |
| `/{Race}-{Year}.html` | `/House-Control-2026.html` | Year-specific race |
| `/{Party}Primary{Year}.html` | `/DEMPrimary2028.html` | Party primary |

---

## External Links (Betting Platforms)

| Platform | URL | Region |
|----------|-----|--------|
| Betfair | https://www.betfair.com/exchange/plus/politics | UK 🇬🇧 |
| Smarkets | https://smarkets.com/politics | UK 🇬🇧 |
| PredictIt | https://www.predictit.org/promo/electionbetting | US 🇺🇸 |
| Polymarket | https://polymarket.com/ | International 🌎 |
| Kalshi | https://kalshi.com/events/politics | US 🇺🇸 |

---

## Site Authors

- **Maxim Lott** - https://www.maximumtruth.org/ / http://maximlott.com/
- **John Stossel** - https://twitter.com/johnstossel / http://johnstossel.com/
