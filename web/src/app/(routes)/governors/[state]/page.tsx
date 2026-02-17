import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { notFound } from "next/navigation";
import getQueryClient from "@/lib/get-query-client";
import { getGovernorRacesServer } from "@/lib/server-queries";
import GovernorStateContent from "./GovernorStateContent";

export const revalidate = 60;

const VALID_STATES = [
  "al", "ak", "az", "ar", "ca", "co", "ct", "fl", "ga", "hi",
  "id", "il", "ia", "ks", "me", "md", "ma", "mi", "mn", "ne",
  "nv", "nh", "nm", "ny", "oh", "ok", "or", "pa", "ri", "sc",
  "sd", "tn", "tx", "vt", "wi", "wy",
];

export default async function GovernorStatePage({
  params,
}: {
  params: Promise<{ state: string }>;
}) {
  const { state } = await params;
  const stateAbbrev = state.toLowerCase();

  if (!VALID_STATES.includes(stateAbbrev)) {
    notFound();
  }

  const queryClient = getQueryClient();

  await queryClient.prefetchQuery({
    queryKey: ["governor-races", "1d", stateAbbrev],
    queryFn: () =>
      getGovernorRacesServer({
        states: [stateAbbrev],
        changePeriod: "1d",
      }),
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <GovernorStateContent />
    </HydrationBoundary>
  );
}
