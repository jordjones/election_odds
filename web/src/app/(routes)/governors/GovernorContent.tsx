"use client";

import { useState } from "react";
import Link from "next/link";
import { useStateGovernorRaces } from "@/hooks/useMarkets";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  formatPercent,
  formatPriceChange,
  getPriceChangeColor,
  cn,
} from "@/lib/utils";
import type { Market, TimeFilter } from "@/lib/types";

const CHANGE_PERIOD_OPTIONS: { value: TimeFilter; label: string }[] = [
  { value: "1d", label: "24h" },
  { value: "1w", label: "7d" },
  { value: "30d", label: "30d" },
];

function RaceCard({ race }: { race: Market }) {
  const stateAbbrev = race.id.replace("governor-race-", "");
  const stateName = race.name.replace(" Governor Race 2026", "");
  const topContracts = [...race.contracts]
    .sort((a, b) => b.aggregatedPrice - a.aggregatedPrice)
    .slice(0, 3);

  return (
    <Link href={`/governors/${stateAbbrev}`} className="block">
      <Card className="hover:shadow-md transition-shadow h-full">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-lg leading-tight">{stateName}</CardTitle>
            <span className="text-xs text-muted-foreground uppercase font-mono">
              {stateAbbrev}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            {race.contracts.flatMap((c) => c.prices).length > 0
              ? `${[...new Set(race.contracts.flatMap((c) => c.prices.map((p) => p.source)))].length} sources`
              : ""}
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {topContracts.map((contract) => (
              <div
                key={contract.id}
                className="flex items-center justify-between py-1"
              >
                <span className="font-medium text-sm truncate mr-2">
                  {contract.shortName || contract.name}
                </span>
                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className={cn(
                      "text-xs font-mono",
                      getPriceChangeColor(contract.priceChange),
                    )}
                  >
                    {formatPriceChange(contract.priceChange)}
                  </span>
                  <span className="font-mono font-bold text-sm">
                    {formatPercent(contract.aggregatedPrice, 1)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export default function GovernorContent() {
  const [changePeriod, setChangePeriod] = useState<TimeFilter>("1d");
  const { data: races, isLoading } = useStateGovernorRaces(changePeriod);

  // Split races: safe when max - min >= 75%, else competitive
  const isCompetitive = (r: Market) => {
    const prices = r.contracts.map((c) => c.aggregatedPrice);
    if (prices.length < 2) return false;
    const max = Math.max(...prices);
    const min = Math.min(...prices);
    return max - min < 0.75;
  };
  const competitiveRaces = races?.filter(isCompetitive) || [];
  const safeRaces = races?.filter((r) => !isCompetitive(r)) || [];

  if (isLoading) {
    return (
      <div className="container py-8">
        <Skeleton className="h-10 w-3/4 mb-4" />
        <Skeleton className="h-6 w-1/2 mb-8" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 12 }).map((_, i) => (
            <Skeleton key={i} className="h-[180px] w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">2026 Governor Races</h1>
        <p className="text-muted-foreground">
          All {races?.length || 0} gubernatorial races up in 2026. Aggregated
          from Polymarket, Kalshi, PredictIt, and Smarkets.
        </p>
      </div>

      <div className="flex items-center gap-2 mb-6">
        <span className="text-sm text-muted-foreground">Change:</span>
        {CHANGE_PERIOD_OPTIONS.map((option) => (
          <button
            key={option.value}
            onClick={() => setChangePeriod(option.value)}
            className={cn(
              "px-2 py-1 text-xs rounded transition-colors",
              changePeriod === option.value
                ? "bg-primary text-primary-foreground"
                : "bg-muted hover:bg-muted/80 text-muted-foreground",
            )}
          >
            {option.label}
          </button>
        ))}
      </div>

      {!races || races.length === 0 ? (
        <div className="text-center py-12">
          <h2 className="text-xl font-bold mb-2">No Race Data</h2>
          <p className="text-muted-foreground">
            No governor race data is currently available. Data requires a
            database connection.
          </p>
        </div>
      ) : (
        <>
          {/* Competitive Races */}
          {competitiveRaces.length > 0 && (
            <section className="mb-10">
              <h2 className="text-xl font-bold mb-4">
                Competitive Races
                <span className="text-sm font-normal text-muted-foreground ml-2">
                  ({competitiveRaces.length})
                </span>
              </h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {competitiveRaces.map((race) => (
                  <RaceCard key={race.id} race={race} />
                ))}
              </div>
            </section>
          )}

          {/* Safe Races */}
          {safeRaces.length > 0 && (
            <section className="mb-10">
              <h2 className="text-xl font-bold mb-4">
                Safe Seats
                <span className="text-sm font-normal text-muted-foreground ml-2">
                  ({safeRaces.length})
                </span>
              </h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {safeRaces.map((race) => (
                  <RaceCard key={race.id} race={race} />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
