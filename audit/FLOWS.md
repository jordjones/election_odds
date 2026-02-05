# User Flows - electionbettingodds.com

**Last Updated:** 2026-02-05

## Overview

This site is primarily a **read-only data display** application. All flows are unauthenticated and involve viewing/navigating public information.

---

## Flow 1: View Current Election Odds

**Purpose:** Check the latest betting odds for upcoming elections

**Entry Point:** Homepage (`/`)

```
┌─────────────────────────────────────────────────────────────────────┐
│                           FLOW DIAGRAM                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   [User] ──→ [Homepage] ──→ [Scroll to desired race table]         │
│                    │                                                │
│                    ├──→ [View aggregated odds]                      │
│                    │                                                │
│                    └──→ [Compare across markets]                    │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**Steps:**
1. Navigate to https://electionbettingodds.com/
2. Scroll to find desired race (Supreme Court, 2028 President, etc.)
3. View the odds table showing:
   - Candidate/outcome name with thumbnail
   - Odds from each betting market
   - Bid-ask range per market
   - Total $ bet per market
   - Aggregated probability with change indicator
4. Click on "details" link to view more information (external)

**User Inputs:** None (view only)

**Success State:** User sees current odds data

**Failure States:**
- Page fails to load (server error)
- Data is stale (no indicators of staleness visible)

**Screenshot:** `01_homepage.png`

---

## Flow 2: Filter by Time Period

**Purpose:** View odds changes over different time periods

**Entry Point:** Any page with time filter dropdown

```
┌─────────────────────────────────────────────────────────────────────┐
│                           FLOW DIAGRAM                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   [Odds Table] ──→ [Dropdown Select] ──→ [Page Reload]             │
│                          │                      │                   │
│                          ├── "in last 4hr"  ────┤                   │
│                          ├── "in last day"  ────┤                   │
│                          ├── "in last wk"   ────┤                   │
│                          └── "CHARTS"       ────┴──→ [Charts View]  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**Steps:**
1. Locate dropdown near the odds table header
2. Click dropdown to reveal options:
   - "in last 4hr" → `/{topic}_4hr.html`
   - "in last day" → `/{topic}.html`
   - "in last wk" → `/{topic}_week.html`
   - "CHARTS" → `/{topic}.html#chart`
3. Select desired time period
4. Page reloads with filtered data

**User Inputs:**
- Dropdown selection (1 click)

**Success State:** Page reloads with time-filtered odds

**Failure States:**
- JavaScript disabled (dropdown may not work)
- Invalid URL (404 if time period doesn't exist)

---

## Flow 3: View Historical Charts

**Purpose:** Analyze trends in odds over time

**Entry Point:** Charts page (`/President2024.html#chart`) or via dropdown

```
┌─────────────────────────────────────────────────────────────────────┐
│                           FLOW DIAGRAM                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   [Navigation] ──→ [Charts Link] ──→ [Charts Page]                 │
│                                           │                         │
│                                           ├──→ [View line chart]   │
│                                           │                         │
│                                           └──→ [Hover for tooltip] │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**Steps:**
1. Click "Charts" in main navigation
2. Wait for Google Charts to load (iframe content)
3. View interactive time-series chart
4. Hover over data points for exact values
5. Scroll down for additional tables

**User Inputs:**
- Click on Charts link
- Hover interactions on chart

**Success State:** Interactive chart displays with historical data

**Failure States:**
- Google Charts fails to load (blank iframe)
- JavaScript blocked
- Network timeout on chart resources

**Screenshot:** `03_charts_page.png`

---

## Flow 4: Navigate to Specific Race

**Purpose:** View odds for a specific race type

**Entry Point:** Main navigation

```
┌─────────────────────────────────────────────────────────────────────┐
│                           FLOW DIAGRAM                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   [Navigation Bar]                                                  │
│        │                                                            │
│        ├── [House Control] ──→ /House-Control-2026.html            │
│        ├── [Senate Control] ──→ /Senate-Control-2026.html          │
│        ├── [DEM Nom] ──→ /DEMPrimary2028.html                      │
│        ├── [GOP Nom] ──→ /GOPPrimary2028.html                      │
│        ├── [General by Party] ──→ /PresidentialParty2028.html      │
│        └── [By Candidate] ──→ /President2028.html                  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**Steps:**
1. Locate navigation bar at top of page
2. Click desired race type
3. Page loads with focused odds tables for that race

**User Inputs:**
- Navigation click (1 click)

**Success State:** Race-specific page loads with relevant tables

**Screenshot:** See `02_page_6_House_Control.png` through `02_page_11_By_Candidate.png`

---

## Flow 5: Research Methodology & Accuracy

**Purpose:** Understand how odds are calculated and historical accuracy

**Entry Point:** About page or Track Record page

```
┌─────────────────────────────────────────────────────────────────────┐
│                           FLOW DIAGRAM                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   [Footer Links]                                                    │
│        │                                                            │
│        ├── [Why This Beats Polls] ──→ /about.html                  │
│        │         └──→ Read methodology explanation                  │
│        │                                                            │
│        ├── [How People Bet] ──→ /about.html#whyBetfair             │
│        │         └──→ Learn about betting platforms                 │
│        │                                                            │
│        └── [Track Record] ──→ /TrackRecord.html                    │
│                  └──→ Review historical accuracy (808 predictions)  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**Steps (About):**
1. Scroll to bottom or click "About" link
2. Read FAQ and methodology
3. (Optional) Click anchor to betting platform info

**Steps (Track Record):**
1. Click "Track Record" in navigation
2. View accuracy tables with Brier scores
3. Review historical win/loss data

**User Inputs:** Navigation clicks only

**Success State:** User understands methodology and accuracy

**Screenshots:** `04_about_page.png`, `05_track_record.png`

---

## Flow 6: Access External Betting Platform

**Purpose:** Place actual bets on external platforms

**Entry Point:** Market links in odds tables

```
┌─────────────────────────────────────────────────────────────────────┐
│                           FLOW DIAGRAM                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   [Odds Table Row]                                                  │
│        │                                                            │
│        └── [Click "details" or market name]                        │
│                    │                                                │
│                    └──→ [External Platform] (new tab/window)       │
│                              │                                      │
│                              ├── Kalshi                            │
│                              ├── Polymarket                        │
│                              ├── Betfair                           │
│                              ├── PredictIt                         │
│                              └── Smarkets                          │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**Steps:**
1. Find desired candidate/outcome in odds table
2. Click "details" link or market name
3. Browser opens external betting platform
4. User completes registration/betting on external site

**User Inputs:**
- Click on external link

**Success State:** User lands on relevant page of betting platform

**Note:** This site does NOT facilitate betting directly

---

## Summary of Interactive Elements

| Element Type | Count | Purpose |
|--------------|-------|---------|
| Navigation Links | 11 | Page navigation |
| Dropdown Selects | 3 | Time filtering |
| Detail Links | ~50+ | External platform access |
| Chart Interactions | 1 | Data exploration |
| Buttons | 2 | Minimal (possibly expand/collapse) |
| Forms | 0 | No user input forms |
| Modals | 0 | No modal dialogs |
