const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const NETWORK_DIR = path.join(__dirname);
const BASE_URL = 'https://electionbettingodds.com';

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function captureTraffic() {
  console.log('=== Network Traffic Capture ===\n');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    recordHar: {
      path: path.join(NETWORK_DIR, 'traffic.har'),
      content: 'embed' // Include response bodies
    }
  });

  const page = await context.newPage();

  // Collect all network requests for analysis
  const requests = [];
  const responses = [];

  page.on('request', request => {
    requests.push({
      url: request.url(),
      method: request.method(),
      headers: request.headers(),
      postData: request.postData(),
      resourceType: request.resourceType(),
      timestamp: Date.now()
    });
  });

  page.on('response', async response => {
    const request = response.request();
    let body = null;
    let bodySize = 0;

    try {
      // Only capture JSON/text responses
      const contentType = response.headers()['content-type'] || '';
      if (contentType.includes('json') || contentType.includes('text')) {
        body = await response.text();
        bodySize = body.length;
        // Truncate large bodies
        if (body.length > 5000) {
          body = body.substring(0, 5000) + '... [truncated]';
        }
      }
    } catch (e) {
      // Response body not available
    }

    responses.push({
      url: response.url(),
      status: response.status(),
      statusText: response.statusText(),
      headers: response.headers(),
      body: body,
      bodySize: bodySize,
      timestamp: Date.now()
    });
  });

  // Flow 1: Homepage
  console.log('Flow 1: Loading Homepage...');
  await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 30000 });
  await sleep(3000);

  // Flow 2: Navigate to Charts page
  console.log('Flow 2: Navigating to Charts...');
  await page.goto(`${BASE_URL}/President2024.html#chart`, { waitUntil: 'networkidle', timeout: 30000 });
  await sleep(3000);

  // Flow 3: Time filter - 4 hour view
  console.log('Flow 3: Testing Time Filter (4hr)...');
  await page.goto(`${BASE_URL}/President2028_4hr.html`, { waitUntil: 'networkidle', timeout: 30000 });
  await sleep(2000);

  // Flow 4: Weekly view
  console.log('Flow 4: Testing Time Filter (weekly)...');
  await page.goto(`${BASE_URL}/President2028_week.html`, { waitUntil: 'networkidle', timeout: 30000 });
  await sleep(2000);

  // Flow 5: Track Record page
  console.log('Flow 5: Track Record page...');
  await page.goto(`${BASE_URL}/TrackRecord.html`, { waitUntil: 'networkidle', timeout: 30000 });
  await sleep(2000);

  // Flow 6: About page
  console.log('Flow 6: About page...');
  await page.goto(`${BASE_URL}/about.html`, { waitUntil: 'networkidle', timeout: 30000 });
  await sleep(2000);

  // Flow 7: House Control
  console.log('Flow 7: House Control...');
  await page.goto(`${BASE_URL}/House-Control-2026.html`, { waitUntil: 'networkidle', timeout: 30000 });
  await sleep(2000);

  // Flow 8: Senate Control
  console.log('Flow 8: Senate Control...');
  await page.goto(`${BASE_URL}/Senate-Control-2026.html`, { waitUntil: 'networkidle', timeout: 30000 });
  await sleep(2000);

  // Flow 9: DEM Primary
  console.log('Flow 9: DEM Primary 2028...');
  await page.goto(`${BASE_URL}/DEMPrimary2028.html`, { waitUntil: 'networkidle', timeout: 30000 });
  await sleep(2000);

  // Flow 10: GOP Primary
  console.log('Flow 10: GOP Primary 2028...');
  await page.goto(`${BASE_URL}/GOPPrimary2028.html`, { waitUntil: 'networkidle', timeout: 30000 });
  await sleep(2000);

  // Flow 11: Return to homepage to check for any dynamic updates
  console.log('Flow 11: Return to Homepage...');
  await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 30000 });
  await sleep(5000); // Wait longer to catch any polling

  // Close context to save HAR
  await context.close();
  await browser.close();

  console.log('\n=== Analyzing Captured Traffic ===\n');

  // Analyze and categorize requests
  const analysis = analyzeTraffic(requests, responses);

  // Save analysis
  fs.writeFileSync(
    path.join(NETWORK_DIR, 'analysis.json'),
    JSON.stringify(analysis, null, 2)
  );

  console.log('\nAnalysis saved to analysis.json');
  console.log('HAR file saved to traffic.har');

  // Print summary
  printSummary(analysis);

  return analysis;
}

function analyzeTraffic(requests, responses) {
  const analysis = {
    summary: {
      totalRequests: requests.length,
      totalResponses: responses.length,
      uniqueHosts: new Set(),
      resourceTypes: {}
    },
    firstParty: [],
    thirdParty: [],
    apis: [],
    assets: [],
    analytics: [],
    fonts: [],
    errors: []
  };

  // Create response lookup by URL
  const responseMap = new Map();
  responses.forEach(r => {
    if (!responseMap.has(r.url)) {
      responseMap.set(r.url, r);
    }
  });

  // Categorize each request
  requests.forEach(req => {
    const url = new URL(req.url);
    const host = url.hostname;
    analysis.summary.uniqueHosts.add(host);

    // Count resource types
    analysis.summary.resourceTypes[req.resourceType] =
      (analysis.summary.resourceTypes[req.resourceType] || 0) + 1;

    const response = responseMap.get(req.url);
    const entry = {
      method: req.method,
      url: req.url,
      host: host,
      path: url.pathname + url.search,
      resourceType: req.resourceType,
      headers: req.headers,
      postData: req.postData,
      status: response?.status,
      statusText: response?.statusText,
      responseHeaders: response?.headers,
      responseBody: response?.body,
      responseSize: response?.bodySize
    };

    // Check for errors
    if (response && response.status >= 400) {
      analysis.errors.push(entry);
    }

    // Categorize by host
    if (host === 'electionbettingodds.com' || host === 'www.electionbettingodds.com') {
      analysis.firstParty.push(entry);

      // Check if it's an API call (XHR/fetch with JSON)
      const contentType = response?.headers?.['content-type'] || '';
      if (req.resourceType === 'xhr' || req.resourceType === 'fetch' ||
          contentType.includes('json') || req.url.includes('/api/')) {
        analysis.apis.push(entry);
      } else if (['image', 'stylesheet', 'font', 'script'].includes(req.resourceType)) {
        analysis.assets.push(entry);
      }
    } else {
      analysis.thirdParty.push(entry);

      // Categorize third-party
      if (isAnalytics(host, req.url)) {
        analysis.analytics.push(entry);
      } else if (req.resourceType === 'font' || host.includes('fonts')) {
        analysis.fonts.push(entry);
      }
    }
  });

  // Convert Set to Array for JSON
  analysis.summary.uniqueHosts = Array.from(analysis.summary.uniqueHosts);

  // Dedupe and group APIs
  analysis.uniqueApis = dedupeEndpoints(analysis.apis);
  analysis.uniqueThirdParty = dedupeEndpoints(analysis.thirdParty);

  return analysis;
}

function isAnalytics(host, url) {
  const analyticsPatterns = [
    'google-analytics', 'googletagmanager', 'analytics',
    'facebook', 'fbq', 'pixel', 'doubleclick', 'googlesyndication',
    'twitter', 'ads', 'tracking', 'adservice', 'gtag'
  ];
  return analyticsPatterns.some(p => host.includes(p) || url.includes(p));
}

function dedupeEndpoints(entries) {
  const seen = new Map();

  entries.forEach(entry => {
    // Create a key based on method + path pattern
    const url = new URL(entry.url);
    const pathPattern = url.pathname.replace(/\d+/g, '{id}'); // Normalize IDs
    const key = `${entry.method}:${entry.host}:${pathPattern}`;

    if (!seen.has(key)) {
      seen.set(key, {
        method: entry.method,
        host: entry.host,
        pathPattern: pathPattern,
        examples: [],
        statuses: new Set(),
        contentTypes: new Set()
      });
    }

    const item = seen.get(key);
    item.examples.push(entry.url);
    if (entry.status) item.statuses.add(entry.status);
    if (entry.responseHeaders?.['content-type']) {
      item.contentTypes.add(entry.responseHeaders['content-type']);
    }
  });

  // Convert to array and Sets to Arrays
  return Array.from(seen.values()).map(item => ({
    ...item,
    statuses: Array.from(item.statuses),
    contentTypes: Array.from(item.contentTypes),
    examples: item.examples.slice(0, 3) // Keep up to 3 examples
  }));
}

function printSummary(analysis) {
  console.log('\n========== TRAFFIC SUMMARY ==========\n');
  console.log(`Total Requests: ${analysis.summary.totalRequests}`);
  console.log(`Unique Hosts: ${analysis.summary.uniqueHosts.length}`);
  console.log('\nHosts:');
  analysis.summary.uniqueHosts.forEach(h => console.log(`  - ${h}`));

  console.log('\nResource Types:');
  Object.entries(analysis.summary.resourceTypes).forEach(([type, count]) => {
    console.log(`  ${type}: ${count}`);
  });

  console.log('\n--- First Party Endpoints ---');
  analysis.uniqueApis.forEach(api => {
    console.log(`  ${api.method} ${api.pathPattern} [${api.statuses.join(', ')}]`);
  });

  console.log('\n--- Third Party Services ---');
  const thirdPartyHosts = [...new Set(analysis.thirdParty.map(t => t.host))];
  thirdPartyHosts.forEach(h => console.log(`  - ${h}`));

  console.log('\n--- Analytics/Tracking ---');
  const analyticsHosts = [...new Set(analysis.analytics.map(a => a.host))];
  analyticsHosts.forEach(h => console.log(`  - ${h}`));

  if (analysis.errors.length > 0) {
    console.log('\n--- Errors ---');
    analysis.errors.forEach(e => {
      console.log(`  ${e.status} ${e.method} ${e.url}`);
    });
  }
}

captureTraffic().catch(err => {
  console.error('Capture failed:', err);
  process.exit(1);
});
