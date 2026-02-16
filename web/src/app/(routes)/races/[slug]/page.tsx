import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { notFound } from "next/navigation";
import getQueryClient from "@/lib/get-query-client";
import { getMarketsServer } from "@/lib/server-queries";
import RaceContent from "./RaceContent";
import type { MarketCategory } from "@/lib/types";

export const revalidate = 60;

const RACE_CATEGORIES: Record<string, MarketCategory> = {
  "house-2026": "house",
  "senate-2026": "senate",
};

export default async function RacePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const category = RACE_CATEGORIES[slug];

  if (!category) {
    notFound();
  }

  const queryClient = getQueryClient();

  await queryClient.prefetchQuery({
    queryKey: ["markets", "category", category, "1d"],
    queryFn: () =>
      getMarketsServer({
        category,
        status: "open",
        changePeriod: "1d",
      }),
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <RaceContent />
    </HydrationBoundary>
  );
}
