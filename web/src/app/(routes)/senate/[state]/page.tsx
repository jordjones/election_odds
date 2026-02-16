import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { notFound } from "next/navigation";
import getQueryClient from "@/lib/get-query-client";
import {
  getSenateRacesServer,
  getSenatePrimariesServer,
} from "@/lib/server-queries";
import StateContent from "./StateContent";

export const revalidate = 60;

const VALID_STATES = [
  "al", "ak", "ar", "co", "de", "fl", "ga", "id", "il", "ia",
  "ks", "ky", "la", "me", "ma", "mi", "mn", "ms", "mt", "ne",
  "nh", "nj", "nm", "nc", "oh", "ok", "or", "ri", "sc", "sd",
  "tn", "tx", "va", "wv", "wy",
];

export default async function StateSenateRacePage({
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

  await Promise.all([
    queryClient.prefetchQuery({
      queryKey: ["senate-races", "1d", stateAbbrev],
      queryFn: () =>
        getSenateRacesServer({
          states: [stateAbbrev],
          changePeriod: "1d",
        }),
    }),
    queryClient.prefetchQuery({
      queryKey: ["senate-primaries", "1d"],
      queryFn: () => getSenatePrimariesServer({ changePeriod: "1d" }),
    }),
  ]);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <StateContent />
    </HydrationBoundary>
  );
}
