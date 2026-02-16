import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import getQueryClient from "@/lib/get-query-client";
import {
  getFeaturedMarketsServer,
  getMarketsServer,
} from "@/lib/server-queries";
import HomeContent from "./HomeContent";

export const revalidate = 60;

export default async function HomePage() {
  const queryClient = getQueryClient();

  await Promise.all([
    queryClient.prefetchQuery({
      queryKey: ["markets", "featured"],
      queryFn: getFeaturedMarketsServer,
    }),
    queryClient.prefetchQuery({
      queryKey: ["markets", "category", "presidential", "1d"],
      queryFn: () =>
        getMarketsServer({
          category: "presidential",
          status: "open",
          changePeriod: "1d",
        }),
    }),
  ]);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <HomeContent />
    </HydrationBoundary>
  );
}
