/**
 * Simple in-memory TTL cache for API route responses.
 * Data syncs every 5 minutes, so caching for 60s is safe
 * and prevents redundant DB queries from concurrent visitors.
 */

interface CacheEntry<T> {
  data: T;
  expires: number;
}

const store = new Map<string, CacheEntry<unknown>>();

/**
 * Get cached value or fetch fresh data.
 * @param key - Cache key (e.g., "markets:presidential:1d")
 * @param ttlMs - Time-to-live in milliseconds
 * @param fetcher - Async function to fetch fresh data on miss
 */
export async function getCached<T>(
  key: string,
  ttlMs: number,
  fetcher: () => Promise<T>,
): Promise<T> {
  const entry = store.get(key) as CacheEntry<T> | undefined;
  if (entry && Date.now() < entry.expires) {
    return entry.data;
  }

  const data = await fetcher();
  store.set(key, { data, expires: Date.now() + ttlMs });
  return data;
}

/** Default TTL: 60 seconds */
export const DEFAULT_TTL = 60 * 1000;

/** Longer TTL for chart data (less frequently changing) */
export const CHART_TTL = 120 * 1000;
