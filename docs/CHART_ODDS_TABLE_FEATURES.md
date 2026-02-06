# Chart & Odds Table Features

This document summarizes the recent improvements to the presidential candidates page that should be applied to all market pages.

## Recent Commits (Feb 5-6, 2026)

### 1. Chart Label Positioning & Dynamic Y-Axis (5e7718c)

**Files Changed:**
- `web/src/app/api/charts/[id]/route.ts`
- `web/src/components/odds/OddsChart.tsx`

**Features:**
- Labels positioned on right side with smart overlap handling
- Labels shrink up to 40% when crowded (minimum spacing maintained)
- Labels can extend into x-axis area for better visibility
- Label background opacity: 0.69
- Y-axis "fit to data" recalculates based on **visible** contracts only
- Toggling candidates in legend updates chart scale automatically
- Chart displays top 10 candidates (previously 6)

---

### 2. X (Twitter) Links for Candidates (b9b4754)

**Files Changed:**
- `web/src/components/odds/CandidateRow.tsx`

**Features:**
- `getTwitterHandle()` function with ~100 candidate handles
- @handle displayed under candidate name in smaller text
- Links open in new tab with hover effect
- Coverage: politicians, media figures, business leaders, Trump family

---

### 3. Change Period Toggle (396e179)

**Files Changed:**
- `web/src/app/(routes)/presidential/[view]/page.tsx`
- `web/src/app/api/markets/route.ts`
- `web/src/components/odds/CandidateRow.tsx`
- `web/src/components/odds/OddsTable.tsx`
- `web/src/hooks/useMarkets.ts`
- `web/src/lib/api/client.ts`
- `web/src/lib/db.ts`

**Features:**
- 24h / 7d / 30d toggle buttons in "Chg" column header
- Price changes calculated from electionbettingodds source (matches chart data)
- Market columns ordered: Polymarket, PredictIt, Kalshi, Smarkets
- Removed "All" option from change period selector
- `changePeriod` state lifted to page component
- API routes accept `changePeriod` parameter

---

### 4. Candidate Headshot Images (a785d3f)

**Files Changed:**
- `web/src/components/odds/CandidateRow.tsx`
- `web/src/lib/db.ts`

**Features:**
- Wikipedia Commons image URLs for ~100+ candidates
- Per-candidate zoom/position settings for optimal face display
- Fallback initials display for candidates without images
- Coverage: politicians, Trump family, Cabinet officials, governors, senators, media figures

---

### 5. Initial Headshots & Chart/Odds Display Improvements (6faeaf4)

**Files Changed:**
- `web/src/app/api/charts/[id]/route.ts`
- `web/src/components/odds/CandidateRow.tsx`
- `web/src/components/odds/OddsChart.tsx`
- `web/src/lib/db.ts`
- `web/src/lib/types.ts`
- Multiple page files

**Features:**
- Wikipedia Commons headshots for 130+ candidates
- Party logos (Democratic/Republican SVGs)
- Time filter default changed to "All time"
- Removed "Last 4 hours" option
- Decimal precision on percentages (24% → 24.2%)
- Kalshi KXPRESPERSON contract name mapping
- Name aliases for variations (Beto O'Rourke, Stephen A. Smith, etc.)
- Removed Betfair from UI

---

## Components to Reuse

| Component | Location | Purpose |
|-----------|----------|---------|
| `OddsChart` | `web/src/components/odds/OddsChart.tsx` | Price history chart with legend toggle |
| `OddsTable` | `web/src/components/odds/OddsTable.tsx` | Multi-source odds comparison table |
| `CandidateRow` | `web/src/components/odds/CandidateRow.tsx` | Table row with headshot, X link, prices |
| `TimeFilterDropdown` | `web/src/components/odds/TimeFilterDropdown.tsx` | Chart time period selector |

## API Endpoints

| Endpoint | Purpose |
|----------|---------|
| `GET /api/markets?changePeriod=1d` | Fetch market data with price changes |
| `GET /api/charts/[id]?period=all` | Fetch chart data for specific market |

## Implementation Checklist for New Market Pages

- [ ] Import and use `OddsChart` component
- [ ] Import and use `OddsTable` component
- [ ] Add `changePeriod` state with useState
- [ ] Pass `changePeriod` to `useMarkets` hook
- [ ] Pass `changePeriod` and `onChangePeriodChange` to `OddsTable`
- [ ] Ensure market ID maps correctly in `getChartMarketId()` function
- [ ] Add candidate images to `db.ts` if new candidates
- [ ] Add Twitter handles to `CandidateRow.tsx` if new candidates
