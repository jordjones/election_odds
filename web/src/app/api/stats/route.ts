import { NextResponse } from "next/server";
import { usePostgres } from "@/lib/use-postgres";
import { getCached, DEFAULT_TTL } from "@/lib/cache";

async function getStatsFromDb() {
  if (usePostgres()) {
    const { getStatsAsync } = await import("@/lib/db-pg");
    return getStatsAsync();
  } else {
    const { getStats } = await import("@/lib/db");
    return getStats();
  }
}

const CACHE_HEADERS = {
  "Cache-Control": "public, max-age=60",
  "CDN-Cache-Control": "public, max-age=120, stale-while-revalidate=300",
  "Netlify-Vary": "query",
};

export async function GET() {
  try {
    const stats = await getCached("stats", DEFAULT_TTL, getStatsFromDb);
    return NextResponse.json(stats, { headers: CACHE_HEADERS });
  } catch (error) {
    console.error("Error fetching stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch stats" },
      { status: 500 },
    );
  }
}
