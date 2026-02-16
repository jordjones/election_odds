import { NextResponse } from "next/server";
import { usePostgres } from "@/lib/use-postgres";
import { getCached, DEFAULT_TTL } from "@/lib/cache";

// Dynamic import to avoid loading better-sqlite3 on Netlify
async function getFeaturedFromDb() {
  if (usePostgres()) {
    const { getFeaturedMarketsAsync } = await import("@/lib/db-pg");
    return getFeaturedMarketsAsync();
  } else {
    const { getFeaturedMarkets } = await import("@/lib/db");
    return getFeaturedMarkets();
  }
}

const CACHE_HEADERS = {
  "Cache-Control": "public, max-age=60",
  "CDN-Cache-Control": "public, max-age=120, stale-while-revalidate=300",
  "Netlify-Vary": "query",
};

export async function GET() {
  try {
    const featured = await getCached(
      "markets:featured",
      DEFAULT_TTL,
      getFeaturedFromDb,
    );
    return NextResponse.json(featured, { headers: CACHE_HEADERS });
  } catch (error) {
    console.error("Error fetching featured markets:", error);
    return NextResponse.json(
      { error: "Failed to fetch featured markets" },
      { status: 500 },
    );
  }
}
