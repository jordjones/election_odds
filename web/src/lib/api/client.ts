/**
 * API Client for fetching prediction market data
 *
 * This client fetches data from our backend API which aggregates
 * data from multiple prediction market sources.
 */

import type {
  Market,
  Contract,
  MarketPrice,
  ChartData,
  TrackRecordEntry,
  AggregatedStats,
  MarketCategory,
  TimeFilter,
  MarketSource,
} from '../types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  private async fetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }

      return response.json();
    } catch (error) {
      console.error(`[API] Failed to fetch ${endpoint}:`, error);
      throw error;
    }
  }

  /**
   * Get all markets with optional filtering
   */
  async getMarkets(params?: {
    category?: MarketCategory;
    status?: 'open' | 'all';
    limit?: number;
  }): Promise<Market[]> {
    const searchParams = new URLSearchParams();
    if (params?.category) searchParams.set('category', params.category);
    if (params?.status) searchParams.set('status', params.status);
    if (params?.limit) searchParams.set('limit', params.limit.toString());

    const query = searchParams.toString();
    return this.fetch<Market[]>(`/markets${query ? `?${query}` : ''}`);
  }

  /**
   * Get a specific market by ID or slug
   */
  async getMarket(idOrSlug: string): Promise<Market> {
    return this.fetch<Market>(`/markets/${idOrSlug}`);
  }

  /**
   * Get markets by category
   */
  async getMarketsByCategory(category: MarketCategory): Promise<Market[]> {
    return this.getMarkets({ category, status: 'open' });
  }

  /**
   * Get chart data for a market
   */
  async getChartData(marketId: string, timeFilter: TimeFilter = 'all'): Promise<ChartData> {
    return this.fetch<ChartData>(`/charts/${marketId}?period=${timeFilter}`);
  }

  /**
   * Get track record / historical accuracy data
   */
  async getTrackRecord(): Promise<TrackRecordEntry[]> {
    return this.fetch<TrackRecordEntry[]>('/track-record');
  }

  /**
   * Get aggregated statistics
   */
  async getStats(): Promise<AggregatedStats> {
    return this.fetch<AggregatedStats>('/stats');
  }

  /**
   * Get featured/homepage markets
   */
  async getFeaturedMarkets(): Promise<Market[]> {
    return this.fetch<Market[]>('/markets/featured');
  }
}

// Singleton instance
export const apiClient = new ApiClient();

// Export class for testing
export { ApiClient };
