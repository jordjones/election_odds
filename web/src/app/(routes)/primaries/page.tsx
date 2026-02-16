import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import getQueryClient from "@/lib/get-query-client";
import { getMarketsServer } from "@/lib/server-queries";
import PrimariesContent from "./PrimariesContent";

export const revalidate = 60;

export default async function PrimariesPage() {
  const queryClient = getQueryClient();

  await Promise.all([
    queryClient.prefetchQuery({
      queryKey: ["markets", "category", "primary-gop", "1d"],
      queryFn: () =>
        getMarketsServer({
          category: "primary-gop",
          status: "open",
          changePeriod: "1d",
        }),
    }),
    queryClient.prefetchQuery({
      queryKey: ["markets", "category", "primary-dem", "1d"],
      queryFn: () =>
        getMarketsServer({
          category: "primary-dem",
          status: "open",
          changePeriod: "1d",
        }),
    }),
  ]);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <PrimariesContent />
    </HydrationBoundary>
  );
}
