# Architecture

This document describes the architecture of the Election Odds Aggregator web application.

## Overview

The application is built with Next.js 14 using the App Router pattern. It aggregates prediction market data from multiple sources and presents it in a unified interface.

## System Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        Client Browser                           │
├─────────────────────────────────────────────────────────────────┤
│  React Components                                               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │
│  │   Header    │  │  OddsTable  │  │  OddsChart  │            │
│  └─────────────┘  └─────────────┘  └─────────────┘            │
│                                                                 │
│  TanStack Query (Caching & State Management)                   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Next.js Server                              │
├─────────────────────────────────────────────────────────────────┤
│  API Routes (/api/*)                                            │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │
│  │  /markets   │  │   /charts   │  │   /stats    │            │
│  └─────────────┘  └─────────────┘  └─────────────┘            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Data Aggregation Layer                       │
├─────────────────────────────────────────────────────────────────┤
│  Currently: Mock Data (mock-data.ts)                           │
│  Future: Python API Clients → Backend API                      │
│                                                                 │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐         │
│  │PredictIt │ │  Kalshi  │ │Polymarket│ │ Smarkets │         │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘         │
└─────────────────────────────────────────────────────────────────┘
```

## Component Architecture

### Layout Components

```
Header
├── Logo
├── NavigationMenu (desktop)
│   ├── NavItem (simple link)
│   └── NavDropdown (with children)
└── MobileMenu (hamburger)

Footer
├── About Links
├── Market Links
├── Source Links (external)
└── Legal Links
```

### Odds Components

```
OddsTable
├── TableHeader
│   └── Source columns (PredictIt, Kalshi, etc.)
└── CandidateRow[]
    ├── Rank
    ├── Name
    ├── AggregatedPrice
    ├── PriceChange
    ├── MarketPriceCell[] (per source)
    │   └── Tooltip (bid/ask/spread/volume)
    └── Volume

OddsChart
├── TimeFilterDropdown
├── ResponsiveContainer
│   └── LineChart (Recharts)
│       ├── CartesianGrid
│       ├── XAxis / YAxis
│       ├── Tooltip
│       ├── Legend
│       └── Line[] (per contract)
└── Loading/Empty states

MarketCard (for homepage)
├── Title + Status Badge
├── Top 3 Contracts
│   └── Name + Change + Price
└── Volume + End Date
```

## Data Flow

### Query Pattern

```typescript
// hooks/useMarkets.ts
export function useMarkets(params?) {
  return useQuery({
    queryKey: ['markets', params],
    queryFn: () => apiClient.getMarkets(params),
  });
}

// Usage in component
const { data, isLoading, error } = useMarkets({ category: 'presidential' });
```

### Caching Strategy

- **staleTime**: 1 minute (data considered fresh)
- **refetchInterval**: 5 minutes (background refresh)
- **refetchOnWindowFocus**: true

## Type System

### Core Types

```typescript
// Market structure
interface Market {
  id: string;
  slug: string;
  name: string;
  category: MarketCategory;
  status: MarketStatus;
  contracts: Contract[];
  totalVolume: number;
  endDate?: string;
  lastUpdated: string;
}

// Contract with prices from multiple sources
interface Contract {
  id: string;
  name: string;
  prices: MarketPrice[];     // Array of prices from each source
  aggregatedPrice: number;    // Weighted average
  priceChange: number;        // 24h change
  totalVolume: number;
}

// Price from a single source
interface MarketPrice {
  source: MarketSource;
  region: MarketRegion;
  yesPrice: number;          // 0-1 probability
  noPrice: number;
  yesBid: number | null;
  yesAsk: number | null;
  volume: number | null;
  lastUpdated: string;
}
```

## Route Structure

### App Router Layout

```
app/
├── layout.tsx              # Root layout (Header, Footer, QueryProvider)
├── page.tsx                # Homepage
├── not-found.tsx
├── error.tsx
├── loading.tsx
│
├── (routes)/               # Route group (no URL segment)
│   ├── about/page.tsx
│   ├── presidential/[view]/page.tsx    # /presidential/party, /presidential/candidates
│   ├── primaries/[party]/page.tsx      # /primaries/dem, /primaries/gop
│   └── races/[slug]/page.tsx           # /races/house-2026, /races/senate-2026
│
├── charts/page.tsx
├── markets/[slug]/page.tsx
├── track-record/page.tsx
│
└── api/                    # API routes
    ├── markets/route.ts
    ├── markets/[id]/route.ts
    ├── markets/featured/route.ts
    ├── charts/[id]/route.ts
    ├── track-record/route.ts
    └── stats/route.ts
```

## Future Architecture

### Backend Integration

The current mock data layer can be replaced with real API calls to:

1. **Python Backend** (recommended)
   - `/api_clients/` - Direct API clients for each prediction market
   - `/aggregator.py` - Unified data aggregation
   - FastAPI or Flask server to expose endpoints

2. **Direct Browser Calls** (alternative)
   - Call prediction market APIs directly from Next.js API routes
   - Handle CORS and rate limiting server-side

### Recommended Production Stack

```
┌─────────────────────────────────────────────────────────────────┐
│                         Vercel Edge                             │
│  (Next.js frontend, API routes for BFF)                        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Python Backend (Railway/Fly.io)              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │
│  │  FastAPI    │  │  Aggregator │  │ API Clients │            │
│  └─────────────┘  └─────────────┘  └─────────────┘            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         Redis Cache                             │
│  (Rate limit compliance, response caching)                     │
└─────────────────────────────────────────────────────────────────┘
```

## Performance Considerations

1. **Server Components**: Static pages use React Server Components
2. **Client Components**: Interactive pages use `'use client'` directive
3. **Data Caching**: TanStack Query manages client-side cache
4. **Static Generation**: About page is statically generated at build time
5. **Dynamic Routes**: Market pages are server-rendered on demand
