import type { Metadata } from "next";

interface Props {
  params: Promise<{ name: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { name } = await params;
  const displayName = name
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

  return {
    title: `${displayName} Pulse`,
    description: `See ${displayName}'s latest posts on X alongside their prediction market odds.`,
    openGraph: {
      title: `${displayName} — Candidate Pulse`,
      description: `${displayName}'s social posts + real-time prediction market odds.`,
    },
  };
}

export default function CandidatePulseLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
