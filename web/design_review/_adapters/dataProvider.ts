/**
 * Local data provider for design overhaul pages.
 * Loads from static JSON fixtures — no network calls.
 */

import type { Market, ChartData, TrackRecordEntry, AggregatedStats } from '../../src/lib/types';

import marketsJson from '../_local_data/markets.json';
import presidentialJson from '../_local_data/presidential.json';
import featuredJson from '../_local_data/featured.json';
import chartDataJson from '../_local_data/chart-data.json';
import chartGopJson from '../_local_data/chart-gop.json';
import chartDemJson from '../_local_data/chart-dem.json';
import statsJson from '../_local_data/stats.json';
import trackRecordJson from '../_local_data/track-record.json';
import senateRacesJson from '../_local_data/senate-races.json';
import pulseFeedJson from '../_local_data/pulse-feed.json';
import primariesJson from '../_local_data/primaries.json';
import partyControlJson from '../_local_data/party-control.json';

export function getMarkets(): Market[] {
  return marketsJson as unknown as Market[];
}

export function getPresidentialMarket(): Market {
  return presidentialJson as unknown as Market;
}

export function getFeaturedMarkets(): Market[] {
  return featuredJson as unknown as Market[];
}

export function getChartData(marketId?: string): ChartData {
  if (marketId === 'gop-primary-2028') return chartGopJson as unknown as ChartData;
  if (marketId === 'dem-primary-2028') return chartDemJson as unknown as ChartData;
  return chartDataJson as unknown as ChartData;
}

export function getStats(): AggregatedStats {
  return statsJson as unknown as AggregatedStats;
}

export function getTrackRecord(): TrackRecordEntry[] {
  return trackRecordJson as unknown as TrackRecordEntry[];
}

export function getSenateRaces(): Market[] {
  return senateRacesJson as unknown as Market[];
}

export function getPulseFeed() {
  return pulseFeedJson;
}

export function getPrimaries(): Market[] {
  return primariesJson as unknown as Market[];
}

export function getPartyControl(): Market {
  return partyControlJson as unknown as Market;
}
