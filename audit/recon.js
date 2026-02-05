const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const AUDIT_DIR = path.join(__dirname);
const SCREENSHOTS_DIR = path.join(AUDIT_DIR, 'screenshots');

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function recon() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
  });
  const page = await context.newPage();

  const results = {
    siteMap: { pages: [], navigation: [] },
    features: [],
    uiComponents: [],
    technical: { analytics: [], seo: {}, accessibility: [] },
    flows: []
  };

  const visitedUrls = new Set();
  const baseUrl = 'https://electionbettingodds.com';

  console.log('=== Starting Recon of electionbettingodds.com ===\n');

  // 1. Homepage Analysis
  console.log('1. Analyzing Homepage...');
  await page.goto(baseUrl, { waitUntil: 'networkidle', timeout: 30000 });
  await sleep(2000);

  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '01_homepage.png'), fullPage: true });
  console.log('   Screenshot: 01_homepage.png');

  // Get page title and meta
  const title = await page.title();
  const metaDesc = await page.$eval('meta[name="description"]', el => el.content).catch(() => 'N/A');
  const metaKeywords = await page.$eval('meta[name="keywords"]', el => el.content).catch(() => 'N/A');

  results.technical.seo = {
    title,
    metaDescription: metaDesc,
    metaKeywords: metaKeywords
  };

  // Extract navigation links
  const navLinks = await page.evaluate(() => {
    const links = [];
    // Look for nav elements, header links, main menu items
    const selectors = ['nav a', 'header a', '.menu a', '.nav a', 'a[href^="/"]', 'a[href*="electionbettingodds"]'];
    const seen = new Set();

    selectors.forEach(sel => {
      document.querySelectorAll(sel).forEach(a => {
        const href = a.href;
        const text = a.textContent.trim();
        if (href && !seen.has(href) && text) {
          seen.add(href);
          links.push({ href, text, selector: sel });
        }
      });
    });
    return links;
  });

  results.siteMap.navigation = navLinks;
  console.log(`   Found ${navLinks.length} navigation links`);

  // Extract all internal links for sitemap
  const allLinks = await page.evaluate((base) => {
    const links = [];
    document.querySelectorAll('a[href]').forEach(a => {
      const href = a.href;
      if (href.includes('electionbettingodds.com') || href.startsWith('/')) {
        links.push({ href, text: a.textContent.trim().substring(0, 50) });
      }
    });
    return [...new Map(links.map(l => [l.href, l])).values()];
  }, baseUrl);

  console.log(`   Total internal links found: ${allLinks.length}`);

  // Analyze page structure
  const pageStructure = await page.evaluate(() => {
    const structure = {
      hasHeader: !!document.querySelector('header'),
      hasNav: !!document.querySelector('nav'),
      hasMain: !!document.querySelector('main'),
      hasFooter: !!document.querySelector('footer'),
      hasSidebar: !!document.querySelector('aside, .sidebar'),
      sections: [],
      headings: []
    };

    document.querySelectorAll('h1, h2, h3').forEach(h => {
      structure.headings.push({ tag: h.tagName, text: h.textContent.trim().substring(0, 100) });
    });

    document.querySelectorAll('section, [class*="section"]').forEach(s => {
      structure.sections.push(s.className || s.id || 'unnamed-section');
    });

    return structure;
  });

  // Identify UI components
  const uiComponents = await page.evaluate(() => {
    const components = [];

    // Tables
    const tables = document.querySelectorAll('table');
    tables.forEach((t, i) => {
      const headers = Array.from(t.querySelectorAll('th')).map(th => th.textContent.trim());
      const rows = t.querySelectorAll('tr').length;
      components.push({ type: 'table', index: i, headers, rowCount: rows, className: t.className });
    });

    // Forms
    const forms = document.querySelectorAll('form');
    forms.forEach((f, i) => {
      const inputs = Array.from(f.querySelectorAll('input, select, textarea')).map(inp => ({
        type: inp.type || inp.tagName.toLowerCase(),
        name: inp.name,
        placeholder: inp.placeholder
      }));
      components.push({ type: 'form', index: i, inputs, action: f.action });
    });

    // Buttons
    const buttons = document.querySelectorAll('button, input[type="submit"], .btn, [class*="button"]');
    components.push({ type: 'buttons', count: buttons.length, samples: Array.from(buttons).slice(0, 5).map(b => b.textContent.trim()) });

    // Charts/Graphs
    const charts = document.querySelectorAll('canvas, svg, [class*="chart"], [class*="graph"]');
    components.push({ type: 'charts', count: charts.length });

    // Dropdowns/Selects
    const selects = document.querySelectorAll('select, [class*="dropdown"]');
    components.push({ type: 'dropdowns', count: selects.length });

    // Modals
    const modals = document.querySelectorAll('[class*="modal"], [role="dialog"]');
    components.push({ type: 'modals', count: modals.length });

    // Images
    const images = document.querySelectorAll('img');
    components.push({ type: 'images', count: images.length });

    return components;
  });

  results.uiComponents = uiComponents;

  // Check for analytics
  const analytics = await page.evaluate(() => {
    const found = [];
    const scripts = Array.from(document.querySelectorAll('script'));

    scripts.forEach(s => {
      const src = s.src || '';
      const content = s.textContent || '';

      if (src.includes('google-analytics') || content.includes('ga(') || content.includes('gtag(')) {
        found.push('Google Analytics');
      }
      if (src.includes('googletagmanager') || content.includes('GTM-')) {
        found.push('Google Tag Manager');
      }
      if (src.includes('facebook') || content.includes('fbq(')) {
        found.push('Facebook Pixel');
      }
      if (src.includes('twitter') || content.includes('twq(')) {
        found.push('Twitter Pixel');
      }
      if (src.includes('hotjar')) {
        found.push('Hotjar');
      }
    });

    return [...new Set(found)];
  });

  results.technical.analytics = analytics;

  // Check accessibility basics
  const a11y = await page.evaluate(() => {
    const checks = [];

    // Alt text on images
    const imgsWithoutAlt = document.querySelectorAll('img:not([alt])').length;
    const totalImgs = document.querySelectorAll('img').length;
    checks.push({ check: 'images_with_alt', pass: imgsWithoutAlt === 0, detail: `${totalImgs - imgsWithoutAlt}/${totalImgs} have alt` });

    // Form labels
    const inputsWithoutLabel = document.querySelectorAll('input:not([type="hidden"]):not([aria-label]):not([aria-labelledby])').length;
    checks.push({ check: 'form_labels', detail: `${inputsWithoutLabel} inputs may lack labels` });

    // Skip link
    const hasSkipLink = !!document.querySelector('a[href="#main"], a[href="#content"], .skip-link');
    checks.push({ check: 'skip_link', pass: hasSkipLink });

    // Heading hierarchy
    const h1Count = document.querySelectorAll('h1').length;
    checks.push({ check: 'single_h1', pass: h1Count === 1, detail: `Found ${h1Count} h1 elements` });

    // ARIA landmarks
    const landmarks = document.querySelectorAll('[role="main"], [role="navigation"], [role="banner"], main, nav, header').length;
    checks.push({ check: 'aria_landmarks', detail: `${landmarks} landmarks found` });

    return checks;
  });

  results.technical.accessibility = a11y;

  // 2. Visit key subpages
  console.log('\n2. Exploring Subpages...');

  const pagesToVisit = allLinks.slice(0, 15); // Limit to first 15 unique pages

  for (let i = 0; i < pagesToVisit.length; i++) {
    const link = pagesToVisit[i];
    if (visitedUrls.has(link.href)) continue;

    try {
      console.log(`   Visiting: ${link.href}`);
      await page.goto(link.href, { waitUntil: 'domcontentloaded', timeout: 15000 });
      await sleep(1000);

      visitedUrls.add(link.href);

      const pageTitle = await page.title();
      const currentUrl = page.url();

      // Take screenshot for key pages
      const screenshotName = `02_page_${i+1}_${link.text.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30)}.png`;
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, screenshotName) });

      // Analyze page content
      const pageFeatures = await page.evaluate(() => {
        return {
          hasTables: document.querySelectorAll('table').length,
          hasCharts: document.querySelectorAll('canvas, svg[class*="chart"]').length,
          hasOddsData: document.body.textContent.includes('%') || document.body.textContent.includes('odds'),
          mainContent: document.querySelector('main, .content, #content')?.textContent.substring(0, 200) || ''
        };
      });

      results.siteMap.pages.push({
        url: currentUrl,
        title: pageTitle,
        linkText: link.text,
        screenshot: screenshotName,
        features: pageFeatures
      });

    } catch (err) {
      console.log(`   Error visiting ${link.href}: ${err.message}`);
    }
  }

  // 3. Identify features
  console.log('\n3. Identifying Features...');

  // Go back to homepage to analyze main features
  await page.goto(baseUrl, { waitUntil: 'networkidle' });
  await sleep(2000);

  const mainFeatures = await page.evaluate(() => {
    const features = [];
    const bodyText = document.body.textContent;

    // Election/political data
    if (bodyText.match(/president|election|democrat|republican/i)) {
      features.push('Presidential Election Odds');
    }
    if (bodyText.match(/senate|house|congress/i)) {
      features.push('Congressional Election Data');
    }
    if (bodyText.match(/governor/i)) {
      features.push('Governor Race Data');
    }

    // Betting markets
    if (bodyText.match(/polymarket|predictit|betfair|kalshi/i)) {
      features.push('Multi-Market Aggregation');
    }

    // Historical data
    if (bodyText.match(/history|historical|trend|chart/i)) {
      features.push('Historical Trends/Charts');
    }

    // Real-time updates
    if (document.querySelector('[class*="live"], [class*="real-time"]')) {
      features.push('Real-time Updates');
    }

    // Data tables
    if (document.querySelectorAll('table').length > 0) {
      features.push('Data Tables');
    }

    return features;
  });

  results.features = mainFeatures;

  // 4. Document user flows
  console.log('\n4. Documenting User Flows...');

  // Primary flow: View election odds
  results.flows.push({
    name: 'View Current Election Odds',
    steps: [
      'Navigate to homepage',
      'View main odds display/table',
      'Compare odds across candidates'
    ],
    entryPage: baseUrl,
    authenticated: false
  });

  // Check for other flows
  const hasFilters = await page.evaluate(() => {
    return !!document.querySelector('select, [class*="filter"], [class*="dropdown"]');
  });

  if (hasFilters) {
    results.flows.push({
      name: 'Filter/Sort Data',
      steps: [
        'Navigate to data page',
        'Use dropdown/filter controls',
        'View filtered results'
      ],
      entryPage: baseUrl,
      authenticated: false
    });
  }

  // Final full page screenshot
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '99_final_homepage.png'), fullPage: true });

  await browser.close();

  // Output results as JSON for processing
  console.log('\n=== Recon Complete ===');
  console.log(JSON.stringify(results, null, 2));

  return results;
}

recon().catch(err => {
  console.error('Recon failed:', err);
  process.exit(1);
});
