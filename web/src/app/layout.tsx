import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { QueryProvider } from "@/components/providers";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://electionodds.com"),
  title: {
    default: "Election Odds 2026 & 2028 — Real-Time Prediction Market Tracker | ElectionOdds",
    template: "%s | ElectionOdds",
  },
  description:
    "Compare real-time election odds from Polymarket, PredictIt, Kalshi, and Smarkets. Track 2026 midterm and 2028 presidential prediction markets in one place.",
  keywords: [
    "election odds",
    "prediction markets",
    "election betting",
    "2028 presidential odds",
    "2026 midterm odds",
    "polymarket",
    "predictit",
    "kalshi",
    "smarkets",
    "election forecast",
  ],
  openGraph: {
    type: "website",
    siteName: "ElectionOdds",
    title: "Election Odds 2026 & 2028 — Real-Time Prediction Market Tracker",
    description:
      "Compare real-time election odds from Polymarket, PredictIt, Kalshi, and Smarkets. Track 2026 midterm and 2028 presidential prediction markets in one place.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Election Odds 2026 & 2028 — Real-Time Prediction Market Tracker",
    description:
      "Compare real-time election odds from Polymarket, PredictIt, Kalshi, and Smarkets.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen flex flex-col`}
      >
        <QueryProvider>
          <Header />
          <main className="flex-1">
            {children}
          </main>
          <Footer />
        </QueryProvider>
      </body>
    </html>
  );
}
