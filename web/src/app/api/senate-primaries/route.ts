import { NextResponse } from "next/server";
import type { TimeFilter } from "@/lib/types";
import { usePostgres } from "@/lib/use-postgres";
import { getCached, DEFAULT_TTL } from "@/lib/cache";

async function getSenatePrimariesFromDb(options: { changePeriod?: string }) {
  if (usePostgres()) {
    const { getSenatePrimariesAsync } = await import("@/lib/db-pg");
    return getSenatePrimariesAsync(options);
  } else {
    const { getSenatePrimaries } = await import("@/lib/db");
    return getSenatePrimaries(options);
  }
}

const CACHE_HEADERS = {
  "Cache-Control": "public, max-age=60",
  "CDN-Cache-Control": "public, max-age=120, stale-while-revalidate=300",
  "Netlify-Vary": "query",
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const changePeriod = searchParams.get("changePeriod") as TimeFilter | null;

  const opts = { changePeriod: changePeriod || "1d" };

  try {
    const cacheKey = `senate-primaries:${changePeriod || "1d"}`;
    const markets = await getCached(cacheKey, DEFAULT_TTL, () =>
      getSenatePrimariesFromDb(opts),
    );

    return NextResponse.json(markets, { headers: CACHE_HEADERS });
  } catch (error) {
    console.error(
      "[API /senate-primaries] Error fetching senate primaries:",
      error,
    );
    return NextResponse.json(
      { error: "Failed to fetch senate primaries", details: String(error) },
      { status: 500 },
    );
  }
}
