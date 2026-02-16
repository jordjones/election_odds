import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import getQueryClient from "@/lib/get-query-client";
import {
  getSenateRacesServer,
  getSenatePrimariesServer,
} from "@/lib/server-queries";
import SenateContent from "./SenateContent";

export const revalidate = 60;

export default async function SenatePage() {
  const queryClient = getQueryClient();

  await Promise.all([
    queryClient.prefetchQuery({
      queryKey: ["senate-races", "1d", undefined],
      queryFn: () => getSenateRacesServer({ changePeriod: "1d" }),
    }),
    queryClient.prefetchQuery({
      queryKey: ["senate-primaries", "1d"],
      queryFn: () => getSenatePrimariesServer({ changePeriod: "1d" }),
    }),
  ]);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <SenateContent />
    </HydrationBoundary>
  );
}
