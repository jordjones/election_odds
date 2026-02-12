# Election Map Data Package

Self-contained data package for building election maps. Contains geographic
boundaries (TopoJSON) and election results (JSON) with consistent join keys.

Generated: 2026-02-12

## Directory Structure

```
maps/
├── boundaries/
│   ├── us-states.topojson      National state boundaries (51)
│   ├── us-counties.topojson    National county boundaries (~3,154)
│   ├── us-cds.topojson         Congressional district boundaries (436)
│   └── states/
│       └── {FIPS}/            Per-state boundaries (51 directories)
│           ├── counties.topojson
│           └── cds.topojson
├── results/
│   ├── presidential/
│   │   ├── state-history.json  1976–2024 presidential by state
│   │   ├── county-history.json 2000–2024 presidential by county
│   │   └── cd-2024.json        2024 presidential by congressional district
│   ├── senate/
│   │   ├── state-2024.json     2024 senate by state
│   │   └── county-2024.json    2024 senate by county
│   └── house/
│       └── cd-2024.json        2024 house by congressional district
├── lookups/
│   ├── state-fips.json         FIPS ↔ state name/abbreviation/slug
│   └── candidates.json         Year → DEM/REP candidate names (1976–2024)
├── README.md                   This file
└── types.ts                    TypeScript interfaces
```

## Join Keys

All data uses FIPS-based GEOIDs as join keys between boundaries and results.

| Geography | Boundary Property | Results Key | Format | Example |
|-----------|-------------------|-------------|--------|---------|
| State | `properties.GEOID` | `results["01"]` | 2-digit zero-padded | `"01"` (Alabama) |
| County | `properties.GEOID` | `results["01001"]` | 5-digit zero-padded | `"01001"` (Autauga, AL) |
| Congressional District | `properties.GEOID` | `results["0101"]` | 4-digit zero-padded | `"0101"` (AL-01) |

TopoJSON object keys are standardized:
- `topology.objects.states` — state boundaries
- `topology.objects.counties` — county boundaries
- `topology.objects.cds` — congressional district boundaries

## Results JSON Schema

### Single-year results (senate, house, cd-2024)

```json
{
  "meta": {
    "election": "presidential|senate|house",
    "year": 2024,
    "geography": "state|county|cd",
    "generated": "ISO timestamp",
    "source": "data source description"
  },
  "results": {
    "<GEOID>": {
      "dem_votes": 123456,
      "rep_votes": 234567,
      "other_votes": 5678,
      "totalvotes": 363701,
      "dem_pct": 0.3395,
      "rep_pct": 0.6449,
      "margin": -0.3054,
      "winner": "REP"
    }
  }
}
```

- `margin` = `dem_pct - rep_pct` (positive = DEM lead, negative = REP lead)
- `winner` = `"DEM"` or `"REP"` based on higher vote count

### Multi-year history (state-history, county-history)

```json
{
  "meta": {
    "election": "presidential",
    "geography": "state",
    "years": [1976, 1980, ..., 2024]
  },
  "candidates": {
    "1976": {"dem": "Carter", "rep": "Ford"},
    "2024": {"dem": "Harris", "rep": "Trump"}
  },
  "results": {
    "2024": {
      "01": { "dem_votes": ..., "rep_votes": ..., "winner": "REP" }
    },
    "2020": { ... }
  }
}
```

### Senate/House results (include candidate names per GEOID)

```json
{
  "results": {
    "04": {
      "dem_candidate": "Ruben Gallego",
      "rep_candidate": "Kari Lake",
      "dem_votes": 1676335,
      "rep_votes": 1595761,
      ...
    }
  }
}
```

## Boundary Properties

### State (`us-states.topojson`)
| Property | Type | Example | Description |
|----------|------|---------|-------------|
| `GEOID` | string | `"01"` | 2-digit state FIPS |
| `STATEFP` | string | `"01"` | Same as GEOID |
| `STUSPS` | string | `"AL"` | 2-letter postal abbreviation |
| `NAME` | string | `"Alabama"` | Full state name |

### County (`us-counties.topojson`)
| Property | Type | Example | Description |
|----------|------|---------|-------------|
| `GEOID` | string | `"01001"` | 5-digit county FIPS (state + county) |
| `STATEFP` | string | `"01"` | 2-digit state FIPS |
| `COUNTYFP` | string | `"001"` | 3-digit county FIPS |
| `NAME` | string | `"Autauga"` | County name |
| `NAMELSAD` | string | `"Autauga County"` | Full name with type suffix |
| `STUSPS` | string | `"AL"` | State abbreviation |
| `STATE_NAME` | string | `"Alabama"` | State name |

### Congressional District (`us-cds.topojson`)
| Property | Type | Example | Description |
|----------|------|---------|-------------|
| `GEOID` | string | `"0101"` | 4-digit CD GEOID (state + district) |
| `STATEFP` | string | `"01"` | 2-digit state FIPS |
| `NAME` | string | `"Congressional District 1..."` | Full district name |

## Usage Examples

### D3.js — Color states by 2024 presidential winner

```typescript
import * as topojson from 'topojson-client';

const topo = await fetch('/data/maps/boundaries/us-states.topojson').then(r => r.json());
const results = await fetch('/data/maps/results/presidential/state-history.json').then(r => r.json());
const year2024 = results.results['2024'];

const states = topojson.feature(topo, topo.objects.states);

states.features.forEach(f => {
  const geoid = f.properties.GEOID;
  const result = year2024[geoid];
  f.properties.winner = result?.winner;
  f.properties.margin = result?.margin;
});
```

### Look up state info

```typescript
const fips = await fetch('/data/maps/lookups/state-fips.json').then(r => r.json());
console.log(fips['06']); // { name: "California", abbrev: "CA", slug: "california" }
```

## Data Sources

- **Presidential (state)**: MIT Election Data + Science Lab (MEDSL), 1976–2024
- **Presidential (county)**: MEDSL, 2000–2024
- **Presidential (CD)**: Daily Kos Elections, 2024
- **Senate**: MEDSL 2024 official results
- **House**: MEDSL via Harvard Dataverse, 2024
- **Boundaries**: US Census Bureau cartographic boundary files (2024 vintage)

## Known Data Issues

1. **Senate AZ party labels**: The MEDSL 2024 state-level data has Gallego (DEM)
   labeled as REPUBLICAN and Lake (REP) labeled as DEMOCRAT. This has been
   corrected in the exported data.

2. **Congressional district boundaries**: Based on post-2020 redistricting
   (118th/119th Congress). Historical house results before 2024 may not align
   with current district lines.

3. **County FIPS changes**: Some counties have changed FIPS codes over time
   (e.g., Shannon County SD → Oglala Lakota County). Historical county data
   may have orphan FIPS codes for years when the old code was in use.

4. **At-large districts**: States with 1 representative use district `00`
   (e.g., Alaska = `0200`, Wyoming = `5600`).

5. **Uncontested races**: Some House races have only one major-party candidate.
   The opposing party's vote count will be 0.
