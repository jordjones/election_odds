import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { notFound } from "next/navigation";
import getQueryClient from "@/lib/get-query-client";
import { getMarketsServer } from "@/lib/server-queries";
import PrimaryContent from "./PrimaryContent";
import type { MarketCategory } from "@/lib/types";

export const revalidate = 60;

const PARTY_CATEGORIES: Record<string, MarketCategory> = {
  dem: "primary-dem",
  democratic: "primary-dem",
  gop: "primary-gop",
  republican: "primary-gop",
};

export default async function PrimaryPage({
  params,
}: {
  params: Promise<{ party: string }>;
}) {
  const { party } = await params;
  const category = PARTY_CATEGORIES[party];

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
      <PrimaryContent />
    </HydrationBoundary>
  );
}
