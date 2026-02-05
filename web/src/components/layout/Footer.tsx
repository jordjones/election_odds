import Link from 'next/link';
import { MARKET_SOURCES } from '@/lib/types';

export function Footer() {
  return (
    <footer className="border-t bg-muted/50">
      <div className="container py-8 md:py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {/* About */}
          <div>
            <h3 className="font-semibold mb-3">About</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link href="/about" className="hover:text-foreground transition-colors">
                  About Us
                </Link>
              </li>
              <li>
                <Link href="/track-record" className="hover:text-foreground transition-colors">
                  Track Record
                </Link>
              </li>
              <li>
                <Link href="/methodology" className="hover:text-foreground transition-colors">
                  Methodology
                </Link>
              </li>
            </ul>
          </div>

          {/* Markets */}
          <div>
            <h3 className="font-semibold mb-3">Markets</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link href="/presidential/candidates" className="hover:text-foreground transition-colors">
                  2028 Presidential
                </Link>
              </li>
              <li>
                <Link href="/races/house-2026" className="hover:text-foreground transition-colors">
                  2026 House
                </Link>
              </li>
              <li>
                <Link href="/races/senate-2026" className="hover:text-foreground transition-colors">
                  2026 Senate
                </Link>
              </li>
            </ul>
          </div>

          {/* Sources */}
          <div>
            <h3 className="font-semibold mb-3">Data Sources</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {Object.entries(MARKET_SOURCES).map(([key, source]) => (
                <li key={key}>
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-foreground transition-colors"
                  >
                    {source.flag} {source.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="font-semibold mb-3">Legal</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link href="/privacy" className="hover:text-foreground transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-foreground transition-colors">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link href="/disclaimer" className="hover:text-foreground transition-colors">
                  Disclaimer
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t text-center text-sm text-muted-foreground">
          <p>
            Data aggregated from multiple prediction markets for informational purposes only.
            Not financial advice.
          </p>
          <p className="mt-2">
            &copy; {new Date().getFullYear()} Election Odds Aggregator. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
