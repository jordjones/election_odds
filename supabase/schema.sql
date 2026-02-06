-- Supabase Schema for Election Odds
-- Run this in the Supabase SQL Editor to create the tables

-- Markets table
CREATE TABLE IF NOT EXISTS markets (
    id BIGSERIAL PRIMARY KEY,
    source TEXT NOT NULL,
    market_id TEXT NOT NULL,
    market_name TEXT NOT NULL,
    category TEXT,
    status TEXT,
    url TEXT,
    total_volume DOUBLE PRECISION,
    end_date TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(source, market_id)
);

-- Contracts table
CREATE TABLE IF NOT EXISTS contracts (
    id BIGSERIAL PRIMARY KEY,
    source TEXT NOT NULL,
    market_id TEXT NOT NULL,
    contract_id TEXT NOT NULL,
    contract_name TEXT NOT NULL,
    short_name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(source, market_id, contract_id)
);

-- Price snapshots table
CREATE TABLE IF NOT EXISTS price_snapshots (
    id BIGSERIAL PRIMARY KEY,
    source TEXT NOT NULL,
    market_id TEXT NOT NULL,
    contract_id TEXT NOT NULL,
    snapshot_time TIMESTAMPTZ NOT NULL,
    yes_price DOUBLE PRECISION,
    no_price DOUBLE PRECISION,
    yes_bid DOUBLE PRECISION,
    yes_ask DOUBLE PRECISION,
    no_bid DOUBLE PRECISION,
    no_ask DOUBLE PRECISION,
    volume DOUBLE PRECISION,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(source, market_id, contract_id, snapshot_time)
);

-- Indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_price_snapshots_source ON price_snapshots(source);
CREATE INDEX IF NOT EXISTS idx_price_snapshots_market ON price_snapshots(market_id);
CREATE INDEX IF NOT EXISTS idx_price_snapshots_time ON price_snapshots(snapshot_time DESC);
CREATE INDEX IF NOT EXISTS idx_price_snapshots_source_market ON price_snapshots(source, market_id);
CREATE INDEX IF NOT EXISTS idx_price_snapshots_lookup ON price_snapshots(source, market_id, contract_id, snapshot_time DESC);

CREATE INDEX IF NOT EXISTS idx_markets_source ON markets(source);
CREATE INDEX IF NOT EXISTS idx_contracts_source_market ON contracts(source, market_id);

-- Enable Row Level Security (optional, for public read access)
ALTER TABLE markets ENABLE ROW LEVEL SECURITY;
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_snapshots ENABLE ROW LEVEL SECURITY;

-- Allow public read access (adjust as needed)
CREATE POLICY "Allow public read access on markets" ON markets FOR SELECT USING (true);
CREATE POLICY "Allow public read access on contracts" ON contracts FOR SELECT USING (true);
CREATE POLICY "Allow public read access on price_snapshots" ON price_snapshots FOR SELECT USING (true);

-- Allow service role full access
CREATE POLICY "Allow service role full access on markets" ON markets FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Allow service role full access on contracts" ON contracts FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Allow service role full access on price_snapshots" ON price_snapshots FOR ALL USING (auth.role() = 'service_role');
