import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Election Odds Charts — Historical Prediction Market Data",
  description:
    "Interactive charts showing how election odds have moved over time. Track historical prediction market data for presidential, senate, and house races.",
  openGraph: {
    title: "Election Odds Charts — Historical Prediction Market Data",
    description:
      "Interactive charts showing how election odds have moved over time. Track historical prediction market data for presidential, senate, and house races.",
  },
  twitter: {
    title: "Election Odds Charts — Historical Prediction Market Data",
    description:
      "Interactive charts tracking election odds over time across all major prediction markets.",
  },
};

export default function ChartsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
