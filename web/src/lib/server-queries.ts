/**
 * Server-side data fetching layer.
 * Centralizes the pg/sqlite toggle so server components can call DB
 * functions directly without going through API routes.
 *
 * Uses dynamic imports to prevent better-sqlite3 from being bundled on Netlify.
 */

import { usePostgres } from "./use-postgres";
import type { Market, MarketCategory } from "./types";

export async function getMarketsServer(options?: {
  category?: MarketCategory;
  status?: "open" | "all";
  limit?: number;
  changePeriod?: string;
}): Promise<Market[]> {
  if (usePostgres()) {
    const { getMarketsAsync } = await import("./db-pg");
    return getMarketsAsync(options);
  }
  const { getMarkets } = await import("./db");
  return getMarkets(options);
}

export async function getFeaturedMarketsServer(): Promise<Market[]> {
  if (usePostgres()) {
    const { getFeaturedMarketsAsync } = await import("./db-pg");
    return getFeaturedMarketsAsync();
  }
  const { getFeaturedMarkets } = await import("./db");
  return getFeaturedMarkets();
}

export async function getSenateRacesServer(options?: {
  states?: string[];
  changePeriod?: string;
}): Promise<Market[]> {
  if (usePostgres()) {
    const { getStateSenateRacesAsync } = await import("./db-pg");
    return getStateSenateRacesAsync(options);
  }
  const { getStateSenateRaces } = await import("./db");
  return getStateSenateRaces(options);
}

export async function getSenatePrimariesServer(options?: {
  changePeriod?: string;
}): Promise<Market[]> {
  if (usePostgres()) {
    const { getSenatePrimariesAsync } = await import("./db-pg");
    return getSenatePrimariesAsync(options);
  }
  const { getSenatePrimaries } = await import("./db");
  return getSenatePrimaries(options);
}
