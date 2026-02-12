# ElectionOdds Marketing Plan

> **Last updated:** February 2026
> **Author:** Solo founder
> **Budget:** Near-zero | **Time:** ~5 hrs/week | **Horizon:** 90 days to midterm ramp-up

---

## Table of Contents

1. [Quick Diagnosis](#1-quick-diagnosis)
2. [SEO Foundation](#2-seo-foundation)
3. [Keyword + Content Plan](#3-keyword--content-plan)
4. [Social Media System](#4-social-media-system)
5. [25+ Low-Cost Growth Ideas](#5-25-low-cost-growth-ideas)
6. [Launch Pipeline](#6-launch-pipeline)

---

## 1. Quick Diagnosis

### Where We Are

ElectionOdds is a fully functional prediction market aggregator with genuine technical differentiation — but zero distribution. The product is ahead of the marketing. That's fixable, and it's actually the better problem to have.

**What we have:**
- Real-time data from 5 sources (PredictIt, Kalshi, Polymarket, Smarkets, electionbettingodds.com)
- 100+ markets, 500+ contracts, millions in tracked volume
- Interactive charts with 24h/7d/30d/all-time filters
- 35 individual state senate races + 19 primaries (no competitor has this)
- Track record page with 808+ historical predictions and Brier scores
- Candidate headshots, Twitter links, party context
- 5-minute update cadence

**What we don't have:**
- A custom domain (still on Netlify subdomain)
- Any social media presence
- A blog or content engine
- Backlinks from anywhere
- An email list
- Any Google indexing momentum

### Pre-Launch Strategy

The play is simple: **own "election odds 2026" and "prediction market comparison" before the midterm cycle heats up.** We have a 9-month runway before November 2026. Most political data sites won't start optimizing until summer. We start now.

**Phase 1 (Weeks 1-4): Foundation**
- Secure domain, set up redirects
- Deploy SEO meta tags across all pages
- Launch X/Twitter account, seed with 20 posts
- Publish first 3 blog articles
- Submit to Product Hunt, Hacker News

**Phase 2 (Weeks 5-12): Content Engine**
- Publish 2 articles/week (mix of evergreen + timely)
- Daily X engagement (15 min/day)
- Reddit distribution in 5 target subreddits
- Guest post outreach (3 pitches/week)
- Build email list via exit-intent popup

**Phase 3 (Months 4-9): Midterm Ramp**
- Weekly "Odds Update" newsletter
- State-specific senate race content (35 states = 35 SEO pages)
- Podcast/interview circuit for political data nerds
- Amplify any prediction wins from track record

### 5 Traps to Avoid

**Trap 1: Premature Paid Ads**
Prediction market keywords are expensive ($3-8 CPC) and the audience is niche. Paid ads will burn budget before we understand our conversion funnel. Organic-first for the first 6 months minimum.

**Trap 2: Building Features Instead of Marketing**
The product works. Every hour spent adding a new chart type is an hour not spent getting the first 100 users. Feature development pauses unless it directly serves a content/SEO goal (e.g., adding a blog).

**Trap 3: Trying to Be RealClearPolitics**
We're not a news site. We're a data aggregator. The content strategy should be data-first: "here's what the odds say" not "here's our political analysis." This keeps us neutral and credible.

**Trap 4: Ignoring the Midterm Window**
2028 presidential content is evergreen but low-urgency. 2026 midterms are happening *this year*. Every piece of content should tie back to "what do the markets think about November 2026?" That's the hook.

**Trap 5: Spreading Across Too Many Platforms**
X/Twitter and Reddit are where political data people live. That's it. No Instagram, no TikTok, no LinkedIn, no Facebook. Two platforms, done well, beats five platforms done poorly.

---

## 2. SEO Foundation

### Technical Checklist

- [ ] **Secure domain**: `electionodds.com` (check availability) or `electionodds.io` / `electionodds.org`
- [ ] **Set up 301 redirects** from Netlify subdomain to custom domain
- [ ] **Add `robots.txt`** allowing all crawlers
- [ ] **Generate XML sitemap** (Next.js can auto-generate via `app/sitemap.ts`)
- [ ] **Submit sitemap** to Google Search Console and Bing Webmaster Tools
- [ ] **Add canonical URLs** to all pages (prevent duplicate content from www vs non-www)
- [ ] **Enable HTTPS** (Netlify provides this automatically)
- [ ] **Set up Google Analytics 4** (or Plausible for privacy-friendly analytics)
- [ ] **Add Open Graph + Twitter Card meta** to all pages
- [ ] **Verify Core Web Vitals** pass (Lighthouse audit)
- [ ] **Add structured data** (JSON-LD) to homepage + key pages
- [ ] **Create `/blog` route** with MDX or markdown support
- [ ] **Internal linking audit** — every page should link to 2-3 related pages
- [ ] **Image alt text** on all candidate headshots and charts
- [ ] **Mobile responsiveness** verification (Google's mobile-first indexing)

### Page-by-Page SEO Tags

#### Homepage (`/`)

```html
<title>Election Odds 2026 & 2028 — Real-Time Prediction Market Tracker | ElectionOdds</title>
<meta name="description" content="Compare real-time election odds from Polymarket, PredictIt, Kalshi, and Smarkets. Track 2026 midterm and 2028 presidential prediction markets in one place." />
```

**H1:** Election Odds Aggregator — Real-Time Prediction Market Data
**H2s:**
- 2028 Presidential Odds
- Featured Markets
- Compare Odds Across Prediction Markets
- Why ElectionOdds?

#### Presidential by Candidate (`/presidential/candidates`)

```html
<title>2028 Presidential Election Odds by Candidate — Who Will Win? | ElectionOdds</title>
<meta name="description" content="Live 2028 presidential election odds for every candidate. Compare Vance, Newsom, DeSantis, and 100+ others across Polymarket, PredictIt, Kalshi, and Smarkets." />
```

**H1:** 2028 Presidential Election Odds — By Candidate
**H2s:**
- Current Frontrunners
- Price History Chart
- Compare Across Markets
- How to Read Prediction Market Odds

#### Presidential by Party (`/presidential/party`)

```html
<title>2028 Presidential Election Odds by Party — Republican vs Democrat | ElectionOdds</title>
<meta name="description" content="Will a Republican or Democrat win in 2028? Real-time party odds from Polymarket, PredictIt, Kalshi, and Smarkets updated every 5 minutes." />
```

**H1:** 2028 Presidential Election Odds — By Party
**H2s:**
- Republican vs Democrat
- Party Odds Over Time
- What the Markets Are Pricing

#### GOP Primary (`/primaries/gop`)

```html
<title>2028 Republican Primary Odds — GOP Nominee Predictions | ElectionOdds</title>
<meta name="description" content="Who will win the 2028 Republican primary? Live odds for DeSantis, Haley, Ramaswamy, and all GOP candidates from prediction markets." />
```

**H1:** 2028 Republican Primary Odds
**H2s:**
- Top GOP Candidates
- Primary Odds Over Time
- Market Comparison

#### DEM Primary (`/primaries/dem`)

```html
<title>2028 Democratic Primary Odds — DEM Nominee Predictions | ElectionOdds</title>
<meta name="description" content="Who will win the 2028 Democratic primary? Live odds for Newsom, AOC, Shapiro, and all DEM candidates from prediction markets." />
```

**H1:** 2028 Democratic Primary Odds
**H2s:**
- Top Democratic Candidates
- Primary Odds Over Time
- Market Comparison

#### House Control (`/races/house-2026`)

```html
<title>2026 House Control Odds — Will Republicans or Democrats Win the House? | ElectionOdds</title>
<meta name="description" content="Real-time 2026 House of Representatives control odds from prediction markets. Compare Republican vs Democrat chances from Polymarket, PredictIt, and Kalshi." />
```

**H1:** 2026 House of Representatives Control — Prediction Market Odds
**H2s:**
- Current House Control Odds
- House Odds Over Time
- What the Markets Think About 2026 Midterms

#### Senate Control (`/races/senate-2026`)

```html
<title>2026 Senate Control Odds — Will Republicans or Democrats Hold the Senate? | ElectionOdds</title>
<meta name="description" content="2026 Senate control prediction market odds. Who will control the Senate after the midterms? Live data from Polymarket, PredictIt, Kalshi, and Smarkets." />
```

**H1:** 2026 Senate Control Odds
**H2s:**
- Senate Control Probabilities
- Senate Odds Over Time
- Key Races to Watch

#### Senate Races Overview (`/senate`)

```html
<title>2026 Senate Race Odds — All 35 State Races Tracked | ElectionOdds</title>
<meta name="description" content="Prediction market odds for all 35 Senate races in 2026. See which races are competitive, compare odds across markets, and track senate primaries." />
```

**H1:** 2026 Senate Race Odds — Every State Tracked
**H2s:**
- Competitive Races
- Safe Seats
- Senate Primaries
- How We Classify Competitive vs Safe

#### Individual State Senate (`/senate/[state]`)

Template (e.g., for Georgia):
```html
<title>Georgia 2026 Senate Race Odds — Prediction Market Tracker | ElectionOdds</title>
<meta name="description" content="Live prediction market odds for the 2026 Georgia Senate race. Compare candidate probabilities from Polymarket, PredictIt, and Kalshi." />
```

**H1:** Georgia Senate Race 2026 — Prediction Market Odds
**H2s:**
- Current Odds
- Odds Over Time
- Primary Odds (if applicable)
- Market Sources

#### Charts (`/charts`)

```html
<title>Election Odds Charts — Historical Prediction Market Data | ElectionOdds</title>
<meta name="description" content="Interactive charts showing how election odds have moved over time. Track historical prediction market data for presidential, senate, and house races." />
```

#### Track Record (`/track-record`)

```html
<title>Prediction Market Track Record — 808+ Elections Scored | ElectionOdds</title>
<meta name="description" content="How accurate are prediction markets? See our track record of 808+ predictions with Brier scores. Transparent accuracy data from 2016 to present." />
```

**H1:** Prediction Market Track Record
**H2s:**
- Overall Accuracy
- How We Score Predictions (Brier Score)
- Historical Results

#### About (`/about`)

```html
<title>About ElectionOdds — How We Aggregate Prediction Market Data | ElectionOdds</title>
<meta name="description" content="ElectionOdds aggregates real-time odds from PredictIt, Kalshi, Polymarket, and Smarkets. Learn about our methodology, data sources, and what makes us different." />
```

### FAQ Section (for Homepage or dedicated `/faq` page)

Add this as a collapsible FAQ section on the homepage, below the fold. Each Q&A pair also gets FAQ JSON-LD schema markup.

**Q1: What is ElectionOdds?**
A: ElectionOdds is a free, real-time aggregator of election prediction market data. We pull odds from PredictIt, Kalshi, Polymarket, Smarkets, and electionbettingodds.com — so you can compare all the major markets in one place without opening five tabs.

**Q2: How often is the data updated?**
A: Featured markets (presidential, house, senate control) update every 5 minutes. All other markets sync twice daily. You'll always see a "last updated" timestamp on every odds table.

**Q3: What prediction markets do you track?**
A: We aggregate data from five sources: Polymarket (international), PredictIt (US), Kalshi (US, CFTC-regulated), Smarkets (UK), and electionbettingodds.com (historical aggregated data). Each has different user bases and liquidity profiles, which is why cross-market comparison is valuable.

**Q4: Are prediction markets accurate?**
A: Historically, yes — often more accurate than polls. Our Track Record page shows 808+ past predictions scored with Brier scores. Markets aren't perfect, but they aggregate the "wisdom of the crowd" in real time and have a strong track record for major elections.

**Q5: What elections do you cover?**
A: We currently track 2028 presidential odds (by candidate and by party), 2028 primary odds (GOP and DEM), 2026 midterm House and Senate control, and all 35 individual 2026 Senate state races including primaries.

**Q6: How do you calculate the aggregated price?**
A: Our aggregated price is a volume-weighted average across all sources that have active, liquid markets for a given contract. We exclude stale prices (>48 hours old) and markets with known data quality issues.

**Q7: Is this a betting site? Can I place bets here?**
A: No. ElectionOdds is an information aggregator only. We do not facilitate betting or trading. We link to the source markets where you can view or trade contracts directly — but we are not a broker, exchange, or gambling platform.

**Q8: Why do odds differ between prediction markets?**
A: Each market has a different user base, fee structure, and geographic access. PredictIt is US-only with position limits; Polymarket is crypto-based and international; Kalshi is CFTC-regulated. These structural differences create price discrepancies — which is exactly what makes comparison valuable.

**Q9: What is a Brier score?**
A: A Brier score measures the accuracy of probabilistic predictions, ranging from 0 (perfect) to 1 (worst possible). A score of 0.25 means "no better than a coin flip." Our Track Record page uses Brier scores to transparently evaluate how well prediction markets have performed.

**Q10: How is this different from electionbettingodds.com?**
A: We cover more markets in more depth. electionbettingodds.com provides aggregated odds but doesn't let you compare individual sources side-by-side, doesn't cover individual state senate races or primaries, and doesn't offer interactive historical charts. We also update more frequently (every 5 minutes vs. periodic).

**Q11: Do you have an API?**
A: Not yet, but it's on our roadmap. If you're interested in programmatic access to aggregated election odds data, reach out — we'd love to hear your use case.

**Q12: Is ElectionOdds free?**
A: Yes, completely free. No ads, no paywall, no account required. We built this because we wanted a better way to track election odds and figured others would too.

### JSON-LD Structured Data

#### Homepage — WebSite + FAQPage Schema

```json
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "name": "ElectionOdds",
      "alternateName": "Election Odds Aggregator",
      "url": "https://electionodds.com",
      "description": "Real-time aggregated prediction market odds for US elections from Polymarket, PredictIt, Kalshi, and Smarkets.",
      "publisher": {
        "@type": "Organization",
        "name": "ElectionOdds",
        "url": "https://electionodds.com"
      },
      "potentialAction": {
        "@type": "SearchAction",
        "target": "https://electionodds.com/search?q={search_term_string}",
        "query-input": "required name=search_term_string"
      }
    },
    {
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "What is ElectionOdds?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "ElectionOdds is a free, real-time aggregator of election prediction market data. We pull odds from PredictIt, Kalshi, Polymarket, Smarkets, and electionbettingodds.com so you can compare all the major markets in one place."
          }
        },
        {
          "@type": "Question",
          "name": "How often is the data updated?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Featured markets update every 5 minutes. All other markets sync twice daily. Every odds table shows a last updated timestamp."
          }
        },
        {
          "@type": "Question",
          "name": "What prediction markets do you track?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "We aggregate data from Polymarket, PredictIt, Kalshi, Smarkets, and electionbettingodds.com. Each has different user bases and liquidity, which is why cross-market comparison is valuable."
          }
        },
        {
          "@type": "Question",
          "name": "Are prediction markets accurate?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Historically, yes. Our Track Record page shows 808+ past predictions scored with Brier scores. Markets aggregate wisdom of the crowd in real time and have a strong track record for major elections."
          }
        },
        {
          "@type": "Question",
          "name": "Is this a betting site?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "No. ElectionOdds is an information aggregator only. We do not facilitate betting or trading. We link to source markets but are not a broker, exchange, or gambling platform."
          }
        },
        {
          "@type": "Question",
          "name": "How is this different from electionbettingodds.com?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "We cover more markets in more depth: side-by-side source comparison, individual state senate races, primaries, interactive historical charts, and 5-minute updates."
          }
        },
        {
          "@type": "Question",
          "name": "Is ElectionOdds free?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Yes, completely free. No ads, no paywall, no account required."
          }
        }
      ]
    }
  ]
}
```

#### Article Pages — Article Schema (template)

```json
{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "{{article_title}}",
  "description": "{{article_meta_description}}",
  "datePublished": "{{ISO_date}}",
  "dateModified": "{{ISO_date}}",
  "author": {
    "@type": "Organization",
    "name": "ElectionOdds"
  },
  "publisher": {
    "@type": "Organization",
    "name": "ElectionOdds",
    "url": "https://electionodds.com"
  },
  "mainEntityOfPage": {
    "@type": "WebPage",
    "@id": "https://electionodds.com/blog/{{slug}}"
  }
}
```

#### Senate Race Pages — Event Schema (template)

```json
{
  "@context": "https://schema.org",
  "@type": "Event",
  "name": "2026 {{state}} Senate Race",
  "startDate": "2026-11-03",
  "eventAttendanceMode": "https://schema.org/OfflineEventAttendanceMode",
  "location": {
    "@type": "Place",
    "name": "{{state}}",
    "address": {
      "@type": "PostalAddress",
      "addressRegion": "{{state_abbr}}",
      "addressCountry": "US"
    }
  },
  "description": "Prediction market odds for the 2026 {{state}} Senate race. Compare candidates and probabilities from multiple markets."
}
```

---

## 3. Keyword + Content Plan

### Keyword Universe (72 Keywords)

#### Money Keywords (High Intent — 15)
These are what people search when they want exactly what we offer.

| Keyword | Est. Volume | Difficulty | Target Page |
|---------|------------|------------|-------------|
| election odds | 8,100/mo | Medium | Homepage |
| election odds 2026 | 1,900/mo | Low | Homepage |
| election odds 2028 | 3,600/mo | Low | `/presidential/candidates` |
| 2028 presidential election odds | 2,400/mo | Low | `/presidential/candidates` |
| prediction market election | 1,600/mo | Medium | Homepage |
| who will win 2028 election | 4,400/mo | Medium | `/presidential/candidates` |
| 2026 senate odds | 720/mo | Low | `/senate` |
| 2026 midterm odds | 590/mo | Low | `/races/house-2026` |
| house control 2026 odds | 320/mo | Low | `/races/house-2026` |
| senate control 2026 odds | 260/mo | Low | `/races/senate-2026` |
| republican primary odds 2028 | 880/mo | Low | `/primaries/gop` |
| democratic primary odds 2028 | 720/mo | Low | `/primaries/dem` |
| polymarket election odds | 1,300/mo | Low | Homepage |
| kalshi election odds | 480/mo | Low | Homepage |
| predictit election odds | 390/mo | Low | Homepage |

#### Pain Keywords (Problem-Aware — 12)
People who have a problem we solve but don't know our solution exists.

| Keyword | Est. Volume | Target Content |
|---------|------------|---------------|
| are prediction markets accurate | 1,600/mo | Blog article |
| prediction markets vs polls | 1,300/mo | Blog article |
| how accurate are betting odds for elections | 880/mo | Track Record page + blog |
| why are prediction market odds different | 260/mo | Blog article / FAQ |
| election betting odds explained | 590/mo | Blog article |
| what do prediction markets say about 2026 | 320/mo | Blog article |
| prediction market aggregator | 170/mo | Homepage |
| compare election odds | 210/mo | Homepage |
| best election prediction site | 480/mo | Blog article |
| where to see election odds | 390/mo | Homepage |
| how to read prediction market odds | 210/mo | Blog article |
| can you trust prediction markets | 170/mo | Blog article |

#### How-To Keywords (Educational — 15)
People learning about prediction markets — our top-of-funnel.

| Keyword | Est. Volume | Target Content |
|---------|------------|---------------|
| how do prediction markets work | 2,900/mo | Blog pillar |
| what is polymarket | 6,600/mo | Blog article |
| what is predictit | 2,400/mo | Blog article |
| what is kalshi | 1,900/mo | Blog article |
| how to bet on elections | 3,600/mo | Blog article |
| how to read election odds | 720/mo | Blog article |
| what is a brier score | 480/mo | Track Record + blog |
| prediction market explained | 1,300/mo | Blog pillar |
| how election betting works | 880/mo | Blog article |
| election odds vs polling averages | 590/mo | Blog article |
| what are prediction market contracts | 320/mo | Blog article |
| how are election odds calculated | 480/mo | Blog article |
| prediction market fees comparison | 170/mo | Blog article |
| can americans bet on elections | 1,600/mo | Blog article |
| is election betting legal | 2,400/mo | Blog article |

#### Comparison Keywords (Decision-Stage — 15)
People comparing options — great for capturing market-specific traffic.

| Keyword | Est. Volume | Target Content |
|---------|------------|---------------|
| polymarket vs predictit | 1,300/mo | Blog article |
| polymarket vs kalshi | 880/mo | Blog article |
| predictit vs kalshi | 590/mo | Blog article |
| best prediction market | 1,600/mo | Blog article |
| best election betting site | 1,300/mo | Blog article |
| polymarket vs betfair elections | 390/mo | Blog article |
| predictit alternatives | 480/mo | Blog article |
| kalshi vs polymarket fees | 210/mo | Blog article |
| election betting sites comparison | 260/mo | Blog article |
| where to bet on midterms | 320/mo | Blog article |
| polymarket election accuracy | 390/mo | Blog article |
| predictit accuracy track record | 170/mo | Blog article |
| smarkets vs polymarket | 210/mo | Blog article |
| election odds sites ranked | 170/mo | Blog article |
| electionbettingodds vs polymarket | 140/mo | Blog article |

#### Best / Superlative Keywords (15)
People looking for rankings and recommendations.

| Keyword | Est. Volume | Target Content |
|---------|------------|---------------|
| best election prediction model | 1,300/mo | Blog article |
| most accurate election forecast | 1,600/mo | Blog article |
| best political prediction markets | 720/mo | Blog article |
| most competitive senate races 2026 | 1,900/mo | `/senate` + blog |
| most likely 2028 presidential candidates | 2,400/mo | `/presidential/candidates` + blog |
| who is favored to win 2026 senate | 590/mo | `/senate` + blog |
| best election data websites | 320/mo | Blog article |
| top prediction market platforms | 260/mo | Blog article |
| most accurate political betting site | 210/mo | Blog article |
| biggest prediction market moves | 170/mo | Blog article |
| senate seats most likely to flip 2026 | 880/mo | `/senate` + blog |
| swing states 2028 | 1,300/mo | Blog article |
| 2026 senate race ratings | 720/mo | Blog article |
| who will control the senate 2026 | 1,600/mo | `/races/senate-2026` + blog |
| 2028 election frontrunners | 1,900/mo | `/presidential/candidates` + blog |

### Content Architecture: Pillar + Support Pages

#### 6 Pillar Pages

1. **"The Complete Guide to Election Prediction Markets"** (`/blog/prediction-markets-guide`)
   - 2,500+ words, evergreen, targets "how do prediction markets work" + "prediction market explained"
   - Links to: all comparison articles, track record, every market page

2. **"2026 Midterm Prediction Market Odds: Everything You Need to Know"** (`/blog/2026-midterm-odds`)
   - 2,000+ words, updated weekly, targets "2026 midterm odds" + "senate races 2026"
   - Links to: House, Senate, individual state pages, competitive races article

3. **"2028 Presidential Election Odds Tracker"** (`/blog/2028-presidential-odds`)
   - 2,000+ words, updated weekly, targets "2028 presidential election odds"
   - Links to: candidate page, party page, primary pages, charts

4. **"Are Prediction Markets Accurate? A Data-Driven Answer"** (`/blog/prediction-markets-accuracy`)
   - 2,000+ words, evergreen, targets "are prediction markets accurate" + "prediction markets vs polls"
   - Links to: track record page, Brier score explanation, methodology

5. **"Prediction Market Comparison: Polymarket vs PredictIt vs Kalshi vs Smarkets"** (`/blog/prediction-market-comparison`)
   - 2,500+ words, evergreen, targets all comparison keywords
   - Links to: homepage, each source's odds

6. **"Senate Races to Watch in 2026: Market-Based Rankings"** (`/blog/senate-races-2026`)
   - 2,000+ words, updated monthly, targets "most competitive senate races 2026"
   - Links to: individual state pages, senate overview, primaries

#### 18 Support Articles

| # | Title | Primary Keyword | Pillar Link |
|---|-------|----------------|-------------|
| 1 | What Is Polymarket? A Beginner's Guide | what is polymarket | Comparison pillar |
| 2 | What Is PredictIt? Everything You Need to Know | what is predictit | Comparison pillar |
| 3 | What Is Kalshi? The CFTC-Regulated Prediction Market | what is kalshi | Comparison pillar |
| 4 | Polymarket vs PredictIt: Which Is Better for Election Betting? | polymarket vs predictit | Comparison pillar |
| 5 | Polymarket vs Kalshi: Fees, Liquidity, and Accuracy Compared | polymarket vs kalshi | Comparison pillar |
| 6 | Is Election Betting Legal in the US? (2026 Update) | is election betting legal | Guide pillar |
| 7 | How to Read Election Odds (With Examples) | how to read election odds | Guide pillar |
| 8 | What Is a Brier Score? How We Measure Prediction Accuracy | what is a brier score | Accuracy pillar |
| 9 | Prediction Markets vs Polls: Which Is More Accurate? | prediction markets vs polls | Accuracy pillar |
| 10 | Senate Seats Most Likely to Flip in 2026 | senate seats most likely to flip | Senate pillar |
| 11 | Who Are the 2028 Presidential Frontrunners? | 2028 election frontrunners | Presidential pillar |
| 12 | 2028 Republican Primary: What the Markets Say | republican primary odds 2028 | Presidential pillar |
| 13 | 2028 Democratic Primary: Who's Leading? | democratic primary odds 2028 | Presidential pillar |
| 14 | Why Election Odds Differ Between Markets | why are prediction market odds different | Comparison pillar |
| 15 | The Biggest Prediction Market Moves This Week | biggest prediction market moves | Midterm pillar |
| 16 | How Election Betting Works: Contracts, Prices, and Payouts | how election betting works | Guide pillar |
| 17 | Best Election Data Websites in 2026 | best election data websites | Guide pillar |
| 18 | Will Republicans or Democrats Control the Senate in 2027? | who will control the senate 2026 | Midterm pillar |

### Internal Linking Map

```
Homepage
├── /presidential/candidates ←→ Blog: 2028 Presidential Odds Tracker
│   ├── /primaries/gop ←→ Blog: 2028 GOP Primary
│   └── /primaries/dem ←→ Blog: 2028 DEM Primary
├── /races/house-2026 ←→ Blog: 2026 Midterm Odds
├── /races/senate-2026 ←→ Blog: 2026 Midterm Odds
├── /senate ←→ Blog: Senate Races to Watch
│   └── /senate/[state] (35 pages, interlinked)
├── /track-record ←→ Blog: Prediction Markets Accuracy
├── /charts ←→ All blog articles (embed chart links)
└── /blog
    ├── Prediction Markets Guide (links to ALL pages)
    ├── 2026 Midterm Odds (links to House, Senate, states)
    ├── 2028 Presidential Odds (links to candidates, parties, primaries)
    ├── Prediction Markets Accuracy (links to track record)
    ├── Market Comparison (links to homepage, each market)
    └── Senate Races 2026 (links to individual states)
```

**Rule of thumb:** Every page links to its pillar, every pillar links to its supports, and every page links to 2-3 non-pillar related pages.

### 30-Day Content Calendar

| Day | Content | Type | Primary Channel |
|-----|---------|------|----------------|
| 1 | Set up blog, publish "How to Read Election Odds" | Support article | Site |
| 2 | X thread: "We built a free election odds aggregator" | Launch post | X |
| 3 | Publish "Prediction Markets vs Polls" | Support article | Site |
| 5 | Submit to Product Hunt | Launch | Product Hunt |
| 6 | Post to r/PredictionMarkets | Distribution | Reddit |
| 7 | Publish "The Complete Guide to Prediction Markets" | Pillar | Site |
| 8 | X thread: "Markets vs polls — here's the data" | Data thread | X |
| 10 | Publish "Polymarket vs PredictIt vs Kalshi" | Pillar | Site |
| 11 | Post comparison to r/Polymarket | Distribution | Reddit |
| 12 | X thread: "Why election odds differ between markets" | Educational | X |
| 14 | Publish "2026 Midterm Odds: Everything You Need to Know" | Pillar | Site |
| 15 | X thread: "The 5 most competitive Senate races (by the odds)" | Data thread | X |
| 16 | Post to r/politics or r/PoliticalDiscussion | Distribution | Reddit |
| 17 | Publish "Is Election Betting Legal?" | Support article | Site |
| 19 | Publish "Senate Seats Most Likely to Flip" | Support article | Site |
| 20 | X thread: state-by-state Senate odds | Data thread | X |
| 21 | Submit to Hacker News (Show HN) | Launch | HN |
| 22 | Publish "Are Prediction Markets Accurate?" | Pillar | Site |
| 23 | X thread: "We scored 808+ predictions. Here's the accuracy" | Data thread | X |
| 24 | Post track record data to r/dataisbeautiful | Distribution | Reddit |
| 25 | Publish "What Is Polymarket?" | Support article | Site |
| 26 | Publish "What Is Kalshi?" | Support article | Site |
| 28 | Publish "2028 Presidential Odds Tracker" | Pillar | Site |
| 29 | X thread: "2028 presidential frontrunners ranked by the odds" | Data thread | X |
| 30 | Publish "Senate Races to Watch in 2026" | Pillar | Site |

### 3 Fully-Written Articles

---

#### Article 1: How to Read Election Odds (With Examples)

**Target keyword:** how to read election odds
**Word count:** ~1,000 | **Publish to:** `/blog/how-to-read-election-odds`

```
---
title: "How to Read Election Odds (With Real Examples From 2026)"
description: "Election odds look confusing at first glance. Here's a 5-minute guide to reading prediction market prices, understanding what they mean, and knowing which numbers to trust."
date: 2026-02-15
---

You've seen the headlines: "Prediction markets give Candidate X a 67% chance of winning." But what does that actually mean? And should you trust it?

This guide will teach you to read election odds like a pro — in about 5 minutes.

## What Are Election Odds?

Election odds come from prediction markets — platforms where people buy and sell contracts based on political outcomes. Think of it like a stock market, but instead of trading shares in Apple, you're trading shares in "Will the Democrats win the Senate in 2026?"

Each contract trades between $0.00 and $1.00 (or equivalently, 0 to 100 cents). The current price represents the market's consensus probability of that outcome happening.

**The simple rule: A contract trading at $0.67 means the market thinks there's a 67% chance that outcome will happen.**

## Reading a Real Odds Table

Let's look at a real example. On ElectionOdds, you might see a table like this for 2026 Senate Control:

| Outcome | Polymarket | PredictIt | Kalshi | Aggregated |
|---------|-----------|-----------|--------|-----------|
| Republican | $0.58 | $0.61 | $0.55 | $0.58 |
| Democratic | $0.42 | $0.41 | $0.45 | $0.43 |

Here's what every column tells you:

- **Polymarket, PredictIt, Kalshi** — The price on each individual prediction market. These can differ because each platform has different users, fees, and liquidity.
- **Aggregated** — Our volume-weighted average across all sources. This is usually the most reliable single number because it incorporates the most information.

In this example, the markets collectively think Republicans have about a 58% chance of controlling the Senate after the 2026 midterms.

## Why Do Odds Differ Between Markets?

You'll notice the numbers aren't identical across columns. That's normal, and here's why:

1. **Different user bases** — Polymarket skews international and crypto-native; PredictIt is mostly US political junkies; Kalshi attracts finance professionals.
2. **Different fee structures** — PredictIt charges 10% on profits and 5% on withdrawals. Kalshi and Polymarket have lower fees. Higher fees mean prices can be "stickier."
3. **Different position limits** — PredictIt caps individual positions at $850. Kalshi and Polymarket allow larger bets, which means more informed money can push prices.

**Pro tip:** When markets disagree by more than 5-10 cents, something interesting is usually happening. Either new information is hitting one market faster than others, or structural differences are creating a genuine price gap.

## Understanding Price Changes

On ElectionOdds, you can toggle between 24-hour, 7-day, and 30-day price changes. Here's how to interpret them:

- **+$0.05 in 24 hours** — A meaningful move. Something happened (a poll, a news event, a primary result) that shifted the market.
- **+$0.01 in 24 hours** — Noise. Markets fluctuate by a penny or two constantly.
- **+$0.15 in 7 days** — A significant trend. The market is repricing this outcome, and it's worth understanding why.

## When to Trust the Odds (And When Not To)

Prediction markets are most reliable when:

- **The market is liquid** — More money in the market means more informed participants. A contract with $5M in volume is more trustworthy than one with $50K.
- **Multiple markets agree** — If Polymarket, PredictIt, and Kalshi all show 60%, that's a strong signal. If they disagree wildly, be more skeptical.
- **The election is soon** — Markets get more accurate as they get closer to the event, because there's less uncertainty and fewer unknown unknowns.

Markets are less reliable when:

- **The event is far away** — Odds 2+ years before an election are interesting but volatile. A lot can change.
- **A contract is illiquid** — A contract with only a few hundred dollars in volume might be mispriced.
- **There's a structural issue** — Sometimes platform-specific rules (like PredictIt's position limits) distort prices.

## Reading Odds for Senate Races

Individual state races work the same way, but with a twist: some states are "competitive" (markets show a real contest) and others are "safe" (one party is priced above 90%).

On the ElectionOdds Senate page, we classify a race as "competitive" when the second-most-likely party is priced at 10% or higher. This means markets think there's at least a 1-in-10 chance of an upset — enough to be worth watching.

## Quick Reference

| If a contract is at... | The market is saying... |
|----------------------|----------------------|
| $0.90+ | Near-certainty. Something extraordinary would have to happen. |
| $0.70-0.89 | Strong favorite. The most likely outcome, but upsets happen. |
| $0.50-0.69 | Lean. The market's best guess, but it's genuinely competitive. |
| $0.40-0.49 | Toss-up. Anything could happen. |
| $0.10-0.39 | Underdog. Not expected, but plausible. |
| Below $0.10 | Long shot. Markets say it's very unlikely, but not impossible. |

**Want to see real odds right now?** Check the [2026 midterm odds](/races/senate-2026) or [2028 presidential race](/presidential/candidates) — updated every 5 minutes.
```

---

#### Article 2: Prediction Markets vs Polls — Which Is More Accurate?

**Target keyword:** prediction markets vs polls
**Word count:** ~1,100 | **Publish to:** `/blog/prediction-markets-vs-polls`

```
---
title: "Prediction Markets vs Polls: Which Is More Accurate at Forecasting Elections?"
description: "Do prediction markets beat polls? We look at the data from 2016, 2020, and 2024 to answer the oldest question in political forecasting."
date: 2026-02-17
---

Every election cycle, the same debate resurfaces: should you trust the polls or the prediction markets?

The short answer: it depends on what you're asking and when you're asking it. Here's the longer answer — backed by data.

## How Polls Work vs How Markets Work

**Polls** ask a sample of people who they plan to vote for, then extrapolate to the broader population. They're snapshots of current voter intent. They can be wrong when the sample isn't representative, when people change their minds, or when turnout models are off.

**Prediction markets** let people put money on outcomes. You don't vote — you bet. This means the price reflects not just what people think will happen, but how confident they are (because they're risking real money). Markets aggregate information from polls, fundraising data, expert analysis, insider knowledge, and gut feelings into a single price.

The key difference: polls measure intent ("Who do you support?"), while markets measure expectations ("Who do you think will actually win?"). These are different questions with different answers.

## The Data: 2016-2024

**2016 — The Year Polls Got It "Wrong"**

National polls actually weren't far off — they showed Clinton winning the popular vote by ~3 points, and she won by ~2 points. But state-level polls in Michigan, Wisconsin, and Pennsylvania missed badly.

Prediction markets? Also wrong. They had Clinton at ~85% on election eve. In hindsight, the error was similar: both polls and markets underestimated Trump's support in the Rust Belt.

**Verdict:** Slight edge to markets (they at least priced in a 15% Trump chance), but both missed.

**2020 — Markets Were Cautious, Polls Were Bullish**

Polls showed Biden ahead by 8-10 points nationally. Markets were more cautious — pricing Biden at ~60-65% for most of the race.

Biden won by 4.5 points — closer to the market's implied toss-up-ish pricing than the polls' comfortable lead.

**Verdict:** Clear edge to markets. They correctly signaled more uncertainty than polls.

**2024 — Markets Caught the Late Shift**

Polls showed a tight race throughout 2024. Markets initially agreed, but in the final weeks, prediction markets shifted decisively toward the eventual winner before polls captured the same movement.

**Verdict:** Edge to markets on timing and direction.

## Why Markets Often Have an Edge

**1. Skin in the Game**

When your money is on the line, you have strong incentives to be right — not just to express an opinion. A pollster has no personal cost if their model is wrong; a trader loses real money.

**2. Information Aggregation**

Markets don't rely on a single methodology. They absorb information from everywhere — polls, fundraising data, early voting numbers, ground-game reports, insider hints — and compress it into a price. One trader might be weighting poll averages; another might be weighting economic indicators; a third might have local knowledge. The market price reflects all of these inputs.

**3. Real-Time Adjustment**

Polls take days to conduct and publish. Markets adjust in minutes. When a major event happens (debate, scandal, endorsement), you can watch market prices move in real-time while pollsters are still in the field.

**4. Wisdom of Crowds**

Prediction markets are a textbook case of the "wisdom of crowds" effect — large groups of independent actors making informed guesses tend to converge on accurate estimates, often beating individual experts.

## When Polls Beat Markets

Markets aren't always better. There are genuine advantages to polling:

- **For primary races** with many candidates, markets can be thin and unreliable. Polls with large samples may be more informative.
- **For specific demographics**, polls offer breakdowns (gender, age, race) that market prices can't provide.
- **When markets are illiquid** — a prediction market with $10K in volume is less trustworthy than a well-conducted poll of 1,500 likely voters.
- **For understanding *why*** someone is ahead, polls provide insight into which issues and demographics are driving results. Markets just give you a number.

## The Best Approach: Use Both

The smartest political forecasters don't choose one or the other — they triangulate.

If polls show Candidate A up by 6 points but prediction markets only give her a 55% chance, that's a signal worth investigating. Maybe the markets are pricing in something the polls haven't captured yet (an upcoming scandal, turnout concerns, economic headwinds).

If polls show a toss-up but markets give one side a 70% chance, the markets might be overreacting to a narrative — or they might have information the polls don't.

## How ElectionOdds Helps

This is exactly why we built ElectionOdds. Instead of checking five different prediction markets and three different poll aggregators, you get all the market data in one place — compared side-by-side, with historical charts to show you how the odds have moved.

For polls, we'd recommend sites like FiveThirtyEight, RealClearPolitics, or 538's successors. For markets, you're already in the right place.

The combination of market odds from ElectionOdds + polling averages from a good aggregator is the closest thing to a forecasting superpower that exists for regular people.

**See current prediction market odds:** [2026 Senate races](/senate) | [2028 Presidential race](/presidential/candidates) | [Track Record](/track-record)
```

---

#### Article 3: The 5 Most Competitive Senate Races in 2026 (According to Prediction Markets)

**Target keyword:** most competitive senate races 2026
**Word count:** ~1,100 | **Publish to:** `/blog/most-competitive-senate-races-2026`

```
---
title: "The 5 Most Competitive Senate Races in 2026, According to Prediction Markets"
description: "Prediction markets have priced every 2026 Senate race. Here are the 5 states where the odds are closest — and what traders are watching."
date: 2026-02-20
---

With 35 Senate seats on the ballot in November 2026, prediction markets have priced every race. Most are safe seats — one party trading above 90% — but a handful of states are genuinely competitive, with odds tight enough that either party could win.

Here are the 5 most competitive Senate races of 2026, ranked by how close the prediction market odds are to 50/50.

*Note: Odds cited below are aggregated from Polymarket, PredictIt, and Kalshi. They change constantly — visit the [live senate race tracker](/senate) for current numbers.*

## What Makes a Race "Competitive"?

On ElectionOdds, we classify a Senate race as competitive when the second-most-likely party is priced at 10% or higher — meaning markets give the underdog at least a 1-in-10 chance. But the races below go way beyond that threshold. These are genuine coin flips.

## 1. [State TBD — Placeholder for Closest Race]

**Current odds:** Republican ~52% / Democrat ~48%

This is the race prediction markets are watching most closely. [Context about why this race is competitive — incumbent retiring, strong challenger, shifting demographics, etc.]

What the markets are pricing in:
- [Key factor 1]
- [Key factor 2]
- [Key factor 3]

**Track this race live:** [State Senate Race page link]

## 2. [State TBD — Second Closest]

**Current odds:** Democrat ~54% / Republican ~46%

[Analysis of why this race is competitive and what traders are watching.]

**Track this race live:** [State Senate Race page link]

## 3. [State TBD — Third Closest]

**Current odds:** Republican ~56% / Democrat ~44%

[Analysis.]

**Track this race live:** [State Senate Race page link]

## 4. [State TBD — Fourth Closest]

**Current odds:** Democrat ~58% / Republican ~42%

[Analysis.]

**Track this race live:** [State Senate Race page link]

## 5. [State TBD — Fifth Closest]

**Current odds:** Republican ~60% / Democrat ~40%

[Analysis.]

**Track this race live:** [State Senate Race page link]

## The Bigger Picture: Senate Control

These 5 races will likely determine which party controls the Senate in 2027. Currently, markets price [Republican/Democrat] Senate control at about [X]%, but if even 2-3 of these races break the other way, control flips.

Here's what makes 2026 interesting for the Senate map:

- **Class II seats** are disproportionately [Republican/Democrat]-held, meaning [Party] has more seats to defend
- **The presidential party** typically loses seats in midterms (historical average: ~3-4 Senate seats)
- **The Ohio special election** adds a 35th seat to the map that wasn't originally scheduled

## How to Use This Data

If you're following the midterms, bookmark the [ElectionOdds Senate Tracker](/senate). Every race updates every 5 minutes with the latest prediction market prices.

Watch for:

- **Big single-day moves** (>5 cents) — usually means breaking news or a major poll
- **Markets diverging** — when Polymarket and PredictIt disagree, someone is likely wrong
- **Primary surprises** — a weak nominee can turn a safe seat competitive overnight

We track primaries too. See the [senate primaries page](/senate) for odds on who will win each party's nomination in contested states.

## Coming Up

We'll update this ranking monthly as the races develop. Sign up for our newsletter [coming soon] to get these updates delivered directly, or follow us on [X/Twitter handle] for weekly odds snapshots.

**Explore all 35 races:** [2026 Senate Race Tracker](/senate) | [Senate Control Odds](/races/senate-2026)
```

*(Note: Article 3 uses placeholder state names intentionally. Before publishing, fill in with the actual most competitive states from live data on the `/senate` page. This template is designed to be refreshed monthly.)*

---

## 4. Social Media System

### Platform Selection

**Primary: X (Twitter)** — Political data lives here. Prediction market discourse happens here. Journalists, traders, and political junkies all check X. This is our #1 channel.

**Secondary: Reddit** — Target subreddits: r/PredictionMarkets (5K+ subscribers), r/Polymarket (20K+), r/politics (8M+), r/PoliticalDiscussion (1.7M+), r/dataisbeautiful (21M+). Great for long-form data posts.

**Not now:** LinkedIn (wrong audience), Instagram (not a visual product), TikTok (not our demo), Facebook (declining for this demo).

### X (Twitter) Strategy

**Account setup:**
- Handle: `@ElectionOdds` (or `@ElectionOddsHQ` if taken)
- Display name: ElectionOdds
- Bio: "Real-time election odds from every major prediction market. 5-min updates. Free. Built by a data nerd. electionodds.com"
- Pinned tweet: Launch thread (see below)
- Header image: Screenshot of the site showing side-by-side odds comparison

### 12 Short Posts (Ready to Tweet)

**1. Launch announcement**
> We built a free site that tracks election odds from Polymarket, PredictIt, Kalshi, and Smarkets — all in one place.
>
> Updated every 5 minutes. No ads, no paywall.
>
> electionodds.com

**2. Data snapshot**
> 2026 Senate control odds right now:
>
> Polymarket: R 58% / D 42%
> PredictIt: R 61% / D 41%
> Kalshi: R 55% / D 45%
>
> Why do they disagree? Different user bases, different fees, different liquidity.
>
> We track all of them: electionodds.com

**3. Feature highlight**
> We track all 35 Senate races in 2026 — including primaries.
>
> Markets classify [X] as competitive and [Y] as safe.
>
> The data updates every 5 minutes.
>
> electionodds.com/senate

**4. Track record flex**
> We've scored 808+ historical predictions with Brier scores.
>
> Prediction markets are more accurate than most people think.
>
> The receipts: electionodds.com/track-record

**5. Comparison hook**
> Polymarket says X.
> PredictIt says Y.
> Kalshi says Z.
>
> Who's right? We aggregate all three so you don't have to pick.
>
> electionodds.com

**6. Education**
> Quick guide to reading election odds:
>
> $0.67 = 67% probability
> $0.90+ = near certainty
> $0.50 = coin flip
>
> Compare all markets at electionodds.com

**7. Timely reaction (template)**
> [Candidate] just [did something]. Here's how prediction markets reacted:
>
> Before: X%
> Now: Y%
> Change: +/- Z in [timeframe]
>
> Live data: electionodds.com/[relevant-page]

**8. Senate race spotlight**
> Most competitive Senate race right now (by the odds):
>
> [State]: R [X]% / D [Y]%
>
> Markets think this one is a genuine coin flip.
>
> Track all 35 races: electionodds.com/senate

**9. Markets vs polls**
> Polls say X.
> Markets say Y.
>
> Who do you trust? (We track the markets. Polls are someone else's job.)
>
> electionodds.com

**10. Weekend data dump**
> Biggest prediction market moves this week:
>
> [Candidate/Race] +X%
> [Candidate/Race] -Y%
> [Candidate/Race] +Z%
>
> Full data: electionodds.com/charts

**11. Nerdy feature**
> We calculate aggregated odds using a volume-weighted average across all sources.
>
> Stale prices (>48hr) get excluded. Illiquid markets get flagged.
>
> This matters because not all prediction markets are created equal.

**12. CTA / question**
> What's the most underpriced candidate on prediction markets right now?
>
> Check the odds and tell us who the markets are sleeping on:
> electionodds.com/presidential/candidates

### 6 Long-Form Posts / Threads

**Thread 1: Launch Story (Pinned)**
> (1/7) I built a free site that tracks election odds from every major prediction market.
>
> Here's why and how — a thread.
>
> (2/7) The problem: If you want to know "what do prediction markets think about the 2026 midterms?" you have to check Polymarket, PredictIt, Kalshi, and Smarkets separately. Different interfaces, different formats, different update schedules.
>
> (3/7) The solution: ElectionOdds aggregates all of them into one clean dashboard. Side-by-side comparison. Interactive historical charts. Updated every 5 minutes.
>
> (4/7) What we cover:
> - 2028 presidential odds (100+ candidates)
> - 2026 midterm House + Senate control
> - All 35 individual Senate races + primaries
> - 808+ historical predictions scored for accuracy
>
> (5/7) What makes us different from electionbettingodds.com:
> - Compare individual sources side-by-side
> - Interactive charts with time filters
> - Individual state Senate races + primaries
> - 5-minute updates vs periodic
>
> (6/7) It's free, no ads, no account required. I built it because I wanted it, and I figured others would too.
>
> (7/7) Check it out: electionodds.com
>
> If you find it useful, a repost goes a long way. If you find a bug, DM me.

**Thread 2: "How accurate are prediction markets?" (Data thread)**
> (1/5) "Are prediction markets actually accurate?"
>
> I scored 808+ historical predictions with Brier scores. Here's what I found.
>
> (Thread with data, Brier score explanation, and link to track record page)

**Thread 3: "The 2026 Senate map explained by the odds" (Analysis thread)**
> (1/6) The 2026 Senate map has 35 races. Markets think [X] are competitive and [Y] are safe.
>
> Here's what prediction markets see that polls might not.
>
> (Thread breaking down competitive vs safe, with odds data)

**Thread 4: "Why do prediction markets disagree?" (Educational thread)**
> (1/5) Polymarket says Republicans have a 58% chance of holding the Senate.
> PredictIt says 61%.
> Kalshi says 55%.
>
> Why the 6-point gap? It's not random.
>
> (Thread explaining fee structures, user bases, position limits)

**Thread 5: "Prediction markets vs polls — the data" (Comparison thread)**
> (1/5) Every election cycle: "Should you trust polls or markets?"
>
> I looked at 2016, 2020, and 2024. Here's what the data actually shows.
>
> (Thread summarizing the blog article data)

**Thread 6: "Building ElectionOdds — technical deep dive" (Builder thread)**
> (1/6) I built a real-time election odds aggregator as a solo dev.
>
> Stack: Next.js, Supabase, Python scrapers, GitHub Actions.
>
> Here's what I learned — a thread for anyone building data products.
>
> (Technical thread about architecture decisions — great for dev Twitter)

### 10 Post Frameworks (Reusable Templates)

1. **The Data Snapshot**: "[Market/Race] odds right now: [numbers]. Compare all sources: [link]"
2. **The Big Move**: "[Candidate] just moved +X%. Here's the market reaction: [numbers + link]"
3. **The Disagreement**: "Polymarket says X. PredictIt says Y. Who's right? [link]"
4. **The Question**: "What's the most [underpriced/overpriced/surprising] [candidate/race] right now? [link]"
5. **The Weekly Recap**: "Biggest prediction market moves this week: [3 bullet points + link]"
6. **The Education**: "Quick reminder: [election odds concept] explained in one tweet. [link to blog post]"
7. **The Comparison**: "[Metric] across 4 markets: [table format]. Why they differ: [link]"
8. **The Timely React**: "[News event] just happened. Here's how prediction markets are reacting: [before/after + link]"
9. **The Race Spotlight**: "Senate race to watch: [State]. Odds: [R%/D%]. What markets are pricing in: [1-2 sentences + link]"
10. **The Track Record**: "We got [X] right. Here's our track record on [topic]: [link to /track-record]"

### Founder Story (for About page / interviews / thread)

> I started tracking prediction markets during the 2024 election because I was tired of opening five different tabs. Polymarket had the best liquidity but missed some races. PredictIt had everything but clunky UI. Kalshi had CFTC legitimacy but sparse markets.
>
> So I built a simple dashboard to compare them all. Then I added charts. Then state-by-state Senate races. Then a track record page. Then I looked up and realized I'd accidentally built the most comprehensive free election odds aggregator on the internet.
>
> ElectionOdds isn't a hot take factory. It's a data product. We show you what the markets say — across every major platform, for every major race — and let you draw your own conclusions.
>
> The goal is simple: one tab, all the odds, updated every 5 minutes. No ads, no paywall, no agenda.

### Roadmap Teaser (for social / about page)

> **What's coming to ElectionOdds:**
>
> - API access for developers and researchers
> - Email alerts when odds cross thresholds you set
> - Historical data exports (CSV/JSON)
> - Gubernatorial race coverage
> - Embedded odds widgets for bloggers/journalists
> - More international markets
>
> Want to vote on what we build next? DM us or reply here.

### Daily Engagement Routine (15 min/day)

**Morning (5 min):**
- Check for overnight odds moves on the site
- If anything moved >5 cents: write a quick tweet about it
- If nothing moved: retweet a relevant political data tweet and add commentary

**Midday (5 min):**
- Reply to 3-5 tweets about prediction markets, elections, or polls
- Add genuine value (data, context, a link to relevant page) — don't just self-promote
- Search "prediction markets" and "election odds" on X, engage with fresh tweets

**Evening (5 min):**
- Check Reddit target subreddits for relevant discussions
- If there's a good thread, add a thoughtful data-backed comment with a link
- Plan tomorrow's post based on any news or odds movements

---

## 5. 25+ Low-Cost Growth Ideas

### Community & Social (Ideas 1-8)

**1. Prediction Market Discord/Slack community**
- Time: 2 hrs setup + 15 min/day moderation
- Upside: Direct access to most engaged users; early feedback loop
- Steps: (1) Create Discord server with channels for each market type, (2) invite first 20 members from X followers and Reddit contacts, (3) share weekly exclusive data previews to keep engagement

**2. Reddit AMA on r/PredictionMarkets**
- Time: 3 hours total
- Upside: Establish expertise; backlink to site; 500+ views minimum
- Steps: (1) Message mods to schedule AMA, (2) prepare answers for top 10 likely questions, (3) run AMA with live odds data examples

**3. Quote-tweet journalists who cite prediction market data**
- Time: 5 min/day
- Upside: Journalist follows → future citations → organic backlinks
- Steps: (1) Set up X search alerts for "prediction market" + "election odds," (2) when a journalist tweets odds, reply with your aggregated data showing all sources, (3) be helpful not promotional

**4. Create a "Prediction Market Picks" betting league**
- Time: 4 hrs setup + 1 hr/week
- Upside: Recurring engagement; content generation; community building
- Steps: (1) Set up a free Google Sheet or simple web form for weekly picks, (2) score based on Brier scores using site data, (3) share leaderboard weekly on X

**5. Post data visualizations to r/dataisbeautiful**
- Time: 2 hrs per post
- Upside: Massive subreddit (21M); viral potential; backlinks
- Steps: (1) Create a compelling chart (e.g., "How 2028 presidential odds have shifted over 6 months"), (2) post with context and methodology in comments, (3) include site link in data source citation

**6. Run a Twitter poll series**
- Time: 10 min per poll
- Upside: Engagement bait → followers → site traffic
- Steps: (1) Poll: "Who wins the 2026 Senate? (see what markets think: [link])," (2) share results vs actual market odds, (3) run weekly

**7. Tag political commentators when their predictions diverge from markets**
- Time: 5 min/day
- Upside: Engagement from high-follower accounts; organic reach
- Steps: (1) Monitor pundit predictions, (2) when they differ from markets, tweet the comparison with data, (3) keep tone neutral/curious, not confrontational

**8. Create a prediction markets meme account**
- Time: 30 min/week
- Upside: Memes spread faster than data; humanizes the brand
- Steps: (1) Make 2-3 memes per week about prediction market life, (2) watermark with @ElectionOdds, (3) post to X and Reddit

### Content & SEO (Ideas 9-16)

**9. Publish weekly "Odds Report" on blog**
- Time: 1 hr/week
- Upside: Recurring SEO content; email newsletter fodder; establishes cadence
- Steps: (1) Template the format (biggest moves, new markets, accuracy updates), (2) publish every Monday, (3) share on X and Reddit

**10. Create state-specific landing pages for all 35 Senate races**
- Time: 4 hrs total (templated)
- Upside: 35 unique SEO pages; long-tail traffic for "[State] senate race odds"
- Steps: (1) Already have `/senate/[state]` pages — add unique meta descriptions and 100-word intros, (2) submit all to Google Search Console, (3) internal link from blog articles

**11. Guest post on political data blogs**
- Time: 3 hrs per pitch + article
- Upside: Backlinks from authoritative domains; reach new audiences
- Steps: (1) Identify 10 political data blogs (Sabato's Crystal Ball, Cook Political, etc.), (2) pitch a data-driven piece using prediction market data, (3) include "data from ElectionOdds" with backlink

**12. Answer questions on Quora about election predictions**
- Time: 30 min/week
- Upside: Long-tail search traffic; backlinks; authority building
- Steps: (1) Search Quora for "prediction market" and "election odds" questions, (2) write detailed answers citing specific odds data, (3) link to relevant pages naturally

**13. Create a "Prediction Markets 101" infographic**
- Time: 3 hrs
- Upside: Shareable asset; works on all platforms; good for backlinks
- Steps: (1) Design with Canva or Figma (how to read odds, what markets exist, accuracy data), (2) publish on site as a blog post, (3) share on X, Reddit, Pinterest

**14. Write comparison pages for "ElectionOdds vs [competitor]"**
- Time: 2 hrs each
- Upside: Captures "[competitor] alternative" search traffic
- Steps: (1) Create `/blog/electionodds-vs-electionbettingodds` and similar, (2) honest feature comparison table, (3) highlight differentiators (state races, source comparison, charts)

**15. Submit to political science course syllabi**
- Time: 2 hrs outreach
- Upside: Captive audience of engaged students; academic credibility
- Steps: (1) Find 20 professors who teach prediction markets or political forecasting, (2) email with a one-paragraph pitch + link, (3) offer to do a guest Q&A over Zoom

**16. Create embeddable odds widgets**
- Time: 8 hrs development
- Upside: Passive backlinks from every site that embeds; brand exposure
- Steps: (1) Build a simple `<iframe>` or React component for key odds, (2) add "Embed this" button on odds tables, (3) reach out to political bloggers who cover elections

### PR & Outreach (Ideas 17-22)

**17. Submit to Product Hunt**
- Time: 4 hrs total
- Upside: 500-2,000 site visits on launch day; backlinks; early adopter community
- Steps: (1) Prepare assets (logo, screenshots, description, first comment), (2) launch on Tuesday or Wednesday at 12:01 AM PT, (3) rally X followers to upvote in the first 2 hours

**18. Submit "Show HN" on Hacker News**
- Time: 1 hr
- Upside: If it hits front page: 5,000-20,000 visits; developer/data audience is ideal
- Steps: (1) Write a concise "Show HN" post emphasizing the technical build, (2) post between 8-10 AM ET on a weekday, (3) respond to every comment in the first 4 hours

**19. Pitch to political data journalists**
- Time: 2 hrs/week
- Upside: Earned media; authoritative backlinks; massive reach
- Steps: (1) Build a list of 30 journalists who write about prediction markets or election forecasting, (2) personalize a 3-sentence email with specific data they'd find useful, (3) follow up once after 5 days

**20. Get listed on prediction market resource pages**
- Time: 3 hrs
- Upside: Permanent backlinks; referral traffic from already-engaged users
- Steps: (1) Search for "prediction market resources," "election data tools," and "political forecasting links," (2) email webmasters asking to be included, (3) offer a reciprocal link or data partnership

**21. Pitch a podcast interview on political data shows**
- Time: 2 hrs outreach + 1 hr per interview
- Upside: Long-form credibility; audience overlap is perfect
- Steps: (1) Identify 10 podcasts that cover elections, data, or prediction markets, (2) pitch: "I built an election odds aggregator — here's what the markets are saying about 2026," (3) prepare 5 interesting data points to share

**22. Partner with a political newsletter**
- Time: 2 hrs outreach
- Upside: Exposure to 10K-100K engaged political readers
- Steps: (1) Find newsletters covering 2026 midterms (e.g., Puck, Tangle, The Dispatch), (2) offer free data/charts for their coverage in exchange for attribution + link, (3) start with a specific data offer ("We have all 35 Senate race odds updated in real-time")

### Technical / Product (Ideas 23-28)

**23. Add Open Graph images with live odds data**
- Time: 4 hrs development
- Upside: Every share on X/Reddit/Facebook shows live data in the preview image
- Steps: (1) Use `@vercel/og` or similar to dynamically generate OG images, (2) include current top-line odds in the image, (3) timestamp it so people see fresh data

**24. Create an email capture with weekly odds digest**
- Time: 3 hrs setup
- Upside: Own your audience; not dependent on platform algorithms
- Steps: (1) Add exit-intent popup or footer signup for "Weekly Odds Report," (2) use Buttondown (free for <100 subscribers) or similar, (3) repurpose weekly blog post as newsletter

**25. Add "Share this odds table" buttons**
- Time: 2 hrs development
- Upside: Frictionless sharing → organic reach
- Steps: (1) Add X/Twitter and copy-link buttons to every odds table, (2) pre-populate tweet text with key odds data + link, (3) track share clicks in analytics

**26. Build a Telegram or X bot that posts daily odds**
- Time: 6 hrs development
- Upside: Passive daily impressions; low-effort engagement
- Steps: (1) Script to pull top-line odds from database, (2) format as a clean daily post, (3) auto-post at 9 AM ET every day

**27. Create a Google Sheets integration**
- Time: 4 hrs development
- Upside: Researchers and analysts will share it; backlinks
- Steps: (1) Build a simple Apps Script that fetches from a lightweight API endpoint, (2) publish template on Google Sheets, (3) share on X and Reddit for data-analysis community

**28. SEO-optimize individual state senate pages with unique content**
- Time: 6 hrs total (35 states)
- Upside: 35 long-tail keyword pages; each can rank for "[State] senate race 2026 odds"
- Steps: (1) Add a unique 100-200 word intro to each state page, (2) include state-specific context (incumbent, challenger, key issues), (3) submit all URLs to Search Console

---

## 6. Launch Pipeline

### Day -14 to Day +14 Checklist

#### Pre-Launch: Day -14 to Day -1

| Day | Task | Status |
|-----|------|--------|
| -14 | Secure domain (electionodds.com or alternative) | [ ] |
| -14 | Set up Google Search Console + Bing Webmaster Tools | [ ] |
| -14 | Create X/Twitter account, set up bio/header/pinned tweet | [ ] |
| -13 | Deploy SEO meta tags on all pages (from Section 2) | [ ] |
| -13 | Generate and submit XML sitemap | [ ] |
| -12 | Add JSON-LD structured data to homepage | [ ] |
| -12 | Set up analytics (GA4 or Plausible) | [ ] |
| -11 | Write + publish Article 1: "How to Read Election Odds" | [ ] |
| -10 | Write + publish Article 2: "Prediction Markets vs Polls" | [ ] |
| -9 | Write + publish "The Complete Guide to Prediction Markets" (Pillar) | [ ] |
| -8 | Set up Buttondown email newsletter | [ ] |
| -8 | Add email capture form to site (footer + exit-intent) | [ ] |
| -7 | Prepare Product Hunt assets (logo, screenshots, tagline, first comment) | [ ] |
| -7 | Prepare Hacker News "Show HN" post draft | [ ] |
| -6 | Seed X account: post 5-7 tweets (data snapshots, education, feature previews) | [ ] |
| -5 | Write + publish "Polymarket vs PredictIt vs Kalshi" (Pillar) | [ ] |
| -4 | Prepare 10 personalized DMs for X prediction market community | [ ] |
| -3 | Prepare 5 personalized emails for political data journalists | [ ] |
| -2 | Prepare Reddit posts for r/PredictionMarkets, r/Polymarket | [ ] |
| -1 | Final QA: all links work, meta tags render correctly, OG images look good | [ ] |
| -1 | Prepare launch thread (7 tweets) | [ ] |

#### Launch Week: Day 0 to Day 7

| Day | Task | Priority |
|-----|------|----------|
| 0 | Post launch thread on X | HIGH |
| 0 | Submit to Product Hunt | HIGH |
| 0 | Send 10 personalized DMs on X | HIGH |
| 0 | Send 5 journalist emails | HIGH |
| 1 | Post to r/PredictionMarkets | HIGH |
| 1 | Post to r/Polymarket | HIGH |
| 1 | Reply to every Product Hunt comment | HIGH |
| 2 | Submit "Show HN" to Hacker News | HIGH |
| 2 | Post to r/PoliticalDiscussion | MEDIUM |
| 3 | Reply to every HN comment | HIGH |
| 3 | Publish Article 3: "5 Most Competitive Senate Races" | MEDIUM |
| 4 | Follow up with journalists who didn't respond | MEDIUM |
| 5 | Post data visualization to r/dataisbeautiful | MEDIUM |
| 5 | Publish "2026 Midterm Odds" pillar article | MEDIUM |
| 6 | Send first email newsletter to early subscribers | MEDIUM |
| 7 | Compile launch week metrics (traffic, signups, social) | MEDIUM |

#### Post-Launch: Day 8 to Day 14

| Day | Task |
|-----|------|
| 8 | Analyze which channels drove most traffic → double down |
| 9 | Publish "Are Prediction Markets Accurate?" pillar article |
| 10 | Begin guest post outreach (3 pitches) |
| 11 | Start daily X engagement routine (15 min/day) |
| 12 | Publish "Senate Races to Watch in 2026" pillar article |
| 13 | Post weekly odds recap to X + Reddit |
| 14 | Review: What worked? What didn't? Adjust 30-day plan accordingly |

### Product Hunt Plan

**Tagline:** "Real-time election odds from every major prediction market — free"

**Description (60 words):**
> ElectionOdds aggregates prediction market data from Polymarket, PredictIt, Kalshi, and Smarkets into one dashboard. Compare odds side-by-side for the 2028 presidential race, 2026 midterms, all 35 Senate seats, and primaries. Updated every 5 minutes. Interactive charts. 808+ predictions scored for accuracy. Free, no ads, no account required.

**First Comment (by maker):**
> Hey Product Hunt! I'm [name], and I built ElectionOdds because I was tired of checking five different prediction markets for election odds.
>
> The problem: Polymarket, PredictIt, Kalshi, and Smarkets all have different odds for the same races. To get the full picture, you had to open multiple tabs, mentally compare, and somehow track changes over time.
>
> ElectionOdds solves this with:
> - Side-by-side odds comparison from all major markets
> - Interactive historical charts (24h/7d/30d/all-time)
> - 35 individual 2026 Senate state races + primaries
> - Track record: 808+ predictions scored with Brier scores
> - 5-minute updates, completely free
>
> Tech stack for the curious: Next.js, Supabase/PostgreSQL, Python data pipeline, GitHub Actions for sync.
>
> I'd love feedback — what races are you watching? What features would make this more useful?

**Screenshots to include:**
1. Homepage with stat cards and presidential odds table
2. Side-by-side odds comparison showing all 4 sources
3. Interactive price history chart
4. Senate races overview (competitive vs safe grid)
5. Track record page with Brier scores

### First-100-Users Outreach Scripts

#### Script 1: X/Twitter DM (for prediction market enthusiasts)

> Hey [name] — I noticed you post about prediction markets a lot. I built a free site that aggregates election odds from Polymarket, PredictIt, Kalshi, and Smarkets in one place.
>
> Would love your feedback: electionodds.com
>
> No strings attached — just looking for early users who actually care about this data.

#### Script 2: X/Twitter DM (for political journalists)

> Hi [name] — I follow your election coverage and thought this might be useful for your reporting:
>
> electionodds.com — it tracks real-time prediction market odds from all major platforms for every 2026 Senate race and the 2028 presidential field.
>
> All free, updated every 5 minutes. Happy to provide custom data for any story you're working on.

#### Script 3: Email to political data journalists

> Subject: Free tool: Real-time election odds from all major prediction markets
>
> Hi [name],
>
> I'm [founder name], and I built ElectionOdds — a free aggregator that pulls real-time odds from Polymarket, PredictIt, Kalshi, and Smarkets for every major 2026 and 2028 race.
>
> I thought it might be useful for your coverage because:
> - We compare all markets side-by-side (most sites only show one source)
> - We cover all 35 individual Senate races + primaries (no one else does this)
> - Data updates every 5 minutes with interactive historical charts
>
> Here's what the markets say about [timely topic — e.g., the most competitive Senate races]: [specific data point with link]
>
> Happy to provide custom data, screenshots, or embed codes for your articles. No catch — the site is free and I'm not selling anything.
>
> Best,
> [name]
> electionodds.com

#### Script 4: Partnership pitch (for political newsletters)

> Subject: Data partnership offer — real-time election odds for your newsletter
>
> Hi [name],
>
> I built ElectionOdds, a real-time aggregator of prediction market data for every major 2026 and 2028 election. We pull from Polymarket, PredictIt, Kalshi, and Smarkets.
>
> I'm reaching out because I think your readers would find our data useful, and I'd love to explore a lightweight partnership:
>
> - I can provide weekly odds snapshots formatted for your newsletter
> - Custom charts or data tables for specific races you're covering
> - Attribution: "Odds data from ElectionOdds" with a link
>
> No cost, no exclusivity — I just want the data in front of people who'll use it.
>
> Here's a quick preview of what we track: [link to /senate or /presidential/candidates]
>
> Interested?
>
> Best,
> [name]

#### Script 5: Interview request pitch (for podcasts)

> Subject: Pitch: What prediction markets say about the 2026 midterms
>
> Hi [name],
>
> I'm [founder name], creator of ElectionOdds — a real-time aggregator tracking election odds from every major prediction market.
>
> I'd love to come on [podcast name] to discuss:
>
> 1. What prediction markets are saying about the 2026 Senate races that polls aren't
> 2. Why different markets disagree on the same races (and what that tells us)
> 3. The accuracy track record of prediction markets vs traditional polling
> 4. The 5 most competitive races of 2026 according to the odds
>
> I have a lot of specific data to share and can make it accessible for a non-technical audience.
>
> Quick bio: [1-2 sentences about background]. I built ElectionOdds as a side project and it's grown into the most comprehensive free election odds tracker on the internet.
>
> Happy to work around your schedule. Here's the site if you want to browse: electionodds.com
>
> Best,
> [name]

---

## Appendix: Metrics to Track

### Weekly Dashboard

| Metric | Tool | Week 1 Target |
|--------|------|---------------|
| Unique visitors | GA4 / Plausible | 500 |
| Page views | GA4 / Plausible | 2,000 |
| X followers | X analytics | 100 |
| X impressions | X analytics | 10,000 |
| Email subscribers | Buttondown | 25 |
| Backlinks (new) | Google Search Console | 5 |
| Google impressions | Search Console | 200 |
| Reddit post karma | Reddit | 100+ |
| Product Hunt upvotes | Product Hunt | 50 |
| Avg session duration | GA4 / Plausible | >2 min |

### Monthly Review Questions

1. Which channel drove the most traffic? (Double down on it)
2. Which blog posts get the most search impressions? (Write more like them)
3. Which tweets got the most engagement? (Clone the format)
4. Are email subscribers growing? (If not, test different lead magnets)
5. What keywords are we ranking for? (Optimize pages for near-misses)
6. What's our best-performing page? (Add internal links to it from everywhere)
7. Did any journalist mention us? (Thank them, build the relationship)
8. What feature requests are coming in? (Feed into product roadmap)

---

*This document is a living plan. Revisit monthly and adjust based on what's working. The single most important thing: start. Imperfect execution beats perfect planning every time.*
