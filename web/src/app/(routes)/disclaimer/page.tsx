import type { Metadata } from "next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Disclaimer",
  description:
    "ElectionOdds disclaimer. Important information about prediction market data and its limitations.",
  openGraph: {
    title: "Disclaimer — ElectionOdds",
    description:
      "Important information about prediction market data and its limitations.",
  },
};

export default function DisclaimerPage() {
  return (
    <div className="container py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-2">Disclaimer</h1>
      <p className="text-muted-foreground mb-8">
        Important information about the data on this site.
      </p>

      <div className="prose prose-neutral dark:prose-invert max-w-none space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>Informational Purposes Only</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>
              The information provided on ElectionOdds is for informational and
              educational purposes only. It should not be construed as
              financial, investment, or gambling advice. Prediction market
              prices are not guaranteed forecasts of future events.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>No Endorsement</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>
              We do not endorse or recommend any specific prediction market
              platform, political candidate, or party. The display of market
              data does not constitute an endorsement of any outcome or a
              recommendation to participate in any prediction market.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Risk of Trading</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>
              Prediction market trading involves substantial risk and is not
              suitable for all individuals. You could lose some or all of your
              invested capital. Users should conduct their own research and
              understand the risks before participating in any prediction
              market.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Data Limitations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>
              Market data is collected from third-party APIs and may contain
              errors, delays, or gaps. Prices displayed may not reflect the
              most recent trades on each platform. Historical data is provided
              as-is and may not capture all market movements.
            </p>
            <p>
              Past performance of prediction markets is not indicative of
              future accuracy. Election outcomes are inherently uncertain, and
              market prices can change significantly in response to new
              information.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Regulatory Notice</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>
              Prediction market regulations vary by jurisdiction. Some markets
              displayed on this site may not be available in your region.
              It is your responsibility to understand and comply with
              applicable laws in your jurisdiction before participating in
              any prediction market.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
