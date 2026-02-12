import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Candidate Pulse | ElectionOdds',
  description: 'See what candidates are saying on X alongside their prediction market odds. Curated posts from top 2028 presidential contenders.',
  openGraph: {
    title: 'Candidate Pulse | ElectionOdds',
    description: 'Candidate social posts + real-time prediction market odds in one place.',
  },
};

export default function PulseLayout({ children }: { children: React.ReactNode }) {
  return children;
}
