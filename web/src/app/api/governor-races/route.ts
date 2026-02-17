import { NextResponse } from "next/server";
import type { TimeFilter } from "@/lib/types";
import { usePostgres } from "@/lib/use-postgres";
import { getCached, DEFAULT_TTL } from "@/lib/cache";

async function getGovernorRacesFromDb(options: {
  states?: string[];
  changePeriod?: string;
}) {
  if (usePostgres()) {
    const { getStateGovernorRacesAsync } = await import("@/lib/db-pg");
    return getStateGovernorRacesAsync(options);
  } else {
    const { getStateGovernorRaces } = await import("@/lib/db");
    return getStateGovernorRaces(options);
  }
}

const CACHE_HEADERS = {
  "Cache-Control": "public, max-age=60",
  "CDN-Cache-Control": "public, max-age=120, stale-while-revalidate=300",
  "Netlify-Vary": "query",
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const state = searchParams.get("state");
  const changePeriod = searchParams.get("changePeriod") as TimeFilter | null;

  const opts = {
    states: state ? [state] : undefined,
    changePeriod: changePeriod || "1d",
  };

  try {
    const cacheKey = `governor-races:${state || "all"}:${changePeriod || "1d"}`;
    const markets = await getCached(cacheKey, DEFAULT_TTL, () =>
      getGovernorRacesFromDb(opts),
    );

    return NextResponse.json(markets, { headers: CACHE_HEADERS });
  } catch (error) {
    console.error("[API /governor-races] Error fetching governor races:", error);
    return NextResponse.json(
      { error: "Failed to fetch governor races", details: String(error) },
      { status: 500 },
    );
  }
}
