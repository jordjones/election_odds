# Election Odds Aggregator

Real-time aggregated prediction market odds for US elections. Compare prices from PredictIt, Kalshi, Polymarket, Smarkets, and Betfair.

## Features

- **Multi-source Aggregation**: Prices from 5 major prediction markets
- **Real-time Updates**: Data refreshes every 5 minutes
- **Historical Charts**: Track price movements over time
- **Track Record**: See how prediction markets performed in past elections
- **Responsive Design**: Works on desktop and mobile

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui
- **Data Fetching**: TanStack Query
- **Charts**: Recharts
- **Testing**: Playwright (E2E), Vitest (Unit)

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Run production server
npm start
```

### Environment Variables

Create a `.env.local` file:

```
NEXT_PUBLIC_API_URL=/api
```

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── (routes)/          # Route groups
│   │   ├── about/
│   │   ├── presidential/
│   │   ├── primaries/
│   │   └── races/
│   ├── api/               # API routes
│   ├── charts/
│   ├── markets/
│   └── track-record/
├── components/
│   ├── layout/            # Header, Footer
│   ├── odds/              # OddsTable, OddsChart, etc.
│   ├── providers/         # QueryProvider
│   └── ui/                # shadcn/ui components
├── hooks/                 # Custom React hooks
│   └── useMarkets.ts      # TanStack Query hooks
└── lib/
    ├── api/               # API client and mock data
    ├── types.ts           # TypeScript types
    └── utils.ts           # Utility functions
```

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm start` | Run production server |
| `npm run lint` | Run ESLint |
| `npm run test` | Run unit tests |
| `npm run test:e2e` | Run Playwright E2E tests |

## API Routes

| Route | Description |
|-------|-------------|
| `GET /api/markets` | List all markets (supports category, status, limit params) |
| `GET /api/markets/:id` | Get single market by ID or slug |
| `GET /api/markets/featured` | Get featured markets for homepage |
| `GET /api/charts/:id` | Get chart data for a market |
| `GET /api/track-record` | Get historical prediction accuracy |
| `GET /api/stats` | Get aggregated statistics |

## Data Sources

- **PredictIt** (US) - Political prediction market
- **Kalshi** (US) - CFTC-regulated event contracts
- **Polymarket** (International) - Crypto-based prediction market
- **Smarkets** (UK) - Sports and political betting exchange
- **Betfair** (UK) - World's largest betting exchange

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## License

MIT
