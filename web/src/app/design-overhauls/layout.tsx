import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Design Overhauls | ElectionOdds',
  robots: { index: false, follow: false },
};

export default function DesignOverhaulLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
