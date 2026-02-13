import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'US Senate Map — Current Party Control by State',
  description:
    'Interactive map of the current US Senate composition. See which states have Republican, Democrat, or split delegations after the 2024 election.',
  openGraph: {
    title: 'US Senate Map — Current Party Control by State',
    description:
      'Interactive map of the current US Senate composition. See which states have Republican, Democrat, or split delegations after the 2024 election.',
  },
  twitter: {
    title: 'US Senate Map — Current Party Control by State',
    description:
      'Interactive choropleth of the 119th Congress Senate composition by state.',
  },
};

export default function MapsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
