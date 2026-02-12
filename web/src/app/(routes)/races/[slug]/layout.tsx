import type { Metadata } from "next";

const RACE_META: Record<string, { title: string; description: string }> = {
  "house-2026": {
    title:
      "2026 House Control Odds — Will Republicans or Democrats Win the House?",
    description:
      "Real-time 2026 House of Representatives control odds from prediction markets. Compare Republican vs Democrat chances from Polymarket, PredictIt, and Kalshi.",
  },
  "senate-2026": {
    title:
      "2026 Senate Control Odds — Will Republicans or Democrats Hold the Senate?",
    description:
      "2026 Senate control prediction market odds. Who will control the Senate after the midterms? Live data from Polymarket, PredictIt, Kalshi, and Smarkets.",
  },
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const meta = RACE_META[slug];
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

export default function RacesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
