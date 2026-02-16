import type { Metadata } from "next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "ElectionOdds privacy policy. Learn how we handle your data and protect your privacy.",
  openGraph: {
    title: "Privacy Policy — ElectionOdds",
    description: "How ElectionOdds handles your data and protects your privacy.",
  },
};

export default function PrivacyPage() {
  return (
    <div className="container py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-2">Privacy Policy</h1>
      <p className="text-muted-foreground mb-8">
        Last updated: February 2026
      </p>

      <div className="prose prose-neutral dark:prose-invert max-w-none space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>Information We Collect</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>
              ElectionOdds is a read-only informational website. We do not
              require user accounts, collect personal information, or use
              cookies for tracking purposes.
            </p>
            <p>
              Our hosting provider (Netlify) may collect standard server logs
              including IP addresses, browser type, and pages visited. These
              logs are used for security and performance monitoring only.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Third-Party Services</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>
              We display data sourced from third-party prediction markets
              (PredictIt, Kalshi, Polymarket, and Smarkets). When you visit
              external links to these platforms, their respective privacy
              policies apply.
            </p>
            <p>
              The Candidate Pulse feature embeds public posts from X (Twitter).
              X&apos;s privacy policy governs any data collection related to
              embedded content.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Data Storage</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>
              All prediction market data displayed on this site is stored in our
              database for the purpose of showing historical trends and price
              changes. This data is publicly available market information and
              does not include any personal user data.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Changes to This Policy</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>
              We may update this privacy policy from time to time. Any changes
              will be reflected on this page with an updated date.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
