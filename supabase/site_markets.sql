-- site_markets table: Controls which markets the sync scripts pull data for.
-- Only markets listed here (and marked active) will be synced and retained.
--
-- Run this in the Supabase SQL Editor to create the table.
-- Then run scripts/populate_site_markets.py to populate it from existing markets.

CREATE TABLE IF NOT EXISTS site_markets (
    id BIGSERIAL PRIMARY KEY,
    source TEXT NOT NULL,
    market_id TEXT NOT NULL,
    canonical_type TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(source, market_id)
);

-- Index for fast lookups during sync
CREATE INDEX IF NOT EXISTS idx_site_markets_source_active
    ON site_markets(source) WHERE is_active = true;

-- Enable RLS consistent with other tables
ALTER TABLE site_markets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access on site_markets"
    ON site_markets FOR SELECT USING (true);

CREATE POLICY "Allow service role full access on site_markets"
    ON site_markets FOR ALL USING (auth.role() = 'service_role');
