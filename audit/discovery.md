# electionbettingodds.com Discovery Report

Generated: 2026-02-05T20:06:30.006795 UTC

## Summary

This document describes the data structure and access patterns discovered on electionbettingodds.com.

## robots.txt

```
Status: 404
```

## Pages Discovered

- **https://electionbettingodds.com/**
  - Title: Election Betting Odds by Maxim Lott and John Stossel
  - Has data table: Yes
  - Last updated shown: 4:28AM EST on Feb 01, 2026
- **https://electionbettingodds.com/President2028.html**
  - Title: Election Betting Odds by Maxim Lott and John Stossel
  - Has chart: Yes
  - Has data table: Yes
  - Last updated shown: 12:35PM EST on Feb 01, 2026
- **https://electionbettingodds.com/President2028_by_party.html**
  - Title: 404 Not Found
- **https://electionbettingodds.com/GOP2028Primary.html**
  - Title: 404 Not Found
- **https://electionbettingodds.com/DEM2028Primary.html**
  - Title: 404 Not Found
- **https://electionbettingodds.com/House2026.html**
  - Title: 404 Not Found
- **https://electionbettingodds.com/Senate2026.html**
  - Title: 404 Not Found
- **https://electionbettingodds.com/about.html**
  - Title: Election Betting Odds by Maxim Lott
  - Last updated shown: 4/2/2024, the odds are not volume-weighted; each e

## Network Requests (XHR/Fetch)

- `GET https://electionbettingodds.com/...`
  - Type: html
- `GET https://c.statcounter.com/t.php?sc_project=10669543&u1=EA9DFCC1A1C4488886FF57DE8207E299&java=1&secur...`
  - Type: json
- `GET https://electionbettingodds.com/President2028.html...`
  - Type: html
- `GET https://electionbettingodds.com/President2028_by_party.html...`
  - Type: html
- `GET https://electionbettingodds.com/GOP2028Primary.html...`
  - Type: html
- `GET https://electionbettingodds.com/DEM2028Primary.html...`
  - Type: html
- `GET https://electionbettingodds.com/House2026.html...`
  - Type: html
- `GET https://electionbettingodds.com/Senate2026.html...`
  - Type: html
- `GET https://electionbettingodds.com/about.html...`
  - Type: html
- `GET https://electionbettingodds.com/2025-08-01...`
  - Type: html
- `GET https://electionbettingodds.com/history/2025-08-01...`
  - Type: html
- `GET https://electionbettingodds.com/archive/2025-08-01...`
  - Type: html
- `GET https://electionbettingodds.com/?date=2025-08-01...`
  - Type: html
- `GET https://electionbettingodds.com/President2028.html?date=2025-08-01...`
  - Type: html

## Embedded JSON Blobs

No embedded JSON blobs found.

## Date/Archive Patterns

- Not found: /2025-08-01 (status 404)
- Not found: /history/2025-08-01 (status 404)
- Not found: /archive/2025-08-01 (status 404)
- Found: /?date=2025-08-01 (status 200)
- Found: /President2028.html?date=2025-08-01 (status 200)

## Chart Data Sources

### https://electionbettingodds.com/President2028.html

- Type: Google Charts addRows
- Sample:
```
[[new Date(2024,10,15,19,12,46),26.2,7.0,3.5,0.4,0.2,0.1,0.4,0.5,0.2,1.1,1.7,0.3,1.3,1.3,4.4,2.3,4.4,1.0,0.2,9.2,2.2,2.0,0.2,0.0,]
```


## HTML Selectors for Data Extraction

```css
/* Last updated timestamp */
last_updated: regex 'Last updated:\s*([^<]+)' in HTML

/* Market title and total bet */
market_tooltip: div.tooltip span[style*="font-size: 21pt"]
total_bet: regex '\$([0-9,]+)\s*bet so far' in tooltip

/* Candidate data */
candidate_tooltip: div.candidate-tooltip
candidate_image: div.candidate-tooltip img[src*=".png"]
candidate_name: derived from img src (e.g., /Vance.png -> Vance)

/* Odds percentage (large number) */
odds_percent: td p[style*="font-size: 55pt"] -> regex '([\d.]+)%'

/* Change percentage */
change_percent: td span[style*="font-size: 20pt"] -> regex '([+-]?[\d.]+)%'

/* Market breakdown in tooltip */
market_breakdown: div.candidate-tooltip span.tooltiptext table tr
  - Column 0: Market name (e.g., "Kalshi 🇺🇸")
  - Column 2: Bid-ask range (e.g., "26.0-27.0%")
  - Column 4: Total bet (e.g., "$5,952,889")
```

### Example Extracted Data

```json
{
  "candidate_name": "Vance",
  "odds_pct": 24.5,
  "change_pct": -0.1,
  "market_breakdown": {
    "Kalshi 🇺🇸": {"bid": 26.0, "ask": 27.0, "total_bet": "$5,952,889"},
    "Betfair 🇬🇧": {"bid": 21.7, "ask": 22.7, "total_bet": "$954,004"},
    "PredictIt 🇺🇸": {"bid": 26.0, "ask": 28.0, "total_bet": "$733,204"},
    "Smarkets 🇬🇧": {"bid": 21.7, "ask": 22.7, "total_bet": "$169,055"}
  }
}
```

## Archive/Historical Access

- https://www.nytimes.com/interactive/2016/upshot/presidential-polls-forecast.html

## Notes

- Site uses Google Charts with embedded data

## Recommended Approach

Based on discovery findings:

1. **Primary**: Use JSON endpoints/embedded data
2. **Historical**: Check Wayback Machine for archived snapshots
3. **Forward**: Set up continuous scraping every 5-15 minutes


## Wayback Machine Availability

Found 20 archived snapshots.

Sample timestamps:
- 20250803012019 (status 200)
- 20250806012441 (status 200)
- 20250807111447 (status 200)
- 20250811073014 (status 200)
- 20250816041939 (status 200)

Full CDX query: `https://electionbettingodds.com` from 2025-08-01 to 2026-02-05
