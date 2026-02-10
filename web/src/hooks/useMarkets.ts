'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import type { Market, MarketCategory, ChartData, TrackRecordEntry, AggregatedStats, TimeFilter } from '@/lib/types';

/**
 * Fetch all markets with optional filtering
 */
export function useMarkets(params?: {
  category?: MarketCategory;
  status?: 'open' | 'all';
  limit?: number;
}) {
  return useQuery<Market[]>({
    queryKey: ['markets', params],
    queryFn: () => apiClient.getMarkets(params),
  });
}

/**
 * Fetch a single market by ID or slug
 */
export function useMarket(idOrSlug: string, changePeriod?: TimeFilter) {
  return useQuery<Market>({
    queryKey: ['market', idOrSlug, changePeriod],
    queryFn: () => apiClient.getMarket(idOrSlug, changePeriod),
    enabled: !!idOrSlug,
  });
}

/**
 * Fetch markets by category
 */
export function useMarketsByCategory(category: MarketCategory, changePeriod?: TimeFilter) {
  return useQuery<Market[]>({
    queryKey: ['markets', 'category', category, changePeriod],
    queryFn: () => apiClient.getMarketsByCategory(category, changePeriod),
    enabled: !!category,
  });
}

/**
 * Fetch chart data for a market
 */
export function useChartData(marketId: string, timeFilter: TimeFilter = 'all') {
  return useQuery<ChartData>({
    queryKey: ['chart', marketId, timeFilter],
    queryFn: () => apiClient.getChartData(marketId, timeFilter),
    enabled: !!marketId,
  });
}

/**
 * Fetch featured markets for homepage
 */
export function useFeaturedMarkets() {
  return useQuery<Market[]>({
    queryKey: ['markets', 'featured'],
    queryFn: () => apiClient.getFeaturedMarkets(),
  });
}

/**
 * Fetch track record data
 */
export function useTrackRecord() {
  return useQuery<TrackRecordEntry[]>({
    queryKey: ['track-record'],
    queryFn: () => apiClient.getTrackRecord(),
  });
}

/**
 * Fetch aggregated stats
 */
export function useStats() {
  return useQuery<AggregatedStats>({
    queryKey: ['stats'],
    queryFn: () => apiClient.getStats(),
  });
}

/**
 * Fetch state senate races
 */
export function useStateSenateRaces(changePeriod?: TimeFilter, state?: string) {
  return useQuery<Market[]>({
    queryKey: ['senate-races', changePeriod, state],
    queryFn: () => apiClient.getStateSenateRaces(changePeriod, state),
  });
}

/**
 * Fetch senate primaries
 */
export function useSenatePrimaries(changePeriod?: TimeFilter) {
  return useQuery<Market[]>({
    queryKey: ['senate-primaries', changePeriod],
    queryFn: () => apiClient.getSenatePrimaries(changePeriod),
  });
}
