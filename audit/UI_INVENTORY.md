# UI/Component Inventory - electionbettingodds.com

**Last Updated:** 2026-02-05

---

## Technology Stack

| Aspect | Technology | Notes |
|--------|------------|-------|
| CSS Framework | Custom (vanilla CSS) | No Bootstrap/Tailwind detected |
| JS Libraries | Google Charts | Via gstatic.com loader |
| JS Framework | None detected | No React/Vue/Angular |
| Responsive | **NOT responsive** | No viewport meta tag |
| Rendering | Server-side HTML | Static HTML pages |

---

## Layout Structure

```
┌─────────────────────────────────────────────────────────────────────┐
│ HEADER (author attribution: "by Maxim Lott and John Stossel")      │
├─────────────────────────────────────────────────────────────────────┤
│ NAVIGATION (nav element)                                            │
│ [Home] [Charts] [Track Record] [House] [Senate] [DEM] [GOP] [...]  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│                         MAIN CONTENT                                │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ ODDS TABLE                                                   │   │
│  │ [Header with title + description + $ volume]                 │   │
│  │ [Row: Candidate | Markets | Bid-Ask | Volume | Aggregated]   │   │
│  │ [Row: ...]                                                   │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  [REPEAT: More odds tables...]                                      │
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│ FOOTER (links to About, How People Bet)                             │
└─────────────────────────────────────────────────────────────────────┘
```

**Semantic Landmarks Detected:** 1 (nav element)
- No `<header>`, `<main>`, `<footer>`, `<aside>` elements detected
- Minimal use of semantic HTML

---

## Component Catalog

### 1. Odds Data Table

**Usage:** Primary component across all pages
**Count:** 31 tables on homepage, varies by page

**Structure:**
```html
<table>
  <tr>
    <th colspan="...">
      <!-- Title + description + $ bet volume -->
      "US Presidency 2028\nWinner of Presidential election...\n$248,220,477 bet so far"
    </th>
  </tr>
  <tr>
    <!-- Column headers: implicit in data rows -->
    <td>[Candidate with photo]</td>
    <td>Markets</td>
    <td></td>
    <td>Range (Bid-Ask)</td>
    <td></td>
    <td>Total $ Bet</td>
    <td>[Market 1 name]</td>
    <td></td>
    <td>[Market 1 bid-ask]</td>
    <td></td>
    <td>[Market 1 volume]</td>
    <!-- ... more markets ... -->
    <td>[Aggregated % with change]</td>
  </tr>
  <!-- More candidate rows -->
</table>
```

**Features:**
- Candidate thumbnail image
- "details" link to external source
- Multi-market comparison columns
- Regional flags (🇺🇸, 🇬🇧, 🌎)
- Bid-ask range display
- $ volume per market
- Aggregated probability with +/- change indicator

**Screenshot Reference:** `01_homepage.png`

---

### 2. Navigation Bar

**Location:** Top of all pages
**Type:** Horizontal nav with text links

**Links (9 items):**
```
Home | Charts | Track Record | House Control | Senate Control | DEM Nom | GOP Nom | General by Party | By Candidate
```

**Selector:** `nav a`

---

### 3. Time Filter Dropdown

**Type:** `<select>` element
**Count:** 3 dropdowns on homepage

**Options Pattern:**
```html
<select>
  <option value="/{topic}_4hr.html">in last 4hr</option>
  <option value="/{topic}.html">in last day</option>
  <option value="/{topic}_week.html">in last wk</option>
  <option value="/{topic}.html#chart">CHARTS</option>
</select>
```

**Behavior:** Navigates to different URL on change (standard form behavior)

---

### 4. Chart Container

**Location:** Charts page, inside main content
**Type:** Div container with Google Charts iframe

**Selector:** `#WIN_chart_div`

**Technology:**
- Google Charts API (loaded from gstatic.com)
- Modules loaded:
  - `jsapi_compiled_default_module.js`
  - `jsapi_compiled_graphics_module.js`
  - `jsapi_compiled_line_module.js`
  - `jsapi_compiled_controls_module.js`
  - `jsapi_compiled_corechart_module.js`
  - `dygraphs/dygraph-tickers-combined.js`

**Embedded Elements:**
- 4 iframes for chart content
- 3 SVG elements for vector graphics

**Screenshot Reference:** `03_charts_page.png`

---

### 5. Track Record Table

**Location:** `/TrackRecord.html`
**Type:** Standard HTML table

**Structure:**
```
| Year | General/Primary | State | Type | Candidate | EBO Probability | Win? | Brier Score |
```

**Data Volume:** 808 historical prediction rows

**Screenshot Reference:** `05_track_record.png`

---

### 6. Candidate Row Component

**Context:** Within odds tables
**Pattern:**

```
┌────────────────────────────────────────────────────────────────────┐
│ [Photo] [Name] details | Markets | Range | $ Bet | [Markets...] | %│
└────────────────────────────────────────────────────────────────────┘
```

**Elements:**
| Element | Has Image | Has Link |
|---------|-----------|----------|
| Candidate cell | ✅ | ✅ (details) |
| Market cell | ❌ | ❌ |
| Aggregated cell | Sometimes | ❌ |

---

### 7. Buttons

**Count:** 2 detected (minimal)
**Samples:** Empty text (likely icon-only or expand/collapse)

---

## Images

**Total Count:** 42 images on homepage
**Types:**
- Candidate headshots/thumbnails
- Regional flag emojis (text-based, not images)

**Accessibility Issue:** 0/42 images have alt text

---

## Forms

**Count:** 0 user input forms
**Note:** Site is read-only with no search, login, or data submission

---

## Modals/Dialogs

**Count:** 0 detected
**Note:** No overlay dialogs or popups

---

## Design Patterns

### Color Scheme
- Standard web colors (not analyzed in depth)
- Uses color for party differentiation (blue/red implied)

### Typography
- Standard system fonts (no custom web fonts detected)
- Monospace numbers for odds display

### Spacing
- Table-based layout
- Minimal responsive design

---

## Accessibility Audit

| Check | Status | Details |
|-------|--------|---------|
| Alt text on images | ❌ FAIL | 0/42 images have alt text |
| Form labels | ⚠️ N/A | 0 inputs to label |
| Skip link | ❌ FAIL | No skip-to-content link |
| Single H1 | ❌ FAIL | 0 H1 elements found |
| ARIA landmarks | ⚠️ PARTIAL | 1 landmark (nav only) |
| Viewport meta | ❌ FAIL | No responsive viewport |
| Color contrast | ⚠️ UNKNOWN | Not tested |
| Keyboard navigation | ⚠️ UNKNOWN | Not tested |

---

## Analytics & Tracking

| Tracker | Detected |
|---------|----------|
| Google Analytics | ✅ |
| Google Tag Manager | ✅ |
| Facebook Pixel | ✅ |
| Twitter Pixel | ✅ |
| Hotjar | ❌ |

---

## SEO Metadata

| Tag | Value |
|-----|-------|
| `<title>` | "Election Betting Odds by Maxim Lott and John Stossel" |
| `<meta name="description">` | "Live betting odds on the 2028 presidential election, and more! Who will win? Vance, Newsom, DeSantis, AOC?..." |
| `<meta name="keywords">` | Not set (N/A) |

---

## Mobile Experience

**Status:** NOT mobile-optimized

**Evidence:**
- No viewport meta tag
- Fixed-width layout
- Tables don't collapse for mobile
- Horizontal scrolling required

**Screenshot:** `06_mobile_homepage.png`

---

## Component Reusability Assessment

| Component | Reusable | Complexity |
|-----------|----------|------------|
| Odds Table | Yes (high repetition) | Medium |
| Nav Bar | Yes (all pages) | Low |
| Time Dropdown | Yes (pattern) | Low |
| Chart Container | Yes (iframes) | High |
| Track Record Table | Unique | Medium |
| Candidate Row | Yes (within tables) | Low |
