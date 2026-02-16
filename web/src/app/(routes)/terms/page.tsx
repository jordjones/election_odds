import type { Metadata } from "next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "ElectionOdds terms of service. Understand the terms governing use of our prediction market aggregator.",
  openGraph: {
    title: "Terms of Service — ElectionOdds",
    description:
      "Terms governing use of the ElectionOdds prediction market aggregator.",
  },
};

export default function TermsPage() {
  return (
    <div className="container py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-2">Terms of Service</h1>
      <p className="text-muted-foreground mb-8">
        Last updated: February 2026
      </p>

      <div className="prose prose-neutral dark:prose-invert max-w-none space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>Use of This Website</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>
              ElectionOdds provides aggregated prediction market data for
              informational and educational purposes only. By using this
              website, you agree to these terms.
            </p>
            <p>
              You may access and view the content on this site for personal,
              non-commercial use. You may not scrape, reproduce, or redistribute
              our aggregated data in bulk without permission.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>No Financial Advice</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>
              Nothing on this website constitutes financial, investment, or
              gambling advice. Prediction market prices reflect market sentiment
              and are not guaranteed forecasts. You should not make financial
              decisions based solely on the information presented here.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Data Accuracy</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>
              We make reasonable efforts to ensure the accuracy of displayed
              data, but we do not guarantee that prices, volumes, or other
              market data are error-free or up-to-date at all times. Data is
              sourced from third-party APIs and may be subject to delays or
              inaccuracies.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Third-Party Links</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>
              This site contains links to third-party prediction market
              platforms. We are not responsible for the content, terms, or
              practices of these external sites. Participation in any prediction
              market is at your own risk and subject to that platform&apos;s
              terms.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Limitation of Liability</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>
              ElectionOdds is provided &quot;as is&quot; without warranties of
              any kind. We are not liable for any losses or damages arising from
              your use of this website or reliance on the information presented.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
