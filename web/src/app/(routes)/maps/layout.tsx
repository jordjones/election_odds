import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Election Maps — Senate & Governor Party Control by State',
  description:
    'Interactive maps of the current US Senate composition and governor party control by state. See which states are Republican or Democrat going into the 2026 midterms.',
  openGraph: {
    title: 'Election Maps — Senate & Governor Party Control by State',
    description:
      'Interactive maps of the current US Senate composition and governor party control by state. See which states are Republican or Democrat going into the 2026 midterms.',
  },
  twitter: {
    title: 'Election Maps — Senate & Governor Party Control by State',
    description:
      'Interactive choropleth maps of US Senate and Governor party control by state.',
  },
};

export default function MapsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
