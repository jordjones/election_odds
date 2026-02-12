import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const name = slug
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

  const title = `${name} — Prediction Market Odds`;
  const description = `Real-time prediction market odds for ${name}. Compare prices from Polymarket, PredictIt, Kalshi, and Smarkets.`;

  return {
    title,
    description,
    openGraph: { title, description },
    twitter: { title, description },
  };
}

export default function MarketLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
