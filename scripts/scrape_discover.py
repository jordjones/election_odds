#!/usr/bin/env python3
"""
Discovery script for electionbettingodds.com

This script inspects the site to understand:
1. Page structure and available URLs
2. How historical data is exposed (if at all)
3. Network requests (XHR/fetch) that might provide data
4. Embedded JSON blobs in page source
5. Chart data sources

Outputs findings to /audit/discovery.md
"""

import asyncio
import json
import re
import os
from datetime import datetime
from pathlib import Path
from urllib.parse import urlparse, parse_qs

# We'll use playwright for browser automation
try:
    from playwright.async_api import async_playwright
except ImportError:
    print("Installing playwright...")
    os.system("pip install playwright")
    os.system("playwright install chromium")
    from playwright.async_api import async_playwright

# Paths
AUDIT_DIR = Path(__file__).parent.parent / "audit"
SAMPLES_DIR = AUDIT_DIR / "samples"
DISCOVERY_FILE = AUDIT_DIR / "discovery.md"

# Ensure directories exist
AUDIT_DIR.mkdir(parents=True, exist_ok=True)
SAMPLES_DIR.mkdir(parents=True, exist_ok=True)

# Site configuration
BASE_URL = "https://electionbettingodds.com"
PAGES_TO_CHECK = [
    "/",
    "/President2028.html",
    "/President2028_by_party.html",
    "/GOP2028Primary.html",
    "/DEM2028Primary.html",
    "/House2026.html",
    "/Senate2026.html",
    "/about.html",
]


class DiscoveryReport:
    """Collects and formats discovery findings."""

    def __init__(self):
        self.timestamp = datetime.utcnow().isoformat()
        self.pages_found = []
        self.network_requests = []
        self.json_blobs = []
        self.date_patterns = []
        self.selectors = []
        self.archive_urls = []
        self.chart_data = []
        self.robots_txt = None
        self.notes = []

    def to_markdown(self) -> str:
        """Generate markdown report."""
        md = f"""# electionbettingodds.com Discovery Report

Generated: {self.timestamp} UTC

## Summary

This document describes the data structure and access patterns discovered on electionbettingodds.com.

## robots.txt

```
{self.robots_txt or 'Not fetched'}
```

## Pages Discovered

"""
        for page in self.pages_found:
            md += f"- **{page['url']}**\n"
            if page.get('title'):
                md += f"  - Title: {page['title']}\n"
            if page.get('has_chart'):
                md += f"  - Has chart: Yes\n"
            if page.get('has_table'):
                md += f"  - Has data table: Yes\n"
            if page.get('last_updated'):
                md += f"  - Last updated shown: {page['last_updated']}\n"

        md += "\n## Network Requests (XHR/Fetch)\n\n"
        if self.network_requests:
            for req in self.network_requests[:20]:  # Limit to 20
                md += f"- `{req['method']} {req['url'][:100]}...`\n"
                if req.get('response_type'):
                    md += f"  - Type: {req['response_type']}\n"
        else:
            md += "No significant XHR/fetch requests found (site appears to use static HTML).\n"

        md += "\n## Embedded JSON Blobs\n\n"
        if self.json_blobs:
            for blob in self.json_blobs[:5]:
                md += f"### {blob['source']}\n\n```json\n{blob['preview']}\n```\n\n"
        else:
            md += "No embedded JSON blobs found.\n"

        md += "\n## Date/Archive Patterns\n\n"
        if self.date_patterns:
            for pattern in self.date_patterns:
                md += f"- {pattern}\n"
        else:
            md += "No date/archive URL patterns found. Site appears to show only current data.\n"

        md += "\n## Chart Data Sources\n\n"
        if self.chart_data:
            for chart in self.chart_data:
                md += f"### {chart['source']}\n\n"
                md += f"- Type: {chart['type']}\n"
                if chart.get('sample'):
                    md += f"- Sample:\n```\n{chart['sample'][:500]}\n```\n\n"
        else:
            md += "Chart data sources not yet analyzed.\n"

        md += "\n## HTML Selectors for Data Extraction\n\n"
        if self.selectors:
            md += "```css\n"
            for sel in self.selectors:
                md += f"{sel['name']}: {sel['selector']}\n"
            md += "```\n"
        else:
            md += "Selectors to be determined from HTML analysis.\n"

        md += "\n## Archive/Historical Access\n\n"
        if self.archive_urls:
            for url in self.archive_urls:
                md += f"- {url}\n"
        else:
            md += """No built-in archive found on the site.

### Fallback Options:
1. **Wayback Machine**: Check archive.org for historical snapshots
2. **Continuous scraping**: Set up periodic scraping to accumulate history going forward
"""

        md += "\n## Notes\n\n"
        for note in self.notes:
            md += f"- {note}\n"

        md += "\n## Recommended Approach\n\n"
        md += "Based on discovery findings:\n\n"

        if self.json_blobs or any(r.get('response_type') == 'json' for r in self.network_requests):
            md += "1. **Primary**: Use JSON endpoints/embedded data\n"
        elif self.chart_data:
            md += "1. **Primary**: Extract chart data from JavaScript\n"
        else:
            md += "1. **Primary**: Parse HTML tables directly\n"

        md += "2. **Historical**: Check Wayback Machine for archived snapshots\n"
        md += "3. **Forward**: Set up continuous scraping every 5-15 minutes\n"

        return md


async def check_robots_txt():
    """Fetch and parse robots.txt."""
    import aiohttp
    async with aiohttp.ClientSession() as session:
        try:
            async with session.get(f"{BASE_URL}/robots.txt", timeout=10) as resp:
                if resp.status == 200:
                    return await resp.text()
                return f"Status: {resp.status}"
        except Exception as e:
            return f"Error: {e}"


async def discover_site():
    """Main discovery function using Playwright."""
    report = DiscoveryReport()

    # Check robots.txt first
    print("Checking robots.txt...")
    report.robots_txt = await check_robots_txt()

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (compatible; ResearchBot/1.0; +https://example.com/bot)"
        )

        # Enable request interception to capture network calls
        page = await context.new_page()

        network_requests = []

        async def handle_request(request):
            """Capture network requests."""
            url = request.url
            if any(x in url for x in ['.png', '.jpg', '.gif', '.ico', '.css', '.woff', 'google', 'facebook', 'twitter', 'analytics']):
                return
            network_requests.append({
                'method': request.method,
                'url': url,
                'resource_type': request.resource_type,
            })

        async def handle_response(response):
            """Capture response metadata."""
            url = response.url
            for req in network_requests:
                if req['url'] == url:
                    content_type = response.headers.get('content-type', '')
                    if 'json' in content_type:
                        req['response_type'] = 'json'
                        try:
                            body = await response.text()
                            req['response_preview'] = body[:500]
                            # Save sample
                            filename = urlparse(url).path.replace('/', '_')[:50] + '.json'
                            (SAMPLES_DIR / filename).write_text(body[:10000])
                        except:
                            pass
                    elif 'html' in content_type:
                        req['response_type'] = 'html'

        page.on('request', handle_request)
        page.on('response', handle_response)

        # Visit each page
        for path in PAGES_TO_CHECK:
            url = f"{BASE_URL}{path}"
            print(f"Visiting: {url}")

            try:
                await page.goto(url, wait_until='networkidle', timeout=30000)
                await asyncio.sleep(2)  # Wait for dynamic content

                # Get page info
                page_info = {
                    'url': url,
                    'title': await page.title(),
                    'has_chart': False,
                    'has_table': False,
                    'last_updated': None,
                }

                # Check for charts (Google Charts or similar)
                chart_elements = await page.query_selector_all('[id*="chart"], [class*="chart"], svg, canvas')
                page_info['has_chart'] = len(chart_elements) > 0

                # Check for data tables
                tables = await page.query_selector_all('table')
                page_info['has_table'] = len(tables) > 0

                # Look for "last updated" text
                content = await page.content()
                updated_match = re.search(r'(updated|refreshed|as of)[:\s]*([^<]+)', content, re.I)
                if updated_match:
                    page_info['last_updated'] = updated_match.group(2).strip()[:50]

                # Look for embedded JSON in script tags
                scripts = await page.query_selector_all('script')
                for script in scripts:
                    script_content = await script.inner_text()
                    # Look for data arrays or objects
                    if 'data' in script_content.lower() and ('{' in script_content or '[' in script_content):
                        # Try to find JSON-like structures
                        json_matches = re.findall(r'(?:var\s+\w+\s*=\s*|data[:\s]*)\s*(\[[^\]]{50,}\]|\{[^}]{50,}\})', script_content)
                        for match in json_matches[:2]:
                            report.json_blobs.append({
                                'source': url,
                                'preview': match[:300] + '...' if len(match) > 300 else match
                            })

                # Look for Google Charts data
                if 'google.visualization' in content or 'google.charts' in content:
                    chart_data_match = re.search(r'arrayToDataTable\s*\(\s*(\[[^\]]+\])', content, re.S)
                    if chart_data_match:
                        report.chart_data.append({
                            'source': url,
                            'type': 'Google Charts arrayToDataTable',
                            'sample': chart_data_match.group(1)[:500]
                        })

                    # Look for DataTable addRows
                    rows_match = re.search(r'addRows?\s*\(\s*(\[[^\]]+\])', content, re.S)
                    if rows_match:
                        report.chart_data.append({
                            'source': url,
                            'type': 'Google Charts addRows',
                            'sample': rows_match.group(1)[:500]
                        })

                # Look for date/archive patterns in links
                links = await page.query_selector_all('a[href]')
                for link in links:
                    href = await link.get_attribute('href')
                    if href and any(x in href.lower() for x in ['archive', 'history', 'date=', 'day=', '/20']):
                        report.archive_urls.append(href)

                # Save HTML sample for first few pages
                if len(report.pages_found) < 3:
                    filename = path.replace('/', '_').replace('.html', '') or 'index'
                    (SAMPLES_DIR / f"{filename}.html").write_text(content[:50000])

                report.pages_found.append(page_info)

            except Exception as e:
                print(f"  Error: {e}")
                report.notes.append(f"Error visiting {url}: {e}")

            # Rate limiting
            await asyncio.sleep(1)

        # Check for date URL patterns
        print("\nChecking for date-based URL patterns...")
        test_date_urls = [
            "/2025-08-01",
            "/history/2025-08-01",
            "/archive/2025-08-01",
            "/?date=2025-08-01",
            "/President2028.html?date=2025-08-01",
        ]

        for test_url in test_date_urls:
            full_url = f"{BASE_URL}{test_url}"
            try:
                response = await page.goto(full_url, wait_until='domcontentloaded', timeout=10000)
                if response and response.status == 200:
                    content = await page.content()
                    if len(content) > 1000 and 'not found' not in content.lower():
                        report.date_patterns.append(f"Found: {test_url} (status {response.status})")
                else:
                    report.date_patterns.append(f"Not found: {test_url} (status {response.status if response else 'None'})")
            except Exception as e:
                report.date_patterns.append(f"Error: {test_url} ({e})")
            await asyncio.sleep(0.5)

        # Compile network requests
        report.network_requests = [r for r in network_requests if r.get('resource_type') in ('xhr', 'fetch', 'document')]

        # Add notes about what we found
        if report.chart_data:
            report.notes.append("Site uses Google Charts with embedded data")
        if report.json_blobs:
            report.notes.append(f"Found {len(report.json_blobs)} embedded JSON data structures")
        if not report.archive_urls and not any('Found' in p for p in report.date_patterns):
            report.notes.append("No built-in historical archive found - site shows current data only")
            report.notes.append("Recommend checking Wayback Machine (archive.org) for historical snapshots")

        await browser.close()

    # Write discovery report
    discovery_md = report.to_markdown()
    DISCOVERY_FILE.write_text(discovery_md)
    print(f"\nDiscovery report written to: {DISCOVERY_FILE}")

    return report


async def check_wayback_availability():
    """Check Wayback Machine for historical snapshots."""
    import aiohttp

    print("\nChecking Wayback Machine availability...")

    # CDX API to check available snapshots
    cdx_url = f"https://web.archive.org/cdx/search/cdx?url={BASE_URL}&output=json&limit=20&from=20250801&to=20260205"

    async with aiohttp.ClientSession() as session:
        try:
            async with session.get(cdx_url, timeout=30) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    if len(data) > 1:  # First row is headers
                        print(f"Found {len(data)-1} Wayback snapshots")
                        # Save sample
                        (SAMPLES_DIR / "wayback_cdx_sample.json").write_text(json.dumps(data[:10], indent=2))
                        return data
                    else:
                        print("No Wayback snapshots found in date range")
                else:
                    print(f"Wayback CDX API returned status {resp.status}")
        except Exception as e:
            print(f"Error checking Wayback: {e}")

    return None


async def main():
    """Run discovery."""
    print("=" * 60)
    print("electionbettingodds.com Discovery Script")
    print("=" * 60)

    # Run main discovery
    report = await discover_site()

    # Check Wayback Machine
    wayback_data = await check_wayback_availability()

    if wayback_data:
        # Append Wayback info to discovery
        with open(DISCOVERY_FILE, 'a') as f:
            f.write("\n\n## Wayback Machine Availability\n\n")
            f.write(f"Found {len(wayback_data)-1} archived snapshots.\n\n")
            f.write("Sample timestamps:\n")
            for row in wayback_data[1:6]:  # Skip header, show 5
                f.write(f"- {row[1]} (status {row[4]})\n")
            f.write(f"\nFull CDX query: `{BASE_URL}` from 2025-08-01 to 2026-02-05\n")

    print("\n" + "=" * 60)
    print("Discovery complete!")
    print(f"Report: {DISCOVERY_FILE}")
    print(f"Samples: {SAMPLES_DIR}")
    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(main())
