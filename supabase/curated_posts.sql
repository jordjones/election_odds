-- curated_posts table: Stores curated tweet posts for the Pulse feed.
-- Source of truth is data/curated-posts.csv; synced via scripts/sync_curated_posts.py.
-- Enriched with X API metrics via scripts/enrich_tweets.py.
--
-- Run: make db-sql FILE=supabase/curated_posts.sql

CREATE TABLE IF NOT EXISTS curated_posts (
    id BIGSERIAL PRIMARY KEY,
    tweet_id TEXT NOT NULL UNIQUE,
    candidate_name TEXT NOT NULL,
    topic TEXT NOT NULL,
    posted_at TIMESTAMPTZ NOT NULL,
    editor_note TEXT,
    -- Enriched from X API (nullable until enriched)
    tweet_text TEXT,
    likes INTEGER,
    retweets INTEGER,
    replies INTEGER,
    views INTEGER,
    -- Metadata
    enriched_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_curated_posts_candidate ON curated_posts(candidate_name);
CREATE INDEX IF NOT EXISTS idx_curated_posts_topic ON curated_posts(topic);
CREATE INDEX IF NOT EXISTS idx_curated_posts_posted_at ON curated_posts(posted_at DESC);
CREATE INDEX IF NOT EXISTS idx_curated_posts_enriched ON curated_posts(enriched_at) WHERE enriched_at IS NULL;

-- RLS: public read, service_role write (matches site_markets.sql pattern)
ALTER TABLE curated_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access on curated_posts"
    ON curated_posts FOR SELECT USING (true);

CREATE POLICY "Allow service role full access on curated_posts"
    ON curated_posts FOR ALL USING (auth.role() = 'service_role');
