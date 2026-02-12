import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Prediction Market Track Record — 808+ Elections Scored",
  description:
    "How accurate are prediction markets? See our track record of 808+ predictions with Brier scores. Transparent accuracy data from 2016 to present.",
  openGraph: {
    title: "Prediction Market Track Record — 808+ Elections Scored",
    description:
      "How accurate are prediction markets? See our track record of 808+ predictions with Brier scores. Transparent accuracy data from 2016 to present.",
  },
  twitter: {
    title: "Prediction Market Track Record — 808+ Elections Scored",
    description:
      "808+ predictions scored with Brier scores. Transparent accuracy data from 2016 to present.",
  },
};

export default function TrackRecordLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
