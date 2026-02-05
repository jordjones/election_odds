'use client';

import type { Market, MarketSource } from '@/lib/types';
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

interface OddsTableProps {
  market: Market;
  showAllSources?: boolean;
}

const DEFAULT_SOURCES: MarketSource[] = ['PredictIt', 'Kalshi', 'Polymarket', 'Smarkets'];

export function OddsTable({ market, showAllSources = false }: OddsTableProps) {
  // Determine which sources to show
  const sources: MarketSource[] = showAllSources
    ? (Object.keys(MARKET_SOURCES) as MarketSource[])
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
                <TableHead className="text-center w-20">Chg</TableHead>
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
                />
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </TooltipProvider>
  );
}
