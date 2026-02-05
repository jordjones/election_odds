const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function extractDataSources() {
  console.log('=== Extracting Data Sources from HTML ===\n');

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  // Visit homepage
  await page.goto('https://electionbettingodds.com/', { waitUntil: 'networkidle', timeout: 30000 });

  // Extract script tags and inline scripts
  const scriptInfo = await page.evaluate(() => {
    const results = {
      externalScripts: [],
      inlineScripts: [],
      dataSources: [],
      metaTags: [],
      dataInHtml: {}
    };

    // External scripts
    document.querySelectorAll('script[src]').forEach(s => {
      results.externalScripts.push(s.src);
    });

    // Inline scripts - look for data definitions
    document.querySelectorAll('script:not([src])').forEach(s => {
      const content = s.textContent;

      // Look for data arrays, objects, or API endpoints
      if (content.includes('data') || content.includes('http') ||
          content.includes('api') || content.includes('fetch') ||
          content.includes('var ') || content.includes('const ') ||
          content.includes('google.charts')) {
        results.inlineScripts.push(content.substring(0, 2000));
      }

      // Extract URLs
      const urlMatches = content.match(/https?:\/\/[^\s"'<>]+/g);
      if (urlMatches) {
        results.dataSources.push(...urlMatches);
      }
    });

    // Meta tags
    document.querySelectorAll('meta').forEach(m => {
      const name = m.name || m.getAttribute('property') || m.httpEquiv;
      const content = m.content;
      if (name && content) {
        results.metaTags.push({ name, content: content.substring(0, 200) });
      }
    });

    // Look for data embedded in HTML (tables with odds data)
    const tables = document.querySelectorAll('table');
    results.dataInHtml.tableCount = tables.length;

    // Sample some table data
    if (tables.length > 0) {
      const sampleTable = tables[0];
      results.dataInHtml.sampleTableRows = sampleTable.querySelectorAll('tr').length;
      results.dataInHtml.sampleTableText = sampleTable.textContent.substring(0, 500);
    }

    // Check for JSON-LD or other structured data
    const ldJson = document.querySelectorAll('script[type="application/ld+json"]');
    results.dataInHtml.jsonLdCount = ldJson.length;

    return results;
  });

  console.log('External Scripts:');
  scriptInfo.externalScripts.forEach(s => console.log(`  ${s}`));

  console.log('\nData Sources Found:');
  const uniqueSources = [...new Set(scriptInfo.dataSources)];
  uniqueSources.forEach(s => console.log(`  ${s}`));

  console.log('\nInline Scripts (data-related):');
  scriptInfo.inlineScripts.forEach((s, i) => {
    console.log(`\n--- Script ${i + 1} ---`);
    console.log(s.substring(0, 500));
    if (s.length > 500) console.log('... [truncated]');
  });

  // Now check the Charts page for how data is loaded
  console.log('\n=== Checking Charts Page Data ===\n');
  await page.goto('https://electionbettingodds.com/President2024.html#chart', { waitUntil: 'networkidle' });

  const chartData = await page.evaluate(() => {
    const results = {
      iframes: [],
      googleChartCalls: [],
      dataArrays: []
    };

    // Check iframes
    document.querySelectorAll('iframe').forEach(iframe => {
      results.iframes.push({ src: iframe.src, id: iframe.id });
    });

    // Look for google.visualization calls in scripts
    document.querySelectorAll('script:not([src])').forEach(s => {
      const content = s.textContent;
      if (content.includes('google.visualization') || content.includes('google.charts') ||
          content.includes('DataTable') || content.includes('arrayToDataTable')) {
        results.googleChartCalls.push(content.substring(0, 3000));
      }

      // Look for data arrays (typically for charts)
      const arrayMatch = content.match(/\[\s*\[.*?\]\s*\]/gs);
      if (arrayMatch) {
        arrayMatch.forEach(arr => {
          if (arr.length < 2000) {
            results.dataArrays.push(arr.substring(0, 500));
          }
        });
      }
    });

    return results;
  });

  console.log('Chart Iframes:');
  chartData.iframes.forEach(i => console.log(`  ${JSON.stringify(i)}`));

  console.log('\nGoogle Chart Data Calls:');
  chartData.googleChartCalls.forEach((c, i) => {
    console.log(`\n--- Chart Script ${i + 1} ---`);
    console.log(c.substring(0, 1000));
    if (c.length > 1000) console.log('... [truncated]');
  });

  await browser.close();

  // Save results
  fs.writeFileSync(
    path.join(__dirname, 'data_sources.json'),
    JSON.stringify({ scriptInfo, chartData }, null, 2)
  );

  console.log('\n\nResults saved to data_sources.json');
}

extractDataSources().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
