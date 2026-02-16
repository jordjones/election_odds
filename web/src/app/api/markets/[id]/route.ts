import { NextResponse } from "next/server";
import type { TimeFilter } from "@/lib/types";
import { usePostgres } from "@/lib/use-postgres";
import { getCached, DEFAULT_TTL } from "@/lib/cache";

// Dynamic import to avoid loading better-sqlite3 on Netlify
async function getMarketFromDb(id: string, changePeriod: string) {
  if (usePostgres()) {
    const { getMarketAsync } = await import("@/lib/db-pg");
    return getMarketAsync(id, changePeriod);
  } else {
    const { getMarket } = await import("@/lib/db");
    return getMarket(id, changePeriod);
  }
}

const CACHE_HEADERS = {
  "Cache-Control": "public, max-age=60",
  "CDN-Cache-Control": "public, max-age=120, stale-while-revalidate=300",
  "Netlify-Vary": "query",
};

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const changePeriod = (searchParams.get("changePeriod") as TimeFilter) || "1d";

  try {
    const cacheKey = `market:${id}:${changePeriod}`;
    const market = await getCached(cacheKey, DEFAULT_TTL, () =>
      getMarketFromDb(id, changePeriod),
    );

    if (!market) {
      return NextResponse.json({ error: "Market not found" }, { status: 404 });
    }

    return NextResponse.json(market, { headers: CACHE_HEADERS });
  } catch (error) {
    console.error("Error fetching market:", error);
    return NextResponse.json(
      { error: "Failed to fetch market" },
      { status: 500 },
    );
  }
}
