"use client";

import { useState } from "react";
import { useParams, notFound } from "next/navigation";
import { useMarketsByCategory, useChartData } from "@/hooks/useMarkets";
import { OddsTable, OddsChart, MarketHeader } from "@/components/odds";
import { Skeleton } from "@/components/ui/skeleton";
import type { TimeFilter, MarketCategory } from "@/lib/types";

const PARTY_CONFIG: Record<
  string,
  { category: MarketCategory; title: string; color: string }
> = {
  dem: {
    category: "primary-dem",
    title: "2028 Democratic Primary",
    color: "text-blue-600",
  },
  democratic: {
    category: "primary-dem",
    title: "2028 Democratic Primary",
    color: "text-blue-600",
  },
  gop: {
    category: "primary-gop",
    title: "2028 Republican Primary",
    color: "text-red-600",
  },
  republican: {
    category: "primary-gop",
    title: "2028 Republican Primary",
    color: "text-red-600",
  },
};

export default function PrimaryPage() {
  const params = useParams();
  const party = params.party as string;
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("all");
  const [changePeriod, setChangePeriod] = useState<TimeFilter>("1d");

  const config = PARTY_CONFIG[party];

  if (!config) {
    notFound();
  }

  const { data: markets, isLoading: marketsLoading } = useMarketsByCategory(
    config.category,
    changePeriod,
  );
  const market = markets?.[0];

  const { data: chartData, isLoading: chartLoading } = useChartData(
    market?.id || "",
    timeFilter,
  );

  if (marketsLoading) {
    return (
      <div className="container py-8">
        <Skeleton className="h-10 w-3/4 mb-4" />
        <Skeleton className="h-6 w-1/2 mb-8" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  if (!market) {
    return (
      <div className="container py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">No Market Data</h1>
          <p className="text-muted-foreground">
            No primary market data is currently available.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <h1 className={`text-3xl font-bold mb-2 ${config.color}`}>
        {config.title}
      </h1>
      <p className="text-muted-foreground mb-8">
        Who will win the{" "}
        {config.category === "primary-dem" ? "Democratic" : "Republican"}{" "}
        presidential nomination?
      </p>

      <div className="grid gap-8">
        {/* Chart Section */}
        <section>
          <OddsChart
            data={chartData}
            isLoading={chartLoading}
            timeFilter={timeFilter}
            onTimeFilterChange={setTimeFilter}
          />
        </section>

        {/* Odds Table */}
        <section>
          <h2 className="text-xl font-bold mb-4">Current Odds</h2>
          <OddsTable
            market={market}
            showAllSources
            changePeriod={changePeriod}
            onChangePeriodChange={setChangePeriod}
          />
        </section>
      </div>
    </div>
  );
}
