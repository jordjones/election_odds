import { NextResponse } from "next/server";
import type { MarketCategory, TimeFilter } from "@/lib/types";
import { usePostgres } from "@/lib/use-postgres";
import { getCached, DEFAULT_TTL } from "@/lib/cache";

// Dynamic import to avoid loading better-sqlite3 on Netlify
async function getMarketsFromDb(options: {
  category?: MarketCategory;
  status?: "open" | "all";
  limit?: number;
  changePeriod?: string;
}) {
  // Use PostgreSQL in production (Netlify), SQLite locally
  if (usePostgres()) {
    const { getMarketsAsync } = await import("@/lib/db-pg");
    return getMarketsAsync(options);
  } else {
    const { getMarkets } = await import("@/lib/db");
    return getMarkets(options);
  }
}

const CACHE_HEADERS = {
  "Cache-Control": "public, max-age=60",
  "CDN-Cache-Control": "public, max-age=120, stale-while-revalidate=300",
  "Netlify-Vary": "query",
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category") as MarketCategory | null;
  const status = searchParams.get("status") as "open" | "all" | null;
  const limitStr = searchParams.get("limit");
  const limit = limitStr ? parseInt(limitStr, 10) : undefined;
  const changePeriod = searchParams.get("changePeriod") as TimeFilter | null;

  const opts = {
    category: category || undefined,
    status: status || undefined,
    limit,
    changePeriod: changePeriod || "1d",
  };

  try {
    const cacheKey = `markets:${category || "all"}:${status || "open"}:${limit || ""}:${changePeriod || "1d"}`;
    const markets = await getCached(cacheKey, DEFAULT_TTL, () =>
      getMarketsFromDb(opts),
    );

    return NextResponse.json(markets, { headers: CACHE_HEADERS });
  } catch (error) {
    console.error("[API /markets] Error fetching markets:", error);
    return NextResponse.json(
      { error: "Failed to fetch markets", details: String(error) },
      { status: 500 },
    );
  }
}
