# Election Odds

Data aggregation platform for election prediction markets. Scrapes and syncs odds from Polymarket, Kalshi, PredictIt, and Smarkets, stores them in SQLite (local) and Supabase/PostgreSQL (production), and serves a Next.js frontend.

## Project Structure

```
election_odds/
├── api_clients/          # Python API clients for each prediction market
│   ├── base.py           # Shared base client
│   ├── kalshi.py
│   ├── polymarket.py
│   ├── predictit.py
│   └── smarkets.py
├── scripts/              # Data pipeline scripts
│   ├── sync.py           # Incremental sync from APIs (--since for incremental)
│   ├── sync_supabase.py  # Sync to Supabase (--featured-only for site_markets)
│   ├── backfill.py       # Historical backfill from APIs
│   ├── backfill_electionbettingodds.py  # Scraper for aggregated odds
│   ├── storage.py        # SQLite storage layer
│   ├── storage_supabase.py  # PostgreSQL/Supabase storage layer
│   ├── cleanup_supabase.py  # Thin non-site snapshots to 1/day
│   └── populate_site_markets.py  # Seed site_markets table
├── web/                  # Next.js frontend (App Router)
│   └── src/
│       ├── app/
│       │   ├── (routes)/         # Page routes
│       │   │   ├── presidential/ # Presidential odds
│       │   │   ├── primaries/    # Presidential primaries
│       │   │   ├── races/        # House/Senate control
│       │   │   ├── senate/       # Senate races overview + [state] detail
│       │   │   ├── charts/       # Historical charts
│       │   │   ├── track-record/ # Prediction accuracy
│       │   │   └── about/
│       │   └── api/              # API routes
│       │       ├── markets/      # Main markets endpoint
│       │       ├── senate-races/ # All 35 state senate races
│       │       ├── senate-primaries/ # Senate primary elections
│       │       ├── charts/       # Chart data
│       │       ├── stats/        # Site statistics
│       │       └── track-record/ # Accuracy data
│       ├── components/
│       │   ├── odds/             # OddsTable, CandidateRow, MarketCard, etc.
│       │   ├── layout/           # Header, footer, navigation
│       │   └── ui/               # shadcn/ui primitives
│       ├── hooks/
│       │   └── useMarkets.ts     # React Query hooks for all data fetching
│       └── lib/
│           ├── db-pg.ts          # PostgreSQL database layer (production)
│           ├── db.ts             # SQLite database layer (local dev)
│           ├── types.ts          # Shared TypeScript types
│           ├── api/client.ts     # Frontend API client class
│           ├── use-postgres.ts   # Toggle between pg/sqlite
│           └── utils.ts          # Formatting, colors, helpers
├── data/                 # Local SQLite database
│   └── election_odds.db
├── supabase/             # Database migrations and DDL
└── Makefile              # Common operations (make help)
```

## Key Architecture Decisions

### Dual Database Layer
- **`db-pg.ts`** — PostgreSQL via connection pool, uses LATERAL JOINs for latest prices. Used in production (Supabase).
- **`db.ts`** — SQLite via better-sqlite3, uses ROW_NUMBER() window functions. Used for local dev.
- **`use-postgres.ts`** — Runtime toggle based on `DATABASE_URL` env var.
- Both files must be kept in sync when adding new queries/functions.

### Market Aggregation
- Each prediction market source stores raw contracts independently.
- At query time, contracts are normalized by candidate name, aggregated across sources, and priced as an average of fresh sources.
- `extractCandidateName()` handles diverse contract naming conventions ("Will X win...", party names, placeholders).
- `excludeIlliquidSources()` detects broken/illiquid markets (e.g., Kalshi showing ~50/50 for all contracts).
- `getFreshPrices()` filters out stale prices (>48h old vs freshest source).

### Senate Races
- 35 states (Class II + OH special election) in `SENATE_STATES_2026`.
- When both party-level contracts (PredictIt: "Which party will win...") and candidate-level contracts (Polymarket: "Election Winner") exist for a state, **keep party-level, drop candidates** for consistency.
- Competitive vs Safe: 2nd-highest price among Democrat/Republican/Independent >= 10%.
- Primaries: 19 markets across 14 states. PredictIt has no volume data — hide volume column when `totalVolume === 0`.

### Components
- **`OddsTable`** — Main data table with per-source price columns, change period selector, and optional volume column (`hideVolume` prop).
- **`CandidateRow`** — Single candidate row with avatar, prices per source, change indicator, volume.
- **`MarketCard`** — Card view for market overview pages.

## Development

```bash
cd web
npm run dev          # Start dev server on :3000 (uses SQLite)
npx tsc --noEmit     # Type check
```

## Deployment

```bash
make deploy          # Trigger Netlify remote build
make deploy-status   # Check build status
make set-db-url URL="..."  # Update DATABASE_URL in GitHub + Netlify
```

## Data Sync (GitHub Actions)

- **Every 5 min**: `sync_supabase.py --source all --featured-only` (only site_markets)
- **Twice daily**: `sync_supabase.py --source all` (all markets)
- **Cleanup**: `cleanup_supabase.py` thins non-site snapshots to 1/day

## Conventions

- API routes return JSON arrays of `Market` objects (see `types.ts`).
- React Query hooks in `useMarkets.ts` for all client-side data fetching.
- All price values are 0-1 decimals (not percentages). Format with `formatPercent()`.
- Candidate names are normalized to lowercase for dedup keys, display names preserve casing.
- Use `make help` to see all available Makefile targets.
