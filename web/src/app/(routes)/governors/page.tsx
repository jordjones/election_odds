import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import getQueryClient from "@/lib/get-query-client";
import { getGovernorRacesServer } from "@/lib/server-queries";
import GovernorContent from "./GovernorContent";

export const revalidate = 60;

export default async function GovernorsPage() {
  const queryClient = getQueryClient();

  await queryClient.prefetchQuery({
    queryKey: ["governor-races", "1d", undefined],
    queryFn: () => getGovernorRacesServer({ changePeriod: "1d" }),
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <GovernorContent />
    </HydrationBoundary>
  );
}
