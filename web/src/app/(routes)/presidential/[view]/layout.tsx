import type { Metadata } from "next";

const VIEW_META: Record<string, { title: string; description: string }> = {
  candidates: {
    title: "2028 Presidential Election Odds by Candidate — Who Will Win?",
    description:
      "Live 2028 presidential election odds for every candidate. Compare Vance, Newsom, DeSantis, and 100+ others across Polymarket, PredictIt, Kalshi, and Smarkets.",
  },
  party: {
    title: "2028 Presidential Election Odds by Party — Republican vs Democrat",
    description:
      "Will a Republican or Democrat win in 2028? Real-time party odds from Polymarket, PredictIt, Kalshi, and Smarkets updated every 5 minutes.",
  },
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ view: string }>;
}): Promise<Metadata> {
  const { view } = await params;
  const meta = VIEW_META[view];
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

export default function PresidentialLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
