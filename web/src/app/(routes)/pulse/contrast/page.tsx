'use client';

import { ContrastView } from '@/components/pulse/ContrastView';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function ContrastPage() {
  return (
    <div className="container py-8">
      {/* Breadcrumb */}
      <div className="text-sm text-muted-foreground mb-4">
        <Link href="/pulse" className="hover:underline">Pulse</Link>
        {' / '}
        <span>Compare</span>
      </div>

      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Compare Candidates</h1>
        <p className="text-muted-foreground">
          Compare what two candidates are saying on X, side by side.
        </p>
      </div>

      <ContrastView />

      <div className="mt-8">
        <Button variant="outline" asChild>
          <Link href="/pulse">Back to Pulse Feed</Link>
        </Button>
      </div>
    </div>
  );
}
