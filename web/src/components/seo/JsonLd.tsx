"use client";

/**
 * Renders JSON-LD structured data as a script tag.
 * The data parameter is a static object defined in this codebase — not user input.
 * This is the standard Next.js pattern for JSON-LD (see Next.js docs).
 */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

export const HOMEPAGE_JSONLD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      name: "ElectionOdds",
      alternateName: "Election Odds Aggregator",
      url: "https://electionodds.com",
      description:
        "Real-time aggregated prediction market odds for US elections from Polymarket, PredictIt, Kalshi, and Smarkets.",
      publisher: {
        "@type": "Organization",
        name: "ElectionOdds",
        url: "https://electionodds.com",
      },
    },
    {
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: "What is ElectionOdds?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "ElectionOdds is a free, real-time aggregator of election prediction market data. We pull odds from PredictIt, Kalshi, Polymarket, Smarkets, and electionbettingodds.com so you can compare all the major markets in one place.",
          },
        },
        {
          "@type": "Question",
          name: "How often is the data updated?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Featured markets update every 5 minutes. All other markets sync twice daily. Every odds table shows a last updated timestamp.",
          },
        },
        {
          "@type": "Question",
          name: "What prediction markets do you track?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "We aggregate data from Polymarket, PredictIt, Kalshi, Smarkets, and electionbettingodds.com. Each has different user bases and liquidity, which is why cross-market comparison is valuable.",
          },
        },
        {
          "@type": "Question",
          name: "Are prediction markets accurate?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Historically, yes. Our Track Record page shows 808+ past predictions scored with Brier scores. Markets aggregate wisdom of the crowd in real time and have a strong track record for major elections.",
          },
        },
        {
          "@type": "Question",
          name: "Is this a betting site?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "No. ElectionOdds is an information aggregator only. We do not facilitate betting or trading. We link to source markets but are not a broker, exchange, or gambling platform.",
          },
        },
        {
          "@type": "Question",
          name: "How is this different from electionbettingodds.com?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "We cover more markets in more depth: side-by-side source comparison, individual state senate races, primaries, interactive historical charts, and 5-minute updates.",
          },
        },
        {
          "@type": "Question",
          name: "Is ElectionOdds free?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes, completely free. No ads, no paywall, no account required.",
          },
        },
      ],
    },
  ],
};
