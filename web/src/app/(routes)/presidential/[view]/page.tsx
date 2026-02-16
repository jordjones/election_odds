import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { notFound } from "next/navigation";
import getQueryClient from "@/lib/get-query-client";
import { getMarketsServer } from "@/lib/server-queries";
import PresidentialContent from "./PresidentialContent";

export const revalidate = 60;

const VALID_VIEWS = ["party", "candidates"];

export default async function PresidentialPage({
  params,
}: {
  params: Promise<{ view: string }>;
}) {
  const { view } = await params;

  if (!VALID_VIEWS.includes(view)) {
    notFound();
  }

  const queryClient = getQueryClient();

  await queryClient.prefetchQuery({
    queryKey: ["markets", "category", "presidential", "1d"],
    queryFn: () =>
      getMarketsServer({
        category: "presidential",
        status: "open",
        changePeriod: "1d",
      }),
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <PresidentialContent />
    </HydrationBoundary>
  );
}
