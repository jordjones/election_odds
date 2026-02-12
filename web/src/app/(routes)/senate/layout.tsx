import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "2026 Senate Race Odds — All 35 State Races Tracked",
  description:
    "Prediction market odds for all 35 Senate races in 2026. See which races are competitive, compare odds across markets, and track senate primaries.",
  openGraph: {
    title: "2026 Senate Race Odds — All 35 State Races Tracked",
    description:
      "Prediction market odds for all 35 Senate races in 2026. See which races are competitive, compare odds across markets, and track senate primaries.",
  },
  twitter: {
    title: "2026 Senate Race Odds — All 35 State Races Tracked",
    description:
      "Prediction market odds for all 35 Senate races in 2026. Competitive vs safe seats, cross-market comparison.",
  },
};

export default function SenateLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
