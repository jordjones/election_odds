import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "2028 Presidential Primaries — Republican & Democratic Nomination Odds",
  description:
    "Live prediction market odds for the 2028 Republican and Democratic presidential primaries. Compare candidates across Polymarket, PredictIt, Kalshi, and Smarkets.",
  openGraph: {
    title: "2028 Presidential Primaries — Republican & Democratic Nomination Odds",
    description:
      "Live prediction market odds for the 2028 Republican and Democratic presidential primaries.",
  },
};

export default function PrimariesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
