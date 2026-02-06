# Supabase + GitHub Actions Setup

This guide explains how to set up automated data syncing every 5 minutes using GitHub Actions and Supabase.

## 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a free account
2. Create a new project (choose a region close to you)
3. Wait for the project to be provisioned (~2 minutes)

## 2. Set Up Database Schema

1. In your Supabase dashboard, go to **SQL Editor**
2. Copy the contents of `supabase/schema.sql`
3. Paste and run in the SQL Editor
4. This creates the `markets`, `contracts`, and `price_snapshots` tables

## 3. Get Your Credentials

From your Supabase project dashboard:

### Database URL (for GitHub Actions)
1. Go to **Settings** → **Database**
2. Find **Connection string** → **URI**
3. Copy the URI (looks like `postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres`)
4. Replace `[PASSWORD]` with your database password

### API Credentials (for web app)
1. Go to **Settings** → **API**
2. Copy:
   - **Project URL** (e.g., `https://xxxx.supabase.co`)
   - **anon/public key** (for client-side)
   - **service_role key** (for server-side, keep secret!)

## 4. Add GitHub Secrets

1. Go to your GitHub repo → **Settings** → **Secrets and variables** → **Actions**
2. Add these secrets:

| Secret Name | Value |
|-------------|-------|
| `DATABASE_URL` | `postgresql://postgres:YOUR_PASSWORD@db.YOUR_PROJECT.supabase.co:5432/postgres` |
| `SUPABASE_URL` | `https://YOUR_PROJECT.supabase.co` |
| `SUPABASE_KEY` | Your `service_role` key |

## 5. Enable GitHub Actions

The workflow file is already created at `.github/workflows/sync-polymarket.yml`.

To enable:
1. Go to your GitHub repo → **Actions** tab
2. Click "I understand my workflows, go ahead and enable them"
3. The sync will run automatically every 5 minutes

### Manual Trigger
You can also trigger manually:
1. Go to **Actions** → **Sync Polymarket Data**
2. Click **Run workflow**

## 6. Update Web App to Use Supabase

Update your Next.js app to connect to Supabase instead of SQLite:

### Install Supabase client
```bash
cd web
npm install @supabase/supabase-js
```

### Create Supabase client (`web/src/lib/supabase.ts`)
```typescript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseKey)
```

### Add environment variables

Create `web/.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

For production (Netlify), add these in the Netlify dashboard under **Site settings** → **Environment variables**.

## 7. Verify Setup

### Check GitHub Actions
1. Go to **Actions** tab
2. Watch the workflow run
3. Check logs for any errors

### Check Supabase Data
1. Go to Supabase dashboard → **Table Editor**
2. Check `price_snapshots` table for new data

### Query Data
```sql
-- Check recent snapshots
SELECT source, COUNT(*), MAX(snapshot_time)
FROM price_snapshots
GROUP BY source;

-- Check specific candidate
SELECT snapshot_time, yes_price
FROM price_snapshots ps
JOIN contracts c ON ps.contract_id = c.contract_id
WHERE c.contract_name LIKE '%Vance%'
ORDER BY snapshot_time DESC
LIMIT 10;
```

## Costs

- **Supabase Free Tier**: 500MB database, 2GB bandwidth/month
- **GitHub Actions**: 2,000 minutes/month free for public repos

For a 5-minute sync schedule:
- ~8,640 runs/month
- ~1-2 minutes per run = ~10,000-17,000 minutes/month

**Recommendation**: For free tier, change schedule to every 15 minutes:
```yaml
schedule:
  - cron: '*/15 * * * *'  # Every 15 minutes
```

This uses ~6,000 minutes/month, staying within limits.
