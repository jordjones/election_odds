import type { Metadata } from "next";

const PARTY_META: Record<string, { title: string; description: string }> = {
  gop: {
    title: "2028 Republican Primary Odds — GOP Nominee Predictions",
    description:
      "Who will win the 2028 Republican primary? Live odds for DeSantis, Haley, Ramaswamy, and all GOP candidates from prediction markets.",
  },
  republican: {
    title: "2028 Republican Primary Odds — GOP Nominee Predictions",
    description:
      "Who will win the 2028 Republican primary? Live odds for DeSantis, Haley, Ramaswamy, and all GOP candidates from prediction markets.",
  },
  dem: {
    title: "2028 Democratic Primary Odds — DEM Nominee Predictions",
    description:
      "Who will win the 2028 Democratic primary? Live odds for Newsom, AOC, Shapiro, and all DEM candidates from prediction markets.",
  },
  democratic: {
    title: "2028 Democratic Primary Odds — DEM Nominee Predictions",
    description:
      "Who will win the 2028 Democratic primary? Live odds for Newsom, AOC, Shapiro, and all DEM candidates from prediction markets.",
  },
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ party: string }>;
}): Promise<Metadata> {
  const { party } = await params;
  const meta = PARTY_META[party];
  if (!meta) return {};

  return {
    title: meta.title,
    description: meta.description,
    openGraph: {
      title: meta.title,
      description: meta.description,
    },
    twitter: {
      title: meta.title,
      description: meta.description,
    },
  };
}

export default function PrimariesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
