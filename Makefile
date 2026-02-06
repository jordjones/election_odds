# Election Odds - Common Operations
# Usage: make <target>

# ─── Secrets Management ──────────────────────────────────────

## Update DATABASE_URL everywhere (GitHub Actions + Netlify + local export)
## Usage: make set-db-url URL="postgresql://..."
set-db-url:
	@test -n "$(URL)" || (echo "Usage: make set-db-url URL=\"postgresql://...\"" && exit 1)
	@echo "Updating DATABASE_URL in GitHub Actions..."
	gh secret set DATABASE_URL --body '$(URL)'
	@echo "Updating DATABASE_URL in Netlify..."
	cd web && netlify env:set DATABASE_URL '$(URL)'
	@echo "Done. Run this to set locally:"
	@echo "  export DATABASE_URL='$(URL)'"

# ─── Supabase ────────────────────────────────────────────────

## Run a SQL file against Supabase
## Usage: make db-sql FILE=supabase/site_markets.sql
db-sql:
	@test -n "$(FILE)" || (echo "Usage: make db-sql FILE=path/to/file.sql" && exit 1)
	@test -n "$$DATABASE_URL" || (echo "DATABASE_URL not set" && exit 1)
	psql "$$DATABASE_URL" -f $(FILE)

## Run a SQL query against Supabase
## Usage: make db-query Q="SELECT COUNT(*) FROM price_snapshots"
db-query:
	@test -n "$(Q)" || (echo 'Usage: make db-query Q="SELECT ..."' && exit 1)
	@test -n "$$DATABASE_URL" || (echo "DATABASE_URL not set" && exit 1)
	psql "$$DATABASE_URL" -c "$(Q)"

## Show table row counts
db-stats:
	@test -n "$$DATABASE_URL" || (echo "DATABASE_URL not set" && exit 1)
	@psql "$$DATABASE_URL" -c " \
		SELECT 'markets' as table_name, COUNT(*) FROM markets \
		UNION ALL SELECT 'contracts', COUNT(*) FROM contracts \
		UNION ALL SELECT 'price_snapshots', COUNT(*) FROM price_snapshots \
		UNION ALL SELECT 'site_markets', COUNT(*) FROM site_markets \
		ORDER BY 1"

# ─── Sync ────────────────────────────────────────────────────

## Sync featured (site) markets from all sources
sync-featured:
	@test -n "$$DATABASE_URL" || (echo "DATABASE_URL not set" && exit 1)
	python scripts/sync_supabase.py --source all --featured-only

## Sync all markets from all sources
sync-all:
	@test -n "$$DATABASE_URL" || (echo "DATABASE_URL not set" && exit 1)
	python scripts/sync_supabase.py --source all

## Populate site_markets table from existing markets
populate-site-markets:
	@test -n "$$DATABASE_URL" || (echo "DATABASE_URL not set" && exit 1)
	python scripts/populate_site_markets.py

## Thin non-site snapshots to 1/day (dry run)
cleanup-dry-run:
	@test -n "$$DATABASE_URL" || (echo "DATABASE_URL not set" && exit 1)
	python scripts/cleanup_supabase.py --dry-run

## Thin non-site snapshots to 1/day (execute)
cleanup:
	@test -n "$$DATABASE_URL" || (echo "DATABASE_URL not set" && exit 1)
	python scripts/cleanup_supabase.py --execute

# ─── Deploy ──────────────────────────────────────────────────

## Trigger Netlify production deploy (remote build)
deploy:
	cd web && netlify deploy --prod --build

## Trigger GitHub Actions sync workflow
trigger-sync:
	gh workflow run "Sync Polymarket Data" --field sync_type=featured

## Trigger twice-daily sync workflow
trigger-sync-all:
	gh workflow run "Sync All Markets (Twice Daily)"

# ─── Development ─────────────────────────────────────────────

## Start local dev server
dev:
	cd web && npm run dev

## List available targets
help:
	@echo "Secrets:"
	@echo "  set-db-url URL=...   Update DATABASE_URL in GitHub + Netlify"
	@echo ""
	@echo "Database:"
	@echo "  db-sql FILE=...      Run a SQL file against Supabase"
	@echo "  db-query Q=...       Run a SQL query against Supabase"
	@echo "  db-stats             Show table row counts"
	@echo ""
	@echo "Sync:"
	@echo "  sync-featured        Sync site markets from all sources"
	@echo "  sync-all             Sync all markets from all sources"
	@echo "  populate-site-markets Populate site_markets table"
	@echo "  cleanup-dry-run      Preview non-site snapshot thinning"
	@echo "  cleanup              Execute non-site snapshot thinning"
	@echo ""
	@echo "Deploy:"
	@echo "  deploy               Netlify production deploy"
	@echo "  trigger-sync         Trigger featured sync workflow"
	@echo "  trigger-sync-all     Trigger twice-daily sync workflow"
	@echo ""
	@echo "Dev:"
	@echo "  dev                  Start local dev server"

.PHONY: set-db-url db-sql db-query db-stats sync-featured sync-all \
	populate-site-markets cleanup-dry-run cleanup deploy \
	trigger-sync trigger-sync-all dev help
