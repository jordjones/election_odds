'use client';

import type { Market, MarketSource, TimeFilter } from '@/lib/types';
import { MARKET_SOURCES } from '@/lib/types';
import { CandidateRow } from './CandidateRow';
import { TooltipProvider } from '@/components/ui/tooltip';
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';

interface OddsTableProps {
  market: Market;
  showAllSources?: boolean;
  changePeriod?: TimeFilter;
  onChangePeriodChange?: (period: TimeFilter) => void;
}

// Market sources in display order: Polymarket, PredictIt, Kalshi, Smarkets
const DEFAULT_SOURCES: MarketSource[] = ['Polymarket', 'PredictIt', 'Kalshi', 'Smarkets'];

// Change period filter options (shorter labels for compact display)
const CHANGE_PERIOD_OPTIONS: { value: TimeFilter; label: string }[] = [
  { value: '1d', label: '24h' },
  { value: '1w', label: '7d' },
  { value: '30d', label: '30d' },
];

export function OddsTable({ market, showAllSources = false, changePeriod = '1d', onChangePeriodChange }: OddsTableProps) {

  // Determine which sources to show - use DEFAULT_SOURCES order
  const sources: MarketSource[] = showAllSources
    ? DEFAULT_SOURCES
    : DEFAULT_SOURCES;

  // Sort contracts by aggregated price (highest first)
  const sortedContracts = [...market.contracts].sort(
    (a, b) => b.aggregatedPrice - a.aggregatedPrice
  );

  return (
    <TooltipProvider>
      <div className="rounded-lg border overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-12 text-center">#</TableHead>
                <TableHead className="min-w-[150px]">Candidate</TableHead>
                <TableHead className="text-center w-20">Avg</TableHead>
                <TableHead className="text-center w-28">
                  <div className="flex flex-col items-center gap-1">
                    <span>Chg</span>
                    <div className="flex gap-0.5">
                      {CHANGE_PERIOD_OPTIONS.map((option) => (
                        <button
                          key={option.value}
                          onClick={() => onChangePeriodChange?.(option.value)}
                          className={cn(
                            'px-1.5 py-0.5 text-[10px] rounded transition-colors',
                            changePeriod === option.value
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted hover:bg-muted/80 text-muted-foreground'
                          )}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </TableHead>
                {sources.map((source) => (
                  <TableHead key={source} className="text-center w-20">
                    <div className="flex flex-col items-center">
                      <span className="text-xs">{MARKET_SOURCES[source].flag}</span>
                      <span className="text-xs font-normal">{source}</span>
                    </div>
                  </TableHead>
                ))}
                <TableHead className="text-center w-24">Volume</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedContracts.map((contract, index) => (
                <CandidateRow
                  key={contract.id}
                  contract={contract}
                  rank={index + 1}
                  sources={sources}
                  changePeriod={changePeriod}
                />
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </TooltipProvider>
  );
}
