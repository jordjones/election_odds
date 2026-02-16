import type { Metadata } from "next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Methodology",
  description:
    "How ElectionOdds aggregates prediction market data. Learn about our price aggregation, contract matching, and data freshness approach.",
  openGraph: {
    title: "Methodology — ElectionOdds",
    description:
      "How ElectionOdds aggregates prediction market data from PredictIt, Kalshi, Polymarket, and Smarkets.",
  },
};

export default function MethodologyPage() {
  return (
    <div className="container py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-2">Methodology</h1>
      <p className="text-muted-foreground mb-8">
        How we collect, process, and display prediction market odds.
      </p>

      <div className="prose prose-neutral dark:prose-invert max-w-none space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>Data Collection</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>
              We poll four major prediction markets every 5 minutes: PredictIt,
              Kalshi, Polymarket, and Smarkets. Each platform offers contracts on
              US election outcomes, and we collect the latest prices, volumes,
              and contract metadata from their public APIs.
            </p>
            <p>
              For each market, we store a timestamped snapshot of every
              contract&apos;s price so we can calculate historical trends and
              price changes over time.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Contract Matching</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>
              Different platforms use different names for the same candidates and
              outcomes. We normalize contract names using a fuzzy matching
              algorithm that strips common prefixes (&quot;Will X win...&quot;),
              handles party labels, and resolves spelling variations.
            </p>
            <p>
              Matched contracts are grouped by candidate, letting you compare
              the same person&apos;s odds across all four sources in a single
              row.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Price Aggregation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>
              The &quot;Average&quot; column shows a volume-weighted mean of
              each candidate&apos;s price across all sources that have fresh
              data. Markets with higher trading volume carry more weight in the
              aggregate.
            </p>
            <p>
              We exclude stale prices (more than 48 hours older than the
              freshest source) and detect illiquid markets where prices cluster
              near 50/50 for all contracts, which typically indicates a broken
              or inactive market rather than genuine uncertainty.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Change Calculations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>
              Price changes (shown as green/red arrows) compare the current
              average price to the average price at the selected lookback period
              (1 day, 1 week, 1 month, or 3 months). The change is displayed in
              percentage points.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Senate Race Classification</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>
              Senate races are classified as &quot;Competitive&quot; or
              &quot;Safe&quot; based on market prices. If the second-highest
              priced party (Democrat, Republican, or Independent) has odds of 10%
              or higher, the race is marked competitive. Otherwise it is
              considered safe for the leading party.
            </p>
            <p>
              When both party-level contracts and individual candidate contracts
              exist for the same state, we display the party-level odds for
              consistency across sources.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
