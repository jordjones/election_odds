import type { Metadata } from 'next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MARKET_SOURCES } from '@/lib/types';

export const metadata: Metadata = {
  title: 'About ElectionOdds — How We Aggregate Prediction Market Data',
  description:
    'ElectionOdds aggregates real-time odds from PredictIt, Kalshi, Polymarket, and Smarkets. Learn about our methodology, data sources, and what makes us different.',
  openGraph: {
    title: 'About ElectionOdds — How We Aggregate Prediction Market Data',
    description:
      'ElectionOdds aggregates real-time odds from PredictIt, Kalshi, Polymarket, and Smarkets. Learn about our methodology, data sources, and what makes us different.',
  },
};

export default function AboutPage() {
  return (
    <div className="container py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-2">About Election Odds Aggregator</h1>
      <p className="text-muted-foreground mb-8">
        Real-time aggregated prediction market data for US elections.
      </p>

      <div className="prose prose-neutral dark:prose-invert max-w-none space-y-8">
        {/* What We Do */}
        <Card>
          <CardHeader>
            <CardTitle>What We Do</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>
              Election Odds Aggregator collects and displays prediction market odds from multiple
              sources in one convenient location. We aggregate data from the world&apos;s leading
              prediction markets to give you a comprehensive view of election forecasts.
            </p>
            <p>
              Our platform updates every 5 minutes to ensure you have access to the most current
              market prices. We calculate weighted averages across all sources to provide a
              consensus probability for each outcome.
            </p>
          </CardContent>
        </Card>

        {/* Data Sources */}
        <Card>
          <CardHeader>
            <CardTitle>Data Sources</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4">
              We aggregate data from the following prediction markets:
            </p>
            <div className="grid gap-4 md:grid-cols-2">
              {Object.entries(MARKET_SOURCES).map(([key, source]) => (
                <div key={key} className="flex items-center gap-3 p-3 rounded-lg bg-muted">
                  <span className="text-2xl">{source.flag}</span>
                  <div>
                    <div className="font-medium">{source.name}</div>
                    <div className="text-sm text-muted-foreground">{source.region}</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Methodology */}
        <Card>
          <CardHeader>
            <CardTitle>Methodology</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>
              <strong>Price Aggregation:</strong> We calculate a volume-weighted average of prices
              across all sources. Markets with higher trading volume receive more weight in the
              final aggregated price.
            </p>
            <p>
              <strong>Contract Matching:</strong> We use fuzzy matching algorithms to match
              equivalent contracts across different platforms, even when naming conventions vary.
            </p>
            <p>
              <strong>Real-time Updates:</strong> Our system polls each data source every 5 minutes
              and updates all displayed prices accordingly.
            </p>
          </CardContent>
        </Card>

        {/* Understanding Prediction Markets */}
        <Card>
          <CardHeader>
            <CardTitle>Understanding Prediction Markets</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>
              Prediction markets are exchange-traded markets where participants buy and sell
              contracts that pay out based on the outcome of future events. The prices of these
              contracts can be interpreted as the market&apos;s collective estimate of the
              probability of each outcome.
            </p>
            <p>
              For example, if a contract for &quot;Candidate X wins the election&quot; is trading at $0.60,
              the market is implying approximately a 60% probability that Candidate X will win.
            </p>
            <p>
              <strong>Important:</strong> Prediction market prices reflect market sentiment and
              available information at a given moment. They are not guaranteed forecasts and can
              change rapidly as new information becomes available.
            </p>
          </CardContent>
        </Card>

        {/* Disclaimer */}
        <Card>
          <CardHeader>
            <CardTitle>Disclaimer</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>
              The information provided on this website is for informational purposes only and
              should not be construed as financial, investment, or gambling advice. Prediction
              market trading involves substantial risk and is not suitable for all investors.
            </p>
            <p>
              We do not endorse or recommend any specific prediction market platform. Users should
              conduct their own research and understand the risks before participating in any
              prediction market.
            </p>
            <p>
              Past performance of prediction markets is not indicative of future results. Election
              outcomes are inherently uncertain, and market prices can and do change significantly.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
