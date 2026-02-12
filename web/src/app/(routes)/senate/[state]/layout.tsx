import type { Metadata } from "next";

const STATE_NAMES: Record<string, string> = {
  al: "Alabama",
  ak: "Alaska",
  ar: "Arkansas",
  co: "Colorado",
  de: "Delaware",
  fl: "Florida",
  ga: "Georgia",
  id: "Idaho",
  il: "Illinois",
  ia: "Iowa",
  ks: "Kansas",
  ky: "Kentucky",
  la: "Louisiana",
  me: "Maine",
  ma: "Massachusetts",
  mi: "Michigan",
  mn: "Minnesota",
  ms: "Mississippi",
  mt: "Montana",
  ne: "Nebraska",
  nh: "New Hampshire",
  nj: "New Jersey",
  nm: "New Mexico",
  nc: "North Carolina",
  oh: "Ohio",
  ok: "Oklahoma",
  or: "Oregon",
  ri: "Rhode Island",
  sc: "South Carolina",
  sd: "South Dakota",
  tn: "Tennessee",
  tx: "Texas",
  va: "Virginia",
  wv: "West Virginia",
  wy: "Wyoming",
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ state: string }>;
}): Promise<Metadata> {
  const { state } = await params;
  const stateName = STATE_NAMES[state.toLowerCase()];
  if (!stateName) return {};

  const title = `${stateName} 2026 Senate Race Odds — Prediction Market Tracker`;
  const description = `Live prediction market odds for the 2026 ${stateName} Senate race. Compare candidate probabilities from Polymarket, PredictIt, and Kalshi.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
    },
    twitter: {
      title,
      description,
    },
  };
}

export default function StateSenateLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
