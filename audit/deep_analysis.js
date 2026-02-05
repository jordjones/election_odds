const { chromium } = require('playwright');
const path = require('path');

const SCREENSHOTS_DIR = path.join(__dirname, 'screenshots');

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function deepAnalysis() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });
  const page = await context.newPage();

  console.log('=== Deep Analysis ===\n');

  // 1. Analyze Charts page in detail
  console.log('1. Analyzing Charts page...');
  await page.goto('https://electionbettingodds.com/President2024.html#chart', { waitUntil: 'networkidle', timeout: 30000 });
  await sleep(3000);

  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '03_charts_page.png'), fullPage: true });

  const chartsInfo = await page.evaluate(() => {
    const info = {
      hasCanvas: document.querySelectorAll('canvas').length,
      hasSvg: document.querySelectorAll('svg').length,
      hasIframe: document.querySelectorAll('iframe').length,
      chartContainers: [],
      scripts: []
    };

    // Look for chart libraries
    const scripts = document.querySelectorAll('script[src]');
    scripts.forEach(s => {
      const src = s.src;
      if (src.includes('chart') || src.includes('highcharts') || src.includes('plotly') || src.includes('d3')) {
        info.scripts.push(src);
      }
    });

    // Check for chart containers
    document.querySelectorAll('[class*="chart"], [id*="chart"], .highcharts-container').forEach(el => {
      info.chartContainers.push({ tag: el.tagName, class: el.className, id: el.id });
    });

    return info;
  });

  console.log('   Charts info:', JSON.stringify(chartsInfo, null, 2));

  // 2. Analyze the homepage data tables structure
  console.log('\n2. Analyzing Homepage Data Tables...');
  await page.goto('https://electionbettingodds.com/', { waitUntil: 'networkidle' });
  await sleep(2000);

  const tableStructure = await page.evaluate(() => {
    const tables = [];
    document.querySelectorAll('table').forEach((t, i) => {
      const table = {
        index: i,
        headerText: t.querySelector('th')?.textContent?.trim().substring(0, 100) || '',
        columns: [],
        sampleRow: null
      };

      // Get column structure from first few rows
      const firstDataRow = t.querySelector('tr:nth-child(2)');
      if (firstDataRow) {
        table.sampleRow = Array.from(firstDataRow.querySelectorAll('td')).map(td => ({
          text: td.textContent.trim().substring(0, 50),
          hasImage: !!td.querySelector('img'),
          hasLink: !!td.querySelector('a')
        }));
      }

      tables.push(table);
    });
    return tables.slice(0, 10); // First 10 tables
  });

  console.log('   Table structure:', JSON.stringify(tableStructure, null, 2));

  // 3. Check for dropdowns and their options
  console.log('\n3. Analyzing Dropdown Controls...');

  const dropdowns = await page.evaluate(() => {
    const results = [];
    document.querySelectorAll('select').forEach((s, i) => {
      results.push({
        index: i,
        id: s.id,
        name: s.name,
        options: Array.from(s.options).map(o => ({ value: o.value, text: o.text }))
      });
    });
    return results;
  });

  console.log('   Dropdowns:', JSON.stringify(dropdowns, null, 2));

  // 4. Check for external links (betting platforms)
  console.log('\n4. Finding External Betting Links...');

  const externalLinks = await page.evaluate(() => {
    const links = [];
    document.querySelectorAll('a[href]').forEach(a => {
      const href = a.href;
      if (!href.includes('electionbettingodds.com') && !href.startsWith('javascript') && !href.startsWith('#')) {
        links.push({ href, text: a.textContent.trim().substring(0, 50) });
      }
    });
    return [...new Map(links.map(l => [l.href, l])).values()];
  });

  console.log('   External links:', JSON.stringify(externalLinks, null, 2));

  // 5. Capture About page for methodology info
  console.log('\n5. Analyzing About/FAQ Page...');
  await page.goto('https://electionbettingodds.com/about.html', { waitUntil: 'networkidle' });
  await sleep(1000);

  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '04_about_page.png'), fullPage: true });

  const aboutContent = await page.evaluate(() => {
    const sections = [];
    document.querySelectorAll('h2, h3, h4').forEach(h => {
      sections.push({ heading: h.textContent.trim(), tag: h.tagName });
    });
    return {
      sections,
      hasMethodology: document.body.textContent.includes('methodology') || document.body.textContent.includes('how we calculate'),
      hasFAQ: document.body.textContent.toLowerCase().includes('faq') || document.body.textContent.includes('frequently asked'),
      mentions: {
        polymarket: document.body.textContent.toLowerCase().includes('polymarket'),
        predictit: document.body.textContent.toLowerCase().includes('predictit'),
        betfair: document.body.textContent.toLowerCase().includes('betfair'),
        kalshi: document.body.textContent.toLowerCase().includes('kalshi')
      }
    };
  });

  console.log('   About content:', JSON.stringify(aboutContent, null, 2));

  // 6. Capture Track Record page
  console.log('\n6. Analyzing Track Record Page...');
  await page.goto('https://electionbettingodds.com/TrackRecord.html', { waitUntil: 'networkidle' });
  await sleep(1000);

  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '05_track_record.png'), fullPage: true });

  const trackRecord = await page.evaluate(() => {
    const tables = [];
    document.querySelectorAll('table').forEach((t, i) => {
      tables.push({
        index: i,
        rows: t.querySelectorAll('tr').length,
        preview: t.textContent.trim().substring(0, 200)
      });
    });
    return tables;
  });

  console.log('   Track Record:', JSON.stringify(trackRecord, null, 2));

  // 7. Check CSS framework and tech stack
  console.log('\n7. Analyzing Tech Stack...');
  await page.goto('https://electionbettingodds.com/', { waitUntil: 'networkidle' });

  const techStack = await page.evaluate(() => {
    const stack = {
      cssFramework: 'custom',
      jsLibraries: [],
      responsive: false,
      viewport: null
    };

    // Check for CSS frameworks
    const stylesheets = Array.from(document.querySelectorAll('link[rel="stylesheet"]')).map(l => l.href);
    stylesheets.forEach(s => {
      if (s.includes('bootstrap')) stack.cssFramework = 'Bootstrap';
      if (s.includes('tailwind')) stack.cssFramework = 'Tailwind';
      if (s.includes('bulma')) stack.cssFramework = 'Bulma';
    });

    // Check for JS libraries
    const scripts = Array.from(document.querySelectorAll('script[src]')).map(s => s.src);
    scripts.forEach(s => {
      if (s.includes('jquery')) stack.jsLibraries.push('jQuery');
      if (s.includes('react')) stack.jsLibraries.push('React');
      if (s.includes('vue')) stack.jsLibraries.push('Vue');
      if (s.includes('angular')) stack.jsLibraries.push('Angular');
      if (s.includes('highcharts')) stack.jsLibraries.push('Highcharts');
    });

    // Check viewport meta
    const viewport = document.querySelector('meta[name="viewport"]');
    stack.viewport = viewport?.content || null;
    stack.responsive = !!viewport;

    return stack;
  });

  console.log('   Tech Stack:', JSON.stringify(techStack, null, 2));

  // 8. Mobile viewport screenshot
  console.log('\n8. Mobile View Check...');
  await page.setViewportSize({ width: 375, height: 812 });
  await page.reload({ waitUntil: 'networkidle' });
  await sleep(1000);

  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '06_mobile_homepage.png'), fullPage: true });

  await browser.close();
  console.log('\n=== Deep Analysis Complete ===');
}

deepAnalysis().catch(err => {
  console.error('Deep analysis failed:', err);
  process.exit(1);
});
